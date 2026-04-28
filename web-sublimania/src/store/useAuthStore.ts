// ============================================================
//  store/useAuthStore.ts — Estado de autenticación
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '../types/auth';
import { authService } from '../utils/authService';

interface AuthState {
  session:      AuthSession | null;
  loading:      boolean;
  error:        string | null;
  recoveryMode: boolean;

  login:                 (email: string, password: string) => Promise<void>;
  register:              (email: string, password: string, nombre: string, orgName: string) => Promise<void>;
  acceptInvite:          (token: string, nombre: string, password: string) => Promise<void>;
  logout:                () => Promise<void>;
  clearError:            () => void;
  checkSession:          () => void;
  requestPasswordReset:  (email: string) => Promise<void>;
  updatePassword:        (newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session:      null,
      loading:      false,
      error:        null,
      recoveryMode: false,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const session = await authService.login(email, password);
          set({ session, loading: false });
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
        }
      },

      register: async (email, password, nombre, orgName) => {
        set({ loading: true, error: null });
        try {
          const session = await authService.register(email, password, nombre, orgName);
          set({ session, loading: false });
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
        }
      },

      acceptInvite: async (token, nombre, password) => {
        set({ loading: true, error: null });
        try {
          const session = await authService.acceptInvite(token, nombre, password);
          set({ session, loading: false });
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
        }
      },

      logout: async () => {
        await authService.logout();
        set({ session: null });
      },

      clearError: () => set({ error: null }),

      requestPasswordReset: async (email) => {
        set({ loading: true, error: null });
        try {
          await authService.requestPasswordReset(email);
          set({ loading: false });
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
        }
      },

      updatePassword: async (newPassword) => {
        set({ loading: true, error: null });
        try {
          await authService.updatePassword(newPassword);
          set({ loading: false });
        } catch (e) {
          set({ error: (e as Error).message, loading: false });
        }
      },

      // Llama al iniciar App — invalida sesiones expiradas
      checkSession: () => {
        const { session } = get();
        if (!authService.isSessionValid(session)) {
          set({ session: null });
        }
      },
    }),
    {
      name: 'sublimania_auth_v1',
      partialize: (s) => ({ session: s.session }),
    },
  ),
);
