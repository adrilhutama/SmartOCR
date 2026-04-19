/* ─────────────────────────────────────────────────────────
   SmartOCR · Enterprise JS
   Modular, clean, Vanilla ES6+
───────────────────────────────────────────────────────── */

'use strict';

// ── Mobile Detection ─────────────────────────────────────
(function detectMobile() {
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isNarrow   = window.innerWidth < 768;
  if (isMobileUA || isNarrow) {
    document.getElementById('mobileBlock').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
  }
  window.addEventListener('resize', () => {
    if (window.innerWidth < 768) {
      document.getElementById('mobileBlock').style.display = 'flex';
      document.getElementById('appShell').style.display = 'none';
    } else {
      document.getElementById('mobileBlock').style.display = 'none';
      document.getElementById('appShell').style.display = 'flex';
    }
  });
})();

// ── DOM References ────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const imageInput     = $('imageInput');
const dropZone       = $('dropZone');
const imagePreviewContainer = $('imagePreviewContainer');
const imagePreview   = $('imagePreview');
const clearPreview   = $('clearPreview');
const processBtn     = $('processBtn');
const langSelect     = $('langSelect');
const statusDiv      = $('status');
const statusText     = $('statusText');
const processPct     = $('processPct');
const progressCircle = $('progressCircle');
const tableArea      = $('tableArea');
const tableBody      = $('tableBody');
const rawText        = $('rawText');
const rawBar         = $('rawBar');
const rawToggle      = $('rawToggle');
const rawChevron     = $('rawChevron');
const copyBtn        = $('copyBtn');
const exportTxtBtn   = $('exportTxtBtn');
const resetBtn       = $('resetBtn');
const countBadge     = $('countBadge');
const emptyState     = $('emptyState');
const resultsMeta    = $('resultsMeta');
const resultsActions = $('resultsActions');
const step1 = $('step1');
const step2 = $('step2');
const step3 = $('step3');
const stepLine1 = $('stepLine1');
const stepLine2 = $('stepLine2');
const statusPillText = $('statusPillText');
const systemStatus   = $('systemStatus');

const CIRC = 113.1; // 2π × 18

let selectedFile = null;
let workerRef    = null;

// ── Storage Keys ──────────────────────────────────────────
const STORAGE_HISTORY = 'smartocr_history';
const STORAGE_STATS   = 'smartocr_stats';

// ── Navigation ────────────────────────────────────────────
const pages = ['dashboard', 'scanner', 'history', 'settings'];

function switchPage(name) {
  pages.forEach(p => {
    const page = $('page-' + p);
    const nav  = $('nav-' + p);
    if (page) page.classList.toggle('hidden', p !== name);
    if (nav)  nav.classList.toggle('active', p === name);
  });

  const labels = {
    dashboard: 'Dashboard',
    scanner:   'OCR Scanner',
    history:   'History',
    settings:  'Settings'
  };

  const breadcrumb = $('pageBreadcrumb');
  if (breadcrumb) breadcrumb.textContent = labels[name] || name;

  // Show step track only on scanner page
  const stepTrack = document.querySelector('.topbar-center');
  if (stepTrack) stepTrack.style.opacity = name === 'scanner' ? '1' : '0';

  if (name === 'dashboard') refreshDashboard();
  if (name === 'history')   renderHistory();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) switchPage(page);
  });
});

// ── Step Tracker ──────────────────────────────────────────
function setStep(n) {
  [step1, step2, step3].forEach((s, i) => {
    if (!s) return;
    s.classList.toggle('active', i < n);
  });
  if (stepLine1) stepLine1.classList.toggle('active', n >= 2);
  if (stepLine2) stepLine2.classList.toggle('active', n >= 3);
}

// ── Progress Ring ─────────────────────────────────────────
function setProgress(pct) {
  const offset = CIRC - (CIRC * pct / 100);
  if (progressCircle) progressCircle.style.strokeDashoffset = offset;
  if (processPct) processPct.textContent = Math.round(pct) + '%';
}

// ── System Status Pill ────────────────────────────────────
function setStatus(state, label) {
  const dot = systemStatus.querySelector('.status-dot');
  if (dot) {
    dot.className = 'status-dot ' + state;
  }
  if (statusPillText) statusPillText.textContent = label;
}

