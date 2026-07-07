import { useEffect, useState, type RefObject } from 'react'

/**
 * 监听 devicePixelRatio 变化（如外接显示器热插拔）。
 * 返回当前 DPR 值，变化时触发组件重渲染。
 */
export function useDevicePixelRatio(): number {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1)

  useEffect(() => {
    const update = () => setDpr(window.devicePixelRatio || 1)
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return dpr
}

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
