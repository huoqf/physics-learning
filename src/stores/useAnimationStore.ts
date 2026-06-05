import { create } from 'zustand'

export type MotionMode = 'auto-v' | 'auto-F' | 'manual'
export type VelocityMode = 'basic' | 'advanced'

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
  /** 速度动画：时间间隔 Δt (s) */
  deltaT: number
  /** 速度动画：考察时刻 t₀ (s) */
  t0: number
  /** 速度动画：基础版/进阶版切换 */
  velocityMode: VelocityMode
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
  setDeltaT: (deltaT: number) => void
  setT0: (t0: number) => void
  setVelocityMode: (mode: VelocityMode) => void
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
  deltaT: 2,
  t0: 0,
  velocityMode: 'basic',
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
  setDeltaT: (deltaT) => set({ deltaT }),
  setT0: (t0) => set({ t0 }),
  setVelocityMode: (mode) => set({ velocityMode: mode }),
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
    deltaT: 2,
    t0: 0,
    velocityMode: 'basic',
  })
}))
