# Deployment guide

This guide walks through three deployment paths, from "show the demo
to a UNICEF reviewer in 3 minutes" to "production pilot in Maradi".

## Path 1 — Live demo on GitHub Pages (3 minutes)

This is the **fastest way** to share a working URL with reviewers,
partners, and your UNICEF Country Office contact.

```bash
# 1. Create a new public repo named "tanadi" on github.com/YOUR_ORG
# 2. Push this code:
git init
git add .
git commit -m "Initial TANADI demo"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/tanadi.git
git push -u origin main

# 3. In GitHub:
#    Repo → Settings → Pages
#    Source: Deploy from a branch
#    Branch: main / (root)
#    Save

# 4. Wait ~30 seconds, then visit:
#    https://YOUR_ORG.github.io/tanadi/
```

That's it. The demo is now publicly reachable, no server, no cost.

## Path 2 — Local development

```bash
git clone https://github.com/YOUR_ORG/tanadi.git
cd tanadi
python3 -m http.server 8000
# open http://localhost:8000
```

To work on the USSD backend:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn ussd.ussd_handler:app --reload --port 9000
# POST test:
curl -X POST http://localhost:9000/ussd \
  -d "sessionId=abc123&serviceCode=*384#&phoneNumber=+22790000000&text="
```

To work on the satellite pipeline:

```bash
earthengine authenticate                # one-time, opens browser
python3 satellite/ndvi_anomaly.py --village "Dan Issa" --lat 13.359 --lon 7.319
```

## Path 3 — Production pilot (Maradi, 50 villages)

This requires:

1. **Africa's Talking production account** with `*384#` shortcode
   provisioned by Orange Niger and Airtel Niger. UNICEF Niger CO
   facilitation needed for shortcode application.

2. **VM or managed container** for the FastAPI USSD handler.
   Recommended: a 2-core / 4 GB VM in a region with low latency to
   Niger (e.g. Frankfurt). Cost: ~$20/month.

3. **PostgreSQL + PostGIS** for village geometries, USSD reports,
   computed TNVS history. Managed (e.g. Supabase, Neon) is fine.

4. **Google Earth Engine service account** for automated satellite
   ingestion. Free for research / humanitarian use.

5. **DHIS2 integration credentials** from Niger Ministry of Health.

6. **MoU with UNICEF Niger CO** specifying data-protection terms
   per the UNICEF Responsible Data for Children policy.

Rough monthly cost at pilot scale (10K active USSD users):

| Item | Cost |
|---|---|
| Africa's Talking USSD (free 1st 100K sessions/mo) | $0 |
| VM + DB | $40 |
| Domain + TLS | $1 |
| Satellite compute (GEE) | $0 |
| **Total** | **~$41 / mo** |

At scale (100K users), Africa's Talking moves to a paid tier
(~$0.005/session). Monthly USSD costs scale to ~$500 at full
deployment — still trivial compared to one missed crisis alert.
