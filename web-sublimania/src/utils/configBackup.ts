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
  teamsMerged:       number;
}

// Fusiona dos entradas del mismo equipo — local siempre gana en conflicto.
// Incoming solo aporta: tallas nuevas, jugadores nuevos, overrides de esos jugadores.
function mergeTeamEntries(local: TeamEntry, incoming: TeamEntry): TeamEntry {
  // tallaRules: local gana por talla; incoming agrega tallas que local no tiene
  const mergedTallaRules: Record<string, import('../types').Rules> = {
    ...incoming.tallaRules,
    ...local.tallaRules,
  };

  // tallas: orden local primero, luego nuevas de incoming
  const mergedTallas = [
    ...local.tallas,
    ...incoming.tallas.filter(t => !local.tallas.includes(t)),
  ];

  // jugadores: local primero; incoming agrega los que no están (por NOMBRE)
  const localNames = new Set(local.players.map(p => p.NOMBRE.trim().toLowerCase()));
  const newPlayers = incoming.players.filter(
    p => !localNames.has(p.NOMBRE.trim().toLowerCase()),
  );
  const mergedPlayers = [...local.players, ...newPlayers];

  // overrides: local se mantiene intacto;
  // overrides de jugadores NUEVOS se remapean al nuevo índice
  const mergedOverrides: import('../types').Overrides = { ...local.overrides };
  const incomingNames = incoming.players.map(p => p.NOMBRE.trim().toLowerCase());
  newPlayers.forEach((player, ni) => {
    const srcIdx = incomingNames.indexOf(player.NOMBRE.trim().toLowerCase());
    const srcOverride = incoming.overrides[srcIdx];
    if (srcOverride && Object.keys(srcOverride).length > 0) {
      mergedOverrides[local.players.length + ni] = srcOverride;
    }
  });

  // exportHistory: local gana en conflicto de talla
  const mergedExportHistory = { ...incoming.exportHistory, ...local.exportHistory };

  return {
    ...local,
    // El nombre del backup gana — permite corregir nombres corruptos/erróneos locales
    nombre:         incoming.nombre || local.nombre,
    updatedAt:      new Date().toISOString(),
    tallas:         mergedTallas,
    tallaRules:     mergedTallaRules,
    players:        mergedPlayers,
    overrides:      mergedOverrides,
    exportHistory:  mergedExportHistory,
  };
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

  // ── Equipos ──────────────────────────────────────────────────
  // Match: primero por id, luego por nombre (para equipos creados en paralelo
  // en dos máquinas con distintos ids pero el mismo nombre).
  // Regla: local siempre gana en conflicto; incoming solo agrega lo que falta.
  let teamsAdded = 0, teamsUpdated = 0, teamsMerged = 0;
  const existingIds   = new Set<string>(currentTeams.map(t => t.id));
  const teamsById     = new Map<string, TeamEntry>(currentTeams.map(t => [t.id, t]));
  const teamsByNombre = new Map<string, TeamEntry>(
    currentTeams.map(t => [t.nombre.trim().toLowerCase(), t]),
  );
  const addedTeams: TeamEntry[] = [];

  backup.teams.forEach(incoming => {
    const byId     = teamsById.get(incoming.id);
    const byNombre = !byId
      ? teamsByNombre.get(incoming.nombre.trim().toLowerCase())
      : undefined;
    const existing = byId ?? byNombre;

    if (!existing) {
      teamsById.set(incoming.id, incoming);
      teamsByNombre.set(incoming.nombre.trim().toLowerCase(), incoming);
      addedTeams.push(incoming);
      teamsAdded++;
      return;
    }

    const existingCorrupt = !existing.nombre || existing.nombre === 'Sin nombre';
    if (existingCorrupt) {
      // Equipo local corrupto → reemplazar completo
      teamsById.set(existing.id, { ...incoming, id: existing.id });
      teamsByNombre.set(existing.nombre.trim().toLowerCase(), teamsById.get(existing.id)!);
      teamsUpdated++;
      return;
    }

    // Match válido → fusionar; local gana
    const merged = mergeTeamEntries(existing, incoming);
    teamsById.set(existing.id, merged);
    teamsByNombre.set(existing.nombre.trim().toLowerCase(), merged);
    if (byId) teamsUpdated++;
    else teamsMerged++;
  });

  // Equipos nuevos van al principio — siempre visibles en página 1
  const existingMerged = Array.from(teamsById.values()).filter(t => existingIds.has(t.id));
  const mergedTeams    = [...addedTeams, ...existingMerged];

  return {
    clientes:         mergedClientes,
    tallasPorCliente: mergedTallas,
    teams:            mergedTeams,
    clientesAdded,
    clientesUpdated,
    tallasUpdated,
    teamsAdded,
    teamsUpdated,
    teamsMerged,
  };
}
