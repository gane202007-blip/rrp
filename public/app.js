/**
 * PlastiCore AI — Main Application Logic
 * =========================================
 * This file handles:
 *   1. Image upload (drag-and-drop + file picker, up to 5 images)
 *   2. Image preview management
 *   3. AI analysis via Claude Vision API (or mock fallback)
 *   4. Rendering result cards with plastic type, confidence, mix ratio, etc.
 *   5. Environmental impact chart (Chart.js)
 *   6. PDF report download (jsPDF)
 *
 * BEGINNER NOTE:
 *   - All data flows from: upload → analyze → render results
 *   - The AI call happens in `analyzeImageWithAI()`
 *   - Mock predictions are used if the API call fails
 */

/* =========================================================
   SECTION 1: PLASTIC DATABASE
   Maps each plastic type to construction data and env impact
   ========================================================= */
const PLASTIC_DATABASE = {
  PET: {
    fullName: "Polyethylene Terephthalate",
    color: "#00e5a0",
    badgeClass: "badge-pet",
    uses: ["Bricks", "Paver Blocks", "Composite Panels"],
    primaryUse: "Bricks & Paver Blocks",
    mixRatio: "30% plastic + 70% sand",
    strength: "High",
    strengthClass: "strength-high",
    strengthVal: 3,
    notes: "Shredded PET bottles are mixed with sand and cement to form durable interlocking bricks.",
    co2Saved: 1.8,       // kg CO₂ per kg of plastic
    energySaved: 42,     // MJ per kg
    waterSaved: 120,     // liters per kg
  },
  HDPE: {
    fullName: "High-Density Polyethylene",
    color: "#4da6ff",
    badgeClass: "badge-hdpe",
    uses: ["Road Construction", "Drainage Pipes", "Speed Bumps"],
    primaryUse: "Road Construction",
    mixRatio: "25% plastic + 75% aggregate",
    strength: "High",
    strengthClass: "strength-high",
    strengthVal: 3,
    notes: "Molten HDPE is mixed with bitumen/aggregate for road surfacing — increases road life by 3×.",
    co2Saved: 1.6,
    energySaved: 38,
    waterSaved: 95,
  },
  PVC: {
    fullName: "Polyvinyl Chloride",
    color: "#ff8060",
    badgeClass: "badge-pvc",
    uses: ["Flooring Tiles", "Wall Panels", "Window Frames"],
    primaryUse: "Flooring & Wall Panels",
    mixRatio: "20% plastic + 80% cement mix",
    strength: "Medium",
    strengthClass: "strength-med",
    strengthVal: 2,
    notes: "PVC granules are pressed into tiles and panels — heat resistant and waterproof.",
    co2Saved: 1.4,
    energySaved: 30,
    waterSaved: 80,
  },
  LDPE: {
    fullName: "Low-Density Polyethylene",
    color: "#f4c430",
    badgeClass: "badge-ldpe",
    uses: ["Insulation Tiles", "Lightweight Panels", "Road Filling"],
    primaryUse: "Insulation Tiles & Panels",
    mixRatio: "35% plastic + 65% sand",
    strength: "Medium",
    strengthClass: "strength-med",
    strengthVal: 2,
    notes: "Melted LDPE bags form lightweight thermal insulation tiles suitable for low-load walls.",
    co2Saved: 1.2,
    energySaved: 28,
    waterSaved: 75,
  },
  PP: {
    fullName: "Polypropylene",
    color: "#c480ff",
    badgeClass: "badge-pp",
    uses: ["Roofing Sheets", "Structural Beams", "Furniture"],
    primaryUse: "Roofing Sheets & Beams",
    mixRatio: "40% plastic + 60% glass fiber",
    strength: "High",
    strengthClass: "strength-high",
    strengthVal: 3,
    notes: "PP is reinforced with glass fiber to produce corrugated roofing sheets with high impact resistance.",
    co2Saved: 1.9,
    energySaved: 45,
    waterSaved: 110,
  },
  PS: {
    fullName: "Polystyrene",
    color: "#f080c0",
    badgeClass: "badge-ps",
    uses: ["Foam Blocks", "Lightweight Filler", "Decorative Panels"],
    primaryUse: "Lightweight Foam Blocks",
    mixRatio: "50% plastic + 50% binding agent",
    strength: "Low",
    strengthClass: "strength-low",
    strengthVal: 1,
    notes: "Expanded PS is crushed and rebonded into lightweight decorative or non-load-bearing panels.",
    co2Saved: 1.0,
    energySaved: 22,
    waterSaved: 60,
  },
};

