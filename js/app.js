import { VolumeRenderer } from './volume-renderer.js';
import { loadDicomFiles } from './dicom-loader.js';
import { SliceViewer, WINDOW_PRESETS } from './slice-viewer.js';
import { makePhantom } from './phantom.js';

// Definición de "partes del cuerpo" por rango de densidad (HU). Cada una es un
// canal independiente que el médico puede encender/apagar y ajustar.
const TISSUES = [
  { id: 'pulmon',   nombre: 'Pulmones y vías aéreas', color: '#5ec8f2', huMin: -950, huMax: -450, alpha: 0.09, on: true },
  { id: 'grasa',    nombre: 'Grasa',                  color: '#f0d69a', huMin: -180, huMax: -30,  alpha: 0.06, on: false },
  { id: 'blando',   nombre: 'Tejido blando / órganos', color: '#e88a7d', huMin: -20,  huMax: 90,   alpha: 0.05, on: true },
  { id: 'vasos',    nombre: 'Vasos / contraste',      color: '#d94848', huMin: 90,   huMax: 300,  alpha: 0.55, on: true },
  { id: 'hueso',    nombre: 'Huesos (costillas, columna)', color: '#f4f0e6', huMin: 300, huMax: 3000, alpha: 0.9, on: true },
];

const state = {
  renderer: null,
  slice: null,
  volume: null,
  clip: { x: [0, 1], y: [0, 1], z: [0, 1] },
};

const el = (id) => document.getElementById(id);

function isMobile() {
  return window.matchMedia('(max-width: 820px)').matches || navigator.maxTouchPoints > 1;
}

function initRenderer() {
  const canvas = el('gl-canvas');
  state.renderer = new VolumeRenderer(canvas);
  state.slice = new SliceViewer(el('slice-canvas'));

  // Presupuesto de cómputo según dispositivo.
  if (isMobile()) {
    state.renderer.setSteps(120);
    state.renderer.setPixelRatioCap(1.5);
  } else {
    state.renderer.setSteps(224);
    state.renderer.setPixelRatioCap(2);
  }

  const ro = new ResizeObserver(() => state.renderer.resize());
  ro.observe(canvas.parentElement);
  window.addEventListener('resize', () => state.renderer.resize());
  requestAnimationFrame(() => state.renderer.resize());
}

function applyAllTissues() {
  TISSUES.forEach((t, i) => {
    state.renderer.setTissue(i, {
      huMin: t.huMin,
      huMax: t.huMax,
      color: t.color,
      alpha: t.on ? t.alpha : 0,
    });
  });
}

function buildTissueControls() {
  const wrap = el('tissues');
  wrap.innerHTML = '';
  TISSUES.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'tissue';
    row.innerHTML = `
      <label class="tissue-head">
        <input type="checkbox" data-i="${i}" ${t.on ? 'checked' : ''} />
        <span class="swatch" style="background:${t.color}"></span>
        <span class="tissue-name">${t.nombre}</span>
      </label>
      <div class="tissue-body">
        <div class="slider-line">
          <span>Opacidad</span>
          <input type="range" min="0" max="1" step="0.01" value="${t.alpha}" data-alpha="${i}" />
        </div>
        <div class="hu">HU ${t.huMin} … ${t.huMax === 3000 ? '∞' : t.huMax}</div>
      </div>`;
    wrap.appendChild(row);

    row.querySelector(`input[data-i="${i}"]`).addEventListener('change', (e) => {
      t.on = e.target.checked;
      row.classList.toggle('off', !t.on);
      state.renderer.setTissue(i, { alpha: t.on ? t.alpha : 0 });
    });
    row.querySelector(`input[data-alpha="${i}"]`).addEventListener('input', (e) => {
      t.alpha = parseFloat(e.target.value);
      if (t.on) state.renderer.setTissue(i, { alpha: t.alpha });
    });
    row.classList.toggle('off', !t.on);
  });
}

