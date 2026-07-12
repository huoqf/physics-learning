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
   * 可选：Canvas ref。传入时在 SVG 前渲染一个 `<canvas>` 元素，
   * 用于 Canvas+SVG 混合渲染场景（如波场）。
   * canvas 与 SVG 同为 `absolute inset-0`，canvas 在 SVG 下层。
   */
  canvasRef?: RefObject<HTMLCanvasElement | null>

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
 * 6. **传入 `canvasRef` 时（Canvas+SVG 混合渲染）**：
 *    - Canvas 绘制物体位置用 `canvasSceneScale`（基于 `vp.visibleW/H` 的容器像素坐标）
 *    - SVG 矢量箭头起点必须通过 `vp.transform` 的**逆变换**对齐：
 *      ```ts
 *      // ✅ 正确：先算 canvas 像素坐标，再逆变换到设计坐标
 *      const { px: cpx, py: cpy } = worldToPixel(wx, wy, canvasSceneScale)
 *      const dx = (cpx - vp.tx) / vp.scale  // 设计坐标 x
 *      const dy = (cpy - vp.ty) / vp.scale  // 设计坐标 y
 *      // ❌ 错误：用 sceneScale（designW/worldWidth 为基准）直接算设计坐标
 *      // const { px: dx, py: dy } = worldToPixel(wx, wy, sceneScale)
 *      // 错误原因：vp.scale = min(visibleW/designW, visibleH/designH)，宽高比不匹配时
 *      // designW/worldWidth * vp.scale ≠ visibleW/worldWidth（Canvas scale），导致偏移
 *      ```
 *    - `VectorArrow` 的 `sceneScale.maxVectorLength` 应使用
 *      `canvasSceneScale.maxVectorLength / vp.scale`（设计坐标单位），
 *      保证箭头在屏幕上的实际像素长度与 Canvas 场景比例一致。
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
 *
 * // ── Canvas+SVG 混合（高频动画 Canvas，矢量箭头 SVG）────────
 * // Canvas 绘制粒子位置，SVG VectorArrow 显示速度/力矢量。
 * // 使用 useSceneScale + useCanvasViewport 统一坐标对齐。
 * const { canvasRef, setupFrame, designToPixel } = useCanvasViewport({ vp, canvasSize })
 * const sceneScale = useSceneScale({
 *   vp, preset,
 *   anchor: 'center',
 *   physicsScaleDesign: ...,
 *   centerSource: 'viewport',
 * })
 * // 物理坐标 → SVG 设计坐标（worldToDesign 输出设计坐标，直接用于 VectorArrow）
 * const particleDesign = worldToDesign(particle.x, particle.y, sceneScale)
 *
 * return (
 *   <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform} canvasRef={canvasRef}>
 *     <VectorArrow
 *       originPixel={{ x: particleDesign.px, y: particleDesign.py }}
 *       vector={{ x: particle.vx, y: particle.vy }}
 *       type="velocity"
 *       sceneScale={sceneScale}
 *     />
 *   </AnimationSvgCanvas>
 * )
 * ```
 */
export const AnimationSvgCanvas = React.memo<AnimationSvgCanvasProps>(
  function AnimationSvgCanvas({
    containerRef,
    transform,
    children,
    svgRef,
    canvasRef,
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
    const hasCanvas = !!canvasRef
    return (
      <div
        ref={containerRef}
        className={`w-full h-full overflow-hidden${hasCanvas ? ' relative' : ''}${className ? ` ${className}` : ''}`}
      >
        {hasCanvas && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
          />
        )}
        <svg
          ref={svgRef}
          className={`block select-none w-full h-full${hasCanvas ? ' absolute inset-0 pointer-events-none' : ''}`}
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