/* =========================================================
   SECTION 2: DOM ELEMENT REFERENCES
   ========================================================= */
const dropZone      = document.getElementById('dropZone');
const fileInput     = document.getElementById('fileInput');
const previewGrid   = document.getElementById('previewGrid');
const analyzeWrap   = document.getElementById('analyzeWrap');
const analyzeBtn    = document.getElementById('analyzeBtn');
const clearBtn      = document.getElementById('clearBtn');
const loaderOverlay = document.getElementById('loaderOverlay');
const loaderLabel   = document.getElementById('loaderLabel');
const loaderBar     = document.getElementById('loaderBar');
const resultsSection= document.getElementById('resultsSection');
const resultsGrid   = document.getElementById('resultsGrid');
const chartSection  = document.getElementById('chartSection');
const chartCards    = document.getElementById('chartCards');
const downloadBtn   = document.getElementById('downloadBtn');

/* =========================================================
   SECTION 3: STATE
   ========================================================= */
let uploadedFiles = [];    // Array of { file, objectURL, base64 }
let analysisResults = [];  // Array of result objects per image
let impactChart = null;    // Chart.js instance (reused on re-analyze)

const MAX_FILES = 5;

/* =========================================================
   SECTION 4: DRAG-AND-DROP UPLOAD
   ========================================================= */

// Clicking the drop zone label triggers the hidden file input
dropZone.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-upload')) return; // let label handle it
  fileInput.click();
});

// Visual feedback while dragging over the drop zone
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragging');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));

// Handle drop
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragging');
  handleFiles(Array.from(e.dataTransfer.files));
});

// Handle file input change (browse button)
fileInput.addEventListener('change', () => {
  handleFiles(Array.from(fileInput.files));
  fileInput.value = ''; // reset so same file can be re-selected
});

/**
 * handleFiles — validates and adds files to uploadedFiles state
 * @param {File[]} files - array of File objects from input/drop
 */
function handleFiles(files) {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    showToast('⚠ Please upload image files only (JPG, PNG, WEBP).');
    return;
  }
  const remaining = MAX_FILES - uploadedFiles.length;
  if (remaining <= 0) {
    showToast(`⚠ Maximum ${MAX_FILES} images allowed. Clear some to add more.`);
    return;
  }
  const toAdd = imageFiles.slice(0, remaining);
  if (imageFiles.length > remaining) {
    showToast(`⚠ Only ${remaining} slot(s) left. Added first ${remaining} image(s).`);
  }

  // Read each file and add to state
  toAdd.forEach(file => {
    const objectURL = URL.createObjectURL(file);
    const entry = { file, objectURL, base64: null };
    uploadedFiles.push(entry);
    readAsBase64(file, entry); // asynchronously fill base64
    renderPreviewItem(entry);
  });

  analyzeWrap.style.display = 'flex';
}

/**
 * readAsBase64 — reads a File as base64 string and stores in entry
 */
function readAsBase64(file, entry) {
  const reader = new FileReader();
  reader.onload = (e) => {
    // Strip the data:image/...;base64, prefix — keep only raw base64
    const raw = e.target.result;
    const parts = typeof raw === 'string' ? raw.split(',') : [];
    entry.base64 = parts.length > 1 ? parts[1] : null;
  };
  reader.onerror = () => {
    entry.base64 = null;
    console.warn('FileReader failed for', file?.name);
  };
  reader.readAsDataURL(file);
}

/**
 * renderPreviewItem — creates a thumbnail card in the preview grid
 */
function renderPreviewItem(entry) {
  const div = document.createElement('div');
  div.className = 'preview-item';
  div.innerHTML = `
    <img src="${entry.objectURL}" alt="Preview"/>
    <button class="preview-remove" title="Remove">✕</button>
    <div class="preview-label">${entry.file.name}</div>
  `;
  // Remove button
  div.querySelector('.preview-remove').addEventListener('click', () => {
    const idx = uploadedFiles.indexOf(entry);
    if (idx !== -1) {
      URL.revokeObjectURL(entry.objectURL);
      uploadedFiles.splice(idx, 1);
    }
    div.remove();
    if (uploadedFiles.length === 0) analyzeWrap.style.display = 'none';
  });
  previewGrid.appendChild(div);
}