function bindClipControls() {
  const axes = [
    ['x', 'clip-x-min', 'clip-x-max'],
    ['y', 'clip-y-min', 'clip-y-max'],
    ['z', 'clip-z-min', 'clip-z-max'],
  ];
  for (const [axis, minId, maxId] of axes) {
    const minEl = el(minId);
    const maxEl = el(maxId);
    const update = () => {
      let lo = parseFloat(minEl.value);
      let hi = parseFloat(maxEl.value);
      if (lo > hi - 0.02) {
        if (document.activeElement === minEl) hi = Math.min(1, lo + 0.02);
        else lo = Math.max(0, hi - 0.02);
        minEl.value = lo;
        maxEl.value = hi;
      }
      state.clip[axis] = [lo, hi];
      state.renderer.setClip(axis, lo, hi);
    };
    minEl.addEventListener('input', update);
    maxEl.addEventListener('input', update);
  }
  el('clip-reset').addEventListener('click', () => {
    for (const [axis, minId, maxId] of axes) {
      el(minId).value = 0;
      el(maxId).value = 1;
      state.clip[axis] = [0, 1];
      state.renderer.setClip(axis, 0, 1);
    }
  });
}

function bindViewControls() {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => state.renderer.setViewPreset(btn.dataset.view));
  });
  el('view-reset').addEventListener('click', () => state.renderer.resetView());
  el('toggle-labels').addEventListener('change', (e) => state.renderer.setLabelsVisible(e.target.checked));
  el('toggle-shading').addEventListener('change', (e) => state.renderer.setShading(e.target.checked));
  el('mode-select').addEventListener('change', (e) => state.renderer.setMode(e.target.value));
  el('snapshot').addEventListener('click', () => {
    const url = state.renderer.snapshot();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reconstruccion-3d.png';
    a.click();
  });
}

function bindSliceControls() {
  const planeSel = el('slice-plane');
  const idx = el('slice-index');
  const winSel = el('slice-window');

  planeSel.addEventListener('change', () => {
    state.slice.setPlane(planeSel.value);
    idx.max = state.slice.sliceCount() - 1;
    idx.value = state.slice.index;
    el('slice-index-label').textContent = `${state.slice.index + 1} / ${state.slice.sliceCount()}`;
  });
  idx.addEventListener('input', () => {
    state.slice.setIndex(parseInt(idx.value, 10));
    el('slice-index-label').textContent = `${state.slice.index + 1} / ${state.slice.sliceCount()}`;
  });
  winSel.addEventListener('change', () => {
    const p = WINDOW_PRESETS[winSel.value];
    state.slice.setWindow(p.center, p.width);
  });
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  el('view-3d').classList.toggle('hidden', name !== '3d');
  el('view-slices').classList.toggle('hidden', name !== 'slices');
  if (name === '3d') state.renderer.resize();
  if (name === 'slices') state.slice.requestRender();
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => switchTab(t.dataset.tab));
  });
}

function showProgress(show, text, pct) {
  const p = el('progress');
  p.classList.toggle('hidden', !show);
  if (text !== undefined) el('progress-text').textContent = text;
  if (pct !== undefined) el('progress-bar').style.width = `${Math.round(pct * 100)}%`;
}

