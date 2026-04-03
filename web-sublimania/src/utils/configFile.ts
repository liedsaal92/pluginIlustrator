// ============================================================
//  utils/configFile.ts — Guardar/cargar config JSON
//  Usa File System Access API + IndexedDB para el file handle
// ============================================================
import type { Player, Rules, Overrides, GlobalConfig } from '../types';
import { getDefaultGlobal } from './schema';

// ── TIPOS ────────────────────────────────────────────────────
export interface ConfigSnapshot {
  version: number;
  savedAt: string;
  players: Player[];
  tallas: string[];
  tallaRules: Record<string, Rules>;
  overrides: Overrides;
  globalConfig: GlobalConfig;
}

// ── INDEXEDDB — persiste el file handle entre sesiones ───────
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sublimania_db', 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore('handles');
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut(key: string, value: FileSystemFileHandle): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* silencioso */ }
}

export async function idbGet(key: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await idbOpen();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get(key);
      req.onsuccess = () => resolve(req.result as FileSystemFileHandle | null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

// ── SNAPSHOT ─────────────────────────────────────────────────
export function buildSnapshot(
  players: Player[],
  tallas: string[],
  tallaRules: Record<string, Rules>,
  overrides: Overrides,
  globalConfig: GlobalConfig,
): ConfigSnapshot {
  return { version: 1, savedAt: new Date().toISOString(), players, tallas, tallaRules, overrides, globalConfig };
}

export function parseSnapshot(raw: unknown): ConfigSnapshot {
  const c = raw as Partial<ConfigSnapshot>;
  return {
    version:      c.version      ?? 1,
    savedAt:      c.savedAt      ?? new Date().toISOString(),
    players:      c.players      ?? [],
    tallas:       c.tallas       ?? [],
    tallaRules:   c.tallaRules   ?? {},
    overrides:    c.overrides    ?? {},
    globalConfig: c.globalConfig ?? getDefaultGlobal(),
  };
}

// ── FILE OPS ──────────────────────────────────────────────────
export async function saveToFile(
  handle: FileSystemFileHandle | null,
  snapshot: ConfigSnapshot,
): Promise<FileSystemFileHandle> {
  let h = handle;
  if (!h) {
    h = await window.showSaveFilePicker({
      suggestedName: 'sublimania_config.json',
      types: [{ description: 'Config JSON', accept: { 'application/json': ['.json'] } }],
    });
    await idbPut('configHandle', h);
  }
  const writable = await h.createWritable();
  await writable.write(JSON.stringify(snapshot, null, 2));
  await writable.close();
  return h;
}

export async function loadFromFile(): Promise<{ handle: FileSystemFileHandle; snapshot: ConfigSnapshot }> {
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Config JSON', accept: { 'application/json': ['.json'] } }],
  });
  await idbPut('configHandle', handle);
  const file = await handle.getFile();
  const text = await file.text();
  const snapshot = parseSnapshot(JSON.parse(text));
  return { handle, snapshot };
}

export async function tryReconnectFile(): Promise<
  | { status: 'loaded'; handle: FileSystemFileHandle; snapshot: ConfigSnapshot }
  | { status: 'needs-permission'; handle: FileSystemFileHandle; name: string }
  | { status: 'none' }
> {
  try {
    const handle = await idbGet('configHandle');
    if (!handle) return { status: 'none' };

    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      const file = await handle.getFile();
      const text = await file.text();
      const snapshot = parseSnapshot(JSON.parse(text));
      return { status: 'loaded', handle, snapshot };
    }
    return { status: 'needs-permission', handle, name: handle.name };
  } catch {
    return { status: 'none' };
  }
}
