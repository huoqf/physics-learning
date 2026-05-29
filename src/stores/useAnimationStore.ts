import { create } from 'zustand'

interface AnimationState {
  animationType: string | null
  params: Record<string, number>
  time: number
  isPlaying: boolean
  speed: number
  setAnimationType: (type: string | null) => void
  setParams: (params: Record<string, number>) => void
  updateParam: (key: string, value: number) => void
  setTime: (time: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setSpeed: (speed: number) => void
  reset: () => void
}

export const useAnimationStore = create<AnimationState>((set) => ({
  animationType: null,
  params: {},
  time: 0,
  isPlaying: false,
  speed: 1,
  setAnimationType: (type) => set({ animationType: type }),
  setParams: (params) => set({ params }),
  updateParam: (key, value) => set((state) => ({
    params: { ...state.params, [key]: value }
  })),
  setTime: (time) => set({ time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  reset: () => set({
    animationType: null,
    params: {},
    time: 0,
    isPlaying: false,
    speed: 1
  })
}))