function showWarnings(warnings) {
  const box = el('warnings');
  if (!warnings || !warnings.length) {
    box.classList.add('hidden');
    box.innerHTML = '';
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = '<strong>Avisos:</strong><ul>' + warnings.map((w) => `<li>${w}</li>`).join('') + '</ul>';
}

function loadVolume(volume, warnings) {
  state.volume = volume;
  showProgress(true, 'Preparando visualización…', 0.98);

  requestAnimationFrame(() => {
    state.renderer.setVolume(volume);
    applyAllTissues();
    state.slice.setVolume(volume);

    // Reset de recortes.
    for (const axis of ['x', 'y', 'z']) {
      state.clip[axis] = [0, 1];
      state.renderer.setClip(axis, 0, 1);
    }
    document.querySelectorAll('#clip-panel input[type="range"]').forEach((r) => {
      r.value = r.id.includes('min') ? 0 : 1;
    });

    // Panel de cortes.
    const idx = el('slice-index');
    idx.max = state.slice.sliceCount() - 1;
    idx.value = state.slice.index;
    el('slice-index-label').textContent = `${state.slice.index + 1} / ${state.slice.sliceCount()}`;

    // Metadatos.
    const m = volume.meta;
    const dims = volume.dims;
    el('meta').innerHTML =
      `<span>${m.modality || 'CT'} · ${m.seriesDescription || m.studyDescription || 'Serie'}</span>` +
      `<span>${dims[0]}×${dims[1]}×${dims[2]} vóxeles` +
      (m.downsampled ? ` (reducido desde ${m.sourceDims.join('×')})` : '') + `</span>`;
    el('meta').classList.remove('hidden');

    showWarnings(warnings);
    showProgress(false);
    el('landing').classList.add('hidden');
    el('workspace').classList.remove('hidden');
    switchTab('3d');
  });
}

async function handleFiles(fileList) {
  const files = Array.from(fileList).filter((f) => !f.name.startsWith('.'));
  if (!files.length) return;
  showProgress(true, 'Leyendo archivos…', 0.02);
  showWarnings(null);
  try {
    const limits = isMobile()
      ? { maxVoxels: 22e6, maxDim: 256 }
      : { maxVoxels: 64e6, maxDim: 512 };
    const { volume, warnings } = await loadDicomFiles(
      files,
      (done, total, phase) => showProgress(true, `${phase}… ${done}/${total}`, done / total),
      limits
    );
    loadVolume(volume, warnings);
  } catch (err) {
    showProgress(false);
    const box = el('error');
    box.textContent = err.message || 'No se pudo procesar la serie.';
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 8000);
  }
}

function bindUpload() {
  const drop = el('dropzone');
  const input = el('file-input');
  const folderInput = el('folder-input');

  el('pick-files').addEventListener('click', () => input.click());
  el('pick-folder').addEventListener('click', () => folderInput.click());
  input.addEventListener('change', (e) => handleFiles(e.target.files));
  folderInput.addEventListener('change', (e) => handleFiles(e.target.files));

  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove('drag');
    })
  );
  drop.addEventListener('drop', async (e) => {
    const items = e.dataTransfer.items;
    if (items && items.length && items[0].webkitGetAsEntry) {
      const files = await collectDroppedFiles(items);
      handleFiles(files);
    } else {
      handleFiles(e.dataTransfer.files);
    }
  });

  el('load-demo').addEventListener('click', () => {
    showProgress(true, 'Generando fantoma de demostración…', 0.5);
    setTimeout(() => {
      const volume = makePhantom(isMobile() ? 128 : 168);
      loadVolume(volume, [
        'Este es un modelo sintético de demostración, no una tomografía real. Suba una serie DICOM para ver datos de un paciente.',
      ]);
    }, 30);
  });

  el('new-study').addEventListener('click', () => {
    el('workspace').classList.add('hidden');
    el('landing').classList.remove('hidden');
    input.value = '';
    folderInput.value = '';
  });
}

// Recorre entradas soltadas (soporta carpetas en navegadores basados en Chromium).
async function collectDroppedFiles(items) {
  const entries = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
    if (entry) entries.push(entry);
  }
  const files = [];
  const walk = (entry) =>
    new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((f) => {
          files.push(f);
          resolve();
        }, resolve);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readAll = () => {
          reader.readEntries(async (batch) => {
            if (!batch.length) return resolve();
            await Promise.all(batch.map(walk));
            readAll();
          }, resolve);
        };
        readAll();
      } else resolve();
    });
  await Promise.all(entries.map(walk));
  return files;
}

function bindPanelToggle() {
  const toggle = el('panel-toggle');
  const panel = el('control-panel');
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    toggle.classList.toggle('open');
  });
}

function main() {
  initRenderer();
  buildTissueControls();
  bindClipControls();
  bindViewControls();
  bindSliceControls();
  bindTabs();
  bindUpload();
  bindPanelToggle();
}

main();
