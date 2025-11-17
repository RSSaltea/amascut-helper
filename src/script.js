A1lib.identifyApp("appconfig.json");


function log(msg) {
  try {
    console.log(msg);
    const out = document.getElementById("output");
    if (!out) return;
    const d = document.createElement("div");
    d.textContent = msg;
    out.prepend(d);
    while (out.childElementCount > 60) out.removeChild(out.lastChild);
  } catch {}
}

if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML = `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}


const seenLineTimes = new Map();

function shouldIgnoreLine(lineId, windowMs = 5000) {
  const now = Date.now();
  const last = seenLineTimes.get(lineId) ?? 0;


  if (now - last < windowMs) return true;


  seenLineTimes.set(lineId, now);


  if (seenLineTimes.size > 400) {
    const cutoff = now - 10 * 60 * 1000;
    for (const [id, ts] of seenLineTimes) {
      if (ts < cutoff) seenLineTimes.delete(id);
    }
  }
  return false;
}
// -------------------------------------------------

let resetTimerId = null;
let lastDisplayAt = 0; // for 10s window used by generic showMessage/updateUI
let activeIntervals = []; // holds intervals for special timers so we can cancel them
let activeTimeouts = [];  // holds timeouts for special timers so we can cancel them

/* =========================
   Global overlay preferences
   ========================= */
let overlayScale = Number(localStorage.getItem("amascut.overlayScale") || "1");
if (!(overlayScale >= 0.25 && overlayScale <= 2.0)) overlayScale = 1;
let overlayEnabled = (localStorage.getItem("amascut.overlayEnabled") ?? "true") === "true";


let overlayPos = null;
try {
  const stored = JSON.parse(localStorage.getItem("amascut.overlayPos") || "null");
  if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
    overlayPos = { x: stored.x, y: stored.y };
  }
} catch {}


const VOICE_LINE_LABELS = {
  // Group: solo calls
  soloGroup: "3 hit barrage",

  // Group: spec order lines
  specGroup: "3 multi hit (base only)",

  // Group: P7 calls
  p7Call: "P7 Call",

  snuffed: "Swap timer + click timer",
  tear: "Scarabs",
  bend: "Bend the Knee",
  tumeken: "P5 Barricade Timer",
  d2h: "P6 D2H Timer",
  d2hAoE: "P6 AoE reminder",
};


let voiceLineConfig = {};
try {
  const raw = localStorage.getItem("amascut.voiceLineConfig");
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") voiceLineConfig = parsed;
  }
} catch {}

function isVoiceLineEnabled(key) {

  if (key === "newdawn") return true;

  // Group: Grovel / Weak / Pathetic share one toggle
  if (key === "grovel" || key === "weak" || key === "pathetic") {
    const v = voiceLineConfig["specGroup"];
    return v !== false; // default ON
  }

  // Group: solo calls share one toggle
  if (key === "soloWeakMagic" || key === "soloMelee" || key === "soloRange") {
    const v = voiceLineConfig["soloGroup"];
    return v !== false; // default ON
  }

  // Group: P7 calls share one toggle
  if (key === "crondis" || key === "apmeken" || key === "het" || key === "scabaras") {
    const v = voiceLineConfig["p7Call"];
    return v !== false; // default ON
  }

  const v = voiceLineConfig[key];
  return v !== false; // default ON
}

function setVoiceLineEnabled(key, enabled) {
  voiceLineConfig[key] = !!enabled;
  try { localStorage.setItem("amascut.voiceLineConfig", JSON.stringify(voiceLineConfig)); } catch {}
}

/* === Exposed helpers for the popup === */
window.amascutGetState = function () {
  return {
    overlayScale,
    overlayEnabled,
    overlayPos,
    posMode,
  };
};

window.amascutSetOverlayScale = function (v) {
  overlayScale = v;
  try { localStorage.setItem("amascut.overlayScale", String(v)); } catch {}
};

window.amascutSetOverlayEnabled = function (enabled) {
  overlayEnabled = !!enabled;
  try { localStorage.setItem("amascut.overlayEnabled", String(overlayEnabled)); } catch {}
  if (!overlayEnabled) clearOverlayGroup();
};

window.amascutIsPosMode = function () {
  return posMode;
};

window.amascutGetVoiceMeta = function () {
  return {
    config: voiceLineConfig,
    labels: VOICE_LINE_LABELS,
  };
};

window.amascutSetVoiceEnabled = function (key, enabled) {
  setVoiceLineEnabled(key, enabled);
};
/* ------------------------------------- */

/* ---------- Logs toggle ---------- */
(function injectLogsToggle(){
  const style = document.createElement("style");
  style.textContent = `
    .ah-logs-toggle{position:fixed;top:6px;right:8px;z-index:11000;font-size:12px;opacity:.85;background:#222;
      border:1px solid #444;border-radius:4px;cursor:pointer;padding:4px 8px;line-height:1;color:#fff}
    .ah-logs-toggle:hover{opacity:1}
    .logs-hidden #output{display:none !important}
  `;
  document.head.appendChild(style);

  const btn = document.createElement("button");
  btn.className = "ah-logs-toggle";
  btn.id = "ah-logs-toggle";
  btn.textContent = "📝 Logs: On";
  document.body.appendChild(btn);

  const saved = localStorage.getItem("amascut.logsVisible");
  const visible = saved === null ? true : saved === "true";
  document.body.classList.toggle("logs-hidden", !visible);
  btn.textContent = `📝 Logs: ${visible ? "On" : "Off"}`;

  btn.addEventListener("click", () => {
    const nowHidden = document.body.classList.toggle("logs-hidden");
    const nowVisible = !nowHidden;
    btn.textContent = `📝 Logs: ${nowVisible ? "On" : "Off"}`;
    try { localStorage.setItem("amascut.logsVisible", String(nowVisible)); } catch {}
  });
})();

/* ==== Tick configuration & toggle ==== */
let tickMs = 600; // default 0.6s display tick

(function injectTickToggle(){
  const style = document.createElement("style");
  style.textContent = `
    .ah-tick-toggle{position:fixed;top:6px;left:8px;z-index:11000;font-size:12px;opacity:.85;background:#222;
      border:1px solid #444;border-radius:4px;cursor:pointer;padding:4px 8px;line-height:1;margin-right:6px;color:#fff}
    .ah-tick-toggle:hover{opacity:1}
  `;
  document.head.appendChild(style);

  const btn = document.createElement("button");
  btn.className = "ah-tick-toggle";
  btn.id = "ah-tick-toggle";
  const saved = Number(localStorage.getItem("amascut.tickMs"));
  tickMs = (saved === 100 || saved === 600) ? saved : 600;
  btn.textContent = `Tick/ms: ${tickMs}`;
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    tickMs = (tickMs === 600) ? 100 : 600;
    btn.textContent = `Tick/ms: ${tickMs}`;
    try { localStorage.setItem("amascut.tickMs", String(tickMs)); } catch {}
    if (startSnuffedTimers._iv) {
      try { clearInterval(startSnuffedTimers._iv); } catch {}
      startSnuffedTimers._iv = makeSnuffedInterval();
    }
  });
})();
/* ============================================ */

/* Global positioning state (used by main window + popup) */
let posMode = false;
let posRaf = 0;
window.amascutOptsWin = null;  // reference to popup (if open)

function startOverlayPosMode() {
  if (posMode) return;
  posMode = true;

  try { alt1 && alt1.setTooltip && alt1.setTooltip("Press Alt+1 to save overlay position!"); } catch {}

  const step = () => {
    if (!posMode) return;

    const mp =
      (window.a1lib && typeof a1lib.getMousePosition === "function" && a1lib.getMousePosition()) ||
      (window.A1lib && typeof A1lib.getMousePosition === "function" && A1lib.getMousePosition()) ||
      null;

    if (mp && Number.isFinite(mp.x) && Number.isFinite(mp.y)) {
      overlayPos = {
        x: Math.max(0, Math.floor(mp.x)),
        y: Math.max(0, Math.floor(mp.y)),
      };
    }
    posRaf = requestAnimationFrame(step);
  };
  posRaf = requestAnimationFrame(step);
}

function stopOverlayPosMode(saveNow = false) {
  if (!posMode) return;
  posMode = false;

  try { alt1 && alt1.clearTooltip && alt1.clearTooltip(); } catch {}
  if (posRaf) {
    cancelAnimationFrame(posRaf);
    posRaf = 0;
  }

  if (saveNow && overlayPos) {
    try { localStorage.setItem("amascut.overlayPos", JSON.stringify(overlayPos)); } catch {}
    log(`📍 Overlay position set to ${overlayPos.x}, ${overlayPos.y}`);
  }

  if (window.amascutOptsWin && !window.amascutOptsWin.closed) {
    try {
      window.amascutOptsWin.postMessage(
        { source: "amascutParent", type: "posSaved", pos: overlayPos },
        "*"
      );
    } catch {}
  }
}

(function bindAlt1Global(){
  const bindAlt1 = (handler) => {
    try {
      if (window.a1lib && typeof a1lib.on === "function") {
        a1lib.on("alt1pressed", handler);
        return true;
      }
    } catch {}
    try {
      if (window.A1lib && typeof A1lib.on === "function") {
        A1lib.on("alt1pressed", handler);
        return true;
      }
    } catch {}
    return false;
  };

  const ok = bindAlt1(() => {
    if (posMode) stopOverlayPosMode(true);
  });

  if (!ok) {
    log("ℹ️ Alt+1 binding via a1lib.on not available; use Set pos button instead.");
  }

  window.addEventListener("keydown", (e) => {
    if (posMode && e.altKey && (e.code === "Digit1" || e.key === "1")) {
      e.preventDefault();
      stopOverlayPosMode(true);
    }
  });
})();

(function injectOptionsPopupButton(){
  const style = document.createElement("style");
  style.textContent = `
    .ah-mini{
      position:fixed;
      right:12px;
      bottom:12px;
      z-index:11051;
      background:#1b1f24;
      border:1px solid #444;
      border-radius:999px;
      padding:8px 12px;
      box-shadow:0 6px 16px #000a;
      color:#ddd;
      font-family:rs-pro-3;
      cursor:pointer;
      user-select:none;
      display:flex;
      align-items:center;
      gap:4px;
      font-size:13px;
    }
    .ah-mini span{
      opacity:.8;
      font-size:11px;
    }
  `;
  document.head.appendChild(style);

  const mini = document.createElement("div");
  mini.className = "ah-mini";
  mini.id = "ah-panel-mini";
  mini.innerHTML = `⚙ <span>Options</span>`;
  document.body.appendChild(mini);

  mini.addEventListener("click", (e) => {
    e.stopPropagation();
    openOptionsPopup();
  });
})();


function openOptionsPopup() {
  if (window.amascutOptsWin && !window.amascutOptsWin.closed) {
    window.amascutOptsWin.focus();
    return;
  }

  const win = window.open(
    "",
    "AmascutOptions",
    "width=420,height=420,resizable=yes"
  );
  if (!win) {
    log("⚠️ Failed to open options popup (blocked by browser?).");
    return;
  }
  window.amascutOptsWin = win;

  win.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Amascut Helper – Options</title>
<style>
  body{
    margin:8px;
    background:#1b1f24;
    color:#ddd;
    font-family:rs-pro-3, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
  }
  h4{
    margin:0 0 8px 0;
    font-size:14px;
    color:#fff;
    display:flex;
    justify-content:space-between;
    align-items:center;
  }
  button{
    font-size:12px;
  }
  .row{
    display:flex;
    align-items:center;
    gap:8px;
    margin:6px 0;
  }
  .row label{
    font-size:12px;
    min-width:110px;
  }
  .row input[type="range"]{
    flex:1;
  }
  .small{
    font-size:11px;
    opacity:.8;
  }
  .btn{
    border:1px solid #444;
    background:#222;
    color:#fff;
    border-radius:4px;
    padding:4px 8px;
    cursor:pointer;
  }
  .btn-row{
    display:flex;
    gap:6px;
    flex-wrap:wrap;
    margin-top:6px;
  }
  .voice-grid{
    margin-top:4px;
    display:flex;
    flex-direction:column;
    gap:2px;
    max-height:200px;
    overflow-y:auto;
    border:1px solid #333;
    padding:4px;
    border-radius:4px;
  }
  .voice-item{
    display:flex;
    align-items:center;
    gap:4px;
    font-size:11px;
  }
</style>
</head>
<body>
  <h4>
    Amascut Helper – Options
    <button id="opt-close" class="btn">Close</button>
  </h4>

  <div class="row">
    <label for="opt-size">Overlay size</label>
    <input id="opt-size" type="range" min="0.25" max="2" step="0.05">
    <span id="opt-size-val" style="width:48px;text-align:right;">1.00×</span>
  </div>

  <div class="row">
    <label for="opt-enable">Overlay</label>
    <input id="opt-enable" type="checkbox">
    <span id="opt-enable-state"></span>
  </div>

  <div class="btn-row">
    <button id="opt-set-pos" class="btn">Set pos</button>
  </div>

  <div class="row">
    <span id="opt-pos-val" class="small"></span>
  </div>

  <hr style="margin:8px 0;border-color:#333;">

  <div class="small">Voice line filters (uncheck to ignore):</div>
  <div id="opt-voice-list" class="voice-grid"></div>

  <script>
    (function(){
      const parent = window.opener;
      if (!parent) {
        document.body.innerHTML = "<p>Parent window not available.</p>";
        return;
      }

      const size = document.getElementById("opt-size");
      const sizeVal = document.getElementById("opt-size-val");
      const enableCb = document.getElementById("opt-enable");
      const enableState = document.getElementById("opt-enable-state");
      const setPosBtn = document.getElementById("opt-set-pos");
      const posVal = document.getElementById("opt-pos-val");
      const closeBtn = document.getElementById("opt-close");
      const voiceList = document.getElementById("opt-voice-list");

      function getState() {
        if (typeof parent.amascutGetState === "function") {
          return parent.amascutGetState();
        }
        return {
          overlayScale: parent.overlayScale || 1,
          overlayEnabled: !!parent.overlayEnabled,
          overlayPos: parent.overlayPos || null,
          posMode: !!parent.posMode
        };
      }

      function buildVoiceList() {
        if (!voiceList) return;
        if (voiceList._built) return;
        voiceList._built = true;

        if (typeof parent.amascutGetVoiceMeta !== "function") return;
        const meta = parent.amascutGetVoiceMeta() || {};
        const labels = meta.labels || {};
        const cfg = meta.config || {};

        Object.keys(labels).forEach(function(key){
          const label = labels[key];
          const wrap = document.createElement("label");
          wrap.className = "voice-item";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.setAttribute("data-key", key);

          const enabled = Object.prototype.hasOwnProperty.call(cfg, key) ? cfg[key] !== false : true;
          cb.checked = enabled;

          const span = document.createElement("span");
          span.textContent = label;

          wrap.appendChild(cb);
          wrap.appendChild(span);
          voiceList.appendChild(wrap);

          cb.addEventListener("change", function(){
            if (typeof parent.amascutSetVoiceEnabled === "function") {
              parent.amascutSetVoiceEnabled(key, cb.checked);
            }
          });
        });
      }

      function refreshFromParent(){
        const st = getState();

        size.value = String(st.overlayScale || 1);
        sizeVal.textContent = Number(st.overlayScale || 1).toFixed(2) + "×";

        enableCb.checked = !!st.overlayEnabled;
        enableState.textContent = st.overlayEnabled ? "On" : "Off";

        const pos = st.overlayPos;
        if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
          posVal.textContent = "Position: (" + pos.x + ", " + pos.y + ")";
        } else {
          posVal.textContent = "Position: centered";
        }

        setPosBtn.textContent = st.posMode ? "Saving… (Alt+1)" : "Set pos";

        // sync voice checkboxes with latest config
        if (voiceList && typeof parent.amascutGetVoiceMeta === "function") {
          const meta = parent.amascutGetVoiceMeta() || {};
          const cfg = meta.config || {};
          voiceList.querySelectorAll("input[data-key]").forEach(function(cb){
            const k = cb.getAttribute("data-key");
            const enabled = Object.prototype.hasOwnProperty.call(cfg, k) ? cfg[k] !== false : true;
            cb.checked = enabled;
          });
        }
      }

      buildVoiceList();
      refreshFromParent();

      // Slider -> real overlayScale via helper
      size.addEventListener("input", function () {
        var v = Number(size.value) || 1;
        if (typeof parent.amascutSetOverlayScale === "function") {
          parent.amascutSetOverlayScale(v);
        } else {
          parent.overlayScale = v;
          try { parent.localStorage.setItem("amascut.overlayScale", String(v)); } catch (e) {}
        }
        sizeVal.textContent = v.toFixed(2) + "×";
      });

      // Enable checkbox -> real overlayEnabled via helper
      enableCb.addEventListener("change", function () {
        var on = enableCb.checked;
        if (typeof parent.amascutSetOverlayEnabled === "function") {
          parent.amascutSetOverlayEnabled(on);
        } else {
          parent.overlayEnabled = on;
          try { parent.localStorage.setItem("amascut.overlayEnabled", String(on)); } catch (e) {}
          if (!on && parent.clearOverlayGroup) parent.clearOverlayGroup();
        }
        enableState.textContent = on ? "On" : "Off";
      });

      // Set pos button: toggle position mode in parent
      setPosBtn.addEventListener("click", function () {
        var st = getState();
        if (!st.posMode) {
          parent.startOverlayPosMode();
          setPosBtn.textContent = "Saving… (Alt+1)";
        } else {
          parent.stopOverlayPosMode(true);
          setPosBtn.textContent = "Set pos";
        }
      });

      // Close button
      closeBtn.addEventListener("click", function () {
        window.close();
      });

      // Listen for messages from parent (position saved via Alt+1)
      window.addEventListener("message", function (evt) {
        var d = evt.data;
        if (!d || d.source !== "amascutParent") return;
        if (d.type === "posSaved") {
          var pos = d.pos;
          if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
            posVal.textContent = "Position: (" + pos.x + ", " + pos.y + ")";
          } else {
            posVal.textContent = "Position: centered";
          }
          setPosBtn.textContent = "Set pos";
        }
      });

      // Periodic refresh in case parent state changes elsewhere
      setInterval(refreshFromParent, 1000);
    })();
  </script>
</body>
</html>
  `);

  win.document.close();
}

