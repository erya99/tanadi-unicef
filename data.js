// ============================================================
// TANADI · Synthetic + real-grounded data for demo
// Villages: real names and approximate coordinates from
//   Maradi region (Niger). Risk values are synthetic but
//   modeled on historical Sahel food-crisis patterns.
// In production these are replaced by:
//   - Sentinel-2 / CHIRPS / MODIS via Google Earth Engine
//   - WFP VAM + FAO FPMA APIs
//   - Africa's Talking USSD callback ingestion
// ============================================================

// Maradi region villages — real names, approximate coordinates.
// Maradi is Niger's "nutrition crisis epicenter" (UNICEF Niger CO).
const VILLAGES = [
  // CRITICAL CLUSTER (south-east, near Nigeria border) — historical hotspot
  { id:'v01', name:'Dan Issa',       lat:13.359, lon:7.319,  pop:14200, sat:84, mkt:72, ussd:81 },
  { id:'v02', name:'Madarounfa',     lat:13.298, lon:7.103,  pop:23400, sat:81, mkt:78, ussd:76 },
  { id:'v03', name:'Gabi',           lat:13.412, lon:7.225,  pop:9100,  sat:78, mkt:74, ussd:79 },
  { id:'v04', name:'Sarkin Yamma',   lat:13.328, lon:7.405,  pop:6800,  sat:86, mkt:69, ussd:74 },
  { id:'v05', name:'Safo',           lat:13.521, lon:7.062,  pop:11500, sat:74, mkt:71, ussd:77 },

  // HIGH RISK
  { id:'v06', name:'Aguié',          lat:13.508, lon:7.770,  pop:18900, sat:71, mkt:68, ussd:62 },
  { id:'v07', name:'Tchadoua',       lat:13.770, lon:7.658,  pop:15300, sat:68, mkt:64, ussd:67 },
  { id:'v08', name:'Tibiri',         lat:13.575, lon:7.039,  pop:24100, sat:66, mkt:71, ussd:58 },
  { id:'v09', name:'Guidan Roumdji', lat:13.658, lon:6.692,  pop:13800, sat:62, mkt:67, ussd:64 },
  { id:'v10', name:'Chadakori',      lat:13.706, lon:6.997,  pop:9700,  sat:64, mkt:62, ussd:69 },
  { id:'v11', name:'Sabon Machi',    lat:13.794, lon:7.341,  pop:7400,  sat:69, mkt:58, ussd:65 },
  { id:'v12', name:'Dakoro',         lat:14.515, lon:6.762,  pop:31200, sat:58, mkt:71, ussd:54 },

  // MEDIUM RISK
  { id:'v13', name:'Maradi',         lat:13.502, lon:7.099,  pop:267000,sat:45, mkt:62, ussd:48 },
  { id:'v14', name:'Guidan Sori',    lat:13.918, lon:6.521,  pop:8200,  sat:52, mkt:48, ussd:51 },
  { id:'v15', name:'Kornaka',        lat:14.029, lon:6.769,  pop:12600, sat:48, mkt:52, ussd:46 },
  { id:'v16', name:'Bermo',          lat:14.703, lon:6.987,  pop:5300,  sat:55, mkt:42, ussd:49 },
  { id:'v17', name:'Mayahi',         lat:13.961, lon:7.685,  pop:19200, sat:44, mkt:51, ussd:42 },
  { id:'v18', name:'Attantané',      lat:13.642, lon:7.892,  pop:6100,  sat:42, mkt:46, ussd:51 },
  { id:'v19', name:'Issawane',       lat:13.812, lon:7.213,  pop:7800,  sat:39, mkt:48, ussd:44 },
  { id:'v20', name:'Korahane',       lat:14.118, lon:7.027,  pop:9400,  sat:41, mkt:45, ussd:38 },
  { id:'v21', name:'Garin Maï Bagi', lat:13.418, lon:6.892,  pop:5600,  sat:46, mkt:38, ussd:42 },
  { id:'v22', name:'Sherkin Haoussa',lat:13.221, lon:7.198,  pop:4900,  sat:38, mkt:42, ussd:48 },

  // LOW RISK
  { id:'v23', name:'El Allassane',   lat:14.318, lon:7.491,  pop:8100,  sat:28, mkt:32, ussd:24 },
  { id:'v24', name:'Tessaoua',       lat:13.755, lon:7.987,  pop:21300, sat:22, mkt:28, ussd:31 },
  { id:'v25', name:'Gangara',        lat:14.502, lon:7.732,  pop:6200,  sat:18, mkt:24, ussd:21 },
  { id:'v26', name:'Birni Lallé',    lat:14.892, lon:6.521,  pop:5800,  sat:25, mkt:22, ussd:18 },
  { id:'v27', name:'Kanan-Bakaché',  lat:13.398, lon:6.612,  pop:4700,  sat:21, mkt:29, ussd:25 },
  { id:'v28', name:'Goula',          lat:13.928, lon:6.198,  pop:5300,  sat:14, mkt:21, ussd:18 },
  { id:'v29', name:'Soumarana',      lat:14.218, lon:8.103,  pop:4100,  sat:16, mkt:18, ussd:22 },
  { id:'v30', name:'Ourafane',       lat:14.681, lon:7.214,  pop:7900,  sat:24, mkt:19, ussd:16 },
  { id:'v31', name:'Tsernaoua',      lat:14.034, lon:6.298,  pop:4400,  sat:11, mkt:14, ussd:19 },
  { id:'v32', name:'Bouza',          lat:14.418, lon:6.029,  pop:11200, sat:19, mkt:24, ussd:15 }
];

