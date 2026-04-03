// ============================================================
//  app.js — Lógica principal del Generador de Equipos
// ============================================================

// ── ESTADO GLOBAL ────────────────────────────────────────────
const APP = {
  players: [],       // [{NOMBRE, NOMBRE_CAMISETA, NUMERO, TALLA, ALTO, ANCHO, ...}]
  tallas: [],        // ['24H', '28H', ...]  — únicas, en orden de aparición
  tallaRules: {},    // { '24H': { LLEVA_NOMBRE_F:'NO', ESCUDO_ALTO:'', ... }, ... }
  overrides: {},     // { 0: { LLEVA_NOMBRE_F:'SI', ... }, 1: {...}, ... }
  globalConfig: {},  // { EQUIPO:'', NOTAS:'' }
  screen: 'upload',  // 'upload' | 'configure' | 'export'
  configTab: 'rules',// 'rules' | 'players'
  activeTalla: null,
  activePieza: 'frente',
  expandedPlayer: null,
  expandedPlayerPieza: 'frente',
  fileHandle: null,       // FileSystemFileHandle — recordado entre saves
  lastSaved: null,        // timestamp último guardado a archivo
};

// ── INDEXEDDB — guarda/recupera el file handle entre sesiones ─
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sublimania_db', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('handles');
    req.onsuccess  = e => resolve(e.target.result);
    req.onerror    = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch(e) {}
}

async function idbGet(key) {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  } catch(e) { return null; }
}

// ── PERSISTENCIA localStorage ─────────────────────────────────
function saveState() {
  try {
    localStorage.setItem('sublimania_state', JSON.stringify({
      players:      APP.players,
      tallas:       APP.tallas,
      tallaRules:   APP.tallaRules,
      overrides:    APP.overrides,
      globalConfig: APP.globalConfig,
      lastSaved:    APP.lastSaved,
    }));
  } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('sublimania_state');
    if (!raw) return;
    const saved = JSON.parse(raw);
    APP.players      = saved.players      || [];
    APP.tallas       = saved.tallas       || [];
    APP.tallaRules   = saved.tallaRules   || {};
    APP.overrides    = saved.overrides    || {};
    APP.globalConfig = saved.globalConfig || getDefaultGlobal();
    APP.lastSaved    = saved.lastSaved    || null;
    if (APP.players.length > 0) APP.screen = 'configure';
    if (APP.tallas.length > 0) APP.activeTalla = APP.tallas[0];
  } catch(e) {}
}

// ── PERSISTENCIA ARCHIVO (File System Access API) ─────────────

// Objeto de configuración que se guarda/carga como JSON
function buildConfigSnapshot() {
  return {
    version:      1,
    savedAt:      new Date().toISOString(),
    players:      APP.players,
    tallas:       APP.tallas,
    tallaRules:   APP.tallaRules,
    overrides:    APP.overrides,
    globalConfig: APP.globalConfig,
  };
}

function applyConfigSnapshot(config) {
  APP.players      = config.players      || [];
  APP.tallas       = config.tallas       || [];
  APP.tallaRules   = config.tallaRules   || {};
  APP.overrides    = config.overrides    || {};
  APP.globalConfig = config.globalConfig || getDefaultGlobal();
  APP.lastSaved    = config.savedAt      || null;
  if (APP.players.length > 0) APP.screen = 'configure';
  if (APP.tallas.length > 0)  APP.activeTalla = APP.tallas[0];
  saveState(); // sincronizar también a localStorage
}

// Guardar config a archivo (abre diálogo solo la primera vez)
async function saveConfigToFile() {
  try {
    if (!window.showSaveFilePicker) {
      showToast('Tu navegador no soporta File System Access API. Usá Chrome o Edge.', 'error');
      return;
    }

    let handle = APP.fileHandle;

    // Primera vez: abrir diálogo "Guardar como"
    if (!handle) {
      handle = await window.showSaveFilePicker({
        suggestedName: 'sublimania_config.json',
        types: [{ description: 'Config JSON', accept: { 'application/json': ['.json'] } }],
      });
      APP.fileHandle = handle;
      await idbPut('configHandle', handle); // recordar para próximas sesiones
    }

    const json    = JSON.stringify(buildConfigSnapshot(), null, 2);
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();

    APP.lastSaved = new Date().toISOString();
    saveState();
    updateSaveStatus();
    showToast('Config guardada → ' + handle.name, 'ok');

  } catch(e) {
    if (e.name !== 'AbortError') showToast('Error al guardar: ' + e.message, 'error');
  }
}

