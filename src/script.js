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
  while (out.childElementCount > 120) out.removeChild(out.lastChild);
}

// If Alt1 not found, show "add app" link
if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML =
    `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

// Create a chatbox reader (CDN build exposes Chatbox.default)
const reader = new Chatbox.default();

/** Build a wide lime palette (r=b, g≈255) to catch the shout even with AA/HDR/DPI quirks */
function buildLimeSweep() {
  const out = [];
  // r/b from 120..200 step 4; g from 248..255
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

function showSelected(chat) {
  try {
    // green “we found it” box
    alt1.overLayRect(
      A1lib.mixColor(0, 255, 0),
      chat.mainbox.rect.x, chat.mainbox.rect.y,
      chat.mainbox.rect.width, chat.mainbox.rect.height,
      2000, 5
    );
    // explicit red box to show the exact OCR rectangle
    alt1.overLayRect(
      A1lib.mixColor(255, 0, 0),
      reader.pos.mainbox.rect.x, reader.pos.mainbox.rect.y,
      reader.pos.mainbox.rect.width, reader.pos.mainbox.rect.height,
      2000, 3
    );
  } catch {}
}

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

// Bind chat, then start loop
setTimeout(() => {
  const h = setInterval(() => {
    try {
      if (reader.pos === null) {
        log("🔍 finding chatbox...");
        reader.find();
      } else {
        clearInterval(h);
        // select first (top-most) chat pane (adjust if you use a different tab)
        reader.pos.mainbox = reader.pos.boxes[0];
        log("✅ chatbox found");
        showSelected(reader.pos);
        setInterval(readChatbox, 300);
      }
    } catch (e) {
      log("⚠️ " + (e && e.message ? e.message : e));
    }
  }, 800);
}, 50);
