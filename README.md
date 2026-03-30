# PlastiCore AI — Plastic Waste Reuse System

## Overview
An AI-powered web app that classifies plastic waste by type (PET, HDPE, PVC, LDPE, PP, PS) and maps each type to real-world construction material uses — with mix ratios, strength ratings, and environmental impact data.

## Features
- **Image Upload**: Drag & drop or browse — up to 5 images at once
- **AI Vision Analysis**: Uses Claude Vision API to detect and classify plastic types
- **Smart Mock Fallback**: If the API is unavailable, realistic mock predictions are used automatically
- **Result Dashboard**: Cards showing plastic type, confidence %, construction use, mix ratio, strength
- **Environmental Impact Chart**: CO₂ saved, energy saved, water saved (Chart.js bar chart)
- **PDF Report**: Download a full report with all analysis results
- **Responsive Design**: Works on mobile and desktop

## Plastic → Construction Mapping

| Type | Full Name | Construction Use | Mix Ratio | Strength |
|------|-----------|-----------------|-----------|----------|
| PET  | Polyethylene Terephthalate | Bricks, Paver Blocks | 30% plastic + 70% sand | High |
| HDPE | High-Density Polyethylene | Road Construction | 25% plastic + 75% aggregate | High |
| PVC  | Polyvinyl Chloride | Flooring, Wall Panels | 20% plastic + 80% cement | Medium |
| LDPE | Low-Density Polyethylene | Insulation Tiles | 35% plastic + 65% sand | Medium |
| PP   | Polypropylene | Roofing Sheets | 40% plastic + 60% glass fiber | High |
| PS   | Polystyrene | Lightweight Foam Blocks | 50% plastic + 50% binder | Low |

## Running Locally

### Option A: Zero Setup (Recommended)
Just open `index.html` in any modern browser. No server required.
The app works fully in the browser using the Anthropic API.

### Option B: Using a Local Server (prevents CORS issues with some browsers)

**Using Python:**
```bash
# Navigate to the project folder
cd plastic-waste-ai

# Python 3
python -m http.server 3000
# Then open: http://localhost:3000
```

**Using Node.js:**
```bash
npx serve .
# Then open the URL shown in terminal
```

**Using VS Code:**
Install the "Live Server" extension → right-click `index.html` → "Open with Live Server"

## Folder Structure

```
plastic-waste-ai/
├── index.html      ← Main HTML page (structure + layout)
├── style.css       ← All styling (dark theme, animations, responsive)
├── app.js          ← All JavaScript logic (upload, AI, results, chart, PDF)
└── README.md       ← This file
```

## How the AI Works

1. **User uploads an image** → it's stored as base64 in memory
2. **On "Analyze"**, each image is sent to Claude's Vision API with a structured prompt
3. **Claude responds with JSON** containing: `isPlastic`, `plasticType`, `confidence`, `visualClues`
4. **The app maps** the plastic type to our construction database (PLASTIC_DATABASE in app.js)
5. **Results are rendered** in cards with all the data
6. **If the API is unavailable**, `mockPrediction()` generates realistic data using filename heuristics + weighted random selection

## Customization

**Add a new plastic type:**
In `app.js`, add an entry to `PLASTIC_DATABASE`:
```javascript
PETG: {
  fullName: "Polyethylene Terephthalate Glycol",
  primaryUse: "Transparent Panels",
  mixRatio: "25% plastic + 75% resin",
  strength: "High",
  // ... etc
}
```

**Change the AI model:**
In `analyzeImageWithAI()`, change:
```javascript
model: "claude-sonnet-4-20250514"
```

## Dependencies (all loaded via CDN — no npm required)

- **Chart.js 4.4.0** — environmental impact bar chart
- **jsPDF 2.5.1** — PDF report generation
- **Google Fonts** — Syne + DM Sans typography

## Browser Compatibility

Works in: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

Built for educational and research purposes. Impact figures are estimates based on published research on plastic-to-construction material studies.
