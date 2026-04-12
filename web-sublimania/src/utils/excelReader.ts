// ============================================================
//  utils/excelReader.ts — Parseo del Excel con SheetJS
// ============================================================
import * as XLSX from 'xlsx';
import type { Player } from '../types';
import { PLAYER_KEYS } from './schema';

export function parseExcelFile(file: File): Promise<Player[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        if (!rows.length) {
          reject(new Error('El archivo está vacío o sin datos'));
          return;
        }

        const players: Player[] = rows
          .map(row => {
            const norm: Record<string, string> = {};
            Object.keys(row).forEach(k => {
              norm[k.trim().toUpperCase()] = String(row[k]);
            });
            return norm as unknown as Player;
          })
          .filter(p => p.NOMBRE && p.NOMBRE.trim() !== '');

        if (!players.length) {
          reject(new Error('No se encontraron jugadores con NOMBRE válido'));
          return;
        }

        // Validar columnas mínimas
        const missing = PLAYER_KEYS.filter(k => !(k in players[0]));
        if (missing.length > 0) {
          reject(new Error('Faltan columnas requeridas: ' + missing.join(', ')));
          return;
        }

        resolve(players);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function extractTallas(players: Player[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  players.forEach(p => {
    const t = String(p.TALLA ?? '').trim();
    if (t && !seen.has(t)) { seen.add(t); result.push(t); }
  });
  return result;
}
