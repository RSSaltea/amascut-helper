# Amascut Helper

![Amascut Helper Screenshot](./assets/shitgif.gif)

An **Alt1 Toolkit** app to assist with **Hardmode Amascut** mechanics in RuneScape.
This tool listens to in-game chat for Amascut's special callouts and provides clear, real-time instructions so you can focus on the fight.

---

## Installation

[![Install in Alt1](https://img.shields.io/badge/Install_in-Alt1_Toolkit-c98736?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABhSURBVDhPY/j//z8DEIMBIwMKwCdJECRBDmBioBIYNRgZkIIYJERNp/7//59BkJuNAUMjAwMDg5+jOQM2jTBNYIkzl+4zCHKxYWrEpgkscebyPQZBbnZMjbg0gSUoAQBZhCEPfNkKxgAAAABJRU5ErkJggg==)](https://rssaltea.github.io/amascut-helper/install.html)

> Requires [Alt1 Toolkit](https://runeapps.org/alt1) to be installed.

**Manual install:**

1. Download this repo or the `app` folder.
2. In Alt1, click the cog > **Add from File** > select `appconfig.json`.

---

## Features

* **Hardmode Specific** - Tailored for Hardmode Amascut mechanics. May work in Normal Mode but is not guaranteed.
* **Mechanic Callouts** - Detects chat lines from Amascut and displays what style you should pray for.
* **Deity Location Tracking** - Shows Hardmode deity locations when Amascut calls them out.
* **Movable Overlay** - Drag the UI anywhere on your screen; position persists between sessions.
* **Lightweight & Non-Intrusive** - Fully runs in Alt1 with minimal overhead.

---

## How It Works

1. **Finds Your Chatbox** - The app locates your RuneScape chatbox in Alt1.
2. **Reads Specific Colours** - It listens for Amascut's lines using the known chat colour codes.
3. **Matches Trigger Phrases** - Each mechanic is tied to a specific trigger phrase.
4. **Updates the Overlay** - The floating overlay updates instantly with style, deity, or mechanic info.
5. **Optional Toggles** - Configure which elements you want visible.

---

## Special Callouts

In addition to standard mechanics, this app handles Hardmode deity location lines:

| Amascut's Line                                 | Displayed In App |
| ---------------------------------------------- | ---------------- |
| `Crondis... It should have never come to this` | `Crondis (SE)`   |
| `I'm sorry, Apmeken`                           | `Apmeken (NW)`   |
| `Forgive me, Het`                              | `Het (SW)`       |
| `Scabaras...`                                  | `Scabaras (NE)`  |

---

## Usage

* Open the app in Alt1.
* Ensure your chatbox is visible in a standard format Alt1 can read.
* Move/resize the overlay as you like.
* Toggle optional features in the UI.
* Fight Amascut - your overlay updates automatically.

---

## Notes

* Developed for **Hardmode**.
* Normal mode may work but is not guaranteed.
* For issues or suggestions, DM **`.saltea`** on Discord.

---

## Credit

* Credit to Duk + Ellam for help for the initial release.

---

## License

Free to use or modify. Please credit if redistributed.