// Cargar config desde archivo (abre diálogo de selección)
async function loadConfigFromFile() {
  try {
    if (!window.showOpenFilePicker) {
      showToast('Tu navegador no soporta File System Access API. Usá Chrome o Edge.', 'error');
      return;
    }
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'Config JSON', accept: { 'application/json': ['.json'] } }],
    });
    APP.fileHandle = handle;
    await idbPut('configHandle', handle);

    const file   = await handle.getFile();
    const text   = await file.text();
    const config = JSON.parse(text);
    applyConfigSnapshot(config);
    render();
    showToast('Config cargada desde ' + handle.name, 'ok');
  } catch(e) {
    if (e.name !== 'AbortError') showToast('Error al cargar: ' + e.message, 'error');
  }
}

// Al iniciar: intentar reconectar con el archivo guardado anteriormente
// Si el permiso ya fue otorgado (misma sesión o Chrome lo recuerda) → carga automática
// Si necesita prompt → muestra banner de reconexión
async function tryReconnectFile() {
  try {
    const handle = await idbGet('configHandle');
    if (!handle) return;
    APP.fileHandle = handle;

    const perm = await handle.queryPermission({ mode: 'readwrite' });

    if (perm === 'granted') {
      // Permiso activo — leer y comparar con localStorage
      const file   = await handle.getFile();
      const text   = await file.text();
      const config = JSON.parse(text);

      // Usar el más reciente entre archivo y localStorage
      const fileDate  = config.savedAt   ? new Date(config.savedAt)   : new Date(0);
      const localDate = APP.lastSaved    ? new Date(APP.lastSaved)     : new Date(0);

      if (fileDate > localDate) {
        applyConfigSnapshot(config);
        render();
        showToast('Config cargada desde archivo → ' + handle.name, 'ok');
      }
      updateSaveStatus();
    } else {
      // Necesita gesto del usuario — mostrar banner
      showReconnectBanner(handle.name);
    }
  } catch(e) {}
}

