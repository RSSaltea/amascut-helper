// Identify this app with Alt1
A1lib.identifyApp("../appconfig.json");

// Simple logger to page + console
function log(msg) {
    console.log(msg);
    const out = document.getElementById("output");
    if (out) {
        const div = document.createElement("div");
        div.textContent = msg;
        out.prepend(div);
        while (out.childElementCount > 100) out.removeChild(out.lastChild);
    }
}

// Alt1 detect / add link
if (window.alt1) {
    alt1.identifyAppUrl("../appconfig.json");
} else {
    const url = new URL("../appconfig.json", document.location.href).href;
    document.body.innerHTML =
        `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

// Create a chatbox reader
const reader = new Chatbox.default();

// Simple readargs for all colors
reader.readargs = {
    colors: A1lib.mixColor(255, 255, 255),
    backwards: true
};

log(`OCR color list size: ${reader.readargs.colors.length}`);

// Mappings
const RESPONSES = {
    weak:     "Range > Magic > Melee",
    grovel:   "Magic > Melee > Range",
    pathetic: "Melee > Range > Magic",
};

// Update the UI table
function updateUI(key) {
    const order = RESPONSES[key].split(" > ");
    const rows = document.querySelectorAll("#spec tr");
    rows.forEach((row, i) => {
        const cell = row.querySelector("td");
        if (cell) cell.textContent = order[i] || "";
        row.classList.toggle("selected", i === 0);
    });
    log(`🎯 Updated UI to: ${RESPONSES[key]}`);
}

// Anti-spam
let lastSig = "";
let lastAt = 0;

function readChatbox() {
    let segs = [];
    try {
        segs = reader.read() || [];
    } catch (e) {
        log("⚠️ reader.read() failed; check capture settings");
        return;
    }
    if (!segs.length) return;

    // Log all segments
    for (const s of segs) {
        const t = (s.text || "").trim();
        if (!t) continue;
        log(`SEG: "${t}"`);
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
            updateUI(key);
        }
    }
}

// Bind to chat and start reading
setTimeout(() => {
    const h = setInterval(() => {
        if (reader.pos === null) {
            log("🔍 finding chatbox...");
            reader.find();
        } else {
            clearInterval(h);
            log("✅ chatbox found");
            // Show the area it’s reading
            alt1.overLayRect(
                A1lib.mixColor(255, 0, 0),
                reader.pos.mainbox.rect.x, reader.pos.mainbox.rect.y,
                reader.pos.mainbox.rect.width, reader.pos.mainbox.rect.height,
                2000, 3
            );
            // Start loop
            setInterval(readChatbox, 300);
        }
    }, 800);
}, 50);
