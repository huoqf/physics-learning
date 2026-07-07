import type { RefObject } from 'react'

/**
 * Canvas DPR 适配：设置物理像素尺寸 + 缩放上下文，使绘图坐标与 CSS 像素对齐。
 *
 * @example
 * const canvasRef = useRef<HTMLCanvasElement>(null)
 * // 在帧循环中：
 * const ctx = setupCanvasDPR(canvasRef, width, height)
 * if (!ctx) return
 * // ctx 坐标系已对齐 CSS 像素，直接用 width/height 绘图
 */
export function setupCanvasDPR(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  const canvas = canvasRef.current
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const dpr = window.devicePixelRatio || 1
  const needsResize = canvas.width !== width * dpr || canvas.height !== height * dpr

  if (needsResize) {
    canvas.width = width * dpr
    canvas.height = height * dpr
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return ctx
}
