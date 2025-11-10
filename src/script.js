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

const seenLineIds = new Set();
const seenLineQueue = [];

let resetTimerId = null;
let lastDisplayAt = 0; // for 10s window used by generic showMessage/updateUI
let activeIntervals = []; // holds intervals for special timers so we can cancel them
let activeTimeouts = [];  // holds timeouts for special timers so we can cancel them

(function injectLogsToggle(){
  const style = document.createElement("style");
  style.textContent = `
    .ah-logs-toggle{position:fixed;top:6px;right:8px;z-index:11000;font-size:12px;opacity:.85;background:#222;
      border:1px solid #444;border-radius:4px;cursor:pointer;padding:4px 8px;line-height:1;}
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
    if (c0) c0.textContent = "Waiting...";
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
  const cell = rows[i].querySelector("td");
  if (cell) cell.textContent = "";
  rows[i].style.display = "none";
  rows[i].classList.remove("selected", "callout", "flash", "role-range", "role-magic", "role-melee");
}

/* format with one decimal (e.g., 14.4 → 14.4, 0.05 → 0.0) */
function fmt(x) { return Math.max(0, x).toFixed(1); }

let snuffStartAt = 0;

function startSnuffedTimers() {
  clearActiveTimers();
  if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }

  startSnuffedTimers._swapHideScheduled = false;
  startSnuffedTimers._swapFrozen = false;

  snuffStartAt = Date.now();

  setRow(0, "Swap side: 14.4s");
  setRow(1, "Click in: 9.0s");

  const iv = setInterval(() => {
    const elapsed = (Date.now() - snuffStartAt) / 1000;

    // Swap 14.4s
    const swapRemaining = 14.4 - elapsed;
    if (swapRemaining <= 0) {
      if (!startSnuffedTimers._swapFrozen) {
        setRow(0, "Swap side: 0.0s");
        startSnuffedTimers._swapFrozen = true; // stop updating row 0 after this

        if (!startSnuffedTimers._swapHideScheduled) {
          startSnuffedTimers._swapHideScheduled = true;
          const t = setTimeout(() => {
            clearRow(0);
            startSnuffedTimers._swapHideScheduled = false;
          }, 10000);
          activeTimeouts.push(t);
        }
      }
    } else {

      if (!startSnuffedTimers._swapFrozen) {
        setRow(0, `Swap side: ${fmt(swapRemaining)}s`);
      }
    }

    // Click in
    const period = 9.0;
    let clickRemaining = period - (elapsed % period);
    if (clickRemaining >= period - 1e-6) clickRemaining = 0;
    setRow(1, `Click in: ${fmt(clickRemaining)}s`);
  }, 100);

  activeIntervals.push(iv);
}

function stopSnuffedTimersAndReset() {
  clearActiveTimers();
  if (resetTimerId) {
    clearTimeout(resetTimerId);
    resetTimerId = null;
  }

  startSnuffedTimers._swapHideScheduled = false;
  startSnuffedTimers._swapFrozen = false;

  lastDisplayAt = 0;
  [0, 1, 2].forEach(clearRow);
  resetUI();
}


let lastSig = "";
let lastAt = 0;

function onAmascutLine(full, lineId) {
  // (remove the early seenLineIds block here)

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
  else if (raw.includes("Crondis... It should have never come to this")) key = "crondis";
  else if (raw.includes("I'm sorry, Apmeken")) key = "apmeken";
  else if (raw.includes("Forgive me, Het")) key = "het";
  else if (raw.includes("Scabaras...")) key = "scabaras";
  if (!key) return;

  // Only dedupe with seenLineIds for NON-snuffed lines
  if (key !== "snuffed" && lineId) {
    if (seenLineIds.has(lineId)) return;
    seenLineIds.add(lineId);
    seenLineQueue.push(lineId);
    if (seenLineQueue.length > 120) {
      const old = seenLineQueue.shift();
      seenLineIds.delete(old);
    }
  }

  const now = Date.now();
    if (key !== "snuffed") {
  const sig = key + "|" + raw.slice(-80);
    if (sig === lastSig && now - lastAt < 1200) return;
  lastSig = sig;
  lastAt = now;
}


  if (key === "snuffed") {
    log("⚡ Snuffed out detected — resetting timers");
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
    showMessage("Magic");
  } else if (key === "soloMelee") {
    showMessage("Melee");
  } else if (key === "soloRange") {
    showMessage("Range");
  } else {
    // weak / grovel / pathetic — same behavior
    updateUI(key);
  }
}

function readChatbox() {
  let segs = [];
  try { segs = reader.read() || []; }
  catch (e) { log("⚠️ reader.read() failed; enable Pixel permission in Alt1."); return; }
  if (!segs.length) return;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
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
