/**
 * useCanvasViewport — Canvas 渲染统一 Viewport Hook
 *
 * 职责：
 *   为 Canvas 2D 渲染提供统一的 DPR 适配、viewport transform 和坐标转换。
 *   内部吸收 DPR 逻辑，不再需要调用方单独使用 useCanvasDPR。
 *
 * 两种模式：
 *   - 'transform'：ctx 自动应用 vp.transform，调用方用设计坐标绘制
 *   - 'raw'：ctx 仅应用 DPR，调用方用容器像素坐标绘制
 *
 * @agent-rule 新 Canvas 场景统一使用此 Hook，禁止直接调用 useCanvasDPR + 手动 ctx.setTransform
 *
 * @example
 * ```tsx
 * const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.full })
 * const { canvasRef, setupFrame, clientToDesign } = useCanvasViewport({ vp, canvasSize })
 *
 * const draw = useCallback(() => {
 *   const ctx = setupFrame()
 *   if (!ctx) return
 *   // 用设计坐标绘制，ctx transform 自动缩放
 *   ctx.beginPath()
 *   ctx.arc(ballDesignX, ballDesignY, radiusDesign, 0, Math.PI * 2)
 *   ctx.fill()
 * }, [setupFrame, ballDesignX, ballDesignY, radiusDesign])
 * ```
 */

import { useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import type { CanvasSize } from '@/utils/useCanvasSize'
import type { ViewportInfo } from '@/utils/useViewport'

// ─── 类型 ──────────────────────────────────────────────────────────────────

export interface UseCanvasViewportOptions {
  vp: ViewportInfo
  canvasSize: CanvasSize
  /** 渲染模式：'transform' 用设计坐标绘制，'raw' 用像素坐标绘制（默认 'transform'） */
  mode?: 'transform' | 'raw'
}

export interface CanvasViewportResult {
  /** 挂载到 <canvas> 元素的 ref */
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** 每帧调用：重置 canvas → 清屏 → 应用 viewport transform → 返回 ctx */
  setupFrame: () => CanvasRenderingContext2D | null
  /** 设计坐标 → 容器像素坐标 */
  designToPixel: (dx: number, dy: number) => { px: number; py: number }
  /** 容器像素坐标 → 设计坐标 */
  pixelToDesign: (px: number, py: number) => { dx: number; dy: number }
  /** 浏览器事件坐标 → 设计坐标（含 canvas 位置偏移） */
  clientToDesign: (clientX: number, clientY: number) => { dx: number; dy: number } | null
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCanvasViewport({
  vp,
  canvasSize,
  mode = 'transform',
}: UseCanvasViewportOptions): CanvasViewportResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const setupFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const dpr = window.devicePixelRatio || 1
    const w = Math.round(canvasSize.width * dpr)
    const h = Math.round(canvasSize.height * dpr)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    // 先 reset 再 clear（clearRect 不受 transform 影响）
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 应用 viewport transform
    if (mode === 'transform') {
      ctx.setTransform(dpr * vp.scale, 0, 0, dpr * vp.scale, dpr * vp.tx, dpr * vp.ty)
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    return ctx
  }, [canvasSize.width, canvasSize.height, vp.scale, vp.tx, vp.ty, mode])

  const designToPixel = useCallback((dx: number, dy: number) => ({
    px: dx * vp.scale + vp.tx,
    py: dy * vp.scale + vp.ty,
  }), [vp.scale, vp.tx, vp.ty])

  const pixelToDesign = useCallback((px: number, py: number) => ({
    dx: (px - vp.tx) / vp.scale,
    dy: (py - vp.ty) / vp.scale,
  }), [vp.scale, vp.tx, vp.ty])

  const clientToDesign = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return pixelToDesign(clientX - rect.left, clientY - rect.top)
  }, [pixelToDesign])

  return { canvasRef, setupFrame, designToPixel, pixelToDesign, clientToDesign }
}