// Banner no intrusivo para reconectar el archivo (necesita gesto de usuario)
function showReconnectBanner(fileName) {
  const existing = document.getElementById('reconnect-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'reconnect-banner';
  banner.className = 'reconnect-banner';
  banner.innerHTML = `
    <span class="reconnect-text">📁 Hay un archivo de config guardado: <strong>${esc(fileName)}</strong></span>
    <button class="btn btn-sm" id="btnReconnect">RECONECTAR</button>
    <button class="btn btn-ghost btn-sm" id="btnDismissBanner">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('btnReconnect').addEventListener('click', async () => {
    try {
      const perm = await APP.fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        banner.remove();
        const file   = await APP.fileHandle.getFile();
        const text   = await file.text();
        const config = JSON.parse(text);
        applyConfigSnapshot(config);
        render();
        updateSaveStatus();
        showToast('Config cargada desde ' + APP.fileHandle.name, 'ok');
      }
    } catch(e) {}
  });
  document.getElementById('btnDismissBanner').addEventListener('click', () => banner.remove());
}

// Actualiza el indicador de estado del guardado en el header
function updateSaveStatus() {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  if (APP.fileHandle && APP.lastSaved) {
    const d = new Date(APP.lastSaved);
    const label = d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
    el.innerHTML = `<span class="save-file">${esc(APP.fileHandle.name)}</span><span class="save-time">Guardado ${label}</span>`;
    el.className = 'save-status save-ok';
  } else if (APP.fileHandle) {
    el.innerHTML = `<span class="save-file">${esc(APP.fileHandle.name)}</span><span class="save-time">Sin guardar</span>`;
    el.className = 'save-status save-pending';
  } else {
    el.innerHTML = `<span class="save-time">Sin archivo de config</span>`;
    el.className = 'save-status save-none';
  }
}

// ── PARSEO EXCEL ─────────────────────────────────────────────
function handleFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) {
        showToast('El archivo está vacío o sin datos', 'error');
        return;
      }

      // Normalizar keys a uppercase
      APP.players = rows.map(row => {
        const norm = {};
        Object.keys(row).forEach(k => { norm[k.trim().toUpperCase()] = row[k]; });
        return norm;
      }).filter(r => r.NOMBRE && String(r.NOMBRE).trim() !== '');

      if (!APP.players.length) {
        showToast('No se encontraron jugadores con NOMBRE válido', 'error');
        return;
      }

      // Detectar tallas únicas en orden de aparición
      const seen = new Set();
      APP.tallas = [];
      APP.players.forEach(p => {
        const t = String(p.TALLA || '').trim();
        if (t && !seen.has(t)) { seen.add(t); APP.tallas.push(t); }
      });

      // Inicializar reglas para tallas nuevas (no sobrescribir las existentes)
      APP.tallas.forEach(t => {
        if (!APP.tallaRules[t]) {
          APP.tallaRules[t] = buildEmptyRules();
        }
      });

      if (!APP.globalConfig || !APP.globalConfig.EQUIPO) {
        APP.globalConfig = getDefaultGlobal();
      }

      APP.activeTalla = APP.tallas[0];
      APP.screen      = 'configure';
      APP.configTab   = 'rules';
      APP.overrides   = {};

      saveState();
      render();
      showToast(APP.players.length + ' jugadores cargados — ' + APP.tallas.length + ' tallas detectadas', 'ok');
    } catch(err) {
      showToast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function buildEmptyRules() {
  const out = {};
  Object.keys(SCHEMA).forEach(pieza => {
    SCHEMA[pieza].elements.forEach(el => {
      if (el.toggleKey) out[el.toggleKey] = 'NO';
      el.fields.forEach(f => { out[f.key] = ''; });
    });
  });
  return out;
}

// ── GETTERS ──────────────────────────────────────────────────
function getPlayerRules(idx) {
  const talla = String(APP.players[idx].TALLA || '');
  const base  = APP.tallaRules[talla] || {};
  return Object.assign({}, base, APP.overrides[idx] || {});
}

function hasOverride(idx) {
  return APP.overrides[idx] && Object.keys(APP.overrides[idx]).length > 0;
}

// ── SETTERS ──────────────────────────────────────────────────
function setTallaRule(talla, key, value) {
  if (!APP.tallaRules[talla]) APP.tallaRules[talla] = buildEmptyRules();
  APP.tallaRules[talla][key] = value;
  saveState();
}

function setOverride(idx, key, value) {
  if (!APP.overrides[idx]) APP.overrides[idx] = {};
  const talla = String(APP.players[idx].TALLA || '');
  const base  = APP.tallaRules[talla] || {};
  // Si el valor coincide con la base, eliminar el override (volver a heredar)
  if (String(value) === String(base[key] || '')) {
    delete APP.overrides[idx][key];
    if (Object.keys(APP.overrides[idx]).length === 0) delete APP.overrides[idx];
  } else {
    APP.overrides[idx][key] = value;
  }
  saveState();
}

function clearOverride(idx) {
  delete APP.overrides[idx];
  saveState();
  renderPlayerPanel(idx);
}

function applyTallaToAll(talla) {
  // Elimina overrides de todos los jugadores de esa talla
  APP.players.forEach((p, idx) => {
    if (String(p.TALLA || '') === talla) delete APP.overrides[idx];
  });
  saveState();
  showToast('Reglas de ' + talla + ' aplicadas a todos los jugadores de esa talla', 'ok');
}

function copyTallaRules(fromTalla, toTalla) {
  APP.tallaRules[toTalla] = Object.assign({}, APP.tallaRules[fromTalla] || {});
  saveState();
  showToast('Reglas de ' + fromTalla + ' copiadas a ' + toTalla, 'ok');
}

function copyTallaRulesToAll(fromTalla) {
  const others = APP.tallas.filter(t => t !== fromTalla);
  others.forEach(t => {
    APP.tallaRules[t] = Object.assign({}, APP.tallaRules[fromTalla] || {});
  });
  saveState();
  showToast('Reglas de ' + fromTalla + ' copiadas a todas las tallas (' + others.join(', ') + ')', 'ok');
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────
function render() {
  const main = document.getElementById('app');
  if (APP.screen === 'upload') {
    main.innerHTML = renderUpload();
  } else if (APP.screen === 'configure') {
    main.innerHTML = renderConfigure();
    attachConfigListeners();
  } else if (APP.screen === 'export') {
    main.innerHTML = renderExport();
    attachExportListeners();
  }
}

// ── PANTALLA UPLOAD ──────────────────────────────────────────
function renderUpload() {
  return `
    <div class="screen upload-screen">
      <div class="upload-box">
        <div class="upload-badge">PASO 01</div>
        <h2 class="upload-title">CARGÁ TU EXCEL</h2>
        <p class="upload-sub">Arrastrá o seleccioná el archivo con los jugadores</p>

        <div class="drop-zone" id="dropZone">
          <div class="drop-jersey">${svgJersey()}</div>
          <div class="drop-label">SOLTÁ TU .XLSX ACÁ</div>
          <div class="drop-sub-label">Columnas requeridas: NOMBRE · TALLA · ALTO · ANCHO · MANGA_ALTO · MANGA_ANCHO</div>
          <button class="btn btn-primary" id="btnSelectFile">SELECCIONAR ARCHIVO</button>
          <input type="file" id="fileInput" accept=".xlsx,.xls" style="display:none">
        </div>

        <div class="upload-cols-preview">
          <div class="cols-label">COLUMNAS DEL EXCEL</div>
          <div class="cols-list">
            ${PLAYER_KEYS.map(k => `<span class="col-tag">${k}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="upload-deco">
        <div class="deco-plotter">${svgPlotter()}</div>
        <div class="deco-block deco-red">SUBLIMACIÓN</div>
        <div class="deco-block deco-yellow">PLÓTER</div>
        <div class="deco-block deco-blue">EQUIPOS</div>
      </div>
    </div>
  `;
}

// ── PANTALLA CONFIGURE ───────────────────────────────────────
function renderConfigure() {
  return `
    <div class="screen configure-screen">
      <div class="config-header">
        <div class="config-header-left">
          <button class="btn btn-ghost btn-sm" id="btnBack">← VOLVER</button>
          <div class="config-stats">
            <span class="stat-badge stat-players">${APP.players.length} JUGADORES</span>
            <span class="stat-badge stat-tallas">${APP.tallas.length} TALLAS</span>
          </div>
        </div>
        <div class="config-global">
          ${GLOBAL_FIELDS.map(f => `
            <div class="global-field">
              <label>${f.label.toUpperCase()}</label>
              <input type="text" class="input-global" data-gkey="${f.key}"
                     value="${esc(APP.globalConfig[f.key] || '')}"
                     placeholder="${f.placeholder}">
            </div>
          `).join('')}
        </div>
        <div class="header-file-actions">
          <div id="saveStatus" class="save-status save-none"><span class="save-time">Sin archivo de config</span></div>
          <button class="btn btn-sm" id="btnSaveConfig" title="Guarda la configuración como archivo JSON en tu carpeta">💾 GUARDAR CONFIG</button>
          <button class="btn btn-ghost btn-sm" id="btnLoadConfig" title="Cargar configuración desde un archivo JSON">📂 CARGAR</button>
        </div>
        <button class="btn btn-primary" id="btnExport">EXPORTAR CSV →</button>
      </div>

      <div class="config-tabs">
        <button class="tab-btn ${APP.configTab==='rules'?'active':''}" data-tab="rules">
          ⚙ REGLAS POR TALLA
        </button>
        <button class="tab-btn ${APP.configTab==='players'?'active':''}" data-tab="players">
          👤 JUGADORES (${APP.players.length})
        </button>
      </div>

      <div class="config-body" id="configBody">
        ${APP.configTab === 'rules' ? renderRulesTab() : renderPlayersTab()}
      </div>
    </div>
  `;
}

// ── TAB REGLAS POR TALLA ─────────────────────────────────────
function renderRulesTab() {
  return `
    <div class="rules-layout">
      <div class="tallas-sidebar">
        <div class="sidebar-label">TALLAS</div>
        ${APP.tallas.map(t => `
          <button class="talla-btn ${APP.activeTalla===t?'active':''}" data-talla="${t}">
            <span class="talla-code">${t}</span>
            <span class="talla-count">${APP.players.filter(p=>String(p.TALLA||'')===t).length} jug.</span>
          </button>
        `).join('')}
        <div class="sidebar-actions">
          <button class="btn btn-ghost btn-sm btn-full" id="btnApplyAll"
                  title="Elimina overrides individuales de esta talla">
            ↺ RESET OVERRIDES
          </button>
          <div class="copy-section">
            <div class="copy-label">Copiar a:</div>
            <select class="select-copy" id="selectCopyTo">
              <option value="">— talla —</option>
              ${APP.tallas.filter(t=>t!==APP.activeTalla).map(t=>`<option value="${t}">${t}</option>`).join('')}
            </select>
            <button class="btn btn-ghost btn-sm btn-full" id="btnCopyRules">COPIAR REGLAS</button>
            <button class="btn btn-ghost btn-sm btn-full btn-copy-all" id="btnCopyAll"
                    title="Copia estas reglas a todas las demás tallas">
              COPIAR A TODAS
            </button>
          </div>
        </div>
      </div>

      <div class="rules-main">
        <div class="pieza-tabs">
          ${Object.keys(SCHEMA).map(pieza => `
            <button class="pieza-tab ${APP.activePieza===pieza?'active':''}"
                    data-pieza="${pieza}"
                    style="--pieza-color:${SCHEMA[pieza].color}">
              ${SCHEMA[pieza].label}
            </button>
          `).join('')}
        </div>
        <div class="elements-grid" id="elementsGrid">
          ${renderElements(APP.activeTalla, APP.activePieza, 'talla')}
        </div>
      </div>
    </div>
  `;
}

// ── TAB JUGADORES ────────────────────────────────────────────
function renderPlayersTab() {
  return `
    <div class="players-layout">
      ${APP.players.map((p, idx) => `
        <div class="player-card ${hasOverride(idx)?'has-override':''}" id="playerCard${idx}">
          <div class="player-card-header" data-player="${idx}">
            <div class="player-info">
              <span class="player-talla-badge" style="background:${tallaColor(p.TALLA)}">${p.TALLA||'—'}</span>
              <span class="player-name">${esc(p.NOMBRE||'')}</span>
              ${p.NOMBRE_CAMISETA?`<span class="player-camiseta">"${esc(p.NOMBRE_CAMISETA)}"</span>`:''}
            </div>
            <div class="player-meta">
              ${p.NUMERO?`<span class="player-num">#${p.NUMERO}</span>`:'<span class="player-num-empty">S/N</span>'}
              <span class="player-dims">${p.ALTO||'?'}×${p.ANCHO||'?'} cm</span>
              ${hasOverride(idx)?'<span class="override-badge">OVERRIDE</span>':''}
              <span class="player-toggle">${APP.expandedPlayer===idx?'▲':'▼'}</span>
            </div>
          </div>
          ${APP.expandedPlayer===idx ? renderPlayerExpanded(idx) : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderPlayerExpanded(idx) {
  return `
    <div class="player-expanded">
      <div class="player-pieza-tabs">
        ${Object.keys(SCHEMA).map(pieza => `
          <button class="pieza-tab-sm ${APP.expandedPlayerPieza===pieza?'active':''}"
                  data-pieza="${pieza}" data-player="${idx}"
                  style="--pieza-color:${SCHEMA[pieza].color}">
            ${SCHEMA[pieza].label}
          </button>
        `).join('')}
        <button class="btn btn-ghost btn-sm" id="btnClearOverride${idx}" data-player="${idx}">
          ↺ LIMPIAR OVERRIDE
        </button>
      </div>
      <div class="player-elements" id="playerElements${idx}">
        ${renderElements(idx, APP.expandedPlayerPieza, 'player')}
      </div>
    </div>
  `;
}

// ── RENDER ELEMENTOS (compartido talla/jugador) ───────────────
function renderElements(context, pieza, mode) {
  // mode='talla' → context es el string de talla
  // mode='player' → context es el índice de jugador
  const schema = SCHEMA[pieza];
  if (!schema) return '';

  const getRules = () => {
    if (mode === 'talla') return APP.tallaRules[context] || {};
    return getPlayerRules(context);
  };

  const isOverridden = (key) => {
    if (mode !== 'player') return false;
    return APP.overrides[context] && APP.overrides[context][key] !== undefined;
  };

  return schema.elements.map(el => {
    const rules  = getRules();
    const active = el.toggleKey ? rules[el.toggleKey] === 'SI' : true;
    const hasFields = el.fields.length > 0;
    const ctxAttr = mode === 'talla' ? `data-talla="${esc(context)}"` : `data-player="${context}"`;

    return `
      <div class="element-card ${active?'element-active':'element-inactive'}" data-el="${el.id}">
        <div class="element-header">
          <span class="element-icon">${el.icon}</span>
          <span class="element-label">${el.label}</span>
          ${el.toggleKey ? `
            <label class="toggle-switch">
              <input type="checkbox" class="el-toggle"
                     ${ctxAttr}
                     data-key="${el.toggleKey}"
                     data-mode="${mode}"
                     ${active?'checked':''}>
              <span class="toggle-slider"></span>
            </label>
          ` : `<span class="element-always-on">SIEMPRE</span>`}
        </div>
        ${hasFields && active ? `
          <div class="element-fields">
            ${el.fields.map(f => `
              <div class="field-row ${isOverridden(f.key)?'is-overridden':''}">
                <label class="field-label">${f.label.toUpperCase()}</label>
                ${renderField(f, rules[f.key], ctxAttr, mode, isOverridden(f.key))}
                ${f.unit?`<span class="field-unit">${f.unit}</span>`:''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderField(f, value, ctxAttr, mode, overridden) {
  const val = value !== undefined && value !== null ? value : '';
  const overClass = overridden ? 'input-overridden' : '';
  if (f.type === 'select') {
    return `
      <select class="field-select ${overClass} field-input"
              ${ctxAttr} data-key="${f.key}" data-mode="${mode}">
        <option value="">—</option>
        ${f.options.map(o => `<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
      </select>
    `;
  }
  return `
    <input type="number" step="0.01" min="0"
           class="field-input ${overClass}"
           ${ctxAttr} data-key="${f.key}" data-mode="${mode}"
           value="${esc(val)}" placeholder="0.00">
  `;
}

function renderPlayerPanel(idx) {
  const card = document.getElementById('playerCard' + idx);
  if (!card) return;
  card.className = 'player-card ' + (hasOverride(idx) ? 'has-override' : '');
  const expanded = card.querySelector('.player-expanded');
  if (expanded) {
    expanded.querySelector('.player-elements').innerHTML =
      renderElements(idx, APP.expandedPlayerPieza, 'player');
    attachFieldListeners(expanded);
  }
}

// ── PANTALLA EXPORT ──────────────────────────────────────────
function renderExport() {
  const csv = buildCSV(APP.players, APP.tallaRules, APP.overrides, APP.globalConfig);
  const lines = csv.split('\r\n');
  const preview = lines.slice(0, 6).join('\n');
  const totalCols = CSV_COLUMN_ORDER.length;

  return `
    <div class="screen export-screen">
      <div class="export-header">
        <button class="btn btn-ghost" id="btnBackExport">← VOLVER</button>
        <h2>EXPORTAR CSV</h2>
        <button class="btn btn-primary" id="btnDownload">⬇ DESCARGAR CSV</button>
      </div>
      <div class="export-stats">
        <div class="stat-card"><div class="stat-num">${APP.players.length}</div><div class="stat-lbl">JUGADORES</div></div>
        <div class="stat-card"><div class="stat-num">${APP.tallas.length}</div><div class="stat-lbl">TALLAS</div></div>
        <div class="stat-card"><div class="stat-num">${totalCols}</div><div class="stat-lbl">COLUMNAS</div></div>
        <div class="stat-card"><div class="stat-num">${Object.keys(APP.overrides).length}</div><div class="stat-lbl">OVERRIDES</div></div>
      </div>
      <div class="export-preview">
        <div class="preview-label">PREVIEW (primeras 5 filas)</div>
        <div class="preview-scroll">
          <pre class="preview-csv">${esc(preview)}</pre>
        </div>
      </div>
    </div>
  `;
}

// ── EVENT LISTENERS ──────────────────────────────────────────
function attachUploadListeners() {
  const dz   = document.getElementById('dropZone');
  const fi   = document.getElementById('fileInput');
  const btn  = document.getElementById('btnSelectFile');

  if (!dz) return;

  btn.addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => { if (fi.files[0]) handleFile(fi.files[0]); });

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
}

function attachConfigListeners() {
  // Back
  const btnBack = document.getElementById('btnBack');
  if (btnBack) btnBack.addEventListener('click', () => {
    APP.screen = 'upload'; render(); attachUploadListeners();
  });

  // Save / Load config file
  const btnSave = document.getElementById('btnSaveConfig');
  if (btnSave) btnSave.addEventListener('click', () => saveConfigToFile());

  const btnLoad = document.getElementById('btnLoadConfig');
  if (btnLoad) btnLoad.addEventListener('click', () => loadConfigFromFile());

  // Actualizar indicador de estado
  updateSaveStatus();

  // Export
  const btnExp = document.getElementById('btnExport');
  if (btnExp) btnExp.addEventListener('click', () => { APP.screen = 'export'; render(); });

  // Config tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      APP.configTab = btn.dataset.tab;
      render();
    });
  });

  // Global fields
  document.querySelectorAll('.input-global').forEach(inp => {
    inp.addEventListener('change', () => {
      APP.globalConfig[inp.dataset.gkey] = inp.value;
      saveState();
    });
  });

  if (APP.configTab === 'rules') attachRulesListeners();
  if (APP.configTab === 'players') attachPlayersListeners();
}

function attachRulesListeners() {
  // Talla selector
  document.querySelectorAll('.talla-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      APP.activeTalla = btn.dataset.talla;
      render();
    });
  });

  // Pieza tabs
  document.querySelectorAll('.pieza-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      APP.activePieza = btn.dataset.pieza;
      document.getElementById('elementsGrid').innerHTML =
        renderElements(APP.activeTalla, APP.activePieza, 'talla');
      document.querySelectorAll('.pieza-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      attachFieldListeners(document.getElementById('elementsGrid'));
    });
  });

  attachFieldListeners(document.getElementById('elementsGrid'));

  // Apply all / copy
  const btnApply = document.getElementById('btnApplyAll');
  if (btnApply) btnApply.addEventListener('click', () => {
    applyTallaToAll(APP.activeTalla);
    render();
  });

  const btnCopy = document.getElementById('btnCopyRules');
  if (btnCopy) btnCopy.addEventListener('click', () => {
    const to = document.getElementById('selectCopyTo').value;
    if (to) { copyTallaRules(APP.activeTalla, to); }
  });

  const btnCopyAll = document.getElementById('btnCopyAll');
  if (btnCopyAll) btnCopyAll.addEventListener('click', () => {
    if (APP.tallas.length < 2) { showToast('Solo hay una talla', 'error'); return; }
    copyTallaRulesToAll(APP.activeTalla);
  });
}

