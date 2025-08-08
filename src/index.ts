import * as A1lib from "alt1";
import ChatboxReader from "alt1/chatbox";

import "./appconfig.json";
import "./css/nis.css";
import "./css/style.css";
import "./css/tooltipster.bundle.min.css";
import "./css/tooltipster.css";

// Identify Alt1 app
if (window.alt1) {
    alt1.identifyAppUrl("./appconfig.json");
} else {
    const addappurl = `alt1://addapp/${new URL("./appconfig.json", document.location.href).href}`;
    document.body.innerHTML = `Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1.`;
}

// Setup ChatboxReader
const appColor = A1lib.mixColor(0, 255, 0);
const reader = new ChatboxReader();

// Use the correct color for Amascut's dialogue: light green
reader.readargs = {
    colors: [A1lib.mixColor(153, 255, 153)],
};

// Mapping Amascut phrases to combat priority
const responses: Record<string, string> = {
    weak: "Range > Magic > Melee",
    grovel: "Magic > Melee > Range",
    pathetic: "Melee > Range > Magic",
};

// Optional: draw overlay rectangle to show chatbox found
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
        console.warn("Overlay failed:", e);
    }
}

// Begin trying to find the chatbox
window.setTimeout(() => {
    const findChat = setInterval(() => {
        if (reader.pos === null) {
            console.log("Searching for chatbox...");
            reader.find();
        } else {
            clearInterval(findChat);
            reader.pos.mainbox = reader.pos.boxes[0];
            console.log("Chatbox found:", reader.pos);
            showSelectedChat(reader.pos);
            setInterval(readChatbox, 600);
        }
    }, 1000);
}, 50);

// Periodically read from the chatbox and update UI
function readChatbox() {
    const lines = reader.read() || [];

    if (!lines.length) {
        console.log("No lines found.");
        return;
    }

    for (const line of lines) {
        const text = line.text.toLowerCase();
        const color = A1lib.decodeColor(line.color);
        console.log(`Line: "${line.text}" | RGB: (${color.r}, ${color.g}, ${color.b})`);

        if (text.includes("weak")) {
            console.log("Matched: weak");
            updateUI("weak");
            return;
        }
        if (text.includes("grovel")) {
            console.log("Matched: grovel");
            updateUI("grovel");
            return;
        }
        if (text.includes("pathetic")) {
            console.log("Matched: pathetic");
            updateUI("pathetic");
            return;
        }
    }
}

// Update the UI with the correct combat order
function updateUI(key: "weak" | "grovel" | "pathetic") {
    const priority = responses[key].split(" > ");
    const rows = document.querySelectorAll("#spec tr");

    rows.forEach((row, index) => {
        const cell = row.querySelector("td");
        if (cell) cell.textContent = priority[index] || "";
        row.classList.toggle("selected", index === 0);
    });
}