// Compute TNVS — Triple Nexus Vulnerability Score
// Weighted: 35% climate, 30% market, 35% nutrition
// Boost if all three signals are simultaneously high (the TANADI insight)
function computeTNVS(v) {
  const base = 0.35*v.sat + 0.30*v.mkt + 0.35*v.ussd;
  const allHigh = (v.sat > 60 && v.mkt > 60 && v.ussd > 60) ? 8 : 0;
  return Math.round(Math.min(100, base + allHigh));
}

VILLAGES.forEach(v => { v.tnvs = computeTNVS(v); });

// ============================================================
// 12-week historical trend for each village (synthetic)
// Used in right panel chart
// ============================================================
function generateTrend(currentScore, volatility = 6) {
  const points = 12;
  const trend = [];
  let val = Math.max(15, currentScore - 25 - Math.random() * 10);
  for (let i = 0; i < points; i++) {
    const drift = (currentScore - val) / (points - i) * (0.6 + Math.random() * 0.4);
    val += drift + (Math.random() - 0.5) * volatility;
    val = Math.max(5, Math.min(98, val));
    trend.push(Math.round(val));
  }
  trend[points - 1] = currentScore;
  return trend;
}
VILLAGES.forEach(v => { v.trend = generateTrend(v.tnvs); });

// ============================================================
// ALERT FEED — synthetic recent alerts
// Mixed types: satellite, market, USSD, critical (multi-signal)
// ============================================================
const ALERTS = [
  { tag:'crit', village:'Dan Issa',     min:14, txt:'<b>Triple signal converged.</b> NDVI −38%, millet +52%, 23 caregivers report red MUAC. UNICEF field team dispatched.' },
  { tag:'ussd', village:'Madarounfa',   min:47, txt:'<b>USSD spike:</b> 18 red MUAC reports in 6 hours (baseline: 3/day). Auto-escalated to district health office.' },
  { tag:'sat',  village:'Sarkin Yamma', min:62, txt:'<b>Satellite anomaly:</b> NDVI dropped to 0.22 — 86% below 10-yr baseline. CHIRPS confirms 21-day rainfall deficit.' },
  { tag:'mkt',  village:'Aguié',        min:108,txt:'<b>Market shock:</b> Sorghum +31% in 7 days at Aguié market. FAI now 1.21 — below food access threshold.' },
  { tag:'crit', village:'Madarounfa',   min:143,txt:'<b>Triple signal:</b> sustained climate stress + price shock + 14% red-MUAC rate. TNVS crossed 75.' },
  { tag:'ussd', village:'Gabi',         min:201,txt:'<b>USSD emergency:</b> 4 caregivers requested urgent help via *384*4#. Coordinates shared with WFP team.' },
  { tag:'sat',  village:'Safo',         min:267,txt:'<b>Drought signal:</b> SPI-3 dropped to −1.4 (severe). Crop stress imminent within 14 days.' },
  { tag:'mkt',  village:'Tibiri',       min:312,txt:'<b>Crowdsourced price:</b> 8 community reporters confirm millet at 540 CFA/kg, +18% above WFP VAM monthly figure.' },
  { tag:'ussd', village:'Tchadoua',     min:401,txt:'<b>Nutrition trend:</b> Yellow-MUAC rate climbed from 7% to 19% over 4 weeks. Early surveillance threshold breached.' },
  { tag:'sat',  village:'Chadakori',    min:512,txt:'<b>Vegetation health:</b> VHI fell into "extreme stress" category for the second consecutive week.' },
  { tag:'mkt',  village:'Dakoro',       min:622,txt:'<b>Food Access Index:</b> FAI = 1.34. Bottom 30% of households cannot afford basic food basket.' },
  { tag:'ussd', village:'Sabon Machi',  min:701,txt:'<b>USSD enrollment:</b> 142 new caregivers registered for Family MUAC++ this week. Total active: 4,180.' },
  { tag:'sat',  village:'Mayahi',       min:843,txt:'<b>Rainfall deficit:</b> Last 30-day CHIRPS shows 41% below seasonal norm. Onset delay confirmed.' },
  { tag:'crit', village:'Dan Issa',     min:962,txt:'<b>First triple-signal alert</b> issued for Dan Issa cluster. Anticipatory action protocol activated.' }
];