/* =========================================================
   SECTION 5: CLEAR BUTTON
   ========================================================= */
clearBtn.addEventListener('click', () => {
  uploadedFiles.forEach(e => URL.revokeObjectURL(e.objectURL));
  uploadedFiles = [];
  previewGrid.innerHTML = '';
  analyzeWrap.style.display = 'none';
  resultsSection.style.display = 'none';
});

/* =========================================================
   SECTION 6: ANALYZE BUTTON — kicks off the AI pipeline
   ========================================================= */
analyzeBtn.addEventListener('click', async () => {
  if (uploadedFiles.length === 0) {
    showToast('Please upload at least one image first.');
    return;
  }
  try {
    await waitForBase64(uploadedFiles);
  } catch (err) {
    showToast(err.message || 'Could not read one or more images.');
    return;
  }
  await runAnalysis();
});

/**
 * waitForBase64 — polls until all entries have their base64 field filled
 * (bounded wait so a failed FileReader cannot hang analysis forever)
 */
function waitForBase64(entries, maxWaitMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (entries.every((e) => e.base64 !== null)) {
        resolve();
        return;
      }
      if (Date.now() - start > maxWaitMs) {
        reject(new Error('Timed out reading image data. Try smaller files or a different format.'));
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

/* =========================================================
   SECTION 7: ANALYSIS PIPELINE
   ========================================================= */
async function runAnalysis() {
  showLoader();
  analysisResults = [];
  resultsGrid.innerHTML = '';
  chartSection.style.display = 'none';

  const steps = [
    "Initializing AI model…",
    "Preprocessing images…",
    "Running plastic detection…",
    "Classifying polymer types…",
    "Mapping construction uses…",
    "Calculating environmental impact…",
    "Generating report…",
  ];
  let stepIdx = 0;
  setLoaderStep(steps[0], 5);

  // Analyze each image sequentially with step feedback
  for (let i = 0; i < uploadedFiles.length; i++) {
  const entry = uploadedFiles[i];

  stepIdx = Math.min(stepIdx + 1, steps.length - 1);
  setLoaderStep(`${steps[stepIdx]} (${i + 1}/${uploadedFiles.length})`,
    Math.round(10 + (i / uploadedFiles.length) * 80));

  // ✅ FIXED IMAGE SOURCE
  const img = new Image();
  img.src = entry.preview || entry.data || URL.createObjectURL(entry);

  await new Promise(resolve => img.onload = resolve);

  // ✅ AI CHECK
  const ai = await analyzeImageAI(img);

  if (ai.result !== "Plastic") {
    showToast("❌ Not a plastic item. Please upload correct image.");
    continue;
  }

  // ✅ ORIGINAL LOGIC
  const result = await analyzeImageWithAI(entry);
  analysisResults.push(result);
  renderResultCard(result);
}

  setLoaderStep("Finalising…", 95);
  await delay(400);
  setLoaderStep("Done!", 100);
  await delay(300);

  hideLoader();
  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Only show chart if at least one plastic was found
  const plasticResults = analysisResults.filter(r => r.isPlastic && r.plasticType !== 'UNKNOWN');
  if (plasticResults.length > 0) {
    chartSection.style.display = 'block';
    renderImpactCards(plasticResults);
    renderImpactChart(plasticResults);
  }

  // Save results to server (if logged in)
  saveResultsToServer(analysisResults);
}

/* =========================================================
   SECTION 8: AI ANALYSIS — Claude Vision API
   The real AI call. Falls back to mock if API not available.
   ========================================================= */

/**
 * analyzeImageWithAI — sends an image to Claude's vision API for analysis
 * Returns a structured result object.
 *
 * BEGINNER NOTE:
 *   We send the image as base64 along with a detailed prompt.
 *   Claude responds with JSON containing: isPlastic, type, confidence, notes.
 *   If the API call fails (no key, network issue), we use mockPrediction().
 */
async function analyzeImageWithAI(entry) {
  const prompt = `You are an expert polymer scientist and waste classification AI.

Analyze this image and determine if it shows plastic waste.

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "isPlastic": true or false,
  "plasticType": "PET" | "HDPE" | "PVC" | "LDPE" | "PP" | "PS" | "UNKNOWN",
  "confidence": 0.0 to 1.0,
  "visualClues": "brief description of what you see that indicates this plastic type",
  "notPlasticReason": "only if isPlastic is false, explain what the object appears to be"
}

Rules:
- If no plastic waste is visible, set isPlastic to false.
- If plastic is visible but type is unclear, use UNKNOWN.
- confidence should reflect how certain you are of the plastic type.
- Be concise in visualClues (max 20 words).`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: entry.file.type || "image/jpeg",
                data: entry.base64,
              }
            },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) throw new Error(`API error ${response.status}`);

    const data = await response.json();
    // Extract text from response content blocks
    const rawText = data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    // Parse JSON from the response
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return buildResult(entry, parsed);

  } catch (err) {
    // API unavailable or parse error — use smart mock prediction
    console.warn("AI API unavailable, using mock prediction:", err.message);
    return buildResult(entry, mockPrediction(entry.file.name));
  }
}