function attachPlayersListeners() {
  // Expand player cards
  document.querySelectorAll('.player-card-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const idx = parseInt(hdr.dataset.player);
      APP.expandedPlayer = APP.expandedPlayer === idx ? null : idx;
      render();
    });
  });

  // Player pieza tabs
  document.querySelectorAll('[data-pieza][data-player]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      APP.expandedPlayerPieza = btn.dataset.pieza;
      const idx = parseInt(btn.dataset.player);
      document.getElementById('playerElements' + idx).innerHTML =
        renderElements(idx, APP.expandedPlayerPieza, 'player');
      document.querySelectorAll('.pieza-tab-sm').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      attachFieldListeners(document.getElementById('playerElements' + idx));
    });
  });

  // Clear override buttons
  document.querySelectorAll('[id^="btnClearOverride"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.player);
      clearOverride(idx);
      render();
    });
  });

  // Fields in expanded players
  APP.players.forEach((_, idx) => {
    const el = document.getElementById('playerElements' + idx);
    if (el) attachFieldListeners(el);
  });
}

function attachFieldListeners(container) {
  if (!container) return;

  // Toggles
  container.querySelectorAll('.el-toggle').forEach(chk => {
    chk.addEventListener('change', () => {
      const val  = chk.checked ? 'SI' : 'NO';
      const key  = chk.dataset.key;
      const mode = chk.dataset.mode;
      if (mode === 'talla') {
        setTallaRule(chk.dataset.talla, key, val);
      } else {
        setOverride(parseInt(chk.dataset.player), key, val);
      }
      // Refrescar sólo el card/grid afectado
      const grid = chk.closest('.elements-grid') || chk.closest('.player-elements');
      if (grid) {
        if (mode === 'talla') {
          grid.innerHTML = renderElements(chk.dataset.talla, APP.activePieza, 'talla');
        } else {
          const idx = parseInt(chk.dataset.player);
          grid.innerHTML = renderElements(idx, APP.expandedPlayerPieza, 'player');
        }
        attachFieldListeners(grid);
      }
    });
  });

  // Inputs y selects
  container.querySelectorAll('.field-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const key  = inp.dataset.key;
      const mode = inp.dataset.mode;
      const val  = inp.value;
      if (mode === 'talla') {
        setTallaRule(inp.dataset.talla, key, val);
      } else {
        setOverride(parseInt(inp.dataset.player), key, val);
        // Marcar visualmente si es override
        const talla = String(APP.players[parseInt(inp.dataset.player)].TALLA || '');
        const base  = (APP.tallaRules[talla] || {})[key];
        if (String(val) !== String(base || '')) {
          inp.classList.add('input-overridden');
        } else {
          inp.classList.remove('input-overridden');
        }
      }
    });
  });
}