/* ======================================== */

function clearActiveTimers() {
  activeIntervals.forEach(clearInterval);
  activeTimeouts.forEach(clearTimeout);
  activeIntervals = [];
  activeTimeouts = [];
}

function autoResetIn10s() {
  if (resetTimerId) clearTimeout(resetTimerId);
  resetTimerId = setTimeout(() => {
    resetUI();
    log("↺ UI reset");
  }, 10000);
  lastDisplayAt = Date.now();
}

function resetUI() {
  clearActiveTimers();
  if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }

  const rows = document.querySelectorAll("#spec tr");

  if (rows[0]) {
    const c0 = rows[0].querySelector("td");
    if (c0) c0.textContent = ".";
    rows[0].style.display = "";
    rows[0].classList.remove("role-range", "role-magic", "role-melee", "callout", "flash");
    rows[0].classList.add("selected");
  }

  for (let i = 1; i < rows.length; i++) {
    const c = rows[i].querySelector("td");
    if (c) c.textContent = "";
    rows[i].style.display = "none";
    rows[i].classList.remove("role-range", "role-magic", "role-melee", "selected", "callout", "flash");
  }
}

function showMessage(text) {
  const rows = document.querySelectorAll("#spec tr");
  if (!rows.length) return;

  const withinWindow = Date.now() - lastDisplayAt <= 10000;

  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.remove("role-range", "role-magic", "role-melee");
    rows[i].classList.remove("callout", "flash");
  }

  if (!withinWindow) {
    if (rows[0]) {
      const c0 = rows[0].querySelector("td");
      if (c0) c0.textContent = text;
      rows[0].style.display = "table-row";
      rows[0].classList.add("selected", "callout", "flash");
    }
    for (let i = 1; i < rows.length; i++) {
      const c = rows[i].querySelector("td");
      if (c) c.textContent = "";
      rows[i].style.display = "none";
      rows[i].classList.remove("selected");
    }
  } else {
    if (rows[1]) {
      const c1 = rows[1].querySelector("td");
      if (c1) c1.textContent = text;
      rows[1].style.display = "table-row";
      rows[1].classList.add("selected", "callout", "flash");
    } else {
      const c0 = rows[0].querySelector("td");
      if (c0) c0.textContent = text;
    }
  }

  log(`✅ ${text}`);
  autoResetIn10s();
}

