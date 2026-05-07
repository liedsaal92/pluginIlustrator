// ============================================================
//  utils/csvExport.ts — Generador del CSV final
// ============================================================
import type { Player, Rules, Overrides, GlobalConfig, TallaDims } from '../types';
import { CSV_COLUMN_ORDER } from './schema';

function escapeCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

export function buildCSV(
  players: Player[],
  tallaRules: Record<string, Rules>,
  overrides: Overrides,
  globalConfig: GlobalConfig,
  tallasSeleccionadas?: string[],
  tallaDims?: Record<string, TallaDims>,
): string {
  const rows: string[] = [CSV_COLUMN_ORDER.join(',')];

  players.forEach((player, idx) => {
    const tallaCami = player.TALLA_CAMI ?? '';
    const tallaPant = player.TALLA_PANT ?? '';
    if (tallasSeleccionadas && !tallasSeleccionadas.includes(tallaCami)) return;
    const baseCami = tallaRules[tallaCami] ?? {};
    const basePant = tallaPant ? (tallaRules[tallaPant] ?? {}) : {};
    const base: Record<string, string> = { ...baseCami, ...basePant };
    const override = overrides[idx] ?? {};
    const merged: Record<string, string> = { ...base, ...override };
    const dims = tallaDims?.[tallaCami] ?? { ALTO: '', ANCHO: '', MANGA_ALTO: '', MANGA_ANCHO: '' };

    const row: Record<string, string> = {
      ...merged,
      NOMBRE:          player.NOMBRE         ?? '',
      NOMBRE_CAMISETA: player.NOMBRE_CAMISETA ?? '',
      NUMERO:          player.NUMERO          ?? '',
      TIENE_NUMERO:    (player.NUMERO ?? '') !== '' ? 'SI' : 'NO',
      TALLA_CAMI:      tallaCami,
      TALLA_PANT:      tallaPant,
      ALTO:            dims.ALTO,
      ANCHO:           dims.ANCHO,
      MANGA_ALTO:      dims.MANGA_ALTO,
      MANGA_ANCHO:     dims.MANGA_ANCHO,
      EQUIPO:          globalConfig.EQUIPO    ?? '',
      NOTAS:           globalConfig.NOTAS     ?? '',
    };

    const cells = CSV_COLUMN_ORDER.map(col => escapeCell(String(row[col] ?? '')));
    rows.push(cells.join(','));
  });

  return rows.join('\r\n');
}

export function downloadCSV(content: string, filename?: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? 'EQUIPO.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
