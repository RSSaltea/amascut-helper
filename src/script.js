// Identify app with Alt1
A1lib.identifyApp("appconfig.json");

// Simple logger to the page + console
function log(msg) {
  try { console.log(msg); } catch {}
  const out = document.getElementById("output");
  if (!out) return;
  const d = document.createElement("div");
  d.textContent = String(msg);
  out.prepend(d);
  while (out.childElementCount > 80) out.removeChild(out.lastChild);
}

// Show runtime errors in the output pane
window.addEventListener("error", e => log("⚠️ " + (e.message || e)));

log("🟢 script (pre-webpack) loaded");

// Alt1 detect / add link
if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML =
    `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

// Create chatbox reader
const reader = new Chatbox.default();

// Lime greens for “Weak/Grovel/Pathetic”
const LIME_GREENS = [
  A1lib.mixColor(145,255,145),
  A1lib.mixColor(148,255,148),
  A1lib.mixColor(150,255,150),
  A1lib.mixColor(153,255,153),
  A1lib.mixColor(156,255,156),
  A1lib.mixColor(159,255,159),
  A1lib.mixColor(162,255,162)
];

// General chat colours to stabilize OCR
const GENERAL_CHAT = [
  A1lib.mixColor(255,255,255),  // white
  A1lib.mixColor(127,169,255),  // public blue
  A1lib.mixColor(102,152,255),  // drops blue
  A1lib.mixColor(67,188,188),   // teal/system
  A1lib.mixColor(255,255,0),    // yellow
  A1lib.mixColor(235,47,47),    // red
];

reader.readargs = {
  colors: [...LIME_GREENS, ...GENERAL_CHAT],
  backwards: true
};

const RESPONSES = {
  weak:     "Range > Magic > Melee",
  grovel:   "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function showSelected(chat) {
  try {
    alt1.overLayRect(
      A1lib.mixColor(0, 255, 0),
      chat.mainbox.rect.x, chat.mainbox.rect.y,
      chat.mainbox.rect.width, chat.mainbox.rect.height,
      2000, 5
    );
  } catch (e) {
    log("overlay error: " + (e && e.message ? e.message : e));
  }
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

// Anti-spam
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

  const texts = segs.map(s => (s.text || "").trim()).filter(Boolean);
  if (!texts.length) return;

  // This is the “it’s reading chat” proof we used before
  log("segs: " + JSON.stringify(texts.slice(-6)));

  const full = texts.join(" ").toLowerCase();

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

// Bind to chat and start reading
setTimeout(() => {
  const h = setInterval(() => {
    try {
      if (reader.pos === null) {
        log("🔍 finding chatbox...");
        reader.find();
      } else {
        clearInterval(h);
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