/**
 * buildResult — merges AI output with our plastic database
 * Returns the complete result object used for rendering
 */
function buildResult(entry, aiData) {
  const {
    isPlastic = false,
    plasticType = "UNKNOWN",
    confidence = 0.5,
    visualClues = "",
    notPlasticReason = ""
  } = aiData;

  const db = PLASTIC_DATABASE[plasticType] || null;

  return {
    file: entry.file,
    objectURL: entry.objectURL,
    isPlastic,
    plasticType,
    confidence: Math.min(Math.max(confidence, 0), 1), // clamp 0–1
    visualClues,
    notPlasticReason,
    // From database (null if UNKNOWN or not plastic)
    fullName:    db?.fullName    || "Unknown",
    primaryUse:  db?.primaryUse  || "—",
    mixRatio:    db?.mixRatio    || "—",
    strength:    db?.strength    || "—",
    strengthClass: db?.strengthClass || "",
    notes:       db?.notes       || "",
    badgeClass:  db?.badgeClass  || (isPlastic ? "badge-unknown" : "badge-error"),
    co2Saved:    db?.co2Saved    || 0,
    energySaved: db?.energySaved || 0,
    waterSaved:  db?.waterSaved  || 0,
  };
}

/* =========================================================
   SECTION 9: MOCK PREDICTION (fallback when AI unavailable)
   Uses filename heuristics + randomised realistic data
   ========================================================= */

/**
 * mockPrediction — generates a realistic-looking mock AI response
 * Useful for testing without an API key or internet connection.
 *
 * BEGINNER NOTE: In a real app you'd replace this with a real
 * TensorFlow.js model loaded in the browser, or always use the API.
 */
function mockPrediction(filename) {
  const lower = filename.toLowerCase();
  const types = ['PET', 'HDPE', 'PVC', 'LDPE', 'PP', 'PS'];

  // Try to guess from filename keywords
  let guessedType = null;
  if (lower.includes('bottle') || lower.includes('pet'))  guessedType = 'PET';
  if (lower.includes('pipe') || lower.includes('hdpe'))   guessedType = 'HDPE';
  if (lower.includes('bag') || lower.includes('ldpe'))    guessedType = 'LDPE';
  if (lower.includes('foam') || lower.includes('ps'))     guessedType = 'PS';
  if (lower.includes('bucket') || lower.includes('pp'))   guessedType = 'PP';
  if (lower.includes('pvc') || lower.includes('tube'))    guessedType = 'PVC';

  // If no keyword match, pick a weighted random type
  if (!guessedType) {
    const weights = [35, 25, 10, 15, 10, 5]; // PET most common
    const roll = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < types.length; i++) {
      acc += weights[i];
      if (roll < acc) { guessedType = types[i]; break; }
    }
  }

  // 10% chance the image is "not plastic" (for demo variety)
  if (Math.random() < 0.10) {
    return {
      isPlastic: false,
      plasticType: "UNKNOWN",
      confidence: 0.88,
      notPlasticReason: "The image appears to show organic material or non-plastic objects.",
      visualClues: ""
    };
  }

  const confidence = 0.72 + Math.random() * 0.24; // 72%–96%
  const clues = {
    PET:  "Transparent bottle with ribbed walls and neck ring visible",
    HDPE: "Opaque container with waxy surface and HDPE resin code",
    PVC:  "Rigid pipe with grayish tint and smooth surface finish",
    LDPE: "Thin flexible film with semi-transparent milky appearance",
    PP:   "Opaque rigid container with hinge, typical polypropylene texture",
    PS:   "White foam-like material with lightweight cellular structure",
  };

  return {
    isPlastic: true,
    plasticType: guessedType,
    confidence: parseFloat(confidence.toFixed(2)),
    visualClues: clues[guessedType] || "Plastic material detected",
    notPlasticReason: ""
  };
}

