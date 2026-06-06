import { create } from 'zustand'

export type MotionMode = 'auto-v' | 'auto-F' | 'manual'

interface AnimationState {
  animationType: string | null
  params: Record<string, number>
  time: number
  isPlaying: boolean
  speed: number
  showVectors: boolean
  showFormulas: boolean
  showGrid: boolean
  showTimeSlices: boolean
  showDualObjects: boolean
  motionMode: MotionMode
  setAnimationType: (type: string | null) => void
  setParams: (params: Record<string, number>) => void
  updateParam: (key: string, value: number) => void
  setTime: (time: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setSpeed: (speed: number) => void
  toggleVectors: () => void
  toggleFormulas: () => void
  toggleGrid: () => void
  toggleTimeSlices: () => void
  toggleDualObjects: () => void
  setMotionMode: (mode: MotionMode) => void
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
  showTimeSlices: false,
  showDualObjects: false,
  motionMode: 'auto-v',
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
  toggleTimeSlices: () => set((state) => ({ showTimeSlices: !state.showTimeSlices })),
  toggleDualObjects: () => set((state) => ({ showDualObjects: !state.showDualObjects })),
  setMotionMode: (mode) => set({ motionMode: mode }),
  reset: () => set({
    animationType: null,
    params: {},
    time: 0,
    isPlaying: false,
    speed: 1,
    showVectors: true,
    showFormulas: true,
    showGrid: true,
    showTimeSlices: false,
    showDualObjects: false,
    motionMode: 'auto-v',
  })
}))
