import React, { useId } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 导轨组件 Props
 */
interface RailsProps {
  /** 渲染模式：'horizontal' = 水平平面，'inclined' = 3D 倾斜，'side-view' = 侧视斜劈 */
  type: 'horizontal' | 'inclined' | 'side-view'
  /** 倾角 (°)，side-view 模式使用，默认 30 */
  theta?: number
  /** 导轨长度 (px)，默认 400 */
  length?: number
  /** 导轨间距 (px)，默认 100 */
  spacing?: number
  /** 画布宽度 (px)，默认 500 */
  width?: number
  /** 画布高度 (px)，默认 300 */
  height?: number
  /** 中心 x 坐标 (px) */
  cx?: number
  /** 中心 y 坐标 (px) */
  cy?: number
  /** 导体有效物理长度 L，默认 4.0 */
  L?: number
}

/**
 * 3D 倾斜导轨的基准布局（默认 500×300 画布）
 * 所有坐标基于此布局，通过 scale 变换缩放
 */
const getInclinedLayout = (L: number, theta: number = 30) => {
  const scaleL = 0.5 + L * 0.125
  const dx = 60 * scaleL
  const dy = 40 * scaleL

  // 3D 主视图是透视示意图，不能按真实 tanθ 等比例绘制，否则 θ=60° 会挤出画布。
  // 这里用单调压缩后的屏幕倾角：默认 θ=30° 约等于旧版 18.4°，同时让“垂直斜面磁场”
  // 与实际显示的导轨方向保持几何一致，避免切换磁场方向时看起来不真实。
  const displayAngleDeg = Math.max(8, Math.min(25, theta * 0.55 + 2))
  const displayAngleRad = (displayAngleDeg * Math.PI) / 180
  const railRun = 420
  const railRise = railRun * Math.tan(displayAngleRad)

  return {
    // 导轨1 后侧：低处 → 高处
    rail1StartX: 65,
    rail1StartY: 230,
    rail1EndX: 65 + railRun,
    rail1EndY: 230 - railRise,
    // 导轨1 长度方向跨度
    railDx: railRun,
    railDy: -railRise,
    // 导轨2 前侧偏移
    dx,
    dy,
    // 地面线
    groundY: 280,
    groundX1: 40,
    groundX2: 560,
    // 支撑架位置
    supportX: 485,
    // 导轨粗细
    outerStroke: 8,
    midStroke: 6,
    highlightStroke: 1.5,
    // 端盖
    capRx: 3.5,
    capRy: 2,
    capRotation: -18,
  }
}