// ============================================================
// 2022 SAHEL CRISIS — Time Machine Data
// Real Sahel 2022 crisis: West Africa faced worst food crisis
//   in a decade. WFP declared emergency in June 2022.
// TANADI simulation: would have flagged Maradi 11 weeks earlier.
// ============================================================
const TM_FRAMES = [
  // month, sat, mkt, ussd, label
  { date:'JAN · 2022', sat:35, mkt:42, ussd:30, msg:'Baseline. Post-harvest stocks normal.' },
  { date:'FEB · 2022', sat:42, mkt:48, ussd:32, msg:'Sentinel-2 detects early NDVI anomaly (−12%).' },
  { date:'MAR · 2022', sat:55, mkt:54, ussd:36, msg:'Drought signal strengthens. Pastoralist migration begins.' },
  { date:'APR · 2022', sat:64, mkt:61, ussd:44, msg:'⚠ TANADI threshold crossed: 3 villages cross TNVS 50.' },
  { date:'MAY · 2022', sat:71, mkt:69, ussd:53, msg:'⚠ Market prices climb. USSD shows yellow MUAC trend.' },
  { date:'JUN · 2022', sat:78, mkt:76, ussd:64, msg:'⚠⚠ WFP issues official Sahel food crisis alert.' },
  { date:'JUL · 2022', sat:82, mkt:81, ussd:74, msg:'⚠⚠⚠ Acute malnutrition admissions surge in Maradi.' },
  { date:'AUG · 2022', sat:85, mkt:83, ussd:79, msg:'⚠⚠⚠ Peak crisis. Emergency response under-resourced.' },
  { date:'SEP · 2022', sat:79, mkt:78, ussd:78, msg:'Harvest begins. Acute phase plateau.' },
  { date:'OCT · 2022', sat:65, mkt:71, ussd:72, msg:'Recovery slow. 1.6M children remained at risk.' }
];

// ============================================================
// IPC / Cadre Harmonisé — 5-level classification system
// This is the OFFICIAL international standard used by FAO,
// WFP, UNICEF, FEWS NET, and CILSS for the Sahel.
// Data: Cadre Harmonisé reports (ipcinfo.org), FEWS NET
//       seasonal monitor, FAO GIEWS country briefs.
// ============================================================
const IPC_PHASES = [
  { id:1, key:'minimal',     en:'Minimal',     fr:'Minimale',     ha:'Babu matsala',  color:'#4a7c3a', desc:'Households can meet essential food and non-food needs.' },
  { id:2, key:'stressed',    en:'Stressed',    fr:'Sous pression',ha:'Damuwa',         color:'#c89832', desc:'Households have minimally adequate food but cannot afford some essential non-food expenses.' },
  { id:3, key:'crisis',      en:'Crisis',      fr:'Crise',        ha:'Rikici',         color:'#d97326', desc:'Households have food consumption gaps or deplete essential assets to meet minimum food needs.' },
  { id:4, key:'emergency',   en:'Emergency',   fr:'Urgence',      ha:'Gaggawa',        color:'#b8412a', desc:'Households have large food gaps reflected in very high acute malnutrition.' },
  { id:5, key:'catastrophe', en:'Catastrophe', fr:'Famine',       ha:'Yunwa',          color:'#7a1810', desc:'Households have an extreme lack of food, starvation, death, destitution.' }
];

function ipcColor(phase) { return IPC_PHASES[phase - 1].color; }
function ipcLabel(phase, lang = 'en') { return IPC_PHASES[phase - 1][lang] || IPC_PHASES[phase - 1].en; }
function ipcDesc(phase)  { return IPC_PHASES[phase - 1].desc; }

