# Amascut Helper

An **Alt1 Toolkit** app to assist with **Hardmode Amascut** mechanics in RuneScape.  
This tool listens to in-game chat for Amascut's special callouts and provides clear, real-time instructions so you can focus on the fight.

---

## Features

- **Hardmode Specific** – This app is tailored for Hardmode Amascut mechanics only.
- **Mechanic Callouts** – Detects chat lines from Amascut and shows the corresponding priority order, location, or ability you should use.
- **Countdown Timers** – Displays timers for critical abilities such as Barricade, Voke → Reflect, and Immortality.
- **Custom Settings Panel** – Configure:
  - Your role (`DPS` or `Base`)
  - How you handle *Bend the Knee* (`Voke` or `Immort`)
  - How you handle *Scarabs* (`Barricade` or `Dive`)
  - Toggle in-game log output
- **Lightweight & Non-Intrusive** – No imports, integrates directly with your HTML.

---

## How It Works

1. **Finds Your Chatbox** – The app locates your RuneScape chatbox in Alt1.
2. **Reads Specific Colors** – It listens for Amascut's lines using the known chat color codes.
3. **Matches Trigger Phrases** – Each mechanic is tied to a specific trigger phrase in Amascut's dialogue.
4. **Displays Instructions** – The UI updates instantly with what you need to do, sometimes with a countdown.

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

1. Click this link to install directly into Alt1:  
   **[Install Amascut Helper](alt1://addapp/https://rssaltea.github.io/amascut-helper/appconfig.json)**
2. Alternatively:
   - Download the app folder or clone this repo.
   - Open the folder in Alt1 Toolkit.
   - Click the cog in Alt1 and select **"Add from File"**, pointing it to `appconfig.json`.

---

## Usage

- Launch the app in Alt1.
- Make sure your chatbox is visible and in a standard Alt1-readable format.
- Configure your settings via the ⚙️ **Settings Cog**:
  - Role
  - Bend the Knee strategy
  - Scarabs strategy
  - Logs toggle
- The UI will update automatically during the fight.

---

## Notes

- This is **Hardmode only** – some mechanics and timings differ in Normal mode.
- For **any issues, questions, or suggestions**, please DM **`.saltea`** on Discord.

---

## License

This project is free to use and modify for personal use. Please credit if redistributed.
