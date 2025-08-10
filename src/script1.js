A1lib.identifyApp("appconfig.json");

function log(msg) {
  if (typeof SETTINGS !== "undefined" && !SETTINGS.logs) return;
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

let countdownTimers = [];
let resetTimerId = null;

function cancelCountdowns() {
  if (startCountdown._interval) {
    clearInterval(startCountdown._interval);
    startCountdown._interval = null;
  }
  countdownTimers.forEach(clearTimeout);
  countdownTimers = [];
}

function showSingleRow(text) {
  const rows = document.querySelectorAll("#spec tr");

  if (rows[0]) {
    const c0 = rows[0].querySelector("td");
    if (c0) c0.textContent = text;
    rows[0].style.display = "table-row";
    rows[0].classList.remove("role-range", "role-magic", "role-melee");
    rows[0].classList.add("selected", "callout", "flash");
  }

  for (let i = 1; i < rows.length; i++) {
    const c = rows[i].querySelector("td");
    if (c) c.textContent = "";
    rows[i].style.display = "none";
    rows[i].classList.remove("role-range", "role-magic", "role-melee", "selected", "callout", "flash");
  }

  log(`✅ ${text}`);
}

function startCountdown(label, seconds) {
  cancelCountdowns();
  if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }

  let remaining = seconds;

  function render() {
    if (remaining > 1) {
      showSingleRow(`${label} (${remaining})`);
    } else if (remaining === 1) {
      showSingleRow(label.toUpperCase());
    }
  }

  render();
  startCountdown._interval = setInterval(() => {
    remaining -= 1;
    if (remaining >= 1) {
      render();
    } else {
      clearInterval(startCountdown._interval);
      startCountdown._interval = null;
    }
  }, 1000);
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

const RESPONSES = {
  weak:     "Range > Magic > Melee",
  grovel:   "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function updateUI(key) {
  cancelCountdowns();

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

  if (resetTimerId) clearTimeout(resetTimerId);
  resetTimerId = setTimeout(() => {
    resetUI();
    log("↺ UI reset");
  }, 6000);
}

function resetUI() {
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

function firstNonWhiteColor(seg) {
  if (!seg.fragments) return null;
  for (const f of seg.fragments) {
    if (!isColorNear(f.color, WHITE_RGB)) return f.color;
  }
  return null;
}

const SETTINGS_DEFAULT = {
  role: "Base",         
  bend: "Voke",         
  scarabs: "Barricade", 
  logs: false           
};


function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem("amascut.settings") || "null");
    return Object.assign({}, SETTINGS_DEFAULT, s || {});
  } catch {
    return { ...SETTINGS_DEFAULT };
  }
}

function saveSettings(s) {
  try { localStorage.setItem("amascut.settings", JSON.stringify(s)); } catch {}
}

let SETTINGS = loadSettings();

(function injectSettingsUI(){
  const style = document.createElement("style");
  style.textContent = `
    .ah-cog{position:fixed;top:6px;right:8px;z-index:11000;font-size:16px;opacity:.8;background:#222;
      border:1px solid #444;border-radius:4px;cursor:pointer;padding:4px 6px;line-height:1;}
    .ah-cog:hover{opacity:1}
    .ah-panel{position:fixed;top:30px;right:8px;z-index:11000;background:#1b1b1b;border:1px solid #444;
      border-radius:6px;padding:8px 10px;min-width:220px;box-shadow:0 4px 12px rgba(0,0,0,.5);display:none}
    .ah-row{display:flex;align-items:center;gap:8px;margin:6px 0}
    .ah-row label{min-width:95px;font-size:12px;opacity:.9}
    .ah-panel select{flex:1;background:#111;color:#fff;border:1px solid #555;border-radius:4px;padding:3px}
    .ah-tip{border-bottom:1px dotted #aaa;cursor:help}
  `;
  document.head.appendChild(style);

  const cog = document.createElement("button");
  cog.className = "ah-cog";
  cog.title = "Settings";
  cog.textContent = "⚙️";
  document.body.appendChild(cog);

  const panel = document.createElement("div");
  panel.className = "ah-panel";
panel.innerHTML = `
  <div class="ah-row">
    <label>Role</label>
    <select id="ah-role">
      <option value="DPS">DPS</option>
      <option value="Base">Base</option>
    </select>
  </div>
  <div class="ah-row">
    <label><span class="ah-tip" title="How do you plan to deal with Bend the knee mechanic?">Bend the knee</span></label>
    <select id="ah-bend">
      <option value="Voke">Voke</option>
      <option value="Immort">Immort</option>
    </select>
  </div>
  <div class="ah-row">
    <label><span class="ah-tip" title="How do you plan to deal with Scarabs?">Scarabs</span></label>
    <select id="ah-scarabs">
      <option value="Barricade">Barricade</option>
      <option value="Dive">Dive</option>
    </select>
  </div>
  <div class="ah-row">
    <label>Logs</label>
    <input type="checkbox" id="ah-logs">
  </div>
`;
  document.body.appendChild(panel);

panel.querySelector("#ah-role").value = SETTINGS.role;
panel.querySelector("#ah-bend").value = SETTINGS.bend;
panel.querySelector("#ah-scarabs").value = SETTINGS.scarabs;
panel.querySelector("#ah-logs").checked = SETTINGS.logs;

  cog.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  });
