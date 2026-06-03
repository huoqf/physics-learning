import { create } from 'zustand'

type Theme = 'light' | 'dark'
export type AnimationMode = 'animation' | 'discovery'

interface AppState {
  theme: Theme
  sidebarOpen: boolean
  mode: AnimationMode
  discoveryStep: number
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setMode: (mode: AnimationMode) => void
  setDiscoveryStep: (step: number) => void
  nextDiscoveryStep: () => void
  prevDiscoveryStep: () => void
  resetDiscovery: () => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  mode: 'animation',
  discoveryStep: 0,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light'
  })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({
    sidebarOpen: !state.sidebarOpen
  })),
  setMode: (mode) => set({ mode, discoveryStep: 0 }),
  setDiscoveryStep: (step) => set({ discoveryStep: step }),
  nextDiscoveryStep: () => set((state) => ({
    discoveryStep: Math.min(state.discoveryStep + 1, 5)
  })),
  prevDiscoveryStep: () => set((state) => ({
    discoveryStep: Math.max(state.discoveryStep - 1, 0)
  })),
  resetDiscovery: () => set({ discoveryStep: 0 }),
}))
