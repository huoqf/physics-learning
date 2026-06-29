import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'

export interface CanvasSize {
  width: number
  height: number
  /** 相对于 initial 设计基准的缩放比（min(width/iw, height/ih)） */
  scale: number
  /** 像素值缩放：px(80) 在 50% 缩放下返回 40 */
  px: (v: number) => number
  /** 字体缩放（带 7–16 可读性 clamp） */
  font: (v: number) => number
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

/**
 * 测量容器尺寸并随窗口缩放更新的 Hook。
 * 替代各动画组件中重复的 getBoundingClientRect + resize 监听样板。
 *
 * 返回的 CanvasSize 包含 scale / px() / font()，供组件按设计基准等比缩放。
 * 向后兼容：原有 `canvasSize.width` / `canvasSize.height` 用法不受影响。
 *
 * @param initial 设计基准尺寸（也是 ResizeObserver 生效前的回退值）
 * @returns [containerRef, size]
 *
 * @example
 * const [containerRef, { width, height, px, font }] = useCanvasSize({ width: 700, height: 420 })
 * const carW = px(80)   // 等比缩放后的像素值
 * const labelFs = font(11) // 带 clamp 的字体大小
 */
export function useCanvasSize(
  initial: { width: number; height: number }
): [RefObject<HTMLDivElement | null>, CanvasSize] {
  const containerRef = useRef<HTMLDivElement>(null)
  const [raw, setRaw] = useState({ width: initial.width, height: initial.height })

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      setRaw({ width: rect.width, height: rect.height })
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return
      const rect = element.getBoundingClientRect()
      setRaw({ width: rect.width, height: rect.height })
    })

    resizeObserver.observe(element)

    const rect = element.getBoundingClientRect()
    setRaw({ width: rect.width, height: rect.height })

    return () => {
      resizeObserver.unobserve(element)
      resizeObserver.disconnect()
    }
  }, [])

  const size: CanvasSize = useMemo(() => {
    const scale = Math.min(raw.width / initial.width, raw.height / initial.height)
    return {
      width: raw.width,
      height: raw.height,
      scale,
      px: (v: number) => v * scale,
      font: (v: number) => clamp(v * scale, 7, 16),
    }
  }, [raw.width, raw.height, initial.width, initial.height])

  return [containerRef, size]
}