export const Rails: React.FC<RailsProps> = ({
  type,
  theta = 30,
  length = 400,
  spacing = 100,
  width = 500,
  height = 300,
  cx,
  cy,
  L = 4.0,
}) => {
  const uniqueId = useId().replace(/:/g, '-')
  const gradientId = `rails-grad-${uniqueId}`

  if (type === 'side-view') {
    // 2D 侧视斜劈：展示倾角 theta 的三角形
    const pad = 40
    // 斜面底角在左下方，斜坡向右上方倾斜
    const x0 = pad
    const y0 = height - pad
    const maxW = width - 2 * pad
    const maxH = height - 2 * pad
    
    const thetaRad = (theta * Math.PI) / 180
    const d = maxW
    let h = d * Math.tan(thetaRad)
    if (h > maxH) {
      h = maxH
    }
    const rightX = x0 + d
    const topY = y0 - h
    
    return (
      <g>
        <defs>
          {/* 侧视斜劈：美化为科技感半透明磨砂玻璃渐变 */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.trackMetalGrad[0]} stopOpacity="0.85" />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.trackMetalGrad[1]} stopOpacity="0.60" />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.trackMetalGrad[2]} stopOpacity="0.40" />
          </linearGradient>
          {/* 角度指示箭头 */}
          <marker
            id={`arc-arrow-${uniqueId}`}
            viewBox="0 0 8 6"
            refX="7"
            refY="3"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={PHYSICS_COLORS.axis} />
          </marker>
        </defs>
        
        {/* 斜劈填充（半透明磨砂玻璃感） */}
        <polygon
          points={`${x0},${y0} ${rightX},${y0} ${rightX},${topY}`}
          fill={`url(#${gradientId})`}
          stroke={SCENE_COLORS.surface.inclineStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        {/* 斜面顶部高光边 */}
        <line
          x1={x0}
          y1={y0}
          x2={rightX}
          y2={topY}
          stroke={colors.neutral.white}
          strokeWidth={CANVAS_STYLE.stroke.objectThin}
          opacity="0.9"
          pointerEvents="none"
        />
        {/* 倾角弧线与标注 */}
        {theta > 0 && (
          <g transform={`translate(${x0}, ${y0})`}>
            {/* 角度刻度弧线，加上了精致的箭头 */}
            <path
              d={`M 50 0 A 50 50 0 0 0 ${50 * Math.cos(thetaRad)} ${-50 * Math.sin(thetaRad)}`}
              fill="none"
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={CANVAS_STYLE.stroke.annotation}
              opacity={CANVAS_STYLE.opacity.annotation}
              markerEnd={`url(#arc-arrow-${uniqueId})`}
            />
            {/* 悬浮文字胶囊底座标注 */}
            <g transform={`translate(${42 * Math.cos(thetaRad / 2)}, ${-42 * Math.sin(thetaRad / 2)})`}>
              <rect
                x="-32"
                y="-10"
                width="64"
                height="20"
                rx="10"
                fill={colors.neutral.white}
                stroke={colors.neutral[200]}
                strokeWidth={CANVAS_STYLE.stroke.grid}
                style={{ filter: `drop-shadow(${CANVAS_STYLE.svgFilter.shadow.dx}px ${CANVAS_STYLE.svgFilter.shadow.dy}px ${withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.06)})` }}
              />
              <text
                x="0"
                y="4"
                textAnchor="middle"
                fontFamily={CANVAS_STYLE.font.family}
                fontSize={CANVAS_STYLE.font.axis}
                fill={PHYSICS_COLORS.labelText}
                fontWeight={CANVAS_STYLE.font.labelWeight}
              >
                θ = {theta.toFixed(0)}°
              </text>
            </g>
          </g>
        )}
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图
    const layout = getInclinedLayout(L, theta)
    const shadowGradId = `rails-shadow-grad-${uniqueId}`
    const railMetalGradId = `rail-metal-grad-${uniqueId}`

    // 计算缩放比例（基于默认 500×300 画布）
    const scaleX = width / 600
    const scaleY = height / 300
    const scale = Math.min(scaleX, scaleY)

    const {
      rail1StartX: r1sx, rail1StartY: r1sy,
      rail1EndX: r1ex, rail1EndY: r1ey,
      dx, dy,
      groundY, groundX1, groundX2,
      supportX,
      outerStroke, midStroke, highlightStroke,
      capRx, capRy, capRotation,
    } = layout

    return (
      <g transform={`scale(${scale})`}>
        <defs>
          {/* 斜面半透明渐变阴影 */}
          <linearGradient id={shadowGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.trackMetalGrad[3]} stopOpacity="0.08" />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.trackMetalGrad[4]} stopOpacity="0.01" />
          </linearGradient>
          {/* 导轨不锈钢材质拉丝金属渐变 */}
          <linearGradient id={railMetalGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.trackMetalGrad[0]} />
            <stop offset="25%" stopColor={SCENE_COLORS.materials.trackMetalGrad[1]} />
            <stop offset="50%" stopColor={SCENE_COLORS.materials.trackMetalGrad[2]} />
            <stop offset="75%" stopColor={SCENE_COLORS.materials.trackMetalGrad[3]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.trackMetalGrad[4]} />
          </linearGradient>
        </defs>
        {/* 支撑架和地面 */}
        <line
          x1={groundX1}
          y1={groundY}
          x2={groundX2}
          y2={groundY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.axis}
          strokeDasharray={CANVAS_STYLE.dash.guide.join(',')}
        />
        
        {/* 斜面阴影/填充（半透明，增加立体感） */}
        <polygon
          points={`${r1sx},${r1sy} ${r1ex},${r1ey} ${r1ex + dx},${r1ey + dy} ${r1sx + dx},${r1sy + dy}`}
          fill={`url(#${shadowGradId})`}
        />

        {/* 导轨1（后侧）- 拉丝金属渐变 3D 效果 */}
        <line x1={r1sx} y1={r1sy} x2={r1ex} y2={r1ey} stroke={colors.neutral[800]} strokeWidth={outerStroke} strokeLinecap="round" />
        <line x1={r1sx} y1={r1sy} x2={r1ex} y2={r1ey} stroke={`url(#${railMetalGradId})`} strokeWidth={midStroke} strokeLinecap="round" />
        <line x1={r1sx} y1={r1sy - 0.8} x2={r1ex} y2={r1ey - 0.8} stroke={colors.neutral.white} strokeWidth={highlightStroke} strokeLinecap="round" opacity="0.75" />
        {/* 导轨1透视切面端盖 */}
        <ellipse cx={r1sx} cy={r1sy} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1sx}, ${r1sy})`} fill={colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />
        <ellipse cx={r1ex} cy={r1ey} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1ex}, ${r1ey})`} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />

        {/* 导轨1支撑架（精细金属工艺） */}
        <rect x={supportX - 5} y={groundY - 3} width="10" height="4" fill={colors.neutral[800]} rx="1.5" />
        <line x1={supportX} y1={r1ey} x2={supportX} y2={groundY} stroke={colors.neutral[800]} strokeWidth="5.5" />
        <line x1={supportX} y1={r1ey} x2={supportX} y2={groundY} stroke={colors.neutral[400]} strokeWidth="3" />
        <line x1={supportX + 1.2} y1={r1ey} x2={supportX + 1.2} y2={groundY} stroke={colors.neutral.white} strokeWidth="1" opacity="0.7" />

        {/* 导轨2（前侧）- 拉丝金属渐变 3D 效果 */}
        <line x1={r1sx + dx} y1={r1sy + dy} x2={r1ex + dx} y2={r1ey + dy} stroke={colors.neutral[800]} strokeWidth={outerStroke} strokeLinecap="round" />
        <line x1={r1sx + dx} y1={r1sy + dy} x2={r1ex + dx} y2={r1ey + dy} stroke={`url(#${railMetalGradId})`} strokeWidth={midStroke} strokeLinecap="round" />
        <line x1={r1sx + dx} y1={r1sy + dy - 0.8} x2={r1ex + dx} y2={r1ey + dy - 0.8} stroke={colors.neutral.white} strokeWidth={highlightStroke} strokeLinecap="round" opacity="0.75" />
        {/* 导轨2透视切面端盖 */}
        <ellipse cx={r1sx + dx} cy={r1sy + dy} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1sx + dx}, ${r1sy + dy})`} fill={colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />
        <ellipse cx={r1ex + dx} cy={r1ey + dy} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1ex + dx}, ${r1ey + dy})`} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />

        {/* 导轨2支撑架（精细金属工艺） */}
        <rect x={supportX + dx - 5} y={groundY - 3} width="10" height="4" fill={colors.neutral[800]} rx="1.5" />
        <line x1={supportX + dx} y1={r1ey + dy} x2={supportX + dx} y2={groundY} stroke={colors.neutral[800]} strokeWidth="5.5" />
        <line x1={supportX + dx} y1={r1ey + dy} x2={supportX + dx} y2={groundY} stroke={colors.neutral[400]} strokeWidth="3" />
        <line x1={supportX + dx + 1.2} y1={r1ey + dy} x2={supportX + dx + 1.2} y2={groundY} stroke={colors.neutral.white} strokeWidth="1" opacity="0.7" />
      </g>
    )
  }

  // 默认：horizontal 平面导轨
  const baseCx = cx ?? width / 2
  const baseCy = cy ?? height / 2
  const y1 = baseCy - spacing / 2
  const y2 = baseCy + spacing / 2
  const x1 = baseCx - length / 2
  const x2 = x1 + length

  const railGradId = `horizontal-rail-grad-${uniqueId}`
  const bgGradId = `horizontal-bg-grad-${uniqueId}`

  // 参数化布局常量（基于默认尺寸比例）
  const railH = 8         // 导轨矩形高度
  const railRx = 4        // 导轨圆角
  const railShadowOffset = 0.5 // 导轨阴影矩形偏移
  const railHighlightY = 2     // 高光线上移量
  const endCapR = 4       // 端点圆半径
  const endCapHighlightOffset = 1 // 端点高光偏移

  return (
    <g>
      <defs>
        {/* 底座微渐变 */}
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.neutral[50]} />
          <stop offset="100%" stopColor={colors.neutral[100]} />
        </linearGradient>
        {/* 轨道圆柱体 3D 不锈钢拉丝金属渐变 */}
        <linearGradient id={railGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.trackMetalGrad[0]} />
          <stop offset="25%" stopColor={SCENE_COLORS.materials.trackMetalGrad[1]} />
          <stop offset="50%" stopColor={SCENE_COLORS.materials.trackMetalGrad[2]} />
          <stop offset="75%" stopColor={SCENE_COLORS.materials.trackMetalGrad[3]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.trackMetalGrad[4]} />
        </linearGradient>
      </defs>
      


      {/* 导轨 1 */}
      {/* 轨道软阴影 */}
      <rect x={x1} y={y1 - railH / 2 + railShadowOffset} width={length} height={railH} fill="none" stroke={colors.neutral[900]} strokeWidth="0.8" opacity={CANVAS_STYLE.opacity.shadow} rx={railRx} />
      {/* 轨道金属本体 */}
      <rect x={x1} y={y1 - railH / 2} width={length} height={railH} fill={`url(#${railGradId})`} rx={railRx} />
      {/* 轨道顶部高光线 */}
      <line x1={x1 + endCapHighlightOffset} y1={y1 - railHighlightY} x2={x2 - endCapHighlightOffset} y2={y1 - railHighlightY} stroke={colors.neutral.white} strokeWidth="0.8" opacity="0.8" />
      {/* 轨道切面端盖，金属抛光色 */}
      <circle cx={x1} cy={y1} r={endCapR} fill={SCENE_COLORS.materials.trackMetalGrad[1]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <circle cx={x2} cy={y1} r={endCapR} fill={SCENE_COLORS.materials.trackMetalGrad[3]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />

      {/* 导轨 2 */}
      {/* 轨道软阴影 */}
      <rect x={x1} y={y2 - railH / 2 + railShadowOffset} width={length} height={railH} fill="none" stroke={colors.neutral[900]} strokeWidth="0.8" opacity={CANVAS_STYLE.opacity.shadow} rx={railRx} />
      {/* 轨道金属本体 */}
      <rect x={x1} y={y2 - railH / 2} width={length} height={railH} fill={`url(#${railGradId})`} rx={railRx} />
      {/* 轨道顶部高光线 */}
      <line x1={x1 + endCapHighlightOffset} y1={y2 - railHighlightY} x2={x2 - endCapHighlightOffset} y2={y2 - railHighlightY} stroke={colors.neutral.white} strokeWidth="0.8" opacity="0.8" />
      {/* 轨道切面端盖，金属抛光色 */}
      <circle cx={x1} cy={y2} r={endCapR} fill={SCENE_COLORS.materials.trackMetalGrad[1]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />
      <circle cx={x2} cy={y2} r={endCapR} fill={SCENE_COLORS.materials.trackMetalGrad[3]} stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.grid} />
    </g>
  )
}


