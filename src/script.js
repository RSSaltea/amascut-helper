// Identify this app with Alt1
A1lib.identifyApp("appconfig.json");

// tiny logger to page + console
function log(msg) {
  console.log(msg);
  const out = document.getElementById("output");
  if (!out) return;
  const d = document.createElement("div");
  d.textContent = msg;
  out.prepend(d);
  while (out.childElementCount > 150) out.removeChild(out.lastChild);
}

// add a small helper button (cycle chat panes)
(function ensureBtn() {
  if (document.getElementById("btn-nextchat")) return;
  const btn = document.createElement("div");
  btn.id = "btn-nextchat";
  btn.textContent = "Next chat";
  btn.style.cssText = "position:fixed;bottom:46px;right:10px;font:12px/22px sans-serif;background:#333;border:1px solid #555;padding:0 8px;border-radius:6px;cursor:pointer;opacity:.9;z-index:9999;";
  btn.onclick = () => cycleChat();
  document.body.appendChild(btn);
})();

// If Alt1 not found, show "add app" link
if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML =
    `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

// Create a chatbox reader
const reader = new Chatbox.default();

/** Build a wide lime palette (r=b, g≈255) to catch the shout even with AA/HDR/DPI quirks */
function buildLimeSweep() {
  const out = [];
  for (let rb = 120; rb <= 200; rb += 4) {
    for (let g = 248; g <= 255; g += 1) {
      out.push(A1lib.mixColor(rb, g, rb));
    }
  }
  return out;
}
const LIME_SWEEP = buildLimeSweep();

// Speaker/name & common UI colors that help OCR return full lines
const COMMON = [
  A1lib.mixColor(69,131,145),   // "Amascut, the Devourer:" cyan-ish
  A1lib.mixColor(255,255,255),  // white
  A1lib.mixColor(127,169,255),  // public chat blue
  A1lib.mixColor(102,152,255),  // drops blue
  A1lib.mixColor(67,188,188),   // teal/system
  A1lib.mixColor(255,255,0),    // yellow
  A1lib.mixColor(235,47,47),    // red
];

reader.readargs = {
  colors: [...LIME_SWEEP, ...COMMON],
  backwards: true
};

log(`OCR color list size: ${reader.readargs.colors.length}`);

// phrase → priority mapping
const RESPONSES = {
  weak:     "Range > Magic > Melee",
  grovel:   "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function updateUI(key) {
  const order = RESPONSES[key].split(" > ");
  const rows = document.querySelectorAll("#spec tr");
  rows.forEach((row, i) => {
    const cell = row.querySelector("td");
    if (cell) cell.textContent = order[i] || "";
    row.classList.toggle("selected", i === 0);
  });
  log(`🎯 UI set to: ${RESPONSES[key]}`);
}

// prevent spam when same phrase repeats quickly
let lastSig = "";
let lastAt = 0;

function readChatbox() {
  let segs = [];
  try {
    segs = reader.read() || [];
  } catch (e) {
    log("⚠️ reader.read() failed; check Alt1 Pixel permission.");
    return;
  }
  if (!segs.length) return;

  // Log ALL segments with their color so we can see what OCR actually captured
  for (const s of segs) {
    const t = (s.text || "").trim();
    if (!t) continue;
    const c = A1lib.decodeColor(s.color);
    log(`SEG: "${t}" rgb=(${c.r},${c.g},${c.b})`);
  }

  const full = segs.map(s => (s.text || "").trim()).filter(Boolean).join(" ").toLowerCase();
  if (!full) return;

  let key = null;
  if (full.includes("weak")) key = "weak";
  else if (full.includes("grovel")) key = "grovel";
  else if (full.includes("pathetic")) key = "pathetic";

  if (key) {
    const now = Date.now();
    const sig = key + "|" + full;
    if (sig !== lastSig || (now - lastAt) > 1500) {
      lastSig = sig;
      lastAt = now;
      log(`✅ matched ${key}`);
      updateUI(key);
    }
  }
}

/* ---------- Multi-chat selection helpers ---------- */
let currentBoxIndex = 0;
let probeTimer = null;

function overlayBoxes() {
  if (!reader.pos || !reader.pos.boxes) return;
  const boxes = reader.pos.boxes;
  boxes.forEach((b, i) => {
    // outline
    alt1.overLayRect(
      i === currentBoxIndex ? A1lib.mixColor(0,255,0) : A1lib.mixColor(255,0,0),
      b.rect.x, b.rect.y, b.rect.width, b.rect.height, 2500, 3
    );
    // label
    alt1.overLayTextEx(`#${i}`, A1lib.mixColor(255,255,255), 14,
      b.rect.x + 6, b.rect.y - 12, 2500, "monospace", true, true);
  });
}

function bindBox(i) {
  reader.pos.mainbox = reader.pos.boxes[i];
  currentBoxIndex = i;
  overlayBoxes();
  log(`🔗 bound to chat box #${i}`);
}

async function autoBindBestBox() {
  if (!reader.pos || !reader.pos.boxes?.length) return;
  overlayBoxes();

  let best = { idx: 0, score: -1 };
  for (let i = 0; i < reader.pos.boxes.length; i++) {
    reader.pos.mainbox = reader.pos.boxes[i];
    // small delay to let capture settle
    await new Promise(r => setTimeout(r, 120));
    let lines = [];
    try { lines = reader.read() || []; } catch {}
    const score = lines.reduce((n, s) => n + ((s.text || "").trim() ? 1 : 0), 0);
    log(`probe #${i}: ${score} segments`);
    if (score > best.score) best = { idx: i, score };
  }
  bindBox(best.idx);
}

function cycleChat() {
  if (!reader.pos || !reader.pos.boxes?.length) return;
  const next = (currentBoxIndex + 1) % reader.pos.boxes.length;
  bindBox(next);
}

// Bind chat, then start loop
setTimeout(() => {
  const h = setInterval(async () => {
    try {
      if (reader.pos === null) {
        log("🔍 finding chatbox...");
        reader.find();
      } else {
        clearInterval(h);
        log(`✅ chatbox found (${reader.pos.boxes.length} box(es))`);
        // auto-probe all boxes to pick the one with the most OCR text
        await autoBindBestBox();

        // start reading
        setInterval(readChatbox, 300);

        // re-probe every 20s in case you switch tabs/layouts
        probeTimer = setInterval(autoBindBestBox, 20000);
      }
    } catch (e) {
      log("⚠️ " + (e && e.message ? e.message : e));
    }
  }, 800);
}, 50);
