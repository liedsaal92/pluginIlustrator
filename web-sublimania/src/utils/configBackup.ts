// ============================================================
//  utils/configBackup.ts — Exportar / importar configuración
//  completa: tallas globales + todos los equipos
// ============================================================
import type { TeamEntry, TallaDims } from '../types';

const BACKUP_VERSION = 1;

export interface ConfigBackup {
  version: number;
  exportedAt: string;
  tallas: Record<string, TallaDims>;
  teams: TeamEntry[];
}

// ── Exportar ─────────────────────────────────────────────────

export function exportBackup(
  tallas: Record<string, TallaDims>,
  teams: TeamEntry[],
): void {
  const backup: ConfigBackup = {
    version:    BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tallas,
    teams,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href     = url;
  a.download = `sublimania_config_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Importar ─────────────────────────────────────────────────

export function importBackup(file: File): Promise<ConfigBackup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target!.result as string) as ConfigBackup;

        if (!parsed.version || !parsed.tallas || !Array.isArray(parsed.teams)) {
          reject(new Error('Archivo inválido: no es una configuración de Sublimania'));
          return;
        }
        if (parsed.version > BACKUP_VERSION) {
          reject(new Error(`Versión ${parsed.version} no soportada (máx. ${BACKUP_VERSION})`));
          return;
        }

        resolve(parsed);
      } catch {
        reject(new Error('No se pudo leer el archivo — verificá que sea un .json válido'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file, 'utf-8');
  });
}
