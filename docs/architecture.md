# TANADI architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       DATA SOURCES                              │
├─────────────────────┬─────────────────────┬─────────────────────┤
│  SATELLITE          │  MARKET             │  COMMUNITY USSD     │
│  Sentinel-2 (10m)   │  WFP VAM API        │  Family MUAC++      │
│  CHIRPS (5km)       │  FAO FPMA           │  Africa's Talking   │
│  MODIS LST (1km)    │  Crowdsourced       │  Orange/Airtel      │
│  → Google Earth Eng │  USSD reports       │  IVR fallback       │
└─────────┬───────────┴──────────┬──────────┴──────────┬──────────┘
          │                      │                     │
          ▼                      ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER (Python)                     │
│   satellite/ndvi_anomaly.py    ussd/ussd_handler.py             │
│   satellite/chirps_spi.py      market/wfp_vam_client.py         │
│                                                                 │
│             →  PostgreSQL + PostGIS (village table)             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SCORING ENGINE (Python)                       │
│   scoring/tnvs.py        Triple Nexus Vulnerability Score       │
│   scoring/lstm_forecast  Crop-failure forecast (PyTorch, 90d)   │
│   scoring/anomaly.py     Isolation Forest on USSD time series   │
│                                                                 │
│             →  Per-village TNVS computed nightly                │
│             →  Triple-signal convergence alerts in real time    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT LAYER                               │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │ Web dashboard       │    │ SMS / USSD feedback          │    │
│  │ (React + Leaflet)   │    │ to families & CHWs           │    │
│  │ UNICEF, MoH users   │    │ in Hausa, French, Zarma      │    │
│  └─────────────────────┘    └──────────────────────────────┘    │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │ DHIS2 connector     │    │ Open data API                │    │
│  │ Niger MoH           │    │ for partners & researchers   │    │
│  └─────────────────────┘    └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Why this shape

**One ingestion layer per stream, one scoring engine.** Each ingestion module
is independent — a satellite outage doesn't take down market data. The
scoring engine is the only place all three streams meet.

**TNVS is computed nightly for all villages**, but **convergence alerts**
fire in real time the moment a new USSD report or price update pushes a
village across the threshold.

**Open APIs everywhere**: the demo data file (`data.js`) is replaced in
production by a public REST API so other UNICEF country offices can
build their own dashboards on top.