const RESPONSES = {
  weak:     "Range > Magic > Melee",
  grovel:   "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function updateUI(key) {
  const order = RESPONSES[key].split(" > ");
  const rows = document.querySelectorAll("#spec tr");

  if (rows[0]) rows[0].style.display = "table-row";
  if (rows[1]) rows[1].style.display = "table-row";
  if (rows[2]) rows[2].style.display = "table-row";

  rows.forEach((row, i) => {
    const role = order[i] || "";
    const cell = row.querySelector("td");
    if (cell) cell.textContent = role;

    row.classList.remove("callout", "flash");
    row.classList.remove("role-range", "role-magic", "role-melee");
    if (role === "Range") row.classList.add("role-range");
    else if (role === "Magic") row.classList.add("role-magic");
    else if (role === "Melee") row.classList.add("role-melee");

    row.classList.toggle("selected", i === 0);
  });

  log(`✅ ${RESPONSES[key]}`);
  autoResetIn10s();
}

const reader = new Chatbox.default();
const NAME_RGB = [69, 131, 145];
const TEXT_RGB = [153, 255, 153];
const WHITE_RGB = [255, 255, 255];
const PUB_BLUE = [127, 169, 255];

function isColorNear(rgb, target, tol = 10) {
  return Math.abs(rgb[0] - target[0]) <= tol &&
         Math.abs(rgb[1] - target[1]) <= tol &&
         Math.abs(rgb[2] - target[2]) <= tol;
}

