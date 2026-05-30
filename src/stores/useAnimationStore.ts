import { create } from 'zustand'

interface AnimationState {
  animationType: string | null
  params: Record<string, number>
  time: number
  isPlaying: boolean
  speed: number
  showVectors: boolean
  showFormulas: boolean
  showGrid: boolean
  setAnimationType: (type: string | null) => void
  setParams: (params: Record<string, number>) => void
  updateParam: (key: string, value: number) => void
  setTime: (time: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setSpeed: (speed: number) => void
  toggleVectors: () => void
  toggleFormulas: () => void
  toggleGrid: () => void
  reset: () => void
}

export const useAnimationStore = create<AnimationState>((set) => ({
  animationType: null,
  params: {},
  time: 0,
  isPlaying: false,
  speed: 1,
  showVectors: true,
  showFormulas: true,
  showGrid: true,
  setAnimationType: (type) => set({ animationType: type }),
  setParams: (params) => set({ params }),
  updateParam: (key, value) => set((state) => ({
    params: { ...state.params, [key]: value }
  })),
  setTime: (time) => set({ time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  toggleVectors: () => set((state) => ({ showVectors: !state.showVectors })),
  toggleFormulas: () => set((state) => ({ showFormulas: !state.showFormulas })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  reset: () => set({
    animationType: null,
    params: {},
    time: 0,
    isPlaying: false,
    speed: 1,
    showVectors: true,
    showFormulas: true,
    showGrid: true
  })
}))
