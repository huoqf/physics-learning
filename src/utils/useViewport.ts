/**
 * useViewport — 在 useCanvasSize 基础上计算可视区域（visible area）
 *
 * 职责：
 *   将容器真实尺寸扣除 overlay 遮挡后，按 contain 策略（min 缩放比）
 *   计算可视区域尺寸、居中原点、统一缩放比。
 *
 * Layer 2 of 3：Scene → Viewport → Renderer
 *
 * @agent-rule 不替代 useCanvasSize，而是消费其输出做纯几何计算
 * @agent-rule 不涉及物理坐标转换（physicsToCanvas 职责不变）
 * @agent-rule overlay 单位统一为像素，由调用方转换（如 W * 0.3 → px）
 *
 * @example
 * ```tsx
 * const [ref, canvas] = useCanvasSize({ width: 760, height: 440 })
 * const vp = useViewport(canvas, {
 *   designWidth: 760,
 *   designHeight: 440,
 *   overlayRight: mode === 1 ? Math.round(canvas.width * 0.3) : 0,
 * })
 * ```
 */
import { useMemo } from 'react'
import type { CanvasSize } from './useCanvasSize'

export interface ViewportOptions {
  /** 设计基准宽（px） */
  designWidth: number
  /** 设计基准高（px） */
  designHeight: number
  /** 左侧遮挡像素（默认 0） */
  overlayLeft?: number
  /** 右侧遮挡像素（默认 0） */
  overlayRight?: number
  /** 顶部遮挡像素（默认 0） */
  overlayTop?: number
  /** 底部遮挡像素（默认 0） */
  overlayBottom?: number
}

export interface ViewportInfo {
  /** 可视区域宽（容器宽 ﹣左右遮挡） */
  visibleW: number
  /** 可视区域高（容器高 ﹣上下遮挡） */
  visibleH: number

  /** 可视区域中心 X（容器坐标系） */
  centerX: number
  /** 可视区域中心 Y（容器坐标系） */
  centerY: number

  /** contain 缩放比：min(visibleW/designW, visibleH/designH) */
  scale: number

  /** 平移 X（= centerX），供 <g transform> 或 ctx.translate 使用 */
  tx: number
  /** 平移 Y（= centerY），供 <g transform> 或 ctx.translate 使用 */
  ty: number
  /**
   * 完整 transform 字符串：
   *   translate(tx ty) scale(scale)
   * 第二阶段 <g transform={vp.transform}> 架构预留
   */
  transform: string
}

export function useViewport(
  canvas: CanvasSize,
  options: ViewportOptions,
): ViewportInfo {
  const {
    designWidth,
    designHeight,
    overlayLeft = 0,
    overlayRight = 0,
    overlayTop = 0,
    overlayBottom = 0,
  } = options

  return useMemo(() => {
    const visibleW = Math.max(0, canvas.width - overlayLeft - overlayRight)
    const visibleH = Math.max(0, canvas.height - overlayTop - overlayBottom)

    const scale = Math.min(
      visibleW / designWidth,
      visibleH / designHeight,
    )

    const centerX = overlayLeft + visibleW / 2
    const centerY = overlayTop + visibleH / 2

    const tx = centerX
    const ty = centerY
    const transform = `translate(${tx} ${ty}) scale(${scale})`

    return {
      visibleW,
      visibleH,
      centerX,
      centerY,
      scale,
      tx,
      ty,
      transform,
    }
  }, [
    canvas.width,
    canvas.height,
    designWidth,
    designHeight,
    overlayLeft,
    overlayRight,
    overlayTop,
    overlayBottom,
  ])
}