// ── Panel State Transitions ───────────────────────────────
function showEmpty() {
  emptyState.classList.remove('hidden');
  statusDiv.classList.add('hidden');
  tableArea.classList.add('hidden');
  rawBar.classList.add('hidden');
  resultsMeta.classList.add('hidden');
  resultsActions.classList.add('hidden');
  setStatus('ready', 'System Ready');
}

function showProcessing() {
  emptyState.classList.add('hidden');
  statusDiv.classList.remove('hidden');
  tableArea.classList.add('hidden');
  rawBar.classList.add('hidden');
  resultsMeta.classList.add('hidden');
  resultsActions.classList.add('hidden');
  setProgress(0);
  setStatus('processing', 'Processing…');
}

function showResults() {
  emptyState.classList.add('hidden');
  statusDiv.classList.add('hidden');
  tableArea.classList.remove('hidden');
  rawBar.classList.remove('hidden');
  resultsMeta.classList.remove('hidden');
  resultsActions.classList.remove('hidden');
  setStatus('ready', 'Done');
}

// ── File Handler ──────────────────────────────────────────
function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    imagePreview.src = e.target.result;
    imagePreviewContainer.classList.remove('hidden');
    const fnEl = document.querySelector('.preview-filename');
    if (fnEl) fnEl.textContent = file.name || 'pasted_image.png';
    processBtn.disabled = false;
    setStep(2);
  };
  reader.readAsDataURL(file);
}

// Clear preview
if (clearPreview) {
  clearPreview.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    selectedFile = null;
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    imageInput.value = '';
    processBtn.disabled = true;
    const fnEl = document.querySelector('.preview-filename');
    if (fnEl) fnEl.textContent = '—';
    setStep(1);
  });
}

// File input change
imageInput.addEventListener('change', e => {
  if (e.target.files?.[0]) handleFile(e.target.files[0]);
});

// Drag & Drop
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
});

// Paste
document.addEventListener('paste', e => {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) { handleFile(item.getAsFile()); return; }
  }

  const textData = (e.clipboardData || window.clipboardData)?.getData('text');
  if (textData && textData.trim().length > 0) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault();

    rawText.value = rawText.value ? rawText.value + '\n\n--- PASTED TEXT ---\n\n' + textData : textData;
    parseAndDisplayData(textData);
    showResults();
    setStep(3);

    const fnEl = document.querySelector('.preview-filename');
    if (fnEl) fnEl.textContent = 'Pasted Text';
    imagePreviewContainer.classList.remove('hidden');
    processBtn.disabled = true;
  }
});

// ── Raw Output Toggle ─────────────────────────────────────
rawToggle.addEventListener('click', () => {
  rawText.classList.toggle('hidden');
  rawChevron.classList.toggle('open');
});

// ── Delete Row ────────────────────────────────────────────
window.deleteRow = function(btn) {
  const tr = btn.closest('tr');
  tr.remove();
  tableBody.querySelectorAll('tr').forEach((row, i) => {
    const noCell = row.querySelector('.col-no');
    if (noCell) noCell.textContent = i + 1;
  });
  const count = tableBody.querySelectorAll('tr').length;
  countBadge.textContent = count;
};

// ── Prevent Rich Text Paste in Table ─────────────────────
tableBody.addEventListener('paste', e => {
  if (e.target.isContentEditable) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }
});

// ── Copy for Sheets ───────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  if (rows.length === 0 || rows[0].querySelector('.error-msg')) return;

  let out = '';
  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length >= 4) {
      const shiftSelect = tds[2].querySelector('select');
      const shiftVal = shiftSelect ? shiftSelect.value : tds[2].innerText.trim();
      out += `${tds[0].innerText.trim()}\t${tds[1].innerText.trim()}\t${shiftVal}\t${tds[3].innerText.trim()}\n`;
    }
  }

  if (out) {
    navigator.clipboard.writeText(out).then(() => {
      const orig = copyBtn.innerHTML;
      copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      copyBtn.style.background = 'var(--green-dark)';
      setTimeout(() => { copyBtn.innerHTML = orig; copyBtn.style.background = ''; }, 2000);
    });
  }
});

