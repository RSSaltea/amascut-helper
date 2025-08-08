import * as A1lib from "alt1";
import ChatboxReader from "alt1/chatbox";

import "./appconfig.json";
import "./css/nis.css";
import "./css/style.css";
import "./css/tooltipster.bundle.min.css";
import "./css/tooltipster.css";

// ——— In-App Logger ———
const logDiv = document.createElement("div");
logDiv.id = "logPanel";
Object.assign(logDiv.style, {
  position: "absolute",
  bottom: "0",
  left: "0",
  width: "100%",
  maxHeight: "120px",
  overflowY: "auto",
  background: "rgba(0,0,0,0.8)",
  color: "#0f0",
  fontSize: "11px",
  lineHeight: "1.2",
  padding: "4px",
  zIndex: "9999",
});
document.body.appendChild(logDiv);
function log(msg: string) {
  logDiv.textContent += msg + "\n";
}

if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML = `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}


const reader = new ChatboxReader();

reader.readargs = {
  colors: [
    A1lib.mixColor(69, 131, 145),   // Amascut, the Devourer:
    A1lib.mixColor(153, 255, 153),  // Weak / Grovel / Pathetic
  ],
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

window.setTimeout(() => {
  const h = setInterval(() => {
    if (reader.pos === null) {
      log("🔍 finding chatbox...");
      reader.find();
    } else {
      clearInterval(h);
      reader.pos.mainbox = reader.pos.boxes[0];
      log("✅ chatbox found");
      showSelected(reader.pos);
      setInterval(readChatbox, 600);
    }
  }, 1000);
}, 50);

// phrase → priority mapping
const responses: Record<"weak"|"grovel"|"pathetic", string> = {
  weak:     "Range > Magic > Melee",
  grovel:   "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function readChatbox() {
  const segs = reader.read() || [];
  if (!segs.length) {
    log("⏳ no OCR segments");
    return;
  }

  const full = segs.map(s => s.text).join(" ").toLowerCase();
  log(`📋 "${full}"`);
  if (full.includes("weak")) {
    log("✅ matched weak");
    updateUI("weak");
  } else if (full.includes("grovel")) {
    log("✅ matched grovel");
    updateUI("grovel");
  } else if (full.includes("pathetic")) {
    log("✅ matched pathetic");
    updateUI("pathetic");
  }
}

function updateUI(key: "weak"|"grovel"|"pathetic") {
  const order = responses[key].split(" > ");
  const rows = document.querySelectorAll("#spec tr");
  rows.forEach((row, i) => {
    const cell = row.querySelector("td");
    if (cell) cell.textContent = order[i] || "";
    row.classList.toggle("selected", i === 0);
  });
  log(`🎯 UI set to: ${responses[key]}`);
}
