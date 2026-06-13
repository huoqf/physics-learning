import { create } from 'zustand'

export type AnimationMode = 'animation' | 'discovery'

interface AppState {
  mode: AnimationMode
  discoveryStep: number
  discoveryMaxStep: number
  setMode: (mode: AnimationMode) => void
  setDiscoveryStep: (step: number) => void
  setDiscoveryMaxStep: (max: number) => void
  nextDiscoveryStep: () => void
  prevDiscoveryStep: () => void
  resetDiscovery: () => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'animation',
  discoveryStep: 0,
  discoveryMaxStep: 5,
  setMode: (mode) => set({ mode, discoveryStep: 0 }),
  setDiscoveryStep: (step) => set({ discoveryStep: step }),
  setDiscoveryMaxStep: (max) => set({ discoveryMaxStep: max }),
  nextDiscoveryStep: () => set((state) => ({
    discoveryStep: Math.min(state.discoveryStep + 1, state.discoveryMaxStep)
  })),
  prevDiscoveryStep: () => set((state) => ({
    discoveryStep: Math.max(state.discoveryStep - 1, 0)
  })),
  resetDiscovery: () => set({ discoveryStep: 0 }),
}))
