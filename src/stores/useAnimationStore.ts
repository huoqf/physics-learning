import { create } from 'zustand'
import {
  AnimationStoreOverrideProvider,
  useAnimationRenderRole,
  useAnimationStoreOverride,
  type AnimationRenderRole,
  type AnimationStoreOverride,
} from '@/context/AnimationRenderContext'

export { AnimationStoreOverrideProvider, useAnimationRenderRole }
export type { AnimationRenderRole }

export interface PhysicsState {
  position: { x: number; y: number }
  velocity: { vx: number; vy: number }
  trajectory: { x: number; y: number }[]
}

export type AnimationParamValue = number
export type AnimationParamKey = string
export type AnimationParams = Record<AnimationParamKey, AnimationParamValue>
export type StoreUpdater<T> = T | ((prev: T) => T)

export interface GhostSnapshot {
  params: AnimationParams
  capturedAt: number
}

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
  /** timed 模式下到达终点后是否自动循环重播 */
  repeatLoop: boolean
  /** 播放经过关键临界点时是否自动暂停定格 */
  autoPauseOnCritical: boolean
  showVectors: boolean
  showFormulas: boolean
  showGrid: boolean
  showTimeSlices: boolean
  /** 频闪采样时间间隔（秒），用于统一控制残影/打点密度 */
  timeSliceInterval: number
  showDualObjects: boolean
  /** 控制变量参照组快照（锁定当前参数后修改参数可同屏对照） */
  ghostSnapshot: GhostSnapshot | null
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
  setRepeatLoop: (repeatLoop: boolean) => void
  toggleRepeatLoop: () => void
  setAutoPauseOnCritical: (autoPause: boolean) => void
  toggleAutoPauseOnCritical: () => void
  toggleVectors: () => void
  toggleFormulas: () => void
  toggleGrid: () => void
  toggleTimeSlices: () => void
  setTimeSliceInterval: (interval: number) => void
  toggleDualObjects: () => void
  captureGhostSnapshot: () => void
  clearGhostSnapshot: () => void
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
  repeatLoop: false,
  autoPauseOnCritical: false,
  showVectors: true,
  showFormulas: true,
  showGrid: true,
  showTimeSlices: false,
  timeSliceInterval: 0.1,
  showDualObjects: false,
  ghostSnapshot: null,
  physicsState: {
    position: { x: 0, y: 0 },
    velocity: { vx: 0, vy: 0 },
    trajectory: [],
  },
}

const useRawAnimationStore = create<AnimationState>((set) => ({
  ...initialState,
  setAnimationType: (type) => set((state) => ({
    animationType: type,
    ghostSnapshot: state.animationType !== type ? null : state.ghostSnapshot,
  })),
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
  setRepeatLoop: (repeatLoop) => set({ repeatLoop }),
  toggleRepeatLoop: () => set((state) => ({ repeatLoop: !state.repeatLoop })),
  setAutoPauseOnCritical: (autoPauseOnCritical) => set({ autoPauseOnCritical }),
  toggleAutoPauseOnCritical: () => set((state) => ({ autoPauseOnCritical: !state.autoPauseOnCritical })),
  toggleVectors: () => set((state) => ({ showVectors: !state.showVectors })),
  toggleFormulas: () => set((state) => ({ showFormulas: !state.showFormulas })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleTimeSlices: () => set((state) => ({ showTimeSlices: !state.showTimeSlices })),
  setTimeSliceInterval: (timeSliceInterval) => set({ timeSliceInterval }),
  toggleDualObjects: () => set((state) => ({ showDualObjects: !state.showDualObjects })),
  captureGhostSnapshot: () => set((state) => ({
    ghostSnapshot: {
      params: { ...state.params },
      capturedAt: state.time,
    },
  })),
  clearGhostSnapshot: () => set({ ghostSnapshot: null }),
  setPhysicsState: (physicsState) => set((state) => ({
    physicsState: typeof physicsState === 'function' ? physicsState(state.physicsState) : physicsState
  })),
  reset: () => set(initialState),
}))

const NOOP = () => {}

type UseAnimationStoreHook = {
  (): AnimationState
  <T>(selector: (state: AnimationState) => T): T
  getState: typeof useRawAnimationStore.getState
  getInitialState: typeof useRawAnimationStore.getInitialState
  setState: typeof useRawAnimationStore.setState
  subscribe: typeof useRawAnimationStore.subscribe
}

function buildOverriddenState(
  state: AnimationState,
  override: AnimationStoreOverride,
): AnimationState {
  return {
    ...state,
    params: override.params ?? state.params,
    time: override.time ?? state.time,
    ghostSnapshot: null,
    setAnimationType: NOOP,
    setParams: NOOP,
    patchParams: NOOP,
    updateParam: NOOP,
    setTime: NOOP,
    setIsPlaying: NOOP,
    setSpeed: NOOP,
    setDirection: NOOP,
    setRepeatLoop: NOOP,
    toggleRepeatLoop: NOOP,
    setAutoPauseOnCritical: NOOP,
    toggleAutoPauseOnCritical: NOOP,
    toggleVectors: NOOP,
    toggleFormulas: NOOP,
    toggleGrid: NOOP,
    toggleTimeSlices: NOOP,
    setTimeSliceInterval: NOOP,
    toggleDualObjects: NOOP,
    captureGhostSnapshot: NOOP,
    clearGhostSnapshot: NOOP,
    setPhysicsState: NOOP,
    reset: NOOP,
  }
}

const useAnimationStoreImpl = (<T,>(selector?: (state: AnimationState) => T) => {
  const override = useAnimationStoreOverride()
  return useRawAnimationStore((state) => {
    const view = override ? buildOverriddenState(state, override) : state
    return selector ? selector(view) : (view as unknown as T)
  })
}) as UseAnimationStoreHook

useAnimationStoreImpl.getState = useRawAnimationStore.getState
useAnimationStoreImpl.getInitialState = useRawAnimationStore.getInitialState
useAnimationStoreImpl.setState = useRawAnimationStore.setState
useAnimationStoreImpl.subscribe = useRawAnimationStore.subscribe

export const useAnimationStore = useAnimationStoreImpl
