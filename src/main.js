import * as A1lib from "alt1";
import ChatboxReader from "alt1/chatbox";

import "./index.html";
import "./appconfig.json";
import "./css/style.css";

if (window.alt1) {
    alt1.identifyAppUrl("./appconfig.json");
} else {
    let addappurl = `alt1://addapp/${new URL("./appconfig.json", document.location.href).href}`;
    document.body.innerHTML = `Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1.`;
}

const appColor = A1lib.mixColor(0, 255, 0);
const reader = new ChatboxReader();

reader.readargs = {
    colors: [A1lib.mixColor(255, 255, 255)], // Adjust this color if Amascut uses different
};

const responses = {
    weak: "Range > Magic > Melee",
    grovel: "Magic > Melee > Range",
    pathetic: "Melee > Range > Magic"
};

function showSelectedChat(chat) {
    try {
        alt1.overLayRect(appColor, chat.mainbox.rect.x, chat.mainbox.rect.y, chat.mainbox.rect.width, chat.mainbox.rect.height, 2000, 5);
    } catch {}
}

window.setTimeout(() => {
    let findChat = setInterval(() => {
        if (reader.pos === null) reader.find();
        else {
            clearInterval(findChat);
            reader.pos.mainbox = reader.pos.boxes[0];
            showSelectedChat(reader.pos);
            setInterval(readChatbox, 600);
        }
    }, 1000);
}, 50);

function readChatbox() {
    const lines = reader.read() || [];
    for (const line of lines) {
        const text = line.text.toLowerCase();

        if (text.includes("weak")) {
            updateUI("weak");
            return;
        }
        if (text.includes("grovel")) {
            updateUI("grovel");
            return;
        }
        if (text.includes("pathetic")) {
            updateUI("pathetic");
            return;
        }
    }
}

function updateUI(key: "weak" | "grovel" | "pathetic") {
    const priority = responses[key].split(" > ");
    const rows = document.querySelectorAll("#spec tr");

    rows.forEach((row, index) => {
        const cell = row.querySelector("td");
        if (cell) cell.textContent = priority[index] || "";
        row.classList.toggle("selected", index === 0);
    });
}