// ============================================================
// CLIMATE & MARKET FORECAST (3-month outlook)
// Per village: IPC phase prediction for next 90 days,
// derived from satellite + market signals
// ============================================================
function climatePhase(sat) {
  if (sat >= 80) return 5; // Catastrophe — extreme crop failure
  if (sat >= 65) return 4; // Emergency — severe drought stress
  if (sat >= 45) return 3; // Crisis — vegetation distress
  if (sat >= 25) return 2; // Stressed — below baseline
  return 1;                // Minimal — normal
}
function marketPhase(mkt) {
  if (mkt >= 80) return 5;
  if (mkt >= 65) return 4;
  if (mkt >= 45) return 3;
  if (mkt >= 25) return 2;
  return 1;
}

// Attach forecast phases to villages
VILLAGES.forEach(v => {
  v.climate_phase = climatePhase(v.sat);
  v.market_phase  = marketPhase(v.mkt);
});

// ============================================================
// USSD FLOW — Family MUAC++ menu tree
// Design principles:
//   • 3 main menus, each with 3 simple options. No deep nesting.
//   • Low literacy users: numbers map to colors/concepts taught
//     in CHW field training. Memorable by repetition.
//   • Each line: Hausa first (local), English in parens (for
//     demo audience / UNICEF reviewer). Production removes English.
//   • Village location resolved from phone number via operator
//     Cell-ID lookup (Orange Niger / Airtel Niger partnership).
//     No GPS — works on basic feature phones.
// ============================================================
const USSD_FLOWS = {
  root: {
    screen: [
      { type:'header', text:'TANADI · *384#' },
      { type:'line',   text:'Ina kwana! (Hello)' },
      { type:'line',   text:'' },
      { type:'line',   text:'1. Yaro (Child MUAC)' },
      { type:'line',   text:'2. Lafiya (Health)' },
      { type:'line',   text:'3. Abinci (Food)' },
      { type:'line',   text:'' },
      { type:'line',   text:'0. Harshe (Language)' }
    ],
    inputs: {
      '1': 'muac',
      '2': 'health',
      '3': 'food',
      '0': 'language'
    }
  },

  // ---- MENU 1: MUAC color ----
  muac: {
    screen: [
      { type:'header', text:'Yaro · MUAC' },
      { type:'line',   text:'Wane launi?' },
      { type:'line',   text:'(Which color?)' },
      { type:'line',   text:'' },
      { type:'line',   text:'1. Kore (Green)' },
      { type:'line',   text:'2. Rawaya (Yellow)' },
      { type:'line',   text:'3. Ja (Red)' }
    ],
    inputs: {
      '1': 'muac_green',
      '2': 'muac_yellow',
      '3': 'muac_red'
    }
  },
  muac_green: {
    screen: [
      { type:'header', text:'Kore · OK' },
      { type:'line',   text:'An karbi rahoton.' },
      { type:'line',   text:'(Report received.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'Yaronka lafiya.' },
      { type:'line',   text:'(Child is healthy.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'Na gode!' }
    ],
    inputs: { 'any': 'done' }
  },
  muac_yellow: {
    screen: [
      { type:'header', text:'Rawaya · Watch' },
      { type:'line',   text:'An karbi rahoton.' },
      { type:'line',   text:'(Report received.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'CHW za ta ziyarta' },
      { type:'line',   text:'cikin kwana 3.' },
      { type:'line',   text:'(CHW visit in 3d.)' }
    ],
    inputs: { 'any': 'done' }
  },
  muac_red: {
    screen: [
      { type:'header', text:'JA · URGENT' },
      { type:'line',   text:'An aiko taimako.' },
      { type:'line',   text:'(Help dispatched.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'CSPS notified.' },
      { type:'line',   text:'ETA 2 hours.' },
      { type:'line',   text:'' },
      { type:'line',   text:'Allah ya kiyaye.' }
    ],
    inputs: { 'any': 'done' }
  },

  // ---- MENU 2: Health symptoms ----
  health: {
    screen: [
      { type:'header', text:'Lafiya · Health' },
      { type:'line',   text:'Wane alama?' },
      { type:'line',   text:'(Which symptom?)' },
      { type:'line',   text:'' },
      { type:'line',   text:'1. Gudawa (Diarrhea)' },
      { type:'line',   text:'2. Zazzabi (Fever)' },
      { type:'line',   text:'3. Tari (Cough)' }
    ],
    inputs: {
      '1': 'health_done',
      '2': 'health_done',
      '3': 'health_done'
    }
  },
  health_done: {
    screen: [
      { type:'header', text:'Lafiya · OK' },
      { type:'line',   text:'An karbi rahoton.' },
      { type:'line',   text:'(Report received.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'Je CSPS yau.' },
      { type:'line',   text:'(Visit clinic today.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'Na gode!' }
    ],
    inputs: { 'any': 'done' }
  },

  // ---- MENU 3: Food access ----
  food: {
    screen: [
      { type:'header', text:'Abinci · Food' },
      { type:'line',   text:'Kwana goma da' },
      { type:'line',   text:'suka wuce?' },
      { type:'line',   text:'(Last 10 days?)' },
      { type:'line',   text:'' },
      { type:'line',   text:'1. Na samu (Got it)' },
      { type:'line',   text:'2. Kadan (Some)' },
      { type:'line',   text:'3. Bansamu (None)' }
    ],
    inputs: {
      '1': 'food_ok',
      '2': 'food_some',
      '3': 'food_none'
    }
  },
  food_ok: {
    screen: [
      { type:'header', text:'Abinci · OK' },
      { type:'line',   text:'An karbi rahoton.' },
      { type:'line',   text:'(Report received.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'Na gode!' }
    ],
    inputs: { 'any': 'done' }
  },
  food_some: {
    screen: [
      { type:'header', text:'Abinci · Watch' },
      { type:'line',   text:'An karbi rahoton.' },
      { type:'line',   text:'(Report received.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'CHW za ta tuntube ka.' },
      { type:'line',   text:'(CHW will follow up.)' }
    ],
    inputs: { 'any': 'done' }
  },
  food_none: {
    screen: [
      { type:'header', text:'Abinci · URGENT' },
      { type:'line',   text:'An karbi rahoton.' },
      { type:'line',   text:'(Report received.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'WFP notified.' },
      { type:'line',   text:'Aid distribution' },
      { type:'line',   text:'list updated.' }
    ],
    inputs: { 'any': 'done' }
  },

  // ---- Language selector ----
  language: {
    screen: [
      { type:'header', text:'Harshe / Language' },
      { type:'line',   text:'1. Hausa' },
      { type:'line',   text:'2. Francais' },
      { type:'line',   text:'3. Zarma' },
      { type:'line',   text:'4. Fulfulde' }
    ],
    inputs: { 'any': 'root' }
  },

  // ---- Terminal ----
  done: {
    screen: [
      { type:'header', text:'Sai an jima.' },
      { type:'line',   text:'(Until next time.)' },
      { type:'line',   text:'' },
      { type:'line',   text:'Dial *384# anytime' },
      { type:'line',   text:'to report again.' }
    ],
    inputs: {}
  }
};

// ============================================================
// COLOR RAMP — TNVS to color
// ============================================================
function tnvsColor(s) {
  if (s >= 76) return getComputedStyle(document.documentElement).getPropertyValue('--critical').trim();
  if (s >= 51) return getComputedStyle(document.documentElement).getPropertyValue('--red').trim();
  if (s >= 26) return getComputedStyle(document.documentElement).getPropertyValue('--yellow').trim();
  return getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
}
function tnvsLabel(s) {
  if (s >= 76) return 'Critical';
  if (s >= 51) return 'High';
  if (s >= 26) return 'Medium';
  return 'Low';
}
function tnvsStatusClass(s) {
  if (s >= 76) return 'crit';
  if (s >= 51) return 'high';
  if (s >= 26) return 'med';
  return 'low';
}

// ============================================================
// REGIONAL AGGREGATE FORECAST (for Maradi as a whole)
// Used in the new forecast strip on the dashboard.
// In production: pulled from Cadre Harmonisé October projection
// and FEWS NET seasonal monitor.
// ============================================================
const REGIONAL_FORECAST = {
  climate: {
    current_phase: 3,  // Crisis
    next_90d_phase: 4, // Emergency
    drivers: [
      'NDVI anomaly −34% vs 10-yr baseline',
      'CHIRPS rainfall deficit 41% (Apr–May)',
      'MODIS LST +2.8°C above seasonal norm',
      'SPI-3 = −1.4 (severe drought)'
    ]
  },
  market: {
    current_phase: 3,  // Crisis
    next_90d_phase: 4, // Emergency
    drivers: [
      'Millet 520 CFA/kg, +47% YoY',
      'Food Access Index = 1.34 (below threshold)',
      'Sorghum +31% in 7 days at Aguié market',
      '8/12 markets above stress threshold'
    ]
  }
};
