import { create } from 'zustand'

export interface PhysicsState {
  position: { x: number; y: number }
  velocity: { vx: number; vy: number }
  trajectory: { x: number; y: number }[]
}

export type AnimationParamValue = number
export type AnimationParamKey = string
export type AnimationParams = Record<AnimationParamKey, AnimationParamValue>
export type StoreUpdater<T> = T | ((prev: T) => T)

interface AnimationDataState {
  animationType: string | null
  params: AnimationParams
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
}

export interface AnimationState extends AnimationDataState {
  setAnimationType: (type: string | null) => void
  /**
   * ⚠️ 全量覆写参数对象（仅供页面初始化、卸载重置或全局 preset 切换使用）。
   * 业务组件修改单一或部分参数请使用 updateParam 或 patchParams，严禁裸调本方法！
   */
  setParams: (params: AnimationParams) => void
  /** 局部批量浅合并（推荐用于同时更新多个参数，绝不会抹除未声明字段） */
  patchParams: (partial: Partial<AnimationParams>) => void
  updateParam: (key: AnimationParamKey, value: AnimationParamValue) => void
  setTime: (time: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setSpeed: (speed: number) => void
  setDirection: (direction: 1 | -1) => void
  toggleVectors: () => void
  toggleFormulas: () => void
  toggleGrid: () => void
  toggleTimeSlices: () => void
  toggleDualObjects: () => void
  setPhysicsState: (state: StoreUpdater<PhysicsState>) => void
  reset: () => void
}

const initialState: AnimationDataState = {
  animationType: null,
  params: {},
  lastChangedParam: null as string | null,
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
}

export const useAnimationStore = create<AnimationState>((set) => ({
  ...initialState,
  setAnimationType: (type) => set({ animationType: type }),
  setParams: (params) => set({ params }),
  patchParams: (partial) => set((state) => {
    const nextParams = { ...state.params }
    for (const [k, v] of Object.entries(partial)) {
      if (typeof v === 'number' && !Number.isNaN(v)) {
        nextParams[k] = v
      }
    }
    return { params: nextParams }
  }),
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
  reset: () => set(initialState),
}))
