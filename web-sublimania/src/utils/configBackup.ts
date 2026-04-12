// ============================================================
//  utils/configBackup.ts — Exportar / importar configuración
//  completa: clientes, tallas por cliente + todos los equipos
// ============================================================
import type { TeamEntry, TallaDims, Cliente } from '../types';

const BACKUP_VERSION = 2;

export interface ConfigBackup {
  version: number;
  exportedAt: string;
  clientes: Cliente[];
  tallasPorCliente: Record<string, Record<string, TallaDims>>;
  teams: TeamEntry[];
}

// ── Exportar ─────────────────────────────────────────────────

export function exportBackup(
  clientes: Cliente[],
  tallasPorCliente: Record<string, Record<string, TallaDims>>,
  teams: TeamEntry[],
): void {
  const backup: ConfigBackup = {
    version:    BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    clientes,
    tallasPorCliente,
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

        if (!parsed.version || !Array.isArray(parsed.teams)) {
          reject(new Error('Archivo inválido: no es una configuración de Sublimania'));
          return;
        }
        if (parsed.version > BACKUP_VERSION) {
          reject(new Error(`Versión ${parsed.version} no soportada (máx. ${BACKUP_VERSION})`));
          return;
        }

        // Migrar v1 → v2: tallas planas → tallasPorCliente vacío
        if (parsed.version === 1) {
          (parsed as ConfigBackup).clientes = (parsed as ConfigBackup).clientes ?? [];
          (parsed as ConfigBackup).tallasPorCliente = {};
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

// ── Merge ─────────────────────────────────────────────────────

export interface MergeResult {
  clientes:          Cliente[];
  tallasPorCliente:  Record<string, Record<string, TallaDims>>;
  teams:             TeamEntry[];
  clientesAdded:     number;
  clientesUpdated:   number;
  tallasUpdated:     number;
  teamsAdded:        number;
  teamsUpdated:      number;
}

export function mergeBackup(
  backup:               ConfigBackup,
  currentClientes:      Cliente[],
  currentTallas:        Record<string, Record<string, TallaDims>>,
  currentTeams:         TeamEntry[],
): MergeResult {
  // ── Clientes: el archivo importado gana en conflicto ────────
  let clientesAdded = 0, clientesUpdated = 0;
  const clientesById = new Map<string, Cliente>(currentClientes.map(c => [c.id, c]));
  (backup.clientes ?? []).forEach(incoming => {
    if (clientesById.has(incoming.id)) clientesUpdated++;
    else clientesAdded++;
    clientesById.set(incoming.id, incoming);
  });
  const mergedClientes = Array.from(clientesById.values());

  // ── Tallas por cliente: el archivo importado gana ───────────
  let tallasUpdated = 0;
  const mergedTallas = { ...currentTallas };
  Object.entries(backup.tallasPorCliente ?? {}).forEach(([cid, tallas]) => {
    if (mergedTallas[cid]) tallasUpdated++;
    mergedTallas[cid] = { ...(mergedTallas[cid] ?? {}), ...tallas };
  });

  // ── Equipos: gana el que tenga updatedAt más reciente ───────
  let teamsAdded = 0, teamsUpdated = 0;
  const teamsById = new Map<string, TeamEntry>(currentTeams.map(t => [t.id, t]));
  backup.teams.forEach(incoming => {
    const existing = teamsById.get(incoming.id);
    if (!existing) {
      teamsById.set(incoming.id, incoming);
      teamsAdded++;
    } else {
      // El backup gana si es más reciente O si el existente quedó corrupto (sin nombre)
      const incomingNewer = new Date(incoming.updatedAt) >= new Date(existing.updatedAt);
      const existingCorrupt = !existing.nombre || existing.nombre === 'Sin nombre';
      if (incomingNewer || existingCorrupt) {
        teamsById.set(incoming.id, incoming);
        teamsUpdated++;
      }
    }
  });

  return {
    clientes:         mergedClientes,
    tallasPorCliente: mergedTallas,
    teams:            Array.from(teamsById.values()),
    clientesAdded,
    clientesUpdated,
    tallasUpdated,
    teamsAdded,
    teamsUpdated,
  };
}