// ── Export TXT ────────────────────────────────────────────
if (exportTxtBtn) {
  exportTxtBtn.addEventListener('click', () => {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    if (rows.length === 0 || rows[0].querySelector('.error-msg')) return;

    let out = 'SmartOCR Export\n' + '='.repeat(40) + '\n';
    out += `Generated: ${new Date().toLocaleString()}\n\n`;
    out += `#\tName\tShift\tTime\n`;
    out += '-'.repeat(40) + '\n';

    for (const tr of rows) {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length >= 4) {
        const shiftSelect = tds[2].querySelector('select');
        const shiftVal = shiftSelect ? shiftSelect.value : tds[2].innerText.trim();
        out += `${tds[0].innerText.trim()}\t${tds[1].innerText.trim()}\t${shiftVal}\t${tds[3].innerText.trim()}\n`;
      }
    }

    const blob = new Blob([out], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `SmartOCR_Export_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ── Reset ─────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  if (confirm('Clear all extracted data?')) {
    tableBody.innerHTML = '';
    rawText.value = '';
    countBadge.textContent = '0';
    showEmpty();
    setStep(1);
    imageInput.value = '';
    selectedFile = null;
    imagePreviewContainer.classList.add('hidden');
    processBtn.disabled = true;
    const fnEl = document.querySelector('.preview-filename');
    if (fnEl) fnEl.textContent = '—';
  }
});

// ── Process Button ────────────────────────────────────────
processBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  if (workerRef) {
    try { await workerRef.terminate(); } catch (_) {}
    workerRef = null;
  }

  processBtn.disabled = true;
  setStep(2);
  showProcessing();
  statusText.textContent = 'Preprocessing image…';
  setProgress(10);

  try {
    const img = new Image();
    const url = URL.createObjectURL(selectedFile);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });

    const canvas = document.createElement('canvas');
    const settingUpscale = $('settingUpscale');
    const doUpscale = settingUpscale ? settingUpscale.checked : true;
    const scale = doUpscale
      ? (img.width < 1000 ? 2 : (img.width > 2000 ? 2000 / img.width : 1.5))
      : 1;

    canvas.width  = img.width  * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    statusText.textContent = 'Loading OCR engine…';
    setProgress(15);

    const settingLang = $('settingLang');
    const lang = (settingLang && settingLang.value) || (langSelect ? langSelect.value : 'eng+ind');

    const settingPSM = $('settingPSM');
    const psmMode = settingPSM ? settingPSM.value : '4';

    const worker = await Tesseract.createWorker(lang, 1, {
      workerPath: 'https://unpkg.com/tesseract.js@v5.0.0/dist/worker.min.js',
      langPath:   'tessdata',
      corePath:   'https://unpkg.com/tesseract.js-core@v5.0.0',
      logger: m => {
        if (m.status === 'recognizing text') {
          const pct = 20 + Math.round(m.progress * 75);
          setProgress(pct);
          statusText.textContent = `Scanning… ${Math.round(m.progress * 100)}%`;
        } else {
          statusText.textContent = 'Loading AI models…';
        }
      }
    });

    workerRef = worker;

    await worker.setParameters({
      tessedit_pageseg_mode: psmMode,
      preserve_interword_spaces: '1',
    });

    const result = await worker.recognize(canvas);
    const text = result.data.text;

    setProgress(100);
    statusText.textContent = 'Finalizing…';

    rawText.value = rawText.value ? rawText.value + '\n\n--- NEW IMAGE ---\n\n' + text : text;

    await worker.terminate();
    workerRef = null;
    URL.revokeObjectURL(url);

    parseAndDisplayData(text);
    showResults();
    setStep(3);

    // Save to history
    const settingAutoSave = $('settingAutoSave');
    const doAutoSave = settingAutoSave ? settingAutoSave.checked : true;
    if (doAutoSave) saveToHistory(selectedFile.name, text);

  } catch (err) {
    console.error(err);
    statusText.textContent = '⚠ Error: ' + err.message;
    tableBody.innerHTML = `<tr><td colspan="5" class="error-msg">OCR failed: ${err.message}</td></tr>`;
    showResults();
    setStatus('error', 'Error');
  } finally {
    processBtn.disabled = false;
  }
});

// ── Scrape Current Table ──────────────────────────────────
function scrapeCurrentTable() {
  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const scraped = [];
  if (rows.length > 0 && rows[0].querySelector('.error-msg')) return [];

  for (const tr of rows) {
    const tds = Array.from(tr.querySelectorAll('td'));
    if (tds.length >= 4) {
      const originalName = tds[1].innerText.trim();
      const shiftSelect  = tds[2].querySelector('select');
      const shift = shiftSelect ? shiftSelect.value : tds[2].innerText.trim();
      const time  = tds[3].innerText.trim();

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
  const existingData = scrapeCurrentTable();
  tableBody.innerHTML = '';

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  let parsedRawList = [];
  let currentContextTime = '';

  for (const line of lines) {
    if (line.match(/dw requested|daily workers|department|date|front office/i)) continue;
    if (line.match(/name.*?shift.*?time/i)) continue;

    let extractedName = '';
    let extractedTime = '';
    let fullTimeStr   = '';

    // Strategy A: Pipe separators
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
      parsedRawList.push({ name: codeMatch[3].replace(/\(.*?$/, '').trim(), timeStr, fullTimeStr: timeStr });
      continue;
    }

    // Strategy C: Context time headers
    const headerMatch = line.match(/(?:jam\s*|shift\s*|masuk\s*|bf\s*|alacarte\s*|streats\s*|regular\s*jam\s*|butcher\s*jam\s*|hot\s*jam\s*)?(\d{1,2}[:\.])\d{2}/i);
    const isListItem  = line.match(/^(\d+[\.)\s]|[-•*]\s*@?|@\s*)/);

    if (headerMatch && !isListItem) {
      currentContextTime = headerMatch[0].match(/(\d{1,2}[:\.]\d{2})/)[1].replace(':', '.');
      continue;
    }

    // Strategy D: List items / fallback
    if (currentContextTime || isListItem || line.match(/\d{2}[:\.]?\d{2}/)) {
      const timeRegex = /(\d{2}[:\.]?\d{2}\s*-\s*\d{2}[:\.]?\d{2}|\d{2}[:\.]]\d{2}|\d{4}|OFF\s*R?|OFF)/i;
      const timeMatch = line.match(timeRegex);

      if (timeMatch && !line.match(/jam\s*\d/i)) {
        fullTimeStr   = timeMatch[1].toUpperCase();
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

  // Name casing
  function toTitleCase(str) {
    const minor = new Set(['bin', 'binti', 'van', 'de', 'di', 'el']);
    return str.toLowerCase().replace(/[^\s-]+/g, (word, offset) =>
      (offset === 0 || !minor.has(word)) ? word.charAt(0).toUpperCase() + word.slice(1) : word
    );
  }

  // Post-process
  let processed = [];

  for (const raw of parsedRawList) {
    if (!raw.timeStr || raw.timeStr.includes('OFF') || raw.timeStr === '-') continue;

    let time = raw.timeStr;
    if (time.match(/^\d{4}$/)) time = time.substring(0, 2) + '.' + time.substring(2);
    else if (time.includes(':')) time = time.replace(':', '.');

    const tf = parseFloat(time);
    if (isNaN(tf)) continue;

    const shift = (tf >= 1 && tf < 12) ? 'Morning' : (tf >= 12 && tf < 18) ? 'Afternoon' : 'Night';

    let cleanName = raw.name
      .replace(/dw new|dw pullman|dw sdr|dw baru/gi, '')
      .replace(/[@_=~—\-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanName.length < 2) continue;
    cleanName = toTitleCase(cleanName);

    let displayTime = raw.timeStr;
    if (displayTime.match(/^\d{4}$/)) displayTime = displayTime.substring(0, 2) + ':' + displayTime.substring(2);
    displayTime = displayTime.replace(/\./g, ':');
    displayTime = displayTime.replace(/^(\d):/, '0$1:');

    processed.push({
      originalName:   cleanName,
      normalizedName: cleanName.toLowerCase().replace(/[^a-z]/g, ''),
      shift, time: displayTime, timeFloat: tf
    });
  }

  // Merge + deduplicate
  const settingDedup = $('settingDedup');
  const doDedup = settingDedup ? settingDedup.checked : true;

  const combined = [...existingData, ...processed];
  let unique = combined;

  if (doDedup) {
    const seen = new Set();
    unique = combined.filter(r => {
      if (seen.has(r.normalizedName)) return false;
      seen.add(r.normalizedName);
      return true;
    });
  }

  // Sort
  const order = { Morning: 1, Afternoon: 2, Night: 3 };
  unique.sort((a, b) => order[a.shift] - order[b.shift] || a.timeFloat - b.timeFloat);

  if (unique.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="error-msg">No valid data found — check Raw OCR output below.</td>`;
    tableBody.appendChild(tr);
    countBadge.textContent = '0';
    return;
  }

  unique.forEach((row, i) => {
    const cls = row.shift === 'Morning' ? 'shift-morning' : row.shift === 'Afternoon' ? 'shift-afternoon' : 'shift-night';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-no">${i + 1}</td>
      <td class="col-name" contenteditable="true" spellcheck="false">${row.originalName}</td>
      <td class="col-shift">
        <select class="shift-select ${cls}" onchange="this.className='shift-select shift-'+this.value.toLowerCase()">
          <option value="Morning"   ${row.shift === 'Morning'   ? 'selected' : ''}>Morning</option>
          <option value="Afternoon" ${row.shift === 'Afternoon' ? 'selected' : ''}>Afternoon</option>
          <option value="Night"     ${row.shift === 'Night'     ? 'selected' : ''}>Night</option>
        </select>
      </td>
      <td class="col-time" contenteditable="true" spellcheck="false">${row.time}</td>
      <td class="col-action">
        <button class="btn-del" onclick="deleteRow(this)" title="Remove row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  countBadge.textContent = unique.length;
  updateHistoryCount();
}

// ── History ───────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]'); }
  catch { return []; }
}

function saveHistory(data) {
  try { localStorage.setItem(STORAGE_HISTORY, JSON.stringify(data)); } catch {}
}

function saveToHistory(filename, rawOcr) {
  const history = loadHistory();
  const entries = tableBody.querySelectorAll('tr:not(:has(.error-msg))').length;
  const counts  = { morning: 0, afternoon: 0, night: 0 };

  tableBody.querySelectorAll('tr').forEach(tr => {
    const sel = tr.querySelector('.shift-select');
    if (!sel) return;
    if (sel.value === 'Morning')   counts.morning++;
    if (sel.value === 'Afternoon') counts.afternoon++;
    if (sel.value === 'Night')     counts.night++;
  });

  history.unshift({
    id:        Date.now(),
    filename:  filename || 'unknown',
    date:      new Date().toLocaleString(),
    entries,
    counts,
    rawOcr:    rawOcr ? rawOcr.substring(0, 500) : ''
  });

  saveHistory(history.slice(0, 50));
  updateHistoryCount();
  updateStats();
}

function updateHistoryCount() {
  const h = loadHistory();
  const el = $('historyCount');
  if (el) el.textContent = h.length;
}

function renderHistory(filter = '') {
  const histList = $('historyList');
  if (!histList) return;

  let history = loadHistory();
  if (filter) {
    const q = filter.toLowerCase();
    history = history.filter(h => h.filename.toLowerCase().includes(q) || h.date.toLowerCase().includes(q));
  }

  if (history.length === 0) {
    histList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M3 3h6l2 3h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
          </svg>
        </div>
        <p class="empty-title">No history found</p>
        <p class="empty-sub">Completed scans will appear here</p>
      </div>`;
    return;
  }

  histList.innerHTML = history.map(h => `
    <div class="history-card" data-id="${h.id}">
      <div class="hist-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M3 15h18M9 3v18"/>
        </svg>
      </div>
      <div>
        <div class="hist-name">${escapeHtml(h.filename)}</div>
        <div class="hist-meta">${h.date}</div>
      </div>
      <div class="hist-entries">
        <span class="hist-count">${h.entries} entries</span>
        <button class="hist-del" onclick="deleteHistoryItem(${h.id})" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

window.deleteHistoryItem = function(id) {
  let history = loadHistory();
  history = history.filter(h => h.id !== id);
  saveHistory(history);
  renderHistory();
  updateHistoryCount();
};

const historySearch = $('historySearch');
if (historySearch) {
  historySearch.addEventListener('input', () => renderHistory(historySearch.value));
}

const clearHistoryBtn = $('clearHistoryBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all history?')) {
      saveHistory([]);
      renderHistory();
      updateHistoryCount();
    }
  });
}

