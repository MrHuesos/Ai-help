'use strict';

// ===== DATA =====

const CATEGORIES = [
  { id: 'food',          label: 'Comida',          svgPath: 'M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-3.5-2.33-5.97-8.39-5.99C1.9 8.99 1 11.1 1 14.99h15.03z' },
  { id: 'transport',     label: 'Transporte',      svgPath: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z' },
  { id: 'entertainment', label: 'Diversión',       svgPath: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z' },
  { id: 'health',        label: 'Salud',           svgPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { id: 'shopping',      label: 'Compras',         svgPath: 'M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.66 0-3-1.34-3-3h2c0 .55.45 1 1 1s1-.45 1-1h2c0 1.66-1.34 3-3 3z' },
  { id: 'services',      label: 'Servicios',       svgPath: 'M7 2v11h3v9l7-12h-4l4-8z' },
  { id: 'other',         label: 'Otro',            svgPath: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z' },
];

const METHODS = [
  { id: 'apple',    label: 'Apple Wallet',   svgPath: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' },
  { id: 'cash',     label: 'Efectivo',        svgPath: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z' },
  { id: 'card',     label: 'Tarjeta',         svgPath: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z' },
  { id: 'transfer', label: 'Transferencia',   svgPath: 'M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z' },
  { id: 'other',    label: 'Otro',            svgPath: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z' },
];

const PERIOD_DAYS = { biweekly: 15, monthly: 30 };
const PERIOD_LABELS = { biweekly: 'Quincenal', monthly: 'Mensual' };

// ===== STATE =====

let state = {
  income: 0,
  period: 'biweekly',
  periodStart: new Date().toISOString(),
  transactions: [],
};

let selectedCategory = 'food';
let selectedMethod = 'apple';
let activeFilter = null;

// ===== PERSISTENCE =====

function loadState() {
  try {
    const raw = localStorage.getItem('presupuesto_state');
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch(e) {}
}

function saveState() {
  localStorage.setItem('presupuesto_state', JSON.stringify(state));
}

// ===== COMPUTED =====

function periodDays() { return PERIOD_DAYS[state.period]; }

function dailyLimit() {
  return state.income > 0 ? state.income / periodDays() : 0;
}

function periodStartDate() { return new Date(state.periodStart); }

function periodEndDate() {
  const d = new Date(state.periodStart);
  d.setDate(d.getDate() + periodDays());
  return d;
}

function daysInPeriod(start, end) {
  const ms = end - start;
  return Math.max(0, Math.round(ms / 86400000));
}

function daysRemaining() {
  return Math.max(0, daysInPeriod(startOfDay(new Date()), periodEndDate()));
}

function daysElapsed() {
  return Math.max(0, daysInPeriod(periodStartDate(), startOfDay(new Date())));
}

function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function currentPeriodTxns() {
  const s = periodStartDate().getTime();
  const e = periodEndDate().getTime();
  return state.transactions.filter(t => {
    const td = new Date(t.date).getTime();
    return td >= s && td <= e;
  });
}

function totalSpentPeriod() {
  return currentPeriodTxns().reduce((sum, t) => sum + t.amount, 0);
}

function remainingBudget() { return state.income - totalSpentPeriod(); }

function spentPct() {
  return state.income > 0 ? Math.min(1, totalSpentPeriod() / state.income) : 0;
}

function todayTxns() {
  const s = startOfDay(new Date()).getTime();
  const e = s + 86400000;
  return state.transactions.filter(t => {
    const td = new Date(t.date).getTime();
    return td >= s && td < e;
  });
}

function totalSpentToday() {
  return todayTxns().reduce((sum, t) => sum + t.amount, 0);
}

function remainingToday() { return dailyLimit() - totalSpentToday(); }

function todaySpentPct() {
  return dailyLimit() > 0 ? Math.min(1, totalSpentToday() / dailyLimit()) : 0;
}

function adjustedDailyLimit() {
  const rem = daysRemaining();
  return rem > 0 ? remainingBudget() / rem : 0;
}

function progressColor(pct) {
  if (pct < 0.6) return '#34C759';
  if (pct < 0.85) return '#FF9500';
  return '#FF3B30';
}

// ===== FORMATTERS =====

function fmt(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(amount);
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function txDateKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ===== SVG HELPERS =====

function svgIcon(path, size=20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${path}"/></svg>`;
}

function ringCircle(pct, color, size=72) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const label = Math.round(pct * 100) + '%';
  return `
    <div class="ring-wrap" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 72 72" width="${size}" height="${size}" style="transform:rotate(-90deg)">
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}22" stroke-width="7"/>
        <circle cx="36" cy="36" r="${r}" fill="none" stroke="${color}" stroke-width="7"
          stroke-dasharray="${dash} ${circ}" stroke-linecap="round"/>
      </svg>
      <div class="ring-pct" style="color:${color}">${label}</div>
    </div>`;
}

// ===== RENDER DASHBOARD =====

function renderDashboard() {
  const el = document.getElementById('dashboard-content');
  if (!el) return;

  if (state.income === 0) {
    el.innerHTML = `
      <div class="empty-state">
        ${svgIcon('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z', 64)}
        <h3>Configura tu ingreso</h3>
        <p>Ve a Configurar para ingresar tu sueldo quincenal o mensual.</p>
        <button onclick="switchTab('config')">Ir a Configurar</button>
      </div>`;
    return;
  }

  const rem = remainingBudget();
  const pct = spentPct();
  const color = progressColor(pct);
  const todayRem = remainingToday();
  const todayPct = todaySpentPct();
  const todayColor = progressColor(todayPct);
  const catBreak = categoryBreakdown();

  el.innerHTML = `
    <!-- Period card -->
    <div class="section-header">PERIODO ${PERIOD_LABELS[state.period].toUpperCase()}</div>
    <div class="card budget-main">
      <div class="budget-row">
        <div>
          <div class="budget-amount ${rem >= 0 ? 'positive' : 'negative'}">${fmt(rem)}</div>
          <div class="budget-sub">disponible de ${fmt(state.income)}</div>
        </div>
        ${ringCircle(pct, color)}
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct*100}%;background:${color}"></div></div>
      <div class="period-meta">
        <span>📅 ${daysElapsed()} días transcurridos</span>
        <span>⏱ ${daysRemaining()} días restantes</span>
      </div>
    </div>

    <!-- Daily tiles -->
    <div class="tiles-row">
      <div class="tile">
        <div class="tile-icon" style="background:#007AFF">
          ${svgIcon('M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z')}
        </div>
        <div class="tile-label">Límite diario base</div>
        <div class="tile-amount" style="color:#007AFF">${fmt(dailyLimit())}</div>
      </div>
      <div class="tile">
        <div class="tile-icon" style="background:#FF9500">
          ${svgIcon('M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z')}
        </div>
        <div class="tile-label">Límite ajustado hoy</div>
        <div class="tile-amount" style="color:${adjustedDailyLimit() >= 0 ? '#FF9500' : '#FF3B30'}">${fmt(Math.max(0, adjustedDailyLimit()))}</div>
      </div>
    </div>

    <!-- Today card -->
    <div class="section-header">HOY</div>
    <div class="card">
      <div class="today-ring-row">
        <div class="today-numbers">
          <div class="today-label">Gastado hoy</div>
          <div class="today-amount" style="color:${totalSpentToday() > dailyLimit() ? '#FF3B30' : '#000'}">${fmt(totalSpentToday())}</div>
          <div class="today-remaining" style="color:${todayRem >= 0 ? '#34C759' : '#FF3B30'}">
            ${todayRem >= 0 ? fmt(todayRem) + ' restante' : fmt(Math.abs(todayRem)) + ' excedido'}
          </div>
        </div>
        ${ringCircle(todayPct, todayColor, 80)}
      </div>
      <div style="margin-top:12px">
        <div class="progress-bar"><div class="progress-fill" style="width:${todayPct*100}%;background:${todayColor}"></div></div>
      </div>
    </div>

    <!-- Today's transactions -->
    ${todayTxns().length > 0 ? `
    <div class="section-header">GASTOS DE HOY</div>
    <div class="card" style="padding:8px 16px">
      ${todayTxns().slice(0,5).map(txRow).join('')}
    </div>` : ''}

    <!-- Category breakdown -->
    ${catBreak.length > 0 ? `
    <div class="section-header">POR CATEGORÍA (ESTE PERIODO)</div>
    <div class="card">
      ${catBreak.map(([catId, amount]) => {
        const cat = CATEGORIES.find(c => c.id === catId) || CATEGORIES[6];
        return `
          <div class="cat-row">
            <div class="cat-icon">${svgIcon(cat.svgPath, 16)}</div>
            <span class="cat-name">${cat.label}</span>
            <span class="cat-amount">${fmt(amount)}</span>
          </div>`;
      }).join('')}
    </div>` : ''}

    <div style="height:20px"></div>
  `;
}

function categoryBreakdown() {
  const totals = {};
  currentPeriodTxns().forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

function txRow(t) {
  const cat = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[6];
  const method = METHODS.find(m => m.id === t.method) || METHODS[4];
  return `
    <div class="tx-row" data-id="${t.id}">
      <div class="tx-icon">${svgIcon(cat.svgPath)}</div>
      <div class="tx-info">
        <div class="tx-name">${escHtml(t.description)}</div>
        <div class="tx-meta">${method.label} · ${cat.label}</div>
      </div>
      <div class="tx-amount">-${fmt(t.amount)}</div>
    </div>`;
}

// ===== RENDER GASTOS =====

function renderGastos() {
  const el = document.getElementById('gastos-content');
  if (!el) return;

  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  let txns = [...state.transactions];

  if (activeFilter) txns = txns.filter(t => t.category === activeFilter);
  if (query) txns = txns.filter(t => t.description.toLowerCase().includes(query));

  if (txns.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        ${svgIcon('M20 6h-2.18c.07-.44.18-.88.18-1.36 0-2.57-2.1-4.64-4.67-4.64-1.49 0-2.81.68-3.71 1.75C8.72.68 7.4 0 5.91 0 3.34 0 1.24 2.07 1.24 4.64c0 .48.11.92.18 1.36H0v2h20V6zM10 20c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm6 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM1 8v12l1.5 2h15L19 20V8H1zm16 11H3V10h14v9z', 48)}
        <h3>${state.transactions.length === 0 ? 'Sin gastos aún' : 'Sin resultados'}</h3>
        <p>${state.transactions.length === 0 ? 'Toca + para registrar tu primer gasto' : 'Intenta otra búsqueda o categoría'}</p>
        ${state.transactions.length === 0 ? '<button onclick="openModal()">Registrar gasto</button>' : ''}
      </div>`;
    return;
  }

  // Group by date
  const groups = {};
  txns.forEach(t => {
    const key = txDateKey(t.date);
    if (!groups[key]) groups[key] = { label: fmtDate(t.date), txns: [] };
    groups[key].txns.push(t);
  });
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  el.innerHTML = sortedKeys.map(key => {
    const g = groups[key];
    const total = g.txns.reduce((s, t) => s + t.amount, 0);
    return `
      <div class="tx-group-header">
        <span>${capitalize(g.label)}</span>
        <span class="group-total">${fmt(total)}</span>
      </div>
      <div class="card" style="padding:8px 16px;margin-bottom:8px">
        ${g.txns.map(t => `
          <div class="tx-row" data-id="${t.id}" onclick="toggleDelete('${t.id}')">
            ${txRow(t).replace(`<div class="tx-row" data-id="${t.id}">`, '').replace('</div>', '')}
            <button class="delete-btn" id="del-${t.id}" onclick="deleteTx(event,'${t.id}')">Eliminar</button>
          </div>`).join('')}
      </div>`;
  }).join('');
}

function renderFilterBar() {
  const el = document.getElementById('filter-bar');
  if (!el) return;
  el.innerHTML = `
    <button class="chip ${!activeFilter ? 'active' : ''}" onclick="setFilter(null)">Todos</button>
    ${CATEGORIES.map(c => `
      <button class="chip ${activeFilter === c.id ? 'active' : ''}" onclick="setFilter('${c.id}')">${c.label}</button>
    `).join('')}`;
}

function setFilter(id) {
  activeFilter = id;
  renderFilterBar();
  renderGastos();
}

function toggleDelete(id) {
  const btn = document.getElementById('del-' + id);
  if (btn) btn.style.display = btn.style.display === 'block' ? 'none' : 'block';
}

function deleteTx(e, id) {
  e.stopPropagation();
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  renderAll();
}

// ===== RENDER CONFIG =====

function renderConfig() {
  document.getElementById('cfg-income').value = state.income || '';
  document.getElementById('cfg-period').value = state.period;
  renderConfigSummary();
  renderPeriodInfo();
}

function renderConfigSummary() {
  const el = document.getElementById('cfg-summary');
  if (!el || !state.income) { if(el) el.innerHTML=''; return; }
  el.innerHTML = `
    <div class="divider"></div>
    <div class="cfg-summary-row"><span>Límite diario</span><span class="val">${fmt(dailyLimit())}</span></div>
    <div style="margin-top:8px" class="cfg-summary-row"><span>Límite por hora</span><span class="val">${fmt(dailyLimit()/24)}</span></div>`;
}

function renderPeriodInfo() {
  const el = document.getElementById('cfg-period-info');
  if (!el) return;
  el.innerHTML = `
    <div class="period-info-row"><span>Inicio</span><span class="val">${fmtDateShort(state.periodStart)}</span></div>
    <div class="period-info-row"><span>Fin estimado</span><span class="val">${fmtDateShort(periodEndDate().toISOString())}</span></div>
    <div class="period-info-row"><span>Días restantes</span><span class="val">${daysRemaining()} días</span></div>
    <div class="divider"></div>
    <button class="new-period-btn" onclick="confirmNewPeriod()">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      Iniciar nuevo periodo ahora
    </button>`;
}

function saveConfig() {
  const incomeVal = parseFloat(document.getElementById('cfg-income').value);
  state.income = isNaN(incomeVal) ? 0 : incomeVal;
  state.period = document.getElementById('cfg-period').value;
  saveState();
  renderConfigSummary();
  renderPeriodInfo();
  renderDashboard();
}

function confirmNewPeriod() {
  if (confirm('¿Iniciar nuevo periodo ahora?\n\nLos gastos anteriores se conservan en el historial.')) {
    state.periodStart = new Date().toISOString();
    saveState();
    renderAll();
  }
}

function confirmClearAll() {
  if (confirm('¿Borrar TODOS los gastos?\nEsta acción no se puede deshacer.')) {
    state.transactions = [];
    saveState();
    renderAll();
  }
}

// ===== MODAL ADD TRANSACTION =====

function openModal() {
  // Set default date to now
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISO = new Date(now - offset).toISOString().slice(0, 16);
  document.getElementById('tx-date').value = localISO;
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('modal-calc').textContent = '';
  document.getElementById('modal-calc').className = 'modal-calc';
  document.getElementById('btn-save').disabled = true;

  selectedCategory = 'food';
  selectedMethod = 'apple';
  renderCategoryGrid();
  renderMethodList();

  document.getElementById('modal-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('tx-amount').focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function renderCategoryGrid() {
  document.getElementById('category-grid').innerHTML = CATEGORIES.map(c => `
    <button class="cat-btn ${selectedCategory === c.id ? 'active' : ''}" onclick="selectCat('${c.id}')">
      <svg viewBox="0 0 24 24" width="22" height="22"><path d="${c.svgPath}"/></svg>
      <span>${c.label}</span>
    </button>`).join('');
}

function renderMethodList() {
  document.getElementById('method-list').innerHTML = METHODS.map(m => `
    <button class="method-btn ${selectedMethod === m.id ? 'active' : ''}" onclick="selectMethod('${m.id}')">
      <svg viewBox="0 0 24 24" width="20" height="20"><path d="${m.svgPath}"/></svg>
      <span>${m.label}</span>
      <svg class="check" viewBox="0 0 24 24" width="20" height="20"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
    </button>`).join('');
}

function selectCat(id) {
  selectedCategory = id;
  renderCategoryGrid();
}

function selectMethod(id) {
  selectedMethod = id;
  renderMethodList();
}

function updateModalCalc() {
  const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
  const el = document.getElementById('modal-calc');
  validateModal();
  if (amount <= 0 || dailyLimit() === 0) { el.textContent = ''; return; }
  const after = remainingToday() - amount;
  if (after >= 0) {
    el.className = 'modal-calc';
    el.textContent = `Te quedarán ${fmt(after)} del límite de hoy`;
  } else {
    el.className = 'modal-calc warning';
    el.textContent = `⚠ Excedes el límite diario por ${fmt(Math.abs(after))}`;
  }
}

function validateModal() {
  const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
  const desc = document.getElementById('tx-desc').value.trim();
  document.getElementById('btn-save').disabled = !(amount > 0 && desc.length > 0);
}

function saveTransaction() {
  const amount = parseFloat(document.getElementById('tx-amount').value);
  const desc = document.getElementById('tx-desc').value.trim();
  const dateVal = document.getElementById('tx-date').value;
  if (!amount || !desc) return;

  const tx = {
    id: Date.now().toString(),
    amount,
    description: desc,
    category: selectedCategory,
    method: selectedMethod,
    date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
  };

  state.transactions.unshift(tx);
  saveState();
  closeModal();
  renderAll();
}

// ===== SHORTCUTS MODAL =====

function showShortcutsInfo() {
  document.getElementById('shortcuts-overlay').classList.remove('hidden');
}

function closeShortcuts(e) {
  if (!e || e.target === document.getElementById('shortcuts-overlay')) {
    document.getElementById('shortcuts-overlay').classList.add('hidden');
  }
}

function copyURL() {
  const text = document.getElementById('url-scheme-text').textContent;
  navigator.clipboard?.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '¡Copiado!';
    setTimeout(() => btn.textContent = 'Copiar', 2000);
  });
}

// ===== TAB SWITCHING =====

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');

  if (tab === 'gastos') { renderGastos(); renderFilterBar(); }
  if (tab === 'config') renderConfig();
  if (tab === 'dashboard') renderDashboard();
}

// ===== UTILS =====

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== URL SHORTCUTS HANDLER =====
// savingstracker://add?amount=XX&desc=YY or ?add=1&amount=XX&desc=YY

function handleURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('add') === '1') {
    const amount = parseFloat(params.get('amount'));
    const desc = params.get('desc') || 'Apple Pay';
    if (amount > 0) {
      const tx = {
        id: Date.now().toString(),
        amount,
        description: desc,
        category: 'other',
        method: 'apple',
        date: new Date().toISOString(),
      };
      state.transactions.unshift(tx);
      saveState();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}

// ===== RENDER ALL =====

function renderAll() {
  renderDashboard();
  renderGastos();
  renderFilterBar();
  renderConfig();
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  handleURLParams();
  renderAll();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
