// ============================================================
//  store/useConfigFileStore.ts — File handle + save status
//  (no persiste en localStorage — el handle vive en IndexedDB)
// ============================================================
import { create } from 'zustand';

interface ConfigFileState {
  fileHandle: FileSystemFileHandle | null;
  lastSaved: string | null;
  setFileHandle: (h: FileSystemFileHandle | null) => void;
  setLastSaved: (ts: string) => void;
}

export const useConfigFileStore = create<ConfigFileState>()((set) => ({
  fileHandle: null,
  lastSaved: null,
  setFileHandle: (fileHandle) => set({ fileHandle }),
  setLastSaved: (lastSaved) => set({ lastSaved }),
}));
