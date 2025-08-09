import * as A1lib from "alt1";
import ChatboxReader from "alt1/chatbox";

import "./appconfig.json";
import "./css/nis.css";
import "./css/style.css";
import "./css/tooltipster.bundle.min.css";
import "./css/tooltipster.css";

// ---- tiny helper: safe logger to page + console
function log(msg: string) {
  console.log(msg);
  const out = document.getElementById("output");
  if (out) {
    const p = document.createElement("div");
    p.textContent = msg;
    out.prepend(p);
    while (out.childElementCount > 20) out.removeChild(out.lastChild!);
  }
}

if (window.alt1) {
  alt1.identifyAppUrl("./appconfig.json");
  A1lib.identifyApp("appconfig.json"); // <-- use the imported name, not a1lib
} else {
  const url = new URL("./appconfig.json", document.location.href).href;
  document.body.innerHTML = `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

// --- Chat reader -------------------------------------------------------------
const reader = new ChatboxReader();

// Only read the lime shout and (optionally) Amascut speaker line.
// If you want strictly the lime only, remove the first color.
reader.readargs = {
  colors: [
    // A1lib.mixColor(69, 131, 145),   // "Amascut, the Devourer:" speaker line (optional)
    A1lib.mixColor(153, 255, 153),  // Weak / Grovel / Pathetic (required)
  ],
  backwards: true, // newest first tends to be nicer
};

// visualise which chat was bound
function showSelected(chat: any) {
  try {
    alt1.overLayRect(
      A1lib.mixColor(0, 255, 0),
      chat.mainbox.rect.x, chat.mainbox.rect.y,
      chat.mainbox.rect.width, chat.mainbox.rect.height,
      2000, 5
    );
  } catch {}
}

// phrase → priority mapping
const responses: Record<"weak"|"grovel"|"pathetic", string> = {
  weak:     "Range > Magic > Melee",
  grovel:   "Magic > Melee > Range",
  pathetic: "Melee > Range > Magic",
};

// de-duplicate spammy repeats
let lastFired = "";
let lastAt = 0;

function readChatbox() {
  let segs: { text?: string }[] = [];
  try {
    segs = reader.read() || [];
  } catch (e) {
    log("⚠️ reader.read() failed; check Alt1 permissions (Pixel).");
    return;
  }
  if (!segs.length) {
    log("⏳ no OCR segments");
    return;
  }

  const full = segs.map(s => (s.text || "")).join(" ").toLowerCase();
  if (!full.trim()) return;

  log(`📋 "${full}"`);

  let key: "weak"|"grovel"|"pathetic"|null = null;
  if (full.includes("weak")) key = "weak";
  else if (full.includes("grovel")) key = "grovel";
  else if (full.includes("pathetic")) key = "pathetic";

  if (key) {
    // Avoid repeating the same call every tick
    const now = Date.now();
    const sig = key + "|" + full;
    if (sig !== lastFired || (now - lastAt) > 1500) {
      lastFired = sig;
      lastAt = now;
      log(`✅ matched ${key}`);
      updateUI(key);
    }
  }
}

function updateUI(key: "weak"|"grovel"|"pathetic") {
  const order = responses[key].split(" > ");
  const rows = document.querySelectorAll<HTMLTableRowElement>("#spec tr");
  rows.forEach((row, i) => {
    const cell = row.querySelector<HTMLTableCellElement>("td");
    if (cell) cell.textContent = order[i] || "";
    row.classList.toggle("selected", i === 0);
  });
  log(`🎯 UI set to: ${responses[key]}`);
}

// --- Boot: find & bind chat, then read --------------------------------------
window.setTimeout(() => {
  const h = setInterval(() => {
    try {
      if (reader.pos === null) {
        log("🔍 finding chatbox...");
        reader.find();
      } else {
        clearInterval(h);
        // choose the first (top-most) chat box
        reader.pos.mainbox = reader.pos.boxes[0];
        log("✅ chatbox found");
        showSelected(reader.pos);
        // Add a tiny log panel if not present
        if (!document.getElementById("output")) {
          const out = document.createElement("div");
          out.id = "output";
          out.style.fontSize = "11px";
          out.style.opacity = "0.75";
          out.style.marginTop = "8px";
          document.body.appendChild(out);
        }
        setInterval(readChatbox, 300); // slightly faster feels snappier
      }
    } catch (e: any) {
      log(`⚠️ ${e?.message || e}`);
    }
  }, 800);
}, 50);
