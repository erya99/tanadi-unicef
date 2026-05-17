# TANADI

**Triple Nexus Anticipatory Network for Anomaly Detection in children's nutrition**

An open-source platform that fuses satellite, market, and community USSD data to detect child nutrition crises 60+ days in advance. Pilot focus: Maradi region, Niger.

> *Tanadi* means *foresight* in Hausa.

---

## Why TANADI

About **2.8 million children** across the Sahel face acute food insecurity each year. Niger alone has one of the world's highest rates of child malnutrition.

Current early-warning systems detect food crises **6–8 weeks too late** because they monitor signals separately:

- Satellite agencies track crop failure
- WFP tracks market prices
- Health agencies run SMART nutrition surveys every 3–6 months

By the time a coordinated alert is issued, children are already acutely malnourished.

**TANADI fuses the three streams in real time at the village level.** Each signal alone has uncertainty; together they predict.

---

## What's in this repository

| Path | Purpose |
|---|---|
| `index.html`, `app.js`, `data.js` | **Web dashboard demo** — runs in any browser, no install |
| `satellite/` | Google Earth Engine notebooks for Sentinel-2 NDVI, CHIRPS rainfall, MODIS LST analytics over Niger |
| `ussd/` | Africa's Talking USSD callback handler (FastAPI) for Family MUAC++ flow |
| `scoring/` | TNVS (Triple Nexus Vulnerability Score) computation, retrospective validation against 2022 Sahel crisis |
| `docs/` | Architecture, data sources, partnerships |

---

## Quick start — run the demo locally

The dashboard is a single HTML file with no build step.

```bash
git clone https://github.com/YOUR_ORG/tanadi.git
cd tanadi
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

You should see:

1. A map of Niger's Maradi region with 32 villages plotted
2. Three signal layers you can toggle on/off (Satellite · Market · USSD)
3. A right panel with TNVS score breakdown, live alert feed, and a working USSD simulator
4. A **Time Machine** in the left panel — click "Play 2022" to replay the Sahel food crisis and see how TANADI would have flagged Maradi 11 weeks before the official WFP alert

---

## Deployment options

### Option A — GitHub Pages (fastest)

```bash
git push origin main
# Then in repo Settings → Pages → enable from main branch
# Demo will be live at https://YOUR_ORG.github.io/tanadi/
```

### Option B — Netlify / Vercel

Both auto-deploy on push. Zero config needed for the demo (no backend yet).

### Option C — Full stack (production target)

Production architecture replaces the static `data.js` with:

- **Backend**: Python (FastAPI) + PostgreSQL/PostGIS
- **Data ingestion**: Google Earth Engine for satellite, WFP VAM API for prices, Africa's Talking webhooks for USSD
- **ML**: PyTorch LSTM for crop forecasting, scikit-learn Isolation Forest for anomaly detection
- **Integration**: DHIS2 connector for health ministry data exchange
- **Frontend**: React + Leaflet (current static HTML is a faithful prototype of the production UI)

See `docs/architecture.md` for the full system diagram.

---

## Data sources

All data sources are open or free for humanitarian use.

| Stream | Source | Resolution | Frequency |
|---|---|---|---|
| Vegetation (NDVI) | Sentinel-2 via Google Earth Engine | 10 m | 5 days |
| Rainfall | CHIRPS | 5 km | Daily |
| Land surface temperature | MODIS | 1 km | Daily |
| Market prices | WFP VAM, FAO FPMA | Per-market | Monthly |
| Crowdsourced prices | Africa's Talking USSD | Per-village | Weekly |
| Child nutrition | Family MUAC++ USSD/IVR | Per-household | Weekly |
| Health facility registry | DHIS2 Niger | National | Daily |

---

## License

MIT License — see `LICENSE`. We commit to open-source the entire stack, including ML models, so other UNICEF country offices can adapt TANADI to their context.

---

## Built by

A women-led team of computer engineers with prior disaster-response field experience.

For partnership, pilot collaboration, or technical questions: see `docs/contact.md`.

---

## Acknowledgments

This work is being prepared for submission to the **UNICEF Venture Fund Climate Ventures cohort 2026**. We thank UNICEF Niger Country Office, FEWS NET, and the OpenEO community for prior art and open data that made this project possible.
