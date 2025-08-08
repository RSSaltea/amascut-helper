import * as A1lib from "alt1";
import ChatboxReader from "alt1/chatbox";

import "./appconfig.json";
import "./css/nis.css";
import "./css/style.css";
import "./css/tooltipster.bundle.min.css";
import "./css/tooltipster.css";

// ———————— In-App Logger ————————
// create a <div> at bottom of screen to capture logs
const logContainer = document.createElement("div");
logContainer.id = "log";
Object.assign(logContainer.style, {
  position: "absolute",
  bottom: "0",
  left: "0",
  width: "100%",
  maxHeight: "150px",
  overflowY: "auto",
  background: "rgba(0,0,0,0.7)",
  color: "white",
  fontSize: "12px",
  padding: "5px",
  whiteSpace: "pre-wrap",
  zIndex: "9999",
});
document.body.appendChild(logContainer);
function log(msg: string) {
  logContainer.textContent += msg + "\n";
}
// ————————————————————————————

if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const addappurl = `alt1://addapp/${new URL(
    "./appconfig.json",
    document.location.href
  ).href}`;
  document.body.innerHTML = `Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1.`;
}

const appColor = A1lib.mixColor(0, 255, 0);
const reader = new ChatboxReader();

// only the exact light-green used by Amascut’s chat
reader.readargs = {
  colors: [A1lib.mixColor(153, 255, 153)],
};

const responses: Record<string, string> = {
  weak: "Range > Magic > Melee",
  grovel: "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function showSelectedChat(chat) {
  try {
    alt1.overLayRect(
      appColor,
      chat.mainbox.rect.x,
      chat.mainbox.rect.y,
      chat.mainbox.rect.width,
      chat.mainbox.rect.height,
      2000,
      5
    );
  } catch (e) {
    log("Overlay failed: " + e);
  }
}

window.setTimeout(() => {
  const findChat = setInterval(() => {
    if (reader.pos === null) {
      log("🔍 searching for chatbox…");
      reader.find();
    } else {
      clearInterval(findChat);
      reader.pos.mainbox = reader.pos.boxes[0];
      log("✅ chatbox found at " +
        JSON.stringify(reader.pos.mainbox.rect));
      showSelectedChat(reader.pos);
      setInterval(readChatbox, 600);
    }
  }, 1000);
}, 50);

function readChatbox() {
  const lines = reader.read() || [];
  if (!lines.length) {
    log("⏳ no lines read");
    return;
  }
  for (const line of lines) {
    const text = line.text.toLowerCase();
    const { r, g, b } = A1lib.decodeColor(line.color);
    log(`📜 "${line.text}" (rgb ${r},${g},${b})`);

    if (text.includes("weak")) {
      log("👉 matched: weak");
      updateUI("weak");
      return;
    }
    if (text.includes("grovel")) {
      log("👉 matched: grovel");
      updateUI("grovel");
      return;
    }
    if (text.includes("pathetic")) {
      log("👉 matched: pathetic");
      updateUI("pathetic");
      return;
    }
  }
}

function updateUI(key: "weak" | "grovel" | "pathetic") {
  const priority = responses[key].split(" > ");
  const rows = document.querySelectorAll("#spec tr");
  rows.forEach((row, i) => {
    const cell = row.querySelector("td");
    if (cell) cell.textContent = priority[i] || "";
    row.classList.toggle("selected", i === 0);
  });
  log(`🎯 UI updated for "${key}" → ${responses[key]}`);
}