/* =========================================================
   SECTION 10: RENDER RESULT CARD
   ========================================================= */

/**
 * renderResultCard — creates a result card DOM element and appends it
 */
function renderResultCard(r) {
  const card = document.createElement('div');
  card.className = 'result-card' + (r.isPlastic === false ? ' error-card' : '');

  if (!r.isPlastic) {
    // Not plastic — show a simpler card
    card.innerHTML = `
      <div class="result-img-wrap">
        <img src="${r.objectURL}" alt="${r.file.name}"/>
        <span class="result-type-badge badge-error">Not Plastic</span>
      </div>
      <div class="result-body">
        <div class="result-filename">${r.file.name}</div>
        <div class="not-plastic-msg">
          ⚠ ${r.notPlasticReason || "No plastic waste detected in this image."}
        </div>
      </div>`;
    resultsGrid.appendChild(card);
    return;
  }

  const confPct = Math.round(r.confidence * 100);

  card.innerHTML = `
    <div class="result-img-wrap">
      <img src="${r.objectURL}" alt="${r.file.name}"/>
      <span class="result-type-badge ${r.badgeClass}">${r.plasticType}</span>
      <div class="confidence-bar-wrap">
        <div class="confidence-bar" style="width:0%" data-width="${confPct}%"></div>
      </div>
    </div>
    <div class="result-body">
      <div class="result-filename">${r.file.name}</div>
      <div class="result-rows">
        <div class="result-row">
          <div class="result-row-icon">🔬</div>
          <div class="result-row-content">
            <div class="result-row-label">Plastic Type</div>
            <div class="result-row-value">${r.plasticType} — ${r.fullName}</div>
          </div>
        </div>
        <div class="result-row">
          <div class="result-row-icon">📊</div>
          <div class="result-row-content">
            <div class="result-row-label">Confidence Score</div>
            <div class="result-row-value confidence-score">${confPct}%</div>
          </div>
        </div>
        <div class="result-row">
          <div class="result-row-icon">🏗</div>
          <div class="result-row-content">
            <div class="result-row-label">Recommended Reuse</div>
            <div class="result-row-value">${r.primaryUse}</div>
          </div>
        </div>
        <div class="result-row">
          <div class="result-row-icon">⚗</div>
          <div class="result-row-content">
            <div class="result-row-label">Mix Ratio</div>
            <div class="result-row-value">${r.mixRatio}</div>
          </div>
        </div>
        <div class="result-row">
          <div class="result-row-icon">💪</div>
          <div class="result-row-content">
            <div class="result-row-label">Strength Level</div>
            <div class="result-row-value">
              <span class="strength-badge ${r.strengthClass}">${r.strength}</span>
            </div>
          </div>
        </div>
        ${r.visualClues ? `
        <div class="result-row">
          <div class="result-row-icon">👁</div>
          <div class="result-row-content">
            <div class="result-row-label">AI Visual Clues</div>
            <div class="result-row-value" style="color:var(--text-dim);font-size:0.85rem">${r.visualClues}</div>
          </div>
        </div>` : ''}
        <div class="result-row">
          <div class="result-row-icon">🌱</div>
          <div class="result-row-content">
            <div class="result-row-label">CO₂ Reduction (est.)</div>
            <div class="result-row-value" style="color:var(--accent)">${r.co2Saved} kg/kg plastic</div>
          </div>
        </div>
      </div>
    </div>`;

  resultsGrid.appendChild(card);

  // Animate confidence bar after card is in DOM
  requestAnimationFrame(() => {
    const bar = card.querySelector('.confidence-bar');
    if (bar) {
      setTimeout(() => { bar.style.width = bar.dataset.width; }, 100);
    }
  });
}

