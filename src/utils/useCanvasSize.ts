import { useEffect, useRef, useState, type RefObject } from 'react'

export interface CanvasSize {
  width: number
  height: number
}

/**
 * 测量容器尺寸并随窗口缩放更新的 Hook。
 * 替代各动画组件中重复的 getBoundingClientRect + resize 监听样板。
 *
 * @param initial 初始尺寸（容器尚未挂载/测量前的回退值）
 * @returns [containerRef, size] —— 将 ref 绑定到容器元素，size 为当前测量尺寸
 *
 * @example
 * const [containerRef, canvasSize] = useCanvasSize({ width: 600, height: 500 })
 * return <div ref={containerRef} className="w-full h-full">...</div>
 */
export function useCanvasSize(
  initial: CanvasSize
): [RefObject<HTMLDivElement | null>, CanvasSize] {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<CanvasSize>(initial)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return [containerRef, size]
}