reader.readargs = {
  colors: [
    A1lib.mixColor(...NAME_RGB),
    A1lib.mixColor(...TEXT_RGB),
    A1lib.mixColor(...WHITE_RGB),
    A1lib.mixColor(...PUB_BLUE),
  ],
  backwards: true
};

function firstNonWhiteColor(seg) {
  if (!seg.fragments) return null;
  for (const f of seg.fragments) {
    if (!isColorNear(f.color, WHITE_RGB)) return f.color;
  }
  return null;
}

/* Helpers to ensure rows are visible and to print on fixed rows */
function setRow(i, text) {
  const rows = document.querySelectorAll("#spec tr");
  if (!rows[i]) return;
  const cell = rows[i].querySelector("td");
  if (cell) cell.textContent = text;
  rows[i].style.display = "table-row";
  rows[i].classList.add("selected", "callout", "flash");
}
function clearRow(i) {
  const rows = document.querySelectorAll("#spec tr");
  if (!rows[i]) return;
  const row = rows[i];
  const cell = row.querySelector("td");

  if (i === 0) {
    if (cell) cell.textContent = ".";
    row.style.display = "table-row";
    row.classList.remove("callout", "flash", "role-range", "role-magic", "role-melee");
    row.classList.add("selected");
    return;
  }

  if (cell) cell.textContent = "";
  row.style.display = "none";
  row.classList.remove("selected", "callout", "flash", "role-range", "role-magic", "role-melee");
}