/* =========================================================
   SECTION 11: ENVIRONMENTAL IMPACT CARDS + CHART
   ========================================================= */

/**
 * renderImpactCards — displays summary KPI cards above the chart
 */
function renderImpactCards(results) {
  // Assume average 0.5 kg per item analysed (for illustration)
  const KG_PER_ITEM = 0.5;
  const totalItems   = results.length;
  const totalKg      = totalItems * KG_PER_ITEM;
  const totalCO2     = results.reduce((s, r) => s + r.co2Saved * KG_PER_ITEM, 0);
  const totalEnergy  = results.reduce((s, r) => s + r.energySaved * KG_PER_ITEM, 0);
  const totalWater   = results.reduce((s, r) => s + r.waterSaved * KG_PER_ITEM, 0);

  chartCards.innerHTML = `
    <div class="impact-card">
      <div class="impact-card-icon">♻</div>
      <div class="impact-card-value">${totalKg.toFixed(1)} kg</div>
      <div class="impact-card-label">Plastic Diverted</div>
    </div>
    <div class="impact-card">
      <div class="impact-card-icon">🌫</div>
      <div class="impact-card-value">${totalCO2.toFixed(2)} kg</div>
      <div class="impact-card-label">CO₂ Reduction</div>
    </div>
    <div class="impact-card">
      <div class="impact-card-icon">⚡</div>
      <div class="impact-card-value">${totalEnergy.toFixed(1)} MJ</div>
      <div class="impact-card-label">Energy Saved</div>
    </div>
    <div class="impact-card">
      <div class="impact-card-icon">💧</div>
      <div class="impact-card-value">${totalWater.toFixed(0)} L</div>
      <div class="impact-card-label">Water Saved</div>
    </div>`;
}

/**
 * renderImpactChart — renders a Chart.js radar/bar chart showing impact per type
 */
function renderImpactChart(results) {
  // Destroy old chart if re-running analysis
  if (impactChart) { impactChart.destroy(); impactChart = null; }

  const labels = results.map(r => `${r.plasticType} (${r.file.name.split('.')[0]})`);
  const co2Data    = results.map(r => parseFloat((r.co2Saved * 0.5).toFixed(2)));
  const energyData = results.map(r => parseFloat((r.energySaved * 0.5).toFixed(1)));

  const ctx = document.getElementById('impactChart').getContext('2d');
  impactChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'CO₂ Saved (kg)',
          data: co2Data,
          backgroundColor: '#00e5a040',
          borderColor: '#00e5a0',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Energy Saved (MJ)',
          data: energyData,
          backgroundColor: '#0077ff30',
          borderColor: '#4da6ff',
          borderWidth: 2,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#7a8599', font: { family: "'DM Sans', sans-serif", size: 12 } }
        },
        tooltip: {
          backgroundColor: '#13172099',
          borderColor: '#1e2535',
          borderWidth: 1,
          titleColor: '#e8edf5',
          bodyColor: '#7a8599',
        }
      },
      scales: {
        x: { ticks: { color: '#7a8599', font: { size: 11 } }, grid: { color: '#1e2535' } },
        y: { ticks: { color: '#7a8599' }, grid: { color: '#1e2535' } }
      }
    }
  });
}

/* =========================================================
   SECTION 12: PDF REPORT DOWNLOAD
   ========================================================= */

downloadBtn.addEventListener('click', generatePDFReport);

/**
 * generatePDFReport — creates and downloads a PDF using jsPDF
 * The report includes: header, analysis table, environmental summary
 *
 * BEGINNER NOTE: jsPDF lets you draw text and lines programmatically.
 * Coordinates are in mm from top-left of the page.
 */
