import { useCallback, type RefObject } from 'react'

/**
 * clientToSvgPoint — 将浏览器视口中的鼠标/触摸事件坐标 (clientX, clientY)
 * 通过 SVG 原生矩阵变换映射至 SVG 设计坐标空间。
 *
 * 适用于 Option A/B 布局空间（固定或动态 viewBox + getScreenCTM().inverse()）。
 * 能精确处理任何窗口缩放、CSS 变换、滚动以及嵌套边距问题。
 */
export function clientToSvgPoint(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement | null
): { x: number; y: number } | null {
  if (!svg) return null
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  return pt.matrixTransform(ctm.inverse())
}

/**
 * clientToContainerPoint — 将鼠标/触摸事件坐标 (clientX, clientY)
 * 转换为相对于 DOM 容器或区域 (rect) 的像素坐标。
 *
 * 适用于 Option C / Canvas 可视区像素自适应场景。
 */
export function clientToContainerPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect | null
): { x: number; y: number } {
  if (!rect) return { x: 0, y: 0 }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  }
}

/**
 * useViewportPointer — 快捷 Hook，返回一个将事件客户端坐标 (clientX, clientY)
 * 映射为 SVG 坐标系的转化函数。
 *
 * @example
 * ```tsx
 * const svgRef = useRef<SVGSVGElement>(null)
 * const getSvgPoint = useViewportPointer(svgRef)
 *
 * const handleMouseMove = (e: React.MouseEvent) => {
 *   const pt = getSvgPoint(e.clientX, e.clientY)
 *   if (pt) updateDrag(pt.x, pt.y)
 * }
 * ```
 */
export function useViewportPointer(svgRef: RefObject<SVGSVGElement | null>) {
  return useCallback(
    (clientX: number, clientY: number) => {
      return clientToSvgPoint(clientX, clientY, svgRef.current)
    },
    [svgRef]
  )
}
