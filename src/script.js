// Identify this app with Alt1
A1lib.identifyApp("appconfig.json");

// Logger for both console + small overlay in HTML
function log(msg) {
  console.log(msg);
  const out = document.getElementById("output");
  if (!out) return;
  const d = document.createElement("div");
  d.textContent = msg;
  out.prepend(d);
  while (out.childElementCount > 20) out.removeChild(out.lastChild);
}

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
reader.readargs = {
  colors: [
    // Only green text from Amascut callouts
    A1lib.mixColor(153, 255, 153),
  ],
  backwards: true
};

// Map phrases → priority order
const responses = {
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
  } catch {}
}

function updateUI(key) {
  const order = responses[key].split(" > ");
  const rows = document.querySelectorAll("#spec tr");
  rows.forEach((row, i) => {
    const cell = row.querySelector("td");
    if (cell) cell.textContent = order[i] || "";
    row.classList.toggle("selected", i === 0);
  });
  log(`🎯 UI set to: ${responses[key]}`);
}

// Prevents spamming UI if same phrase repeats quickly
let lastSig = "";
let lastAt = 0;

function readChatbox() {
  let segs = [];
  try { segs = reader.read() || []; } catch(e) {
    log("⚠️ reader.read() failed; check Alt1 Pixel permission.");
    return;
  }
  if (!segs.length) return;

  const full = segs.map(s => s.text || "").join(" ").toLowerCase();
  if (!full.trim()) return;

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

// Try to find the chatbox
setTimeout(() => {
  const h = setInterval(() => {
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
  }, 800);
}, 50);
