# StreetCheck — User Manual

> **StreetCheck** shows you the safety score of every road in Hyderabad —
> so you can choose the safest route, not just the fastest one.

## Getting Started

Open the app at: https://sid529-gif.github.io/StreetCheck/

No account required. No personal data is collected.

---

## The Map

When you open StreetCheck, you see Hyderabad's roads coloured by safety:

| Colour   | Meaning                                 | Score  |
| -------- | --------------------------------------- | ------ |
| 🟢 Green | Safe — well-lit, good surface, low risk | 75–100 |
| 🟡 Amber | Caution — some issues present           | 45–74  |
| 🔴 Red   | Avoid if possible — multiple hazards    | 0–44   |

### Switching layers

Use the layer toggle (top-right of the map) to view roads scored by a single dimension:

- **All** — composite safety score (default)
- **Lighting** — street-by-street lighting coverage
- **Flood Risk** — monsoon inundation risk
- **Surface** — road surface condition
- **Walkability** — footpath and sidewalk coverage

---

## Checking a Road

Tap or click any road segment to open its detail panel. You will see:

- The overall safety score and band (Safe / Caution / Avoid)
- A breakdown across all five dimensions with progress bars
- An AI-generated summary of the road's safety profile
- Any active hazard reports on that segment

---

## Finding a Safe Route

1. In the **Safety Route Finder** panel (left side), enter your origin and destination
2. Press **Find Safest Route**
3. StreetCheck returns two options:
   - **Fastest** — shortest travel time (like Google Maps)
   - **Safest** — optimised for safety score, not time
4. An AI explanation tells you _why_ the safer route scores better
5. Tap **Select** on your preferred route to highlight it on the map

---

## Reporting a Hazard

Spotted something dangerous? Report it in seconds:

1. Tap the **⚠ Report Hazard** button (bottom-right of map)
   — or tap a road segment and press **Report** in the detail panel
2. Select the hazard type:
   - 🕳 Pothole
   - 💡 Broken streetlight
   - 🌊 Waterlogging / flooding
   - 🏗 Construction obstruction
   - 🗑 Debris on road
   - 🐄 Stray animals
3. Optionally add a description and/or photo
4. Tap **Submit Report**

Your report is anonymous. It immediately updates the safety score for that road segment and is visible to other users. Reports expire automatically after 72 hours (flooding/construction) or 7 days (potholes/lights).

---

## The Safety Assistant

Tap the chat bubble (bottom-right) to ask the StreetCheck AI assistant questions about road safety in Hyderabad:

- "Is it safe to walk near Tolichowki underpass at night?"
- "Which route from Kondapur to Gachibowli has better lighting?"
- "Are there any flood-prone roads near Mehdipatnam?"

The assistant uses real safety data from the map to answer your questions.

---

## Data Sources

StreetCheck scores are built from:

- **OpenStreetMap** — road geometry, lighting tags, surface type, footpath data
- **HYDRAA** — Hyderabad flood-prone zone maps
- **MoRTH** — Ministry of Road Transport accident black spot data
- **Citizen reports** — live hazard reports from StreetCheck users

Scores update every 15 minutes from OpenStreetMap. Citizen reports update in real time.

---

## Privacy

- No account or login required
- No personal data collected
- Reports are submitted anonymously using a randomly generated session ID
- No location tracking beyond what you explicitly submit in a report

---

## Limitations

- StreetCheck covers **Hyderabad only** (bounding box: central city + ORR)
- Road scores are estimates based on available data — always use your own judgement
- Scores do not include traffic conditions or time-of-day variation (yet)
- Crime and policing data are intentionally excluded from all scores