// ── Stats ─────────────────────────────────────────────────
function loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_STATS) || '{}'); }
  catch { return {}; }
}

function updateStats() {
  const history = loadHistory();
  const totalEntries = history.reduce((sum, h) => sum + (h.entries || 0), 0);
  const stats = {
    totalScans:    history.length,
    totalEntries,
    lastActivity:  history.length ? history[0].date : '—',
    counts: {
      morning:   history.reduce((s, h) => s + (h.counts?.morning   || 0), 0),
      afternoon: history.reduce((s, h) => s + (h.counts?.afternoon || 0), 0),
      night:     history.reduce((s, h) => s + (h.counts?.night     || 0), 0),
    }
  };
  localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
  return stats;
}

function refreshDashboard() {
  const history = loadHistory();
  const totalEntries = history.reduce((sum, h) => sum + (h.entries || 0), 0);
  const counts = {
    morning:   history.reduce((s, h) => s + (h.counts?.morning   || 0), 0),
    afternoon: history.reduce((s, h) => s + (h.counts?.afternoon || 0), 0),
    night:     history.reduce((s, h) => s + (h.counts?.night     || 0), 0),
  };

  const dashTotalScans    = $('dashTotalScans');
  const dashTotalEntries  = $('dashTotalEntries');
  const dashLastActivity  = $('dashLastActivity');
  const dashSuccessRate   = $('dashSuccessRate');
  const dashRecentList    = $('dashRecentList');

  if (dashTotalScans)   dashTotalScans.textContent   = history.length;
  if (dashTotalEntries) dashTotalEntries.textContent  = totalEntries;
  if (dashLastActivity) dashLastActivity.textContent  = history.length ? history[0].date.split(',')[0] : '—';
  if (dashSuccessRate)  dashSuccessRate.textContent   = history.length ? '100%' : '—';

  const total = counts.morning + counts.afternoon + counts.night;
  const pct   = n => total ? Math.round(n / total * 100) : 0;

  const dm = $('distMorning'),   dmp = $('distMorningPct');
  const da = $('distAfternoon'), dap = $('distAfternoonPct');
  const dn = $('distNight'),     dnp = $('distNightPct');

  if (dm) dm.style.width = pct(counts.morning) + '%';
  if (da) da.style.width = pct(counts.afternoon) + '%';
  if (dn) dn.style.width = pct(counts.night) + '%';
  if (dmp) dmp.textContent = pct(counts.morning) + '%';
  if (dap) dap.textContent = pct(counts.afternoon) + '%';
  if (dnp) dnp.textContent = pct(counts.night) + '%';

  if (dashRecentList) {
    if (history.length === 0) {
      dashRecentList.innerHTML = '<div class="empty-inline">No sessions yet. Start your first scan.</div>';
    } else {
      dashRecentList.innerHTML = history.slice(0, 6).map(h => `
        <div class="recent-item">
          <div class="recent-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 3v18"/>
            </svg>
          </div>
          <div>
            <div class="recent-name">${escapeHtml(h.filename)}</div>
            <div class="recent-meta">${h.date}</div>
          </div>
          <span class="recent-entries">${h.entries} entries</span>
        </div>
      `).join('');
    }
  }
}

// ── Settings sync ─────────────────────────────────────────
const settingLangEl = $('settingLang');
if (settingLangEl && langSelect) {
  settingLangEl.addEventListener('change', () => {
    langSelect.value = settingLangEl.value;
  });
  langSelect.addEventListener('change', () => {
    settingLangEl.value = langSelect.value;
  });
}

// ── Utilities ─────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────
(function init() {
  switchPage('scanner');
  updateHistoryCount();
  showEmpty();
  setStep(1);
})();
