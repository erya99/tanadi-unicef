# Data sources

All sources are open access or free for humanitarian use.

## Satellite & climate

| Source | What we use | Access | Notes |
|---|---|---|---|
| **Sentinel-2 SR Harmonized** | 10 m optical bands → NDVI | Google Earth Engine `COPERNICUS/S2_SR_HARMONIZED` | 5-day revisit, cloud-mask via SCL |
| **CHIRPS** | Daily rainfall, 5 km grid | `UCSB-CHG/CHIRPS/DAILY` | 1981–present; used for SPI-3 |
| **MODIS Terra LST** | Land surface temperature | `MODIS/061/MOD11A1` | 1 km daily; heatwave detection |
| **ERA5-Land** | Hourly reanalysis | `ECMWF/ERA5_LAND/HOURLY` | For temperature anomalies |
| **GHSL** | Settlement layer | `JRC/GHSL/P2023A/GHS_BUILT_S` | Cross-reference with village locations |

## Market

| Source | What we use | Access | Notes |
|---|---|---|---|
| **WFP VAM** | Monthly market prices for staples | `dataviz.vam.wfp.org` API | 40+ markets in Niger |
| **FAO FPMA** | Cross-country price database | FPMA Tool | Sorghum, millet, cowpea |
| **Crowdsourced** | Weekly per-village prices | Africa's Talking USSD | Our own pipeline |

## Nutrition & health

| Source | What we use | Access | Notes |
|---|---|---|---|
| **DHIS2 Niger** | Health facility registry, SMART surveys | Ministry of Health partnership | Pilot requires MoU |
| **Family MUAC++ USSD** | Per-household color reports | Africa's Talking webhook | Our own pipeline |
| **UNICEF SMART surveys** | Validation ground truth | UNICEF Niger CO | Quarterly |

## Reference / validation

| Source | What we use | Access | Notes |
|---|---|---|---|
| **FEWS NET** | IPC phase classifications | fews.net | Validation ground truth |
| **ACLED** | Conflict events | acleddata.com | Context for displaced households |
| **IPC** | Acute food insecurity phases | ipcinfo.org | Gold standard for outcome eval |
