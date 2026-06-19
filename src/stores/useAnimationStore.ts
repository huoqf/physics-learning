import { create } from 'zustand'

export interface PhysicsState {
  position: { x: number; y: number }
  velocity: { vx: number; vy: number }
  trajectory: { x: number; y: number }[]
}

interface AnimationState {
  animationType: string | null
  params: Record<string, number>
  /** 最后修改的参数 key（用于右侧因果链高亮） */
  lastChangedParam: string | null
  time: number
  isPlaying: boolean
  speed: number
  /** 播放方向：1=正向，-1=逆向（热力学第二定律逆向实验） */
  direction: 1 | -1
  showVectors: boolean
  showFormulas: boolean
  showGrid: boolean
  showTimeSlices: boolean
  showDualObjects: boolean
  physicsState: PhysicsState
  setAnimationType: (type: string | null) => void
  setParams: (params: Record<string, number>) => void
  updateParam: (key: string, value: number) => void
  setTime: (time: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setSpeed: (speed: number) => void
  setDirection: (direction: 1 | -1) => void
  toggleVectors: () => void
  toggleFormulas: () => void
  toggleGrid: () => void
  toggleTimeSlices: () => void
  toggleDualObjects: () => void
  setPhysicsState: (state: PhysicsState | ((prev: PhysicsState) => PhysicsState)) => void
  reset: () => void
}

export const useAnimationStore = create<AnimationState>((set) => ({
  animationType: null,
  params: {},
  lastChangedParam: null,
  time: 0,
  isPlaying: false,
  speed: 1,
  direction: 1,
  showVectors: true,
  showFormulas: true,
  showGrid: true,
  showTimeSlices: false,
  showDualObjects: false,
  physicsState: {
    position: { x: 0, y: 0 },
    velocity: { vx: 0, vy: 0 },
    trajectory: [],
  },
  setAnimationType: (type) => set({ animationType: type }),
  setParams: (params) => set({ params }),
  updateParam: (key, value) => set((state) => ({
    params: { ...state.params, [key]: value },
    lastChangedParam: key,
  })),
  setTime: (time) => set({ time }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  setDirection: (direction) => set({ direction }),
  toggleVectors: () => set((state) => ({ showVectors: !state.showVectors })),
  toggleFormulas: () => set((state) => ({ showFormulas: !state.showFormulas })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleTimeSlices: () => set((state) => ({ showTimeSlices: !state.showTimeSlices })),
  toggleDualObjects: () => set((state) => ({ showDualObjects: !state.showDualObjects })),
  setPhysicsState: (physicsState) => set((state) => ({
    physicsState: typeof physicsState === 'function' ? physicsState(state.physicsState) : physicsState
  })),
  reset: () => set({
    animationType: null,
    params: {},
    time: 0,
    isPlaying: false,
    speed: 1,
    direction: 1,
    showVectors: true,
    showFormulas: true,
    showGrid: true,
    showTimeSlices: false,
    showDualObjects: false,
    physicsState: {
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      trajectory: [],
    },
  })
}))
