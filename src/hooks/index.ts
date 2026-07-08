/**
 * src/hooks/index.ts
 * 跨页面复用 Hook 统一导出入口
 */
export { useAnimationLifecycle } from './useAnimationLifecycle'
export type { AnimationLifecycleResult } from './useAnimationLifecycle'

export { useAnimationViewport } from './useAnimationViewport'
export type {
  UseAnimationViewportOptions,
  AnimationViewportResult,
  CanvasPreset,
} from './useAnimationViewport'
