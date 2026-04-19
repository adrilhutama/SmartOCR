// ── Element References ────────────────────────────────────
const imageInput    = document.getElementById('imageInput');
const fileName      = document.getElementById('fileName');
const dropZone      = document.getElementById('dropZone');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview  = document.getElementById('imagePreview');
const processBtn    = document.getElementById('processBtn');
const statusDiv     = document.getElementById('status');
const statusText    = document.getElementById('statusText');
const progressFill  = document.getElementById('progressFill');
const tableArea     = document.getElementById('tableArea');
const tableBody     = document.getElementById('tableBody');
const rawText       = document.getElementById('rawText');
const rawBar        = document.getElementById('rawBar');
const rawToggle     = document.getElementById('rawToggle');
const rawChevron    = document.getElementById('rawChevron');
const copyBtn       = document.getElementById('copyBtn');
const resetBtn      = document.getElementById('resetBtn');
const countBadge    = document.getElementById('countBadge');
const emptyState    = document.getElementById('emptyState');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');

let selectedFile = null;
let currentExtractedData = "";

// ── Step Indicator ────────────────────────────────────────
function setStep(n) {
  [step1, step2, step3].forEach((s, i) => s.classList.toggle('active', i < n));
}

// ── Raw Output Toggle ─────────────────────────────────────
rawToggle.addEventListener('click', () => {
  rawText.classList.toggle('hidden');
  rawChevron.classList.toggle('open');
});

// ── File Handler ──────────────────────────────────────────
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  selectedFile = file;
  fileName.textContent = file.name || "pasted_image.png";
  fileName.classList.add('has-file');

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    imagePreviewContainer.classList.remove('hidden');
    processBtn.disabled = false;
    setStep(2);
  };
  reader.readAsDataURL(file);

  // Note: We don't call showEmpty() here so the user can see existing data
  // while the new image is pending process.
}

function showEmpty() {
  emptyState.classList.remove('hidden');
  statusDiv.classList.add('hidden');
  tableArea.classList.add('hidden');
  rawBar.classList.add('hidden');
  copyBtn.classList.add('hidden');
  resetBtn.classList.add('hidden');
  countBadge.classList.add('hidden');
}

function showProcessing() {
  emptyState.classList.add('hidden');
  statusDiv.classList.remove('hidden');
  tableArea.classList.add('hidden');
}

function showResults() {
  emptyState.classList.add('hidden');
  statusDiv.classList.add('hidden');
  tableArea.classList.remove('hidden');
  rawBar.classList.remove('hidden');
  copyBtn.classList.remove('hidden');
  resetBtn.classList.remove('hidden');
  countBadge.classList.remove('hidden');
}

// ── Input Listeners ───────────────────────────────────────
imageInput.addEventListener('change', e => {
  if (e.target.files?.[0]) handleFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
});

document.addEventListener('paste', e => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      handleFile(item.getAsFile());
      return;
    }
  }

  // If no image, try processing as raw text instantly
  const textData = (e.clipboardData || window.clipboardData).getData('text');
  if (textData && textData.trim().length > 0) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      // Let them paste text normally if they are editing a specific field
      return;
    }
    
    e.preventDefault();
    
    // Simulate immediate AI scan
    if (rawText.value) rawText.value += '\n\n--- PASTED TEXT ---\n\n' + textData;
    else rawText.value = textData;

    parseAndDisplayData(textData);
    showResults();
    setStep(3);

    fileName.textContent = "Pasted Text";
    fileName.classList.add('has-file');
    imagePreviewContainer.classList.add('hidden');
    processBtn.disabled = true;
  }
});

// ── Copy Button ───────────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  if (rows.length === 0 || rows[0].querySelector('.error-msg')) return;

  let exportData = "";
  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length >= 4) {
      const shiftSelect = tds[2].querySelector('select');
      const shiftValue = shiftSelect ? shiftSelect.value : tds[2].innerText.trim();
      exportData += `${tds[0].innerText.trim()}\t${tds[1].innerText.trim()}\t${shiftValue}\t${tds[3].innerText.trim()}\n`;
    }
  }

  if (exportData) {
    navigator.clipboard.writeText(exportData).then(() => {
      const orig = copyBtn.innerHTML;
      copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
    });
  }
});

// ── Prevent Rich Text Paste in Table ──────────────────────
tableBody.addEventListener('paste', e => {
  if (e.target.isContentEditable) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }
});