function updateFromUI(){
  SETTINGS.role = panel.querySelector("#ah-role").value;
  SETTINGS.bend = panel.querySelector("#ah-bend").value;
  SETTINGS.scarabs = panel.querySelector("#ah-scarabs").value;
  SETTINGS.logs = panel.querySelector("#ah-logs").checked;
  saveSettings(SETTINGS);

  if (!SETTINGS.logs) {
    const out = document.getElementById("output");
    if (out) out.innerHTML = "";
  }

  log(`⚙️ Settings → role=${SETTINGS.role}, bend=${SETTINGS.bend}, scarabs=${SETTINGS.scarabs}, logs=${SETTINGS.logs}`);
}

  panel.addEventListener("change", updateFromUI);
})();

let lastSig = "";
let lastAt = 0;

function onAmascutLine(full, lineId) {
  // --- NEW: ignore lines older than 2 minutes based on [HH:MM] or [HH:MM:SS] ---
  try {
    const m = lineId && lineId.match(/^\s*\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/);
    if (m) {
      const now = new Date();
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ss = m[3] ? parseInt(m[3], 10) : 0;

      let msgTime = new Date(now);
      msgTime.setHours(hh, mm, ss, 0);

      // handle just-after-midnight wrap (e.g., timestamp ahead of "now" by >5 min → previous day)
      if (msgTime.getTime() - now.getTime() > 5 * 60 * 1000) {
        msgTime.setDate(msgTime.getDate() - 1);
      }

      if (now.getTime() - msgTime.getTime() > 2 * 60 * 1000) {
        return; // too old → don't trigger
      }
    }
  } catch { /* ignore parsing issues and continue */ }
  // --- END NEW ---

  if (lineId && seenLineIds.has(lineId)) return;
  if (lineId) {
    seenLineIds.add(lineId);
    seenLineQueue.push(lineId);
    if (seenLineQueue.length > 120) {
      const old = seenLineQueue.shift();
      seenLineIds.delete(old);
    }
  }

  const raw = full;               
  const low = full.toLowerCase(); 

  let key = null;
  if (raw.includes("Grovel")) key = "grovel";
  else if (/\bWeak\b/.test(raw)) key = "weak";
  else if (raw.includes("Pathetic")) key = "pathetic";
  else if (low.includes("tear them apart")) key = "tear";
  else if (low.includes("tumeken's heart delivered")) key = "barricadeHeart";
  else if (raw.includes("I WILL NOT BE SUBJUGATED")) key = "notSubjugated";
  else if (raw.includes("Crondis... It should have never come to this")) key = "crondis";
  else if (raw.includes("I'm sorry, Apmeken")) key = "apmeken";
  else if (raw.includes("Forgive me, Het")) key = "het";
  else if (raw.includes("Scabaras...")) key = "scabaras";

  if (!key) return;

  const nowTs = Date.now();
  const sig = key + "|" + raw.slice(-80);
  if (sig === lastSig && nowTs - lastAt < 1200) return;
  lastSig = sig;
  lastAt = nowTs;

  if (key === "tear") {
    let first = "none"; 
    if (SETTINGS.role === "DPS" && SETTINGS.bend === "Voke") first = "voke";
    else if (SETTINGS.role === "Base" && SETTINGS.bend === "Immort") first = "immort";

    const firstDuration = (first === "voke" || first === "immort") ? 8 : 0;

    if (first === "voke") {
      startCountdown("Voke → Reflect", 8);
    } else if (first === "immort") {
      startCountdown("Immortality", 8);
    } 

    const scarabDelayMs = (firstDuration ? (firstDuration + 2) : 2) * 1000;

    countdownTimers.push(setTimeout(() => {
      if (SETTINGS.scarabs === "Barricade") {
        let barricadeTime;
        if (SETTINGS.role === "Base" && SETTINGS.bend === "Immort") {
          barricadeTime = 9;     // Base + Immort → 9s
        } else if (SETTINGS.role === "Base") {
          barricadeTime = 18;    // Base + Voke
        } else {
          barricadeTime = 10;    // DPS
        }

        startCountdown("Barricade", barricadeTime);
        countdownTimers.push(setTimeout(() => {
          resetUI();
          log("↺ UI reset");
        }, barricadeTime * 1000));
      } else {

        showSingleRow("Dive");
        countdownTimers.push(setTimeout(() => {
          resetUI();
          log("↺ UI reset");
        }, 8000));
      }
    }, scarabDelayMs));

  } else if (key === "barricadeHeart") {

    startCountdown("Barricade", 12);
    countdownTimers.push(setTimeout(() => {
      resetUI();
      log("↺ UI reset");
    }, 12000));

  } else if (key === "notSubjugated") {

    showSingleRow("Magic Prayer → Devo → Reflect → Melee Prayer");
    setTimeout(() => {
      resetUI();
      log("↺ UI reset");
    }, 8000);

  } else if (key === "crondis") {
    showSingleRow("Crondis (SE)");
    setTimeout(() => {
      resetUI();
      log("↺ UI reset");
    }, 6000);

  } else if (key === "apmeken") {
    showSingleRow("Apmeken (NW)");
    setTimeout(() => {
      resetUI();
      log("↺ UI reset");
    }, 6000);

  } else if (key === "het") {
    showSingleRow("Het (SW)");
    setTimeout(() => {
      resetUI();
      log("↺ UI reset");
    }, 6000);

  } else if (key === "scabaras") {
    showSingleRow("Scabaras (NE)");
    setTimeout(() => {
      resetUI();
      log("↺ UI reset");
    }, 6000);

  } else {

    if (SETTINGS.role === "Base") {
      cancelCountdowns();
      updateUI(key);
    } else {
      log(`(DPS mode) Ignored ${key}`);
    }
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
      if (!s2.fragments || s2.fragments.length === 0) break;
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

/* ============================
   [ADD] Tumeken call-out support
   ============================ */

// [ADD] Tumeken speaker name color captured from your screenshot
const TUMEKEN_NAME_RGB = [23, 41, 42];

// [ADD] Include Tumeken name color in the palette (non-breaking)
try {
  if (reader && reader.readargs && reader.readargs.colors && Array.isArray(reader.readargs.colors)) {
    reader.readargs.colors.push(A1lib.mixColor(...TUMEKEN_NAME_RGB));
  }
} catch { /* safe to ignore */ }

// [ADD] Handle Tumeken’s “(player) shield us from her shadow…” line
function onTumekenLine(full, lineId) {
  if (lineId && seenLineIds.has(lineId)) return;
  if (lineId) {
    seenLineIds.add(lineId);
    seenLineQueue.push(lineId);
    if (seenLineQueue.length > 120) {
      const old = seenLineQueue.shift();
      seenLineIds.delete(old);
    }
  }

  // Extract the player name before the phrase
  const m = full.match(/^\s*([\w\- ']+?)\s+shield us from her shadow/i);
  if (!m) return;

  const player = m[1].trim();
  if (!player) return;

  // de-dupe
  const now = Date.now();
  const sig = "tumekenShield|" + player;
  if (sig === lastSig && now - lastAt < 1200) return;
  lastSig = sig;
  lastAt = now;

  showSingleRow(player);
  countdownTimers.push(setTimeout(() => {
    resetUI();
    log("↺ UI reset");
  }, 8000));
}

// [ADD] Separate reader loop for Tumeken without changing your Amascut loop
function readChatboxTumeken() {
  let segs = [];
  try { segs = reader.read() || []; }
  catch (e) { log("⚠️ reader.read() failed; enable Pixel permission in Alt1."); return; }
  if (!segs.length) return;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!seg.fragments || seg.fragments.length === 0) continue;

    // Confirm the speaker is Tumeken
    if (!/Tumeken/i.test(seg.text)) continue;

    // Build the full spoken text (strip "Tumeken:" + stitch following green lines)
    let full = seg.text;
    const colon = full.indexOf(":");
    if (colon !== -1) full = full.slice(colon + 1).trim();

    for (let j = i + 1; j < segs.length; j++) {
      const s2 = segs[j];
      if (!s2.fragments || s2.fragments.length === 0) break;

      const col = firstNonWhiteColor(s2);
      if (col && isColorNear(col, TEXT_RGB)) {
        full += " " + s2.text.trim();
      } else {
        break;
      }
    }

    if (!full) continue;

    if (/shield us from her shadow/i.test(full)) {
      log("Tumeken says: " + full);
      const lineId = seg.text.trim();
      onTumekenLine(full, lineId);
    }
  }
}

// [ADD] Start Tumeken polling loop (kept separate)
setInterval(readChatboxTumeken, 250);
