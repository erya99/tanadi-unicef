// ============================================================
// TANADI · Main application logic
// ============================================================

let activeLayers = { satellite: true, market: true, ussd: true };
let selectedVillage = VILLAGES.find(v => v.name === 'Dan Issa');
let markers = {};
let timeMachineState = { playing: false, frame: 0, timer: null };

// ============================================================
// MAP INITIALIZATION
// ============================================================
const map = L.map('map', {
  center: [13.85, 7.20],
  zoom: 8,
  zoomControl: true,
  attributionControl: true
});

// Esri World Imagery — satellite view, free for non-commercial use
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 18,
  attribution: '© Esri, Maxar, Earthstar Geographics · TANADI demo · Synthetic risk data',
}).addTo(map);

// Place name labels on top of satellite imagery
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 18,
  opacity: 0.85,
  pane: 'overlayPane'
}).addTo(map);

// Maradi region rough boundary outline (approximate)
const maradiBoundary = [
  [14.95, 5.80], [14.95, 8.40], [13.10, 8.40], [13.10, 5.80], [14.95, 5.80]
];
L.polygon(maradiBoundary, {
  color: '#ffd966',
  weight: 1.5,
  fill: false,
  dashArray: '6,4',
  opacity: 0.7
}).addTo(map);

// Build village markers
function buildMarkers() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};

  VILLAGES.forEach(v => {
    // Compute display score based on which layers are active
    let displayScore = 0, weightSum = 0;
    if (activeLayers.satellite) { displayScore += v.sat * 0.35; weightSum += 0.35; }
    if (activeLayers.market)    { displayScore += v.mkt * 0.30; weightSum += 0.30; }
    if (activeLayers.ussd)      { displayScore += v.ussd * 0.35; weightSum += 0.35; }
    displayScore = weightSum > 0 ? displayScore / weightSum : 0;

    // Triple-signal boost
    if (activeLayers.satellite && activeLayers.market && activeLayers.ussd &&
        v.sat > 60 && v.mkt > 60 && v.ussd > 60) {
      displayScore = Math.min(100, displayScore + 8);
    }
    displayScore = Math.round(displayScore);

    const color = tnvsColor(displayScore);
    const isCritical = displayScore >= 76;
    const isSelected = selectedVillage && v.id === selectedVillage.id;

    // Size scales with population
    const baseSize = 18 + Math.min(14, Math.sqrt(v.pop) / 20);

    const markerHtml = `<div class="village-marker ${isCritical ? 'critical' : ''} ${isSelected ? 'selected' : ''}"
      style="background:${color}; width:${baseSize}px; height:${baseSize}px;"></div>`;

    const icon = L.divIcon({
      className: 'village-marker-wrap',
      html: markerHtml,
      iconSize: [baseSize, baseSize],
      iconAnchor: [baseSize/2, baseSize/2]
    });

    const marker = L.marker([v.lat, v.lon], { icon }).addTo(map);

    marker.bindPopup(`
      <b>${v.name}</b><br>
      Population: ${v.pop.toLocaleString()}<br>
      TNVS score: <b style="color:${color}">${displayScore}</b> · ${tnvsLabel(displayScore)}<br>
      Climate ${v.sat} · Market ${v.mkt} · Nutrition ${v.ussd}
    `);

    marker.on('click', () => selectVillage(v));
    markers[v.id] = marker;
  });
}

// ============================================================
// LAYER TOGGLES
// ============================================================
function toggleLayer(el) {
  const layer = el.dataset.layer;
  activeLayers[layer] = !activeLayers[layer];
  el.classList.toggle('active');
  buildMarkers();
  updateAggregate();
}

// ============================================================
// VILLAGE SELECTION
// ============================================================
function selectVillage(v) {
  selectedVillage = v;
  buildMarkers();

  document.getElementById('rsVillage').textContent = v.name;
  document.getElementById('rsCoords').textContent = `Maradi · ${v.lat.toFixed(2)}°N, ${v.lon.toFixed(2)}°E`;

  const score = v.tnvs;
  document.getElementById('tnvsNum').textContent = score;
  const ring = document.getElementById('tnvsRing');
  const circ = 238.76;
  ring.style.strokeDashoffset = circ - (circ * score / 100);
  ring.style.stroke = tnvsColor(score);

  const statusEl = document.getElementById('tnvsStatus');
  statusEl.textContent = tnvsLabel(score);
  statusEl.className = 'tnvs-status ' + tnvsStatusClass(score);

  // Update bars
  setBar('barSat', 'valSat', v.sat);
  setBar('barMkt', 'valMkt', v.mkt);
  setBar('barUssd', 'valUssd', v.ussd);

  drawTrend(v.trend);
}

