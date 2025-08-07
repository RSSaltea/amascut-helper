if (window.alt1 && alt1.identifyAppUrl) {
    alt1.identifyAppUrl("https://rssaltea.github.io/amascut-helper/index.html");
}

A1lib.identifyApp("appconfig.json");
function getChatReader() {
  return chatReader;
}

function parseChat() {
    const lines = chatReader.read();
    for (const line of lines) {
        const text = line.message.toUpperCase();

        if (text.includes("Weak")) {
            updateDisplay("range", "magic", "melee");
        } else if (text.includes("Grovel")) {
            updateDisplay("magic", "melee", "range");
        } else if (text.includes("Pathetic")) {
            updateDisplay("melee", "range", "magic");
        }
    }
}

function updateDisplay(first, second, third) {
    const output = document.getElementById("output");
    output.innerHTML = `
        <span class="${first}">${capitalize(first)}</span> >
        <span class="${second}">${capitalize(second)}</span> >
        <span class="${third}">${capitalize(third)}</span>
    `;
}

function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

setInterval(parseChat, 500);

function toggleVisibility() {
    const output = document.getElementById("output");
    output.style.display = (output.style.display === "none") ? "block" : "none";
}

function changeFontSize(size) {
    const output = document.getElementById("output");
    output.style.fontSize = size;
}

const dragElement = document.getElementById("output");
let offsetX = 0, offsetY = 0, isDragging = false;

dragElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - dragElement.offsetLeft;
    offsetY = e.clientY - dragElement.offsetTop;
});

document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        dragElement.style.left = `${e.clientX - offsetX}px`;
        dragElement.style.top = `${e.clientY - offsetY}px`;
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});
