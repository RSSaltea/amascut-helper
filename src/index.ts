import * as A1lib from "alt1";
import ChatboxReader from "alt1/chatbox";

import "./appconfig.json";
import "./css/nis.css";
import "./css/style.css";
import "./css/tooltipster.bundle.min.css";
import "./css/tooltipster.css";

if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
} else {
  const addappurl = `alt1://addapp/${new URL(
    "./appconfig.json",
    document.location.href
  ).href}`;
  document.body.innerHTML = `Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app.`;
}

const reader = new ChatboxReader();

reader.readargs = {
  colors: [
    A1lib.mixColor(69, 131, 145),  // “Amascut, the Devourer:” color
    A1lib.mixColor(153, 255, 153), // “Weak/Grovel/Pathetic” color
  ],
};

const appColor = A1lib.mixColor(0, 255, 0);

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
  } catch {}
}

window.setTimeout(() => {
  const handle = setInterval(() => {
    if (reader.pos === null) {
      reader.find();
    } else {
      clearInterval(handle);
      reader.pos.mainbox = reader.pos.boxes[0];
      showSelectedChat(reader.pos);
      setInterval(readChatbox, 600);
    }
  }, 1000);
}, 50);

const responses: Record<"weak"|"grovel"|"pathetic", string> = {
  weak: "Range > Magic > Melee",
  grovel: "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

function readChatbox() {
  const lines = reader.read() || [];
  if (!lines.length) return;

  const full = lines.map(l => l.text).join(" ").toLowerCase();

  if (full.includes("weak")) {
    updateUI("weak");
  } else if (full.includes("grovel")) {
    updateUI("grovel");
  } else if (full.includes("pathetic")) {
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
}