// ── Delete Row Function ──────────────────────────────────
window.deleteRow = function(btn) {
  const tr = btn.closest('tr');
  tr.remove();
  
  // Re-number rows
  const rows = tableBody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    row.querySelector('.no-col').textContent = index + 1;
  });

  // Update badge
  countBadge.textContent = rows.length;
};

// ── Reset Button ──────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  if (confirm("Reset and clear all extracted data?")) {
    tableBody.innerHTML = '';
    rawText.value = '';
    countBadge.textContent = '0';
    showEmpty();
    setStep(1);
    
    // Reset file inputs
    imageInput.value = '';
    selectedFile = null;
    fileName.textContent = 'No file selected';
    fileName.classList.remove('has-file');
    imagePreviewContainer.classList.add('hidden');
    processBtn.disabled = true;
  }
});

// ── Process Button ────────────────────────────────────────
processBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  processBtn.disabled = true;
  setStep(2);
  showProcessing();
  statusText.textContent = 'Preprocessing image…';
  progressFill.style.width = '10%';

  try {
    // Upscale & enhance image
    const img = new Image();
    const url = URL.createObjectURL(selectedFile);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

    const canvas = document.createElement('canvas');
    // Dynamic scaling: only upscale if image is small
    let scale = img.width < 1000 ? 2 : (img.width > 2000 ? 2000/img.width : 1.5);
    canvas.width  = img.width  * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Removed contrast/brightness filters: Let Tesseract's internal adaptive binarization handle uneven lighting in photos!
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    statusText.textContent = 'Initializing AI engine…';

    const worker = await Tesseract.createWorker("eng+ind", 1, {
      workerPath: 'https://unpkg.com/tesseract.js@v5.0.0/dist/worker.min.js',
      langPath:   'tessdata',
      corePath:   'https://unpkg.com/tesseract.js-core@v5.0.0',
      logger: m => {
        if (m.status === 'recognizing text') {
          progressFill.style.width = `${20 + Math.round(m.progress * 80)}%`;
          statusText.textContent = `Scanning… ${Math.round(m.progress * 100)}%`;
        } else {
          statusText.textContent = 'Loading AI models…';
        }
      }
    });

    // Optimize for table structure but allow variable line sizes (PSM 4 is better than 6 for photos)
    await worker.setParameters({
      tessedit_pageseg_mode: '4', 
      preserve_interword_spaces: '1',
    });

    const result = await worker.recognize(canvas);
    const text = result.data.text;
    
    // Append to raw text rather than replace, so users can debug multiple images
    if (rawText.value) rawText.value += '\n\n--- NEW IMAGE ---\n\n' + text;
    else rawText.value = text;
    
    await worker.terminate();
    URL.revokeObjectURL(url);

    parseAndDisplayData(text);
    showResults();
    setStep(3);

  } catch (err) {
    console.error(err);
    statusText.textContent = 'Error: ' + err.message;
  } finally {
    processBtn.disabled = false;
  }
});

// ── Helper: Scrape Current Table ──────────────────────────
function scrapeCurrentTable() {
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const scraped = [];
  if (rows.length > 0 && rows[0].querySelector('.error-msg')) return [];

  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length >= 4) {
      const originalName = tds[1].innerText.trim();
      const shiftSelect = tds[2].querySelector('select');
      const shift = shiftSelect ? shiftSelect.value : tds[2].innerText.trim();
      const time = tds[3].innerText.trim();
      
      let tf = 0;
      const match = time.match(/\d{2}[\.:]?\d{2}/);
      if (match) tf = parseFloat(match[0].replace(':', '.'));
      else if (shift === 'Morning') tf = 8;
      else if (shift === 'Afternoon') tf = 14;
      else tf = 20;

      scraped.push({
        originalName,
        normalizedName: originalName.toLowerCase().replace(/\s+/g, ''),
        shift, time, timeFloat: tf
      });
    }
  }
  return scraped;
}