function setBar(barId, valId, score) {
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  bar.style.width = score + '%';
  bar.style.background = tnvsColor(score);
  val.textContent = score;
}

function drawTrend(trend) {
  const w = 280, h = 50;
  const max = 100, min = 0;
  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${w},${h} L0,${h} Z`;
  document.getElementById('trendPath').setAttribute('d', line);
  document.getElementById('trendArea').setAttribute('d', area);
}

// ============================================================
// AGGREGATE RISK
// ============================================================
function updateAggregate() {
  const scores = VILLAGES.map(v => {
    let ds = 0, ws = 0;
    if (activeLayers.satellite) { ds += v.sat * 0.35; ws += 0.35; }
    if (activeLayers.market)    { ds += v.mkt * 0.30; ws += 0.30; }
    if (activeLayers.ussd)      { ds += v.ussd * 0.35; ws += 0.35; }
    return ws > 0 ? ds / ws : 0;
  });
  const inRed = scores.filter(s => s >= 51).length;
  const inCrit = scores.filter(s => s >= 76).length;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  document.getElementById('aggregateRisk').textContent = tnvsLabel(avg);
  document.getElementById('aggregateRisk').style.color = tnvsColor(avg);
  document.getElementById('aggregateSub').textContent =
    `${inCrit} critical · ${inRed - inCrit} high risk villages`;

  // Update top bar children count (rough estimate: 25% of pop are <5)
  const atRiskChildren = VILLAGES
    .filter((v, i) => scores[i] >= 51)
    .reduce((sum, v) => sum + Math.round(v.pop * 0.25), 0);
  document.getElementById('topChildren').textContent = atRiskChildren.toLocaleString();
}

// ============================================================
// ALERT FEED
// ============================================================
function renderAlerts() {
  const feed = document.getElementById('alertFeed');
  feed.innerHTML = '';
  ALERTS.forEach(a => {
    const el = document.createElement('div');
    el.className = 'alert';
    const timeText = a.min < 60 ? `${a.min}m ago` : `${Math.round(a.min/60)}h ago`;
    el.innerHTML = `
      <span class="alert-tag ${a.tag}">${a.tag === 'crit' ? 'TRIPLE' : a.tag.toUpperCase()}</span>
      <div class="alert-body">
        ${a.txt}
        <span class="alert-time">${a.village} · ${timeText}</span>
      </div>
    `;
    el.addEventListener('click', () => {
      const v = VILLAGES.find(x => x.name === a.village);
      if (v) {
        selectVillage(v);
        map.setView([v.lat, v.lon], 10, { animate: true });
      }
    });
    el.style.cursor = 'pointer';
    feed.appendChild(el);
  });
}

// Simulate live alert injection
function injectLiveAlert() {
  const samples = [
    { tag:'ussd', village:'Tibiri',   txt:'<b>USSD report:</b> caregiver in Tibiri logged yellow MUAC for 2yo girl.' },
    { tag:'mkt',  village:'Aguié',    txt:'<b>Price update:</b> crowdsourced report — sorghum 480 CFA/kg (+4% on week).' },
    { tag:'sat',  village:'Mayahi',   txt:'<b>Sentinel-2:</b> fresh tile processed. NDVI stable at −22% anomaly.' },
    { tag:'ussd', village:'Gabi',     txt:'<b>Family MUAC++:</b> new caregiver enrolled. Total active: 4,183.' }
  ];
  const s = samples[Math.floor(Math.random() * samples.length)];
  const feed = document.getElementById('alertFeed');
  const el = document.createElement('div');
  el.className = 'alert';
  el.innerHTML = `
    <span class="alert-tag ${s.tag}">${s.tag.toUpperCase()}</span>
    <div class="alert-body">
      ${s.txt}
      <span class="alert-time">${s.village} · just now</span>
    </div>
  `;
  feed.insertBefore(el, feed.firstChild);
  // Keep feed manageable
  while (feed.children.length > 20) feed.removeChild(feed.lastChild);
}

// ============================================================
// TIME MACHINE — 2022 Sahel crisis replay
// ============================================================
function playTimeMachine() {
  if (timeMachineState.playing) {
    stopTimeMachine();
    return;
  }
  timeMachineState.playing = true;
  timeMachineState.frame = 0;
  document.getElementById('tmPlay').textContent = '⏸ Pause';
  document.getElementById('tmPlay').classList.add('playing');
  advanceTimeMachine();
}

function stopTimeMachine() {
  timeMachineState.playing = false;
  clearTimeout(timeMachineState.timer);
  document.getElementById('tmPlay').textContent = '▶ Play 2022';
  document.getElementById('tmPlay').classList.remove('playing');
}

function resetTimeMachine() {
  stopTimeMachine();
  timeMachineState.frame = 0;
  document.getElementById('tmFill').style.width = '0%';
  document.getElementById('tmDate').textContent = 'JAN · 2022';
  // Restore current values
  VILLAGES.forEach((v, i) => { v.sat = originalValues[i].sat; v.mkt = originalValues[i].mkt; v.ussd = originalValues[i].ussd; v.tnvs = computeTNVS(v); });
  buildMarkers();
  updateAggregate();
  if (selectedVillage) selectVillage(selectedVillage);
}

function advanceTimeMachine() {
  if (!timeMachineState.playing) return;
  const frame = TM_FRAMES[timeMachineState.frame];
  document.getElementById('tmDate').textContent = frame.date;
  document.getElementById('tmFill').style.width = ((timeMachineState.frame + 1) / TM_FRAMES.length * 100) + '%';

  // Apply this frame's intensity to all villages, scaled by their inherent vulnerability
  const intensitySat = frame.sat / 50;
  const intensityMkt = frame.mkt / 50;
  const intensityUssd = frame.ussd / 50;

  VILLAGES.forEach((v, i) => {
    const orig = originalValues[i];
    v.sat  = Math.min(100, Math.round(orig.sat  * intensitySat * 0.7 + orig.sat  * 0.3));
    v.mkt  = Math.min(100, Math.round(orig.mkt  * intensityMkt * 0.7 + orig.mkt  * 0.3));
    v.ussd = Math.min(100, Math.round(orig.ussd * intensityUssd * 0.7 + orig.ussd * 0.3));
    v.tnvs = computeTNVS(v);
  });

  buildMarkers();
  updateAggregate();
  if (selectedVillage) {
    const updated = VILLAGES.find(v => v.id === selectedVillage.id);
    selectVillage(updated);
  }

  // Inject a frame-specific alert
  const alertEl = document.createElement('div');
  alertEl.className = 'alert';
  alertEl.innerHTML = `
    <span class="alert-tag ${frame.sat > 70 ? 'crit' : (frame.sat > 50 ? 'sat' : 'sat')}">${frame.date.split(' ')[0]}</span>
    <div class="alert-body">
      ${frame.msg}
      <span class="alert-time">Time machine · ${frame.date}</span>
    </div>
  `;
  const feed = document.getElementById('alertFeed');
  feed.insertBefore(alertEl, feed.firstChild);

  timeMachineState.frame++;
  if (timeMachineState.frame < TM_FRAMES.length) {
    timeMachineState.timer = setTimeout(advanceTimeMachine, 1400);
  } else {
    stopTimeMachine();
  }
}

// Save the original values so time machine can reset
const originalValues = VILLAGES.map(v => ({ sat: v.sat, mkt: v.mkt, ussd: v.ussd }));

// ============================================================
// USSD SIMULATOR
// ============================================================
let ussdState = 'root';
let ussdBuffer = '';

function renderUssd() {
  const screen = document.getElementById('phoneScreen');
  const flow = USSD_FLOWS[ussdState];
  if (!flow) { screen.innerHTML = '<div class="phone-line">Session ended.</div>'; return; }

  let html = '';
  flow.screen.forEach(line => {
    if (line.type === 'header') {
      html += `<div class="phone-line" style="color:#ffd966; margin-bottom:6px;"><b>${line.text}</b></div>`;
    } else {
      html += `<div class="phone-line">${line.text || '&nbsp;'}</div>`;
    }
  });
  if (ussdBuffer) {
    html += `<div class="phone-line input">${ussdBuffer}<span class="phone-cursor"></span></div>`;
  } else {
    html += `<div class="phone-line input"><span class="phone-cursor"></span></div>`;
  }
  screen.innerHTML = html;
}

function ussdKey(key) {
  if (ussdState === 'done') {
    ussdState = 'root';
    ussdBuffer = '';
    renderUssd();
    return;
  }
  if (key === '*' || key === '#') {
    ussdBuffer = '';
    ussdState = 'root';
    renderUssd();
    return;
  }
  if (key === 'back') {
    ussdBuffer = ussdBuffer.slice(0, -1);
    renderUssd();
    return;
  }
  ussdBuffer += key;
  renderUssd();
}

function ussdSend() {
  if (ussdState === 'done' || !ussdBuffer) return;
  const flow = USSD_FLOWS[ussdState];
  const next = flow.inputs[ussdBuffer] || flow.inputs['any'];
  if (next) {
    // Trigger alerts for high-signal reports
    const village = selectedVillage ? selectedVillage.name : 'Dan Issa';
    const feed = document.getElementById('alertFeed');

    if (ussdState === 'muac' && ussdBuffer === '3') {
      // Red MUAC report
      const el = document.createElement('div');
      el.className = 'alert';
      el.innerHTML = `
        <span class="alert-tag ussd">RED MUAC</span>
        <div class="alert-body">
          <b>Live USSD report:</b> caregiver in ${village} reported <b>red MUAC</b>. CSPS notified · ETA 2h.
          <span class="alert-time">${village} · just now</span>
        </div>
      `;
      feed.insertBefore(el, feed.firstChild);
    } else if (ussdState === 'food' && ussdBuffer === '3') {
      // "Bansamu" — no food
      const el = document.createElement('div');
      el.className = 'alert';
      el.innerHTML = `
        <span class="alert-tag ussd">NO FOOD</span>
        <div class="alert-body">
          <b>Household food access:</b> caregiver in ${village} reported <b>no food acquired</b> in last 10 days. WFP distribution list updated.
          <span class="alert-time">${village} · just now</span>
        </div>
      `;
      feed.insertBefore(el, feed.firstChild);
    } else if (ussdState === 'health') {
      const symptoms = { '1': 'Diarrhea (Gudawa)', '2': 'Fever (Zazzabi)', '3': 'Cough (Tari)' };
      if (symptoms[ussdBuffer]) {
        const el = document.createElement('div');
        el.className = 'alert';
        el.innerHTML = `
          <span class="alert-tag ussd">HEALTH</span>
          <div class="alert-body">
            <b>Symptom report:</b> ${symptoms[ussdBuffer]} reported in ${village}. Cross-referenced with epidemic surveillance.
            <span class="alert-time">${village} · just now</span>
          </div>
        `;
        feed.insertBefore(el, feed.firstChild);
      }
    }
    ussdState = next;
    ussdBuffer = '';
    renderUssd();
  }
}

function ussdEnd() {
  ussdState = 'done';
  ussdBuffer = '';
  renderUssd();
}

// USSD session timer
let ussdSeconds = 42;
setInterval(() => {
  ussdSeconds++;
  const m = String(Math.floor(ussdSeconds / 60)).padStart(2, '0');
  const s = String(ussdSeconds % 60).padStart(2, '0');
  document.getElementById('ussdSession').textContent = `${m}:${s}`;
}, 1000);

// ============================================================
// REGIONAL FORECAST STRIPS (IPC/CH 5-phase)
// ============================================================
function renderForecast(stripId, data, sourceLabel) {
  const strip = document.getElementById(stripId);
  if (!strip) return;
  const steps = strip.querySelectorAll('.fc-step');
  steps.forEach((s, i) => {
    const phase = i + 1;
    s.classList.remove('active-now', 'forecast', 'colored');
    if (phase === data.current_phase) {
      s.classList.add('active-now', 'colored');
    } else if (phase === data.next_90d_phase) {
      s.classList.add('forecast', 'colored');
    } else if (phase < data.current_phase) {
      s.classList.add('colored');
      s.style.opacity = '0.35';
    } else {
      s.style.opacity = '1';
    }
  });
}

function initForecasts() {
  // Climate
  renderForecast('climateForecast', REGIONAL_FORECAST.climate);
  const cc = document.getElementById('climateCurrent');
  cc.innerHTML = `Now: <b>${ipcLabel(REGIONAL_FORECAST.climate.current_phase)}</b> → 90d: <b>${ipcLabel(REGIONAL_FORECAST.climate.next_90d_phase)}</b>`;
  const cd = document.getElementById('climateDrivers');
  cd.innerHTML = REGIONAL_FORECAST.climate.drivers.map(d => `<div class="fc-driver">${d}</div>`).join('');

  // Market
  renderForecast('marketForecast', REGIONAL_FORECAST.market);
  const mc = document.getElementById('marketCurrent');
  mc.innerHTML = `Now: <b>${ipcLabel(REGIONAL_FORECAST.market.current_phase)}</b> → 90d: <b>${ipcLabel(REGIONAL_FORECAST.market.next_90d_phase)}</b>`;
  const md = document.getElementById('marketDrivers');
  md.innerHTML = REGIONAL_FORECAST.market.drivers.map(d => `<div class="fc-driver">${d}</div>`).join('');
}

// ============================================================
// INIT
// ============================================================
buildMarkers();
selectVillage(selectedVillage);
renderAlerts();
updateAggregate();
renderUssd();
initForecasts();

// Periodic live activity simulation
setInterval(injectLiveAlert, 12000);
