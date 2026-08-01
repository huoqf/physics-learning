import { useCallback, type RefObject } from 'react'

/**
 * clientToSvgPoint — 将浏览器视口中的鼠标/触摸事件坐标 (clientX, clientY)
 * 通过 SVG 原生矩阵变换映射至 SVG 用户坐标系（如果无 viewBox 则等价于容器像素坐标）。
 *
 * 返回坐标语义：
 *   - AnimationSvgCanvas 无 viewBox 场景：SVG 用户坐标 = 容器像素坐标，非设计坐标！
 *     若需设计坐标，还需要逆变换：x_design = (pt.x - vp.tx) / vp.scale
 *   - 固定 viewBox 场景（存量方式 A/B）：pt.x/y 直接是设计坐标，无需额外转换。
 *
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
 * useViewportPointer — 快捷 Hook，返回将事件客户端坐标 (clientX, clientY)
 * 映射为 SVG 用户坐标的转化函数。
 *
 * 返回坐标语义：
 *   - AnimationSvgCanvas（无 viewBox）：返回容器像素坐标，**不是设计坐标**。
 *     若需设计坐标，需额外逆变换：x_design = (pt.x - vp.tx) / vp.scale
 *   - 固定 viewBox 场景（存量方式 A/B）：pt.x/y 直接是设计坐标。
 *
 * @example
 * ```tsx
 * const svgRef = useRef<SVGSVGElement>(null)
 * const getSvgPoint = useViewportPointer(svgRef)
 *
 * // AnimationSvgCanvas 无 viewBox 场景：SVG 用户坐标 = 容器像素
 * // 若需设计坐标（如拖拽计算物体位置），需再逆变换
 * const handleMouseMove = (e: React.MouseEvent, vp: ViewportInfo) => {
 *   const pt = getSvgPoint(e.clientX, e.clientY)    // 容器像素坐标
 *   if (!pt) return
 *   const x = (pt.x - vp.tx) / vp.scale             // 设计坐标 x
 *   const y = (pt.y - vp.ty) / vp.scale             // 设计坐标 y
 *   updateDrag(x, y)
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
