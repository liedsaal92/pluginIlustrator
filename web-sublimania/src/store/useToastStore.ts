// ============================================================
//  store/useToastStore.ts — Cola global de notificaciones
// ============================================================
import { create } from 'zustand';

interface ToastEntry {
  id: number;
  message: string;
  type: 'ok' | 'error';
}

interface ToastStore {
  queue:  ToastEntry[];
  push:   (message: string, type?: 'ok' | 'error') => void;
  remove: (id: number) => void;
}

let _nextId = 1;

export const useToastStore = create<ToastStore>()((set) => ({
  queue: [],

  push: (message, type = 'error') =>
    set(s => ({ queue: [...s.queue, { id: _nextId++, message, type }] })),

  remove: (id) =>
    set(s => ({ queue: s.queue.filter(t => t.id !== id) })),
}));
