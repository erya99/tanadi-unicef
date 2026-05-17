"""
TANADI · Satellite ingestion pipeline
=====================================

This module pulls vegetation health (NDVI), rainfall (CHIRPS), and land
surface temperature (MODIS LST) over Niger's Maradi region using Google
Earth Engine, computes anomaly indices, and outputs per-village risk
scores that feed the TNVS engine.

Status: skeleton / reference implementation
Production deployment requires a Google Earth Engine service account.

Authentication:
    earthengine authenticate
    pip install earthengine-api pandas numpy

Run:
    python ndvi_anomaly.py --region maradi --start 2026-04-01 --end 2026-05-15
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timedelta

try:
    import ee  # type: ignore
except ImportError:
    ee = None  # graceful — file is documented even without GEE installed


# --- Region of interest ---------------------------------------------------

MARADI_BBOX = [5.80, 13.10, 8.40, 14.95]  # minLon, minLat, maxLon, maxLat


@dataclass
class VillageAOI:
    """A village-level area of interest (5 km buffer around centroid)."""
    village_id: str
    name: str
    lat: float
    lon: float
    buffer_m: int = 5000


# --- NDVI anomaly ---------------------------------------------------------

def compute_ndvi_anomaly(aoi: VillageAOI, start: str, end: str,
                         baseline_years: int = 10) -> dict:
    """
    Sentinel-2 NDVI anomaly vs. baseline_years median for the same period.

    Returns:
        {
          'mean_ndvi': float,         # current window mean
          'baseline_ndvi': float,     # historical median for same dates
          'anomaly_pct': float,       # (current - baseline) / baseline * 100
          'n_scenes': int
        }
    """
    if ee is None:
        raise RuntimeError("earthengine-api not installed. Run: pip install earthengine-api")

    point = ee.Geometry.Point([aoi.lon, aoi.lat]).buffer(aoi.buffer_m)

    # Current window
    current = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
               .filterBounds(point)
               .filterDate(start, end)
               .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
               .map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI')))

    current_mean = current.mean().reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=10
    ).get('NDVI').getInfo()

    # Baseline: same calendar window over last N years
    end_dt = datetime.fromisoformat(end)
    start_dt = datetime.fromisoformat(start)
    baseline_imgs = []
    for y in range(1, baseline_years + 1):
        baseline_imgs.append(
            ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
              .filterBounds(point)
              .filterDate(
                  (start_dt.replace(year=start_dt.year - y)).isoformat()[:10],
                  (end_dt.replace(year=end_dt.year - y)).isoformat()[:10])
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
              .map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI')))

    baseline = ee.ImageCollection(baseline_imgs).flatten()
    baseline_mean = baseline.mean().reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=10
    ).get('NDVI').getInfo()

    anomaly_pct = ((current_mean - baseline_mean) / baseline_mean) * 100

    return {
        'mean_ndvi': current_mean,
        'baseline_ndvi': baseline_mean,
        'anomaly_pct': anomaly_pct,
        'n_scenes': int(current.size().getInfo())
    }


# --- CHIRPS rainfall anomaly ---------------------------------------------

def compute_chirps_anomaly(aoi: VillageAOI, start: str, end: str) -> dict:
    """Standardized Precipitation Index (SPI-3) using CHIRPS daily."""
    if ee is None:
        raise RuntimeError("earthengine-api not installed.")

    point = ee.Geometry.Point([aoi.lon, aoi.lat]).buffer(aoi.buffer_m)
    chirps = (ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
              .filterDate(start, end)
              .sum())
    rainfall_mm = chirps.reduceRegion(
        reducer=ee.Reducer.mean(), geometry=point, scale=5566
    ).get('precipitation').getInfo()

    # SPI-3 computation skipped in this stub — see scoring/spi3.py
    return {'rainfall_mm': rainfall_mm}


# --- Score mapping --------------------------------------------------------

def ndvi_to_risk_score(anomaly_pct: float) -> int:
    """
    Map NDVI anomaly to 0–100 risk component.
        anomaly_pct ≥ 0    →  0–15 (no stress)
        −20 ≥ x > 0        → 16–40 (mild)
        −40 ≥ x > −20      → 41–65 (moderate)
        −60 ≥ x > −40      → 66–85 (severe)
        x < −60            → 86–100 (extreme)
    """
    if anomaly_pct >= 0:
        return max(0, min(15, int(15 + anomaly_pct * 0.5)))
    if anomaly_pct >= -20:
        return min(40, 16 + int(abs(anomaly_pct) * 1.2))
    if anomaly_pct >= -40:
        return min(65, 41 + int((abs(anomaly_pct) - 20) * 1.2))
    if anomaly_pct >= -60:
        return min(85, 66 + int((abs(anomaly_pct) - 40) * 0.95))
    return min(100, 86 + int((abs(anomaly_pct) - 60) * 0.35))


# --- Demo / CLI -----------------------------------------------------------

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='TANADI satellite pipeline')
    parser.add_argument('--village', default='Dan Issa')
    parser.add_argument('--lat', type=float, default=13.359)
    parser.add_argument('--lon', type=float, default=7.319)
    parser.add_argument('--start', default='2026-04-01')
    parser.add_argument('--end', default='2026-05-15')
    args = parser.parse_args()

    if ee is None:
        print('GEE not available in this environment. This is a reference skeleton.')
        print('To run for real: pip install earthengine-api && earthengine authenticate')
        print(f'\nWould process: {args.village} ({args.lat}°N, {args.lon}°E)')
        print(f'Window: {args.start} → {args.end}')
        raise SystemExit(0)

    ee.Initialize()
    aoi = VillageAOI(village_id='v01', name=args.village, lat=args.lat, lon=args.lon)
    result = compute_ndvi_anomaly(aoi, args.start, args.end)
    risk = ndvi_to_risk_score(result['anomaly_pct'])
    print(f"Village: {args.village}")
    print(f"NDVI mean: {result['mean_ndvi']:.3f}")
    print(f"Baseline:  {result['baseline_ndvi']:.3f}")
    print(f"Anomaly:   {result['anomaly_pct']:+.1f}%")
    print(f"Risk score: {risk}/100")
