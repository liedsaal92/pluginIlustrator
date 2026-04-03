// ============================================================
//  csv-export.js — Generador del CSV final
// ============================================================

function buildCSV(players, tallaRules, overrides, globalConfig) {
  const rows = [];

  // Header
  rows.push(CSV_COLUMN_ORDER.join(','));

  players.forEach((player, idx) => {
    // Merge: talla base → override de jugador
    const talla = player.TALLA || '';
    const base = tallaRules[talla] || {};
    const override = overrides[idx] || {};
    const merged = Object.assign({}, base, override);

    // Campos derivados
    const tieneNumero = (player.NUMERO !== undefined && player.NUMERO !== '') ? 'SI' : 'NO';

    // Merge con datos del jugador
    const row = Object.assign({}, merged, {
      NOMBRE:         player.NOMBRE         || '',
      NOMBRE_CAMISETA:player.NOMBRE_CAMISETA|| '',
      NUMERO:         player.NUMERO         || '',
      TIENE_NUMERO:   tieneNumero,
      TALLA:          player.TALLA          || '',
      ALTO:           player.ALTO           || '',
      ANCHO:          player.ANCHO          || '',
      MANGA_ALTO:     player.MANGA_ALTO     || '',
      MANGA_ANCHO:    player.MANGA_ANCHO    || '',
      EQUIPO:         globalConfig.EQUIPO   || '',
      NOTAS:          globalConfig.NOTAS    || '',
    });

    const cells = CSV_COLUMN_ORDER.map(col => {
      const val = row[col] !== undefined ? row[col] : '';
      const str = String(val);
      // Escapar si contiene comas o comillas
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    });

    rows.push(cells.join(','));
  });

  return rows.join('\r\n');
}

function downloadCSV(content, filename) {
  const BOM = '\uFEFF'; // UTF-8 BOM para que Excel lo abra bien
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'EQUIPO.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Preview: primeras N filas para mostrar en pantalla
function previewCSV(players, tallaRules, overrides, globalConfig, maxRows) {
  const full = buildCSV(players, tallaRules, overrides, globalConfig);
  const lines = full.split('\r\n');
  const preview = lines.slice(0, (maxRows || 5) + 1); // +1 por header
  return preview.join('\r\n');
}