// ── Parse & Display ───────────────────────────────────────
function parseAndDisplayData(text) {
  // Grab whatever is currently on the UI (including manual user edits)
  const existingData = scrapeCurrentTable();
  
  tableBody.innerHTML = '';
  currentExtractedData = "";

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  let parsedRawList = [];
  let currentContextTime = '';

  for (const line of lines) {
    if (line.match(/dw requested|daily workers|department|date|front office/i)) continue;
    if (line.match(/name.*?shift.*?time/i)) continue;

    let extractedName = '';
    let extractedTime = '';
    let fullTimeStr = '';

    // Strategy A: Table with pipe separators
    const cleanLine = line.replace(/[\[\]]/g, '|');
    if (cleanLine.includes('|')) {
      const parts = cleanLine.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4) {
        let noIndex = -1;
        for (let i = 0; i < Math.min(3, parts.length); i++) {
          if (!isNaN(parseInt(parts[i].replace(/\D/g, ''))) && parts[i].length < 4) {
            noIndex = i; break;
          }
        }
        if (noIndex !== -1 && parts.length >= noIndex + 3) {
          extractedName = parts[noIndex + 1];
          for (let i = noIndex + 2; i < parts.length; i++) {
            if (parts[i].match(/\d{2}[\.:]?\d{2}/)) {
              fullTimeStr = parts[i];
              extractedTime = parts[i].match(/\d{2}[\.:]?\d{2}/)[0];
              break;
            }
          }
        }
      }
      if (extractedName && extractedTime) {
        extractedName = extractedName.replace(/[\|\[\]\/\\]/g, '').replace(/^[=~\-\.]+\s*/, '').trim();
        parsedRawList.push({ name: extractedName, timeStr: extractedTime, fullTimeStr: fullTimeStr || extractedTime });
      }
      continue;
    }

    // Strategy B: Inline shift codes (M7, A14, E22)
    const codeMatch = line.match(/^([MAE])(\d{1,2})\s+(.+)$/i);
    if (codeMatch) {
      const hour = parseInt(codeMatch[2]);
      const timeStr = (hour < 10 ? '0' + hour : String(hour)) + '.00';
      parsedRawList.push({
        name: codeMatch[3].replace(/\(.*?$/, '').trim(),
        timeStr, fullTimeStr: timeStr
      });
      continue;
    }

    // Strategy C: Context time headers
    const headerMatch = line.match(/(?:jam\s*|shift\s*|masuk\s*|bf\s*|alacarte\s*|streats\s*|regular\s*jam\s*|butcher\s*jam\s*|hot\s*jam\s*)?(\d{1,2}[:\.])\d{2}/i);
    const isListItem  = line.match(/^(\d+[\.)\s]|[-•*]\s*@?|@\s*)/);

    if (headerMatch && !isListItem) {
      currentContextTime = headerMatch[0].match(/(\d{1,2}[:\.]\d{2})/)[1].replace(':', '.');
      continue;
    }

    // Strategy D: List items or fallback
    if (currentContextTime || isListItem || line.match(/\d{2}[:\.]?\d{2}/)) {
      const timeRegex = /(\d{2}[:\.]?\d{2}\s*-\s*\d{2}[:\.]?\d{2}|\d{2}[:\.]]\d{2}|\d{4}|OFF\s*R?|OFF)/i;
      const timeMatch = line.match(timeRegex);

      if (timeMatch && !line.match(/jam\s*\d/i)) {
        fullTimeStr = timeMatch[1].toUpperCase();
        extractedTime = fullTimeStr.match(/\d{2}[:\.]?\d{2}|\d{4}/)?.[0] || fullTimeStr;
        extractedName = line.replace(timeMatch[0], '').trim();
      } else if (currentContextTime) {
        extractedTime = currentContextTime;
        fullTimeStr   = currentContextTime;
        extractedName = line;
      }

      if (extractedName && extractedTime) {
        extractedName = extractedName.replace(/\s+\d{8,15}$/, '').trim();
        const shiftKW = /\b(Night|Morning|Afternoon|Malam|Pagi|Siang|Sore|PULLMAN\s*TOUCH|CONCIERGE|DOORGIRL|GYM|KIDS\s*CLUB|VALET)\b/i;
        const skm = extractedName.match(shiftKW);
        if (skm) extractedName = extractedName.replace(skm[0], '').trim();
        extractedName = extractedName.replace(/^(\d+[\.)\s]|[-•*]\s*@?|@\s*)/, '');
        extractedName = extractedName.replace(/[:;\|\[\]\/\\]/g, '').replace(/^[=~\-\.]+\s*/, '').trim();

        if (extractedName.length > 2 && !extractedName.match(/^(jam|shift|masuk|sadrasa|streats|madcow|pastry|bicc)$/i)) {
          parsedRawList.push({ name: extractedName, timeStr: extractedTime, fullTimeStr });
        }
      }
    }
  }

  // ── Helper: Proper Name Casing ────────────────────────
  function toTitleCase(str) {
    // Words that should stay lowercase (articles/prepositions) unless first word
    const minor = new Set(['bin', 'binti', 'van', 'de', 'di', 'el']);
    return str
      .toLowerCase()
      .replace(/[^\s-]+/g, (word, offset) =>
        (offset === 0 || !minor.has(word))
          ? word.charAt(0).toUpperCase() + word.slice(1)
          : word
      );
  }

  // ── Post-process ──────────────────────────────────────
  let processed = [];

  for (const raw of parsedRawList) {
    if (!raw.timeStr || raw.timeStr.includes('OFF') || raw.timeStr === '-') continue;

    let time = raw.timeStr;
    if (time.match(/^\d{4}$/)) time = time.substring(0, 2) + '.' + time.substring(2);
    else if (time.includes(':')) time = time.replace(':', '.');

    const tf = parseFloat(time);
    if (isNaN(tf)) continue;

    // Shift: Morning 01:00–12:00 | Afternoon 12:00–18:00 | Night 18:00–24:00
    const shift = (tf >= 1 && tf < 12) ? 'Morning'
                : (tf >= 12 && tf < 18) ? 'Afternoon'
                : 'Night';

    // Clean & properly case the name
    let cleanName = raw.name
      .replace(/dw new|dw pullman|dw sdr|dw baru/gi, '')
      .replace(/[@_=~—\-]/g, ' ') // Strip common noise symbols
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Fix squished CamelCase (e.g. "RyanRusyana" -> "Ryan Rusyana")
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
      
    if (cleanName.length < 2) continue;
    cleanName = toTitleCase(cleanName);

    // Format time to strictly 00:00 (padding zeroes and taking only the first time)
    let displayTime = raw.timeStr;
    if (displayTime.match(/^\d{4}$/)) displayTime = displayTime.substring(0, 2) + ':' + displayTime.substring(2);
    displayTime = displayTime.replace(/\./g, ':'); // enforce colon
    displayTime = displayTime.replace(/^(\d):/, '0$1:'); // pad single hour digits (e.g., "7:00" -> "07:00")

    processed.push({
      originalName:   cleanName,
      // strictly alphabetic normalization to deduplicate flawlessly
      normalizedName: cleanName.toLowerCase().replace(/[^a-z]/g, ''),
      shift, time: displayTime, timeFloat: tf
    });
  }

  // Combine with existing data before deduplication
  const combined = [...existingData, ...processed];

  // Deduplicate
  const seen = new Set();
  const unique = combined.filter(r => {
    if (seen.has(r.normalizedName)) return false;
    seen.add(r.normalizedName);
    return true;
  });

  // Sort: Morning → Afternoon → Night, then time asc
  const order = { Morning: 1, Afternoon: 2, Night: 3 };
  unique.sort((a, b) => order[a.shift] - order[b.shift] || a.timeFloat - b.timeFloat);

  // Render
  if (unique.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" class="error-msg">Could not extract valid data — check Raw OCR Output below.</td>`;
    tableBody.appendChild(tr);
    countBadge.textContent = '0';
    return;
  }

  unique.forEach((row, i) => {
    const no = i + 1;
    const cls = row.shift === 'Morning' ? 'shift-morning' : row.shift === 'Afternoon' ? 'shift-afternoon' : 'shift-night';
    const tr = document.createElement('tr');
    // Cells are editable so users can fix OCR typos directly
    tr.innerHTML = `
      <td class="no-col">${no}</td>
      <td class="name-col" contenteditable="true" spellcheck="false">${row.originalName}</td>
      <td class="shift-col">
        <select class="shift-select ${cls}" onchange="this.className = 'shift-select shift-' + this.value.toLowerCase()">
          <option value="Morning" ${row.shift === 'Morning' ? 'selected' : ''}>Morning</option>
          <option value="Afternoon" ${row.shift === 'Afternoon' ? 'selected' : ''}>Afternoon</option>
          <option value="Night" ${row.shift === 'Night' ? 'selected' : ''}>Night</option>
        </select>
      </td>
      <td class="time-col" contenteditable="true" spellcheck="false">${row.time}</td>
      <td class="action-col">
        <button class="btn-del" onclick="deleteRow(this)" title="Delete Row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  countBadge.textContent = unique.length;
}
