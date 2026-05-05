// frontend/src/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
}

interface Dataset {
  id: number;
  filename: string;
  file_size_bytes: number;
  row_count?: number;
  col_count?: number;
  columns?: string[];
  project_id?: number | null;
}

export interface Toast {
  id: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface AppState {
  token: string | null;
  user: User | null;
  dataset: Dataset | null;
  profilingReport: any | null;
  rules: any[];
  themeMode: 'light' | 'dark';
  toasts: Toast[];
  setToken: (token: string, user?: User) => void;
  setUser: (user: User) => void;
  setDataset: (dataset: Dataset | null) => void;
  setProfilingReport: (report: any | null) => void;
  setRules: (rules: any[]) => void;
  toggleThemeMode: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      dataset: null,
      profilingReport: null,
      rules: [],
      themeMode: 'light',
      toasts: [],
      setToken: (token, user) => set((state) => ({ ...state, token, user: user || state.user })),
      setUser: (user) => set({ user }),
      setDataset: (dataset) => set({ dataset, profilingReport: null, rules: [] }),
      setProfilingReport: (profilingReport) => set({ profilingReport }),
      setRules: (rules) => set({ rules }),
      toggleThemeMode: () =>
        set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),
      addToast: (toast) =>
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
        })),
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      logout: () =>
        set({ token: null, user: null, dataset: null, profilingReport: null, rules: [] }),
    }),
    {
      name: 'profiler-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        dataset: state.dataset,
        themeMode: state.themeMode,
      }),
    }
  )
);
