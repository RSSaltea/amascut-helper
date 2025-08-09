// Alt1 app identification
A1lib.identifyApp("appconfig.json");

// UI logging helper
function log(msg: string) {
    console.log(msg);
    const out = document.getElementById("output");
    if (!out) return;
    const d = document.createElement("div");
    d.textContent = msg;
    out.prepend(d);
    while (out.childElementCount > 50) out.removeChild(out.lastChild);
}

// Detect if running in Alt1 or browser
if (window.alt1) {
    alt1.identifyAppUrl("./appconfig.json");
} else {
    const url = new URL("./appconfig.json", document.location.href).href;
    document.body.innerHTML =
        `Alt1 not detected, click <a href="alt1://addapp/${url}">here</a> to add this app.`;
}

// Import images for image detection
import GrovelImg from "./Grovel.png";
import PatheticImg from "./Pathetic.png";
import WeakImg from "./Weak.png";

// Create Webpack image objects
const imgs = a1lib.ImageDetect.webpackImages({
    grovel: GrovelImg,
    pathetic: PatheticImg,
    weak: WeakImg
});

// Set up chatbox reader
let reader = new Chatbox.default();

// lime greens for Weak/Grovel/Pathetic text detection
let LIME_GREENS = [
    A1lib.mixColor(145, 255, 145),
    A1lib.mixColor(148, 255, 148),
    A1lib.mixColor(150, 255, 150),
    A1lib.mixColor(153, 255, 153),
    A1lib.mixColor(156, 255, 156),
    A1lib.mixColor(159, 255, 159),
    A1lib.mixColor(162, 255, 162)
];

// general chat colors for OCR stability
let GENERAL_CHAT = [
    A1lib.mixColor(255, 255, 255),
    A1lib.mixColor(127, 169, 255),
    A1lib.mixColor(102, 152, 255),
    A1lib.mixColor(67, 188, 188),
    A1lib.mixColor(255, 255, 0),
    A1lib.mixColor(235, 47, 47),
];

reader.readargs = {
    colors: [...LIME_GREENS, ...GENERAL_CHAT],
    backwards: true
};

const RESPONSES: Record<string, string> = {
    weak: "Range > Magic > Melee",
    grovel: "Magic > Melee > Range",
    pathetic: "Melee > Range > Magic",
};

// Show green overlay on detected chatbox
function showSelected(chat: any) {
    try {
        alt1.overLayRect(
            A1lib.mixColor(0, 255, 0),
            chat.mainbox.rect.x, chat.mainbox.rect.y,
            chat.mainbox.rect.width, chat.mainbox.rect.height,
            2000, 5
        );
    } catch { }
}

// Update UI table
function updateUI(key: string) {
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

// OCR detection
function readChatbox() {
    let segs: any[] = [];
    try { segs = reader.read() || []; } catch (e) {
        log("⚠️ reader.read() failed; check Alt1 Pixel permission.");
        return;
    }
    if (!segs.length) return;

    const texts = segs.map(s => (s.text || "").trim()).filter(Boolean);
    if (!texts.length) return;

    log("segs: " + JSON.stringify(texts.slice(-6)));

    const full = texts.join(" ").toLowerCase();

    let key: string | null = null;
    if (full.includes("weak")) key = "weak";
    else if (full.includes("grovel")) key = "grovel";
    else if (full.includes("pathetic")) key = "pathetic";

    if (key) triggerUpdate(key, full);
}

// Image detection
function readImages() {
    for (const [key, img] of Object.entries(imgs)) {
        const pos = a1lib.ImageDetect.findSubimage(img);
        if (pos.length > 0) {
            triggerUpdate(key, `img:${key}`);
        }
    }
}

// Avoid duplicate updates
function triggerUpdate(key: string, sigSource: string) {
    const now = Date.now();
    const sig = key + "|" + sigSource;
    if (sig !== lastSig || (now - lastAt) > 1500) {
        lastSig = sig;
        lastAt = now;
        log(`✅ matched ${key}`);
        updateUI(key);
    }
}

// Wait for chatbox, then start both detectors
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
                setInterval(readImages, 500);
            }
        } catch (e) {
            log("⚠️ " + (e && e.message ? e.message : e));
        }
    }, 800);
}, 50);