function fmt(x) { return Math.max(0, x).toFixed(1); }

let snuffStartAt = 0;

let barricadeStartAt = 0;
let barricadeIv = 0;
let barricadeClearT = 0;

function stopBarricadeTimer(clearRowToo = true) {
  if (barricadeIv) {
    try { clearInterval(barricadeIv); } catch {}
    barricadeIv = 0;
  }
  if (barricadeClearT) {
    try { clearTimeout(barricadeClearT); } catch {}
    barricadeClearT = 0;
  }
  barricadeStartAt = 0;
  if (clearRowToo) clearRow(2);
}

function startBarricadeTimer() {
  stopBarricadeTimer(false);

  barricadeStartAt = Date.now();
  setRow(2, "Barricade: 13.2s");

  barricadeIv = setInterval(() => {
    const elapsed   = (Date.now() - barricadeStartAt) / 1000;
    const remaining = 13.2 - elapsed;

    if (remaining <= 0) {
      setRow(2, "Barricade: 0.0s");

      try { clearInterval(barricadeIv); } catch {}
      barricadeIv = 0;

      if (barricadeClearT) {
        try { clearTimeout(barricadeClearT); } catch {}
      }

      barricadeClearT = setTimeout(() => {
        clearRow(2);
        barricadeClearT = 0;
      }, 5000);

      return;
    }

    setRow(2, `Barricade: ${fmt(remaining)}s`);
  }, tickMs);
}

let d2hStartAt = 0;
let d2hIv = 0;
let d2hClearT = 0;

function stopD2HTimer(clearRowToo = true) {
  if (d2hIv) {
    try { clearInterval(d2hIv); } catch {}
    d2hIv = 0;
  }
  if (d2hClearT) {
    try { clearTimeout(d2hClearT); } catch {}
    d2hClearT = 0;
  }
  d2hStartAt = 0;
  if (clearRowToo) clearRow(2);
}

function startD2HTimer() {
  stopD2HTimer(false);

  d2hStartAt = Date.now();
  setRow(2, "D2H in: 6.0s");

  d2hIv = setInterval(() => {
    const elapsed   = (Date.now() - d2hStartAt) / 1000;
    const remaining = 6.0 - elapsed;

    if (remaining <= 0) {
      setRow(2, "D2H in: 0.0s");

      try { clearInterval(d2hIv); } catch {}
      d2hIv = 0;

      if (d2hClearT) {
        try { clearTimeout(d2hClearT); } catch {}
      }

      d2hClearT = setTimeout(() => {
        clearRow(2);
        d2hClearT = 0;
      }, 2000);

      return;
    }

    setRow(2, `D2H in: ${fmt(remaining)}s`);
  }, tickMs);
}

function clearClickInTimerOnly() {
  startSnuffedTimers._clickDisabled = true;
  clearRow(1);
  log("⏹ Click in timer cleared on path selection");
}

