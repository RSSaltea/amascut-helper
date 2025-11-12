# Amascut Helper by Saltea (credit to Ellam + Duk)

An **Alt1 Toolkit** app to assist with **Hardmode Amascut** mechanics in RuneScape.  
This tool listens to in-game chat for Amascut's special callouts and provides clear, real-time instructions so you can focus on the fight.

---

## Features

- **Hardmode Specific** – This app is tailored for Hardmode Amascut mechanics only. It may work in Normal Mode but it has not been tested in Normal Mode.
- **Mechanic Callouts** – Detects chat lines from Amascut and shows the corresponding priority order.
- **Lightweight & Non-Intrusive** – No imports, integrates directly with your HTML.

---

## How It Works

1. **Finds Your Chatbox** – The app locates your RuneScape chatbox in Alt1.
2. **Reads Specific Colors** – It listens for Amascut's lines using the known chat color codes.
3. **Matches Trigger Phrases** – Each mechanic is tied to a specific trigger phrase in Amascut's dialogue.
4. **Displays Instructions** – The UI updates instantly with what mechanic it is, sometimes with a countdown.

---

## Special Callouts

In addition to standard mechanics, this app also handles Hardmode deity location lines:

| Amascut's Line                                           | Displayed In App |
| -------------------------------------------------------- | ---------------- |
| `Crondis... It should have never come to this`           | `Crondis (SE)`   |
| `I'm sorry, Apmeken`                                     | `Apmeken (NW)`   |
| `Forgive me, Het`                                        | `Het (SW)`       |
| `Scabaras...`                                            | `Scabaras (NE)`  |

---

## Installation

1. **Copy this into your browser to install in Alt1:**  
   - `alt1://addapp/https://rssaltea.github.io/amascut-helper/appconfig.json`

2. **Manual install:**
   - Download this repo or the app folder.
   - In Alt1, click the cog → **Add from File** → select `appconfig.json`.

---

## Usage

- Launch the app in Alt1.
- Make sure your chatbox is visible and in a standard Alt1-readable format.
- The UI will update automatically during the fight.

---

## Notes

- This is **Hardmode only** – some mechanics differ from Normal Mode.
- For **any issues, questions, or suggestions**, please DM **`.saltea`** on Discord.

---

## License

This project is free to use and modify for personal use. Please credit if redistributed.
