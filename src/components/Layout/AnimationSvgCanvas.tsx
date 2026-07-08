import React, { type RefObject } from 'react'

// ─── 类型 ──────────────────────────────────────────────────────────────────

interface AnimationSvgCanvasProps {
  /**
   * useAnimationViewport / useCanvasSize 返回的容器 ref，
   * 挂载到外层 div，ResizeObserver 通过它监听容器尺寸变化。
   */
  containerRef: RefObject<HTMLDivElement | null>

  /**
   * useViewport 返回的 vp.transform 字符串。
   * 格式：`translate(tx ty) scale(s)`，将设计坐标映射到可视区域。
   */
  transform: string

  /**
   * SVG 场景内容，将被包裹在 `<g transform={transform}>` 内。
   * 内容使用设计坐标（0..designWidth / 0..designHeight）。
   *
   * 若需要 <defs>（gradient / filter / marker），请将其作为 children 的第一个元素放入，
   * defs 在 g transform 内完全合法：id 引用在同一 SVG 文档内仍有效。
   */
  children: React.ReactNode

  /**
   * 可选：将 SVGSVGElement ref 暴露给外层，供 useViewportPointer 使用。
   * 若页面需要指针交互（拖拽/点击），请传入此 ref。
   */
  svgRef?: RefObject<SVGSVGElement | null>

  /**
   * 附加到外层 div 的 CSS 类名。
   * 外层 div 默认类为 `w-full h-full`，此处追加不覆盖。
   */
  className?: string

  // ── 指针事件（挂载到 <svg> 元素）───────────────────────────────────────────
  onMouseMove?: React.MouseEventHandler<SVGSVGElement>
  onMouseUp?: React.MouseEventHandler<SVGSVGElement>
  onMouseLeave?: React.MouseEventHandler<SVGSVGElement>
  onMouseDown?: React.MouseEventHandler<SVGSVGElement>
  onClick?: React.MouseEventHandler<SVGSVGElement>
  onTouchStart?: React.TouchEventHandler<SVGSVGElement>
  onTouchMove?: React.TouchEventHandler<SVGSVGElement>
  onTouchEnd?: React.TouchEventHandler<SVGSVGElement>
}

// ─── 组件 ──────────────────────────────────────────────────────────────────

/**
 * AnimationSvgCanvas — 标准动画 SVG 画布容器
 *
 * 封装 "containerRef + w-full h-full SVG + g transform" 的重复样板，
 * 新动画页面必须使用此组件，禁止手写等效逻辑。
 *
 * ## 布局模型
 *
 * ```
 * <div ref={containerRef} class="w-full h-full">   ← ResizeObserver 锚点
 *   <svg class="w-full h-full block select-none">   ← CSS 撑满，无 viewBox
 *     <g transform={vp.transform}>                  ← 设计坐标 → 可视区域
 *       {children}                                  ← 场景内容（设计坐标）
 *     </g>
 *   </svg>
 * </div>
 * ```
 *
 * ## 使用规则
 *
 * 1. 上层必须先调用 `useAnimationViewport` 获取 `containerRef` 和 `vp`
 * 2. 场景内容使用设计坐标（0..designWidth / 0..designHeight），**不得再乘 scale**
 * 3. `<defs>` 放在 children 第一个位置，在 `<g transform>` 内声明合法
 * 4. 需要指针交互时传入 `svgRef`，配合 `useViewportPointer(svgRef)` 使用
 * 5. 有 overlay 浮层时，在外层 div 用 `relative` + 绝对定位叠加 HTML 元素
 *
 * @example
 * ```tsx
 * // ── 最简场景 ─────────────────────────────────────────────
 * const { containerRef, canvasSize, vp } = useAnimationViewport({
 *   preset: CANVAS_PRESETS.full,
 * })
 *
 * return (
 *   <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
 *     <defs>
 *       <radialGradient id="ball-grad">...</radialGradient>
 *     </defs>
 *     <PhysicsScene font={canvasSize.font} />
 *   </AnimationSvgCanvas>
 * )
 *
 * // ── 带指针交互 ────────────────────────────────────────────
 * const svgRef = useRef<SVGSVGElement>(null)
 * const getSvgPoint = useViewportPointer(svgRef)
 *
 * return (
 *   <AnimationSvgCanvas
 *     containerRef={containerRef}
 *     transform={vp.transform}
 *     svgRef={svgRef}
 *     onMouseMove={(e) => {
 *       const pt = getSvgPoint(e.clientX, e.clientY)
 *       if (pt) handleDrag(pt.x, pt.y)
 *     }}
 *   >
 *     <DraggableScene font={canvasSize.font} />
 *   </AnimationSvgCanvas>
 * )
 *
 * // ── 带 HTML overlay 浮层 ──────────────────────────────────
 * const cardWidth = Math.max(280, canvasSize.width * 0.38)
 * const { containerRef, vp } = useAnimationViewport({
 *   preset: CANVAS_PRESETS.full,
 *   overlayRight: Math.round(cardWidth),
 * })
 *
 * return (
 *   <div className="w-full h-full relative">
 *     <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
 *       <PhysicsScene />
 *     </AnimationSvgCanvas>
 *     <div className="absolute right-0 top-0 bottom-0" style={{ width: cardWidth }}>
 *       <ChartPanel />
 *     </div>
 *   </div>
 * )
 * ```
 */
export const AnimationSvgCanvas = React.memo<AnimationSvgCanvasProps>(
  function AnimationSvgCanvas({
    containerRef,
    transform,
    children,
    svgRef,
    className = '',
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onMouseDown,
    onClick,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }) {
    return (
      <div ref={containerRef} className={`w-full h-full${className ? ` ${className}` : ''}`}>
        <svg
          ref={svgRef}
          className="w-full h-full block select-none"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onClick={onClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <g transform={transform}>
            {children}
          </g>
        </svg>
      </div>
    )
  }
)