/* ==== Shared interval builder for snuffed timers ==== */
function makeSnuffedInterval() {
  const iv = setInterval(() => {
    try {
      const elapsed = (Date.now() - snuffStartAt) / 1000;

      // --- Swap (14.4s) ---
      const swapRemaining = 14.4 - elapsed;
      if (swapRemaining <= 0) {
        if (!startSnuffedTimers._swapFrozen) {
          setRow(0, "Swap side: 0.0s");
          startSnuffedTimers._swapFrozen = true;
          const t = setTimeout(() => { clearRow(0); }, 5000);
          activeTimeouts.push(t);
        }
      } else if (!startSnuffedTimers._swapFrozen) {
        setRow(0, `Swap side: ${fmt(swapRemaining)}s`);
      }

      // --- Click-in (9.0s repeating) ---
      const period = 9.0;
      if (!startSnuffedTimers._clickDisabled) {
        let clickRemaining = period - (elapsed % period);
        if (clickRemaining >= period - 1e-6) clickRemaining = 0;
        setRow(1, `Click in: ${fmt(clickRemaining)}s`);
      } else {
        clearRow(1);
      }
    } catch (e) {
      console.error(e);
    }
  }, tickMs);

  activeIntervals.push(iv);
  return iv;
}

function startSnuffedTimers() {
  clearActiveTimers();
  if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }

  startSnuffedTimers._swapHideScheduled = false;
  startSnuffedTimers._swapFrozen = false;
  startSnuffedTimers._clickDisabled = false;

  snuffStartAt = Date.now();

  setRow(0, "Swap side: 14.4s");
  setRow(1, "Click in: 9.0s");

  if (startSnuffedTimers._iv) { try { clearInterval(startSnuffedTimers._iv); } catch {} }
  startSnuffedTimers._iv = makeSnuffedInterval();
}

function stopSnuffedTimersAndReset() {
  clearActiveTimers();
  if (resetTimerId) {
    clearTimeout(resetTimerId);
    resetTimerId = null;
  }

  startSnuffedTimers._swapHideScheduled = false;
  startSnuffedTimers._swapFrozen = false;
  startSnuffedTimers._clickDisabled = false;

  snuffStartAt = 0;

  stopBarricadeTimer(true);
  stopD2HTimer(true);

  lastDisplayAt = 0;
  [0, 1, 2].forEach(clearRow);
  resetUI();
}

let lastSig = "";
let lastAt = 0;
let emptyReadCount = 0;

/* ===== Hard session reset helper ===== */
function hardResetSession() {
  log("🔄 Session welcome detected — full reset");

  seenLineTimes.clear();
  lastSig = "";
  lastAt = 0;

  stopSnuffedTimersAndReset();
}
/* ==================================== */

function showSolo(role, cls) {
  const rows = document.querySelectorAll("#spec tr");
  if (!rows.length) return;

  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.remove("role-range","role-magic","role-melee","callout","flash","selected");
    const c = rows[i].querySelector("td");
    if (c) c.textContent = "";
    rows[i].style.display = "none";
  }

  const row = rows[0];
  if (row) {
    const cell = row.querySelector("td");
    if (cell) cell.textContent = role;
    row.style.display = "table-row";
    row.classList.add("selected","callout","flash",cls);
  }

  const t = setTimeout(() => { clearRow(0); }, 4000);
  activeTimeouts.push(t);
}