function generatePDFReport() {
  if (analysisResults.length === 0) {
    showToast('No analysis results to export yet.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, marginL = 18, marginR = 192;
  let y = 20;

  // ── Header ──
  doc.setFillColor(0, 229, 160);
  doc.rect(0, 0, 210, 14, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text("PlastiCore AI — Plastic Waste Analysis Report", marginL, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginR, 9, { align: 'right' });

  y = 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text("Analysis Summary", marginL, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Total images analysed: ${analysisResults.length}`, marginL, y);
  y += 5;
  const plasticCount = analysisResults.filter(r => r.isPlastic).length;
  doc.text(`Plastic items detected: ${plasticCount}`, marginL, y);
  y += 10;

  // ── Section: Per-Image Results ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("Detailed Results", marginL, y);
  y += 6;

  // Table header row
  const cols = { file: 18, type: 60, conf: 95, use: 115, mix: 152, str: 186 };
  doc.setFillColor(245, 247, 250);
  doc.rect(marginL, y - 4, marginR - marginL, 7, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("File", cols.file, y);
  doc.text("Type", cols.type, y);
  doc.text("Conf%", cols.conf, y);
  doc.text("Recommended Use", cols.use, y);
  doc.text("Mix Ratio", cols.mix, y);
  doc.text("Str", cols.str, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);

  analysisResults.forEach((r, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(250, 252, 255);
      doc.rect(marginL, y - 4, marginR - marginL, 7, 'F');
    }
    const name = r.file.name.length > 18 ? r.file.name.slice(0, 15) + '…' : r.file.name;
    doc.text(name,   cols.file, y);
    doc.text(r.isPlastic ? r.plasticType : "N/A",  cols.type, y);
    doc.text(r.isPlastic ? `${Math.round(r.confidence * 100)}%` : "—", cols.conf, y);
    doc.text(r.isPlastic ? (r.primaryUse.length > 22 ? r.primaryUse.slice(0, 19) + '…' : r.primaryUse) : "Not Plastic", cols.use, y);
    doc.text(r.isPlastic ? r.mixRatio.slice(0, 22) : "—", cols.mix, y);
    doc.text(r.isPlastic ? r.strength : "—", cols.str, y);
    y += 7;
  });

  y += 8;
  if (y > 260) { doc.addPage(); y = 20; }

  // ── Section: Environmental Impact ──
  const plasticResults = analysisResults.filter(r => r.isPlastic && r.co2Saved > 0);
  if (plasticResults.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text("Environmental Impact (est. 0.5 kg per item)", marginL, y);
    y += 7;

    const KG = 0.5;
    const co2  = plasticResults.reduce((s, r) => s + r.co2Saved * KG, 0).toFixed(2);
    const enrg = plasticResults.reduce((s, r) => s + r.energySaved * KG, 0).toFixed(1);
    const water= plasticResults.reduce((s, r) => s + r.waterSaved * KG, 0).toFixed(0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const impacts = [
      `♻  Plastic diverted from landfill: ${(plasticResults.length * KG).toFixed(1)} kg`,
      `🌫  Estimated CO₂ reduction: ${co2} kg`,
      `⚡  Energy saved: ${enrg} MJ`,
      `💧  Water saved: ${water} litres`,
    ];
    impacts.forEach(line => {
      doc.text(line, marginL, y);
      y += 6;
    });
  }

  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("This report is generated for educational and research purposes. Impact figures are estimates.", marginL, y);

  // Save
  doc.save(`PlastiCore_AI_Report_${Date.now()}.pdf`);
}

/* =========================================================
   SECTION 13: LOADER HELPERS
   ========================================================= */
function showLoader() {
  loaderOverlay.style.display = 'flex';
  loaderBar.style.width = '0%';
}
function hideLoader() {
  loaderOverlay.style.display = 'none';
}
function setLoaderStep(label, pct) {
  loaderLabel.textContent = label;
  loaderBar.style.width = pct + '%';
}

/* =========================================================
   SECTION 14: TOAST NOTIFICATIONS
   ========================================================= */

/**
 * showToast — shows a temporary error/info message at the bottom right
 */
function showToast(message, type = 'info', duration = 4000) {
  // Use the new container-based system if available (from lang.js)
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

/* =========================================================
   SECTION 15: UTILITY
   ========================================================= */

/** Simple async delay helper */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* =========================================================
   SECTION 16: SAVE RESULTS TO SERVER (after analysis)
   Only saves if user is logged in (has JWT token)
   ========================================================= */

/**
 * saveResultsToServer — sends analysis results to the backend
 * Called automatically after runAnalysis() completes.
 * 
 * BEGINNER NOTE:
 *   - This only runs if a user is logged in (token exists)
 *   - The server stores metadata only (not the actual images)
 *   - Data is linked to the user's ID for their personal dashboard
 */
async function saveResultsToServer(results) {
  // Check if auth.js is loaded and user is logged in
  if (typeof isLoggedIn !== 'function' || !isLoggedIn()) {
    console.log('Not logged in — results not saved to server.');
    return;
  }

  try {
    const payload = results.map(r => ({
      fileName: r.file?.name || 'unknown',
      isPlastic: r.isPlastic,
      plasticType: r.plasticType,
      confidence: r.confidence,
      primaryUse: r.primaryUse,
      mixRatio: r.mixRatio,
      strength: r.strength,
      co2Saved: r.co2Saved,
      energySaved: r.energySaved,
      waterSaved: r.waterSaved,
      visualClues: r.visualClues,
    }));

    const res = await fetch('/api/user/uploads', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ results: payload }),
    });

    if (res.ok) {
      const data = await res.json();
      const msg = data.pointsEarned
        ? `✅ Saved! +${data.pointsEarned} pts earned (${data.totalPoints} total) — ${data.badge}`
        : `✅ ${data.message} — View in Dashboard`;
      showToast(msg, 'success');
    } else {
      console.warn('Failed to save results to server');
    }
  } catch (err) {
    console.warn('Could not save results to server:', err.message);
  }
}


/* =========================================================
   SECTION 17: GLOBAL STATS + NEARBY RECYCLERS MAP
   ========================================================= */

/** Load global platform stats for the homepage stats bar */
async function loadGlobalStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    const uploadsEl = document.getElementById('globalUploads');
    const co2El = document.getElementById('globalCo2');
    const usersEl = document.getElementById('globalUsers');
    if (uploadsEl) uploadsEl.textContent = data.totalUploads;
    if (co2El) co2El.textContent = data.totalCo2 + ' kg';
    if (usersEl) usersEl.textContent = data.users;
  } catch (_) {}
}

/** Initialise nearby recyclers map using Leaflet + OpenStreetMap */
function initRecyclersMap(lat, lng) {
  const container = document.getElementById('mapContainer');
  const mapEl = document.getElementById('leafletMap');
  if (!container || !mapEl) return;
  container.style.display = 'block';

  // Remove old map if exists
  if (window._leafletMap) {
    window._leafletMap.remove();
    window._leafletMap = null;
    mapEl.innerHTML = '';
  }

  const map = L.map('leafletMap').setView([lat, lng], 13);
  window._leafletMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  // User location marker
  L.marker([lat, lng]).addTo(map)
    .bindPopup('<b>You are here</b>').openPopup();

  // Query OSM Overpass API for recycling centres
  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];node["amenity"="recycling"](around:5000,${lat},${lng});out;`;

  fetch(overpassUrl)
    .then((r) => r.json())
    .then((data) => {
      const nodes = data.elements || [];
      if (nodes.length === 0) {
        showToast('No recycling centres found nearby. Try expanding your area.', 'info');
        return;
      }
      nodes.forEach((node) => {
        const name = node.tags?.name || node.tags?.operator || 'Recycling Centre';
        L.marker([node.lat, node.lon])
          .addTo(map)
          .bindPopup(`<b>♻️ ${name}</b><br>${node.tags?.['addr:street'] || ''}`);
      });
      showToast(`Found ${nodes.length} recycling point(s) near you!`, 'success');
    })
    .catch(() => {
      showToast('Could not fetch recycling locations. Check your connection.', 'error');
    });
}

// ── DOM Ready: Wire up new features ──
document.addEventListener('DOMContentLoaded', () => {
  // Load global stats on homepage
  loadGlobalStats();

  // Nearby recyclers button
  const findBtn = document.getElementById('findRecyclersBtn');
  if (findBtn) {
    findBtn.addEventListener('click', () => {
      findBtn.disabled = true;
      findBtn.textContent = 'Locating…';
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser.', 'error');
        findBtn.disabled = false;
        findBtn.textContent = 'Find Recyclers Near Me';
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          initRecyclersMap(latitude, longitude);
          findBtn.textContent = '📍 Map Updated';
          findBtn.disabled = false;
        },
        () => {
          showToast('Could not get your location. Please allow location access.', 'error');
          findBtn.disabled = false;
          findBtn.textContent = 'Find Recyclers Near Me';
        }
      );
    });
  }
});
