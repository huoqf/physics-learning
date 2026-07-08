/**
 * useAnimationViewport — 标准动画 Viewport 复合 Hook
 *
 * 职责：
 *   将 useCanvasSize + useViewport 合并为单次调用，
 *   designWidth/designHeight 严格从 preset 派生，**禁止手动覆盖**，
 *   从根本上消除两者不一致导致的双重缩放 bug。
 *
 * @agent-rule 新页面必须使用此 Hook，禁止拆开调用 useCanvasSize + useViewport
 * @agent-rule overlayRight/Left/Top/Bottom 单位为像素，由调用方在 useMemo 中计算后传入
 * @agent-rule presetCompensation 仅用于旧 preset（wide/tall）迁移至 full 的平滑过渡，新页面不传
 *
 * @example
 * ```tsx
 * // ── 最简用法（无 overlay）──────────────────────────
 * const { containerRef, canvasSize, vp } = useAnimationViewport({
 *   preset: CANVAS_PRESETS.full,
 * })
 *
 * // ── 有右侧 overlay 浮层 ───────────────────────────
 * const cardWidth = Math.max(280, canvasSize.width * 0.38) // 先算好再传
 * const { containerRef, canvasSize, vp } = useAnimationViewport({
 *   preset: CANVAS_PRESETS.full,
 *   overlayRight: Math.round(cardWidth),
 * })
 * // 注意：若 overlay 依赖 canvasSize，需两步：先用无 overlay 拿到 canvasSize，
 * // 再重新调用。或将 overlay 计算移到 useAnimationViewport 外，
 * // 用 canvasSize.width 的上一帧值（初始值 = preset.width）估算。
 * ```
 */

import { useCanvasSize, useViewport } from '@/utils'
import type { CanvasSize, CanvasSizeOptions } from '@/utils/useCanvasSize'
import type { ViewportInfo } from '@/utils/useViewport'
import type { RefObject } from 'react'

// ─── 类型 ──────────────────────────────────────────────────────────────────

/** preset 格式与 CANVAS_PRESETS 保持一致 */
export interface CanvasPreset {
  readonly width: number
  readonly height: number
}

export interface UseAnimationViewportOptions {
  /**
   * 画布尺寸预设，必须从 CANVAS_PRESETS 取值：
   *   full (700×650) | splitV (700×325) | splitH (350×650) | square (650×650)
   */
  preset: CanvasPreset

  /** 右侧遮挡像素（默认 0）。若值来自 canvasSize.width，用初始帧估算值即可。 */
  overlayRight?: number
  /** 左侧遮挡像素（默认 0） */
  overlayLeft?: number
  /** 顶部遮挡像素（默认 0） */
  overlayTop?: number
  /** 底部遮挡像素（默认 0） */
  overlayBottom?: number

  /**
   * 缩放比代偿系数（默认 1.0）。
   * 仅用于将旧 preset（wide 700×400 / tall 700×450）迁移至 full (700×650) 时平滑过渡。
   * 新页面不传此参数。
   */
  presetCompensation?: number
}

export interface AnimationViewportResult {
  /** 挂载到外层容器 div 的 ref，由 useCanvasSize 的 ResizeObserver 监听 */
  containerRef: RefObject<HTMLDivElement | null>
  /** 容器真实尺寸 + scale / px() / font() 辅助函数 */
  canvasSize: CanvasSize
  /** 可视区域几何信息 + vp.transform（用于 AnimationSvgCanvas） */
  vp: ViewportInfo
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * useAnimationViewport
 *
 * 新页面的唯一标准 Viewport 入口。
 * 内部强制将 designWidth/designHeight 绑定到 preset，杜绝手动同步偏差。
 */
export function useAnimationViewport({
  preset,
  overlayRight = 0,
  overlayLeft = 0,
  overlayTop = 0,
  overlayBottom = 0,
  presetCompensation,
}: UseAnimationViewportOptions): AnimationViewportResult {
  const sizeOptions: CanvasSizeOptions | undefined =
    presetCompensation !== undefined ? { presetCompensation } : undefined

  const [containerRef, canvasSize] = useCanvasSize(preset, sizeOptions)

  const vp = useViewport(canvasSize, {
    // 严格从 preset 派生，不允许调用方覆盖 designWidth/Height
    designWidth: preset.width,
    designHeight: preset.height,
    overlayRight,
    overlayLeft,
    overlayTop,
    overlayBottom,
  })

  return { containerRef, canvasSize, vp }
}