function onAmascutLine(full, lineId) {
  if (/welcome to your session/i.test(full)) {
    hardResetSession();
    return;
  }

  const raw = full;
  const low = full.toLowerCase();

  let key = null;
  if (low.includes("your soul is weak")) key = "soloWeakMagic";
  else if (low.includes("all strength withers")) key = "soloMelee";
  else if (low.includes("i will not suffer this")) key = "soloRange";
  else if (low.includes("your light will be snuffed out")) key = "snuffed";
  else if (low.includes("a new dawn")) key = "newdawn";
  else if (raw.includes("Grovel")) key = "grovel";
  else if (/\bWeak\b/.test(raw)) key = "weak";
  else if (raw.includes("Pathetic")) key = "pathetic";
  else if (low.includes("tear them apart")) key = "tear";
  else if (low.includes("bend the knee")) key = "bend";
  else if (raw.includes("Tumeken's heart")) key = "tumeken";
  else if (raw.includes("Crondis... It should have never come to this")) key = "crondis";
  else if (raw.includes("I'm sorry, Apmeken")) key = "apmeken";
  else if (raw.includes("Forgive me, Het")) key = "het";
  else if (/Scabaras\.\.\.(?!\s*Het\.\.\.\s*Bear witness!?)/i.test(raw)) key = "scabaras";
  else if (low.includes("i will not be subjugated by a mortal")) key = "d2h";

  if (!key) return;

  if (key !== "d2h" && !isVoiceLineEnabled(key)) {
    log("🔇 Suppressed voice line: " + key);
    return;
  }

  if (key !== "snuffed" && lineId) {
    if (shouldIgnoreLine(lineId, 5000)) return;
  }

  const now = Date.now();
  if (key !== "snuffed") {
    const sig = key + "|" + raw.slice(-80);
    if (sig === lastSig && now - lastAt < 1200) return;
    lastSig = sig;
    lastAt = now;
  }

  if (key === "snuffed") {
    if (snuffStartAt) {
      log("⚡ Snuffed out already active — ignoring duplicate");
      return;
    }
    log("⚡ Snuffed out detected — starting timers");
    startSnuffedTimers();
    return;
  }

  if (key === "newdawn") {
    log("🌅 A new dawn — resetting timers");
    stopSnuffedTimersAndReset();
    snuffStartAt = 0;
    return;
  }

  if (key === "tear") {
    showMessage("Scarabs + Bend the knee shortly");
  } else if (key === "bend") {
    showMessage("Bend the Knee");
  } else if (key === "crondis") {
    showMessage("Crondis (SE)");
  } else if (key === "apmeken") {
    showMessage("Apmeken (NW)");
  } else if (key === "het") {
    showMessage("Het (SW)");
  } else if (key === "scabaras") {
    showMessage("Scabaras (NE)");
  } else if (key === "soloWeakMagic") {
    showSolo("Magic", "role-magic");
  } else if (key === "soloMelee") {
    showSolo("Melee", "role-melee");
  } else if (key === "soloRange") {
    showSolo("Range", "role-range");
  } else if (key === "tumeken") {
    log("💙 Tumeken's heart — starting Barricade timer");
    startBarricadeTimer();
  } else if (key === "d2h") {
    const d2hTimerOn = isVoiceLineEnabled("d2h");    // P6 D2H Timer
    const d2hAoeOn   = isVoiceLineEnabled("d2hAoE"); // P6 AoE reminder

    if (!d2hTimerOn && !d2hAoeOn) {
      log("🔇 Suppressed D2H effects (timer + AoE reminder)");
    } else {
      if (d2hTimerOn) {
        log("🗡 D2H line — starting D2H timer");
        startD2HTimer();
      } else {
        log("🔇 D2H timer suppressed");
      }

      if (d2hAoeOn) {
        showMessage("Threads / Gchain soon");
      }
    }

    startSnuffedTimers._clickDisabled = true;
    const rows = document.querySelectorAll("#spec tr");
    if (rows[1]) {
      const cell = rows[1].querySelector("td");
      if (cell) cell.textContent = "";
    }
  } else {
    updateUI(key);
  }
}

function readChatbox() {
  let segs = [];
  try {
    segs = reader.read() || [];
  } catch (e) {
    log("⚠️ reader.read() failed; enable Pixel permission in Alt1. Error: " + (e?.message || e));
    return;
  }

  const EMPTY_REFIND_THRESHOLD = 4;

  if (!segs.length) {
    emptyReadCount++;

    if (emptyReadCount % 4 === 0) {
      log("👀 No chat text detected in last " + emptyReadCount + " reads");
    }

    if (emptyReadCount >= EMPTY_REFIND_THRESHOLD) {
      try {
        log("🔁 No chat text for a bit, re-finding chatbox...");
        reader.pos = null;
        reader.find();

        if (reader.pos && reader.pos.mainbox && reader.pos.mainbox.rect) {
          log("✅ Chatbox re-found after empty reads");
          try { showSelected(reader.pos); } catch {}
        } else {
          log("⚠️ reader.find() did not return a valid chatbox");
        }
      } catch (e) {
        log("⚠️ reader.find() while recovering failed: " + (e?.message || e));
      }
      emptyReadCount = 0;
    }
    return;
  }

  emptyReadCount = 0;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];

    if (seg && typeof seg.text === "string") {
      if (/welcome to your session/i.test(seg.text)) {
        hardResetSession();
        continue;
      }

      if (/take the path toward/i.test(seg.text)) {
        clearClickInTimerOnly();
        continue;
      }
    }

    if (!seg.fragments || seg.fragments.length === 0) continue;

    const hasNameColor = seg.fragments.some(f => isColorNear(f.color, NAME_RGB));
    if (!hasNameColor || !/Amascut/i.test(seg.text)) continue;

    let full = seg.text;
    const colon = full.indexOf(":");
    if (colon !== -1) full = full.slice(colon + 1).trim();

    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (!s2.fragments || !s2.fragments.length) break;
      const col = firstNonWhiteColor(s2);
      if (col && isColorNear(col, TEXT_RGB)) {
        full += " " + s2.text.trim();
      } else {
        break;
      }
    }

    if (full) {
      log(full);
      const lineId = seg.text.trim();
      onAmascutLine(full, lineId);
    }
  }
}

resetUI();

setTimeout(() => {
  const finder = setInterval(() => {
    try {
      if (!reader.pos) {
        log("🔍 finding chatbox...");
        reader.find();
      } else {
        clearInterval(finder);
        log("✅ chatbox found");
        showSelected(reader.pos);
        setInterval(readChatbox, 250);

        try { startOverlay(); } catch (e) { console.error(e); }
      }
    } catch (e) {
      log("⚠️ " + (e?.message || e));
    }
  }, 800);
}, 50);

function showSelected(pos) {
  try {
    const b = pos.mainbox.rect;
    alt1.overLayRect(A1lib.mixColor(0, 255, 0), b.x, b.y, b.width, b.height, 2000, 4);
  } catch {}
}

/* ===== Alt1 overlay controller ===== */
const overlayCtl = {
  group: "amascOverlayRegion",
  raf: 0,
  timer: 0,
  refreshRate: 50,
  running: false,
};