function attachExportListeners() {
  const btnBack = document.getElementById('btnBackExport');
  if (btnBack) btnBack.addEventListener('click', () => { APP.screen = 'configure'; render(); });

  const btnDl = document.getElementById('btnDownload');
  if (btnDl) btnDl.addEventListener('click', () => {
    const csv      = buildCSV(APP.players, APP.tallaRules, APP.overrides, APP.globalConfig);
    const equipo   = (APP.globalConfig.EQUIPO || 'EQUIPO').replace(/\s+/g,'_').toUpperCase();
    const ts       = new Date().toISOString().slice(0,10).replace(/-/g,'');
    downloadCSV(csv, equipo + '_' + ts + '.csv');
    showToast('CSV descargado', 'ok');
  });
}

// ── UTILS ─────────────────────────────────────────────────────
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

const TALLA_COLORS = ['#E8462A','#F5C842','#4A9BE8','#7B5CF0','#1DBF73','#F050A0','#FF8C00','#00CED1'];
const tallaColorMap = {};
function tallaColor(talla) {
  if (!tallaColorMap[talla]) {
    const idx = Object.keys(tallaColorMap).length % TALLA_COLORS.length;
    tallaColorMap[talla] = TALLA_COLORS[idx];
  }
  return tallaColorMap[talla];
}

