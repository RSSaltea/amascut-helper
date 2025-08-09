A1lib.identifyApp("appconfig.json");

function log(msg) {
  console.log(msg);
  const out = document.getElementById("output");
  if (!out) return;
  const d = document.createElement("div");
  d.textContent = msg;
  out.prepend(d);
  while (out.childElementCount > 50) out.removeChild(out.lastChild);
}

if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML =
    `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

let reader = new Chatbox.default();
reader.readargs = { backwards: true };

// Load images for detection
let imgGrovel = new Image();
imgGrovel.src = "./src/Grovel.png";

let imgPathetic = new Image();
imgPathetic.src = "./src/Pathetic.png";

let imgWeak = new Image();
imgWeak.src = "./src/Weak.png";

// Prepare a canvas for matching
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

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

let lastSig = "";
let lastAt = 0;

function detectByImage(chatImage) {
  let matches = [];

  const templates = [
    { key: "grovel", img: imgGrovel },
    { key: "pathetic", img: imgPathetic },
    { key: "weak", img: imgWeak }
  ];

  for (let t of templates) {
    ctx.drawImage(t.img, 0, 0);
    let templateData = ctx.getImageData(0, 0, t.img.width, t.img.height);

    let matchCount = chatImage.countMatch(templateData, false).passed;
    if (matchCount >= 150) { // Threshold — tweak if needed
      matches.push(t.key);
    }
  }

  return matches.length > 0 ? matches[0] : null;
}

function readChatbox() {
  let segs = [];
  try { segs = reader.read() || []; } catch (e) {
    log("⚠️ reader.read() failed; check Alt1 Pixel permission.");
    return;
  }
  if (!segs.length) return;

  const texts = segs.map(s => (s.text || "").trim()).filter(Boolean);
  log("segs: " + JSON.stringify(texts.slice(-6)));

  const full = texts.join(" ").toLowerCase();

  // OCR detection
  let key = null;
  if (full.includes("weak")) key = "weak";
  else if (full.includes("grovel")) key = "grovel";
  else if (full.includes("pathetic")) key = "pathetic";

  // Image detection as fallback
  if (!key) {
    let chatImg = reader.readraw();
    if (chatImg) {
      let imgKey = detectByImage(chatImg);
      if (imgKey) {
        log(`🖼 Image match: ${imgKey}`);
        key = imgKey;
      }
    }
  }

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