function getRsClientSize() {
  try {
    const w = (alt1 && alt1.rsWidth) ? alt1.rsWidth : 800;
    const h = (alt1 && alt1.rsHeight) ? alt1.rsHeight : 600;
    return { w, h };
  } catch { return { w: 800, h: 600 }; }
}

function centerFor(canvas) {
  const { w: rw, h: rh } = getRsClientSize();
  return {
    x: Math.max(0, Math.round((rw - canvas.width) / 2)),
    y: Math.max(0, Math.round((rh - canvas.height) / 2)),
  };
}

function positionFor(canvas) {
  if (overlayPos && Number.isFinite(overlayPos.x) && Number.isFinite(overlayPos.y)) {
    return { x: Math.max(0, Math.floor(overlayPos.x)), y: Math.max(0, Math.floor(overlayPos.y)) };
  }
  return centerFor(canvas);
}

function clearOverlayGroup() {
  try {
    alt1.overLaySetGroup(overlayCtl.group);
    alt1.overLayFreezeGroup(overlayCtl.group);
    alt1.overLayClearGroup(overlayCtl.group);
    alt1.overLayRefreshGroup(overlayCtl.group);
  } catch {}
}

function scheduleNext(cb) {
  overlayCtl.timer = window.setTimeout(() => {
    overlayCtl.raf = window.requestAnimationFrame(cb);
  }, overlayCtl.refreshRate);
}

function encodeImage(imgData) {
  const enc = (window.a1lib && a1lib.encodeImageString) || (window.A1lib && A1lib.encodeImageString);
  if (!enc) throw new Error("encodeImageString not found on a1lib/A1lib");
  return enc(imgData);
}

/* ==================== Text-only overlay ==================== */
function gatherSpecLines() {
  const rows = document.querySelectorAll("#spec tr");
  const lines = [];

  if (posMode) {
    lines.push({ text: "Positioning...", color: "#FFFFFF" });
    return lines;
  }

  rows.forEach((row) => {
    if (row.style.display === "none") return;
    const td = row.querySelector("td");
    const text = (td?.textContent || "").trim();
    if (!text) return;

    let color = "#FFFFFF";
    if (row.classList.contains("role-range")) color = "#1fb34f";
    else if (row.classList.contains("role-magic")) color = "#3a67ff";
    else if (row.classList.contains("role-melee")) color = "#e13b3b";

    lines.push({ text, color });
  });
  return lines;
}

function renderLinesToCanvas(lines) {
  const { w: rw } = getRsClientSize();
  const baseSize = Math.round(Math.min(64, Math.max(28, rw * 0.045)));
  const fontSize = Math.max(14, Math.round(baseSize * overlayScale));
  const pad = 12;
  const gap = 6;

  const m = document.createElement("canvas");
  const mctx = m.getContext("2d");
  mctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Arial, sans-serif`;

  let maxW = 0;
  for (const { text } of lines) {
    const w = Math.ceil(mctx.measureText(text).width);
    if (w > maxW) maxW = w;
  }
  const lineH = fontSize + gap;
  const cw = Math.max(1, maxW + pad * 2);
  const ch = Math.max(1, lines.length * lineH + pad * 2);

  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;

  const ctx = c.getContext("2d");
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Arial, sans-serif`;
  ctx.textBaseline = "top";

  const outline = Math.max(2, Math.round(fontSize / 10));
  let y = pad;
  for (const { text, color } of lines) {
    const x = pad;

    ctx.lineWidth = outline;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(text, x, y);

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    y += lineH;
  }
  return c;
}
/* ================================================================= */

async function updateOverlayOnce() {
  try {
    if (!window.alt1) { scheduleNext(updateOverlayOnce); return; }

    if (!overlayEnabled) {
      clearOverlayGroup();
      scheduleNext(updateOverlayOnce);
      return;
    }

    const lines = gatherSpecLines();
    if (!lines.length) {
      clearOverlayGroup();
      scheduleNext(updateOverlayOnce);
      return;
    }

    const canvas = renderLinesToCanvas(lines);
    const ctx = canvas.getContext("2d");
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pos = positionFor(canvas);

    if (img && img.width > 0 && img.height > 0) {
      alt1.overLaySetGroup(overlayCtl.group);
      alt1.overLayFreezeGroup(overlayCtl.group);
      alt1.overLayClearGroup(overlayCtl.group);
      alt1.overLayImage(
        pos.x,
        pos.y,
        encodeImage(img),
        img.width,
        overlayCtl.refreshRate
      );
      alt1.overLayRefreshGroup(overlayCtl.group);
    } else {
      clearOverlayGroup();
    }
  } catch (e) {
    console.error(e);
    clearOverlayGroup();
  } finally {
    if (overlayCtl.running) scheduleNext(updateOverlayOnce);
  }
}

function startOverlay(opts = {}) {
  overlayCtl.refreshRate = Number(opts.refreshRate) || 50;
  if (overlayCtl.running) return;
  overlayCtl.running = true;
  clearOverlayGroup();
  scheduleNext(updateOverlayOnce);
}

function stopOverlay() {
  overlayCtl.running = false;
  try { if (overlayCtl.raf) cancelAnimationFrame(overlayCtl.raf); } catch {}
  try { if (overlayCtl.timer) clearTimeout(overlayCtl.timer); } catch {}
  overlayCtl.raf = 0;
  overlayCtl.timer = 0;
  clearOverlayGroup();
}