function showToast(msg, type) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast toast-' + (type || 'ok');
  t.classList.add('toast-show');
  setTimeout(() => t.classList.remove('toast-show'), 3000);
}

// ── SVG DECORACIONES ─────────────────────────────────────────
function svgJersey() {
  return `
    <svg class="jersey-svg" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 8 Q45 2 55 5 Q60 12 65 12 Q70 12 75 5 Q85 2 95 8
               L115 28 L98 36 L95 20 L95 88 L35 88 L35 20 L32 36 L15 28 Z"
            fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M55 5 Q60 12 65 12" fill="none" stroke="currentColor" stroke-width="2.5"/>
    </svg>
  `;
}

function svgPlotter() {
  return `
    <svg class="plotter-svg" viewBox="0 0 160 80" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="140" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
      <rect x="20" y="30" width="30" height="20" fill="currentColor" opacity="0.15"/>
      <circle cx="50" cy="55" r="8" fill="none" stroke="currentColor" stroke-width="3"/>
      <circle cx="110" cy="55" r="8" fill="none" stroke="currentColor" stroke-width="3"/>
      <line x1="60" y1="40" x2="100" y2="40" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="M70 30 L80 15 L90 30" fill="none" stroke="currentColor" stroke-width="2.5"/>
    </svg>
  `;
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadState(); // 1. localStorage → inmediato, sin permiso
  render();
  if (APP.screen === 'upload') attachUploadListeners();

  // 2. Intentar reconectar con el archivo guardado (async, no bloquea el render)
  await tryReconnectFile();
});
