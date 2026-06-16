import React, { useId } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
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
 * 导轨组件
 *
 * 绘制导体棒滑动的金属导轨，支持三种视角模式：
 * - horizontal：水平平面模式，双平行导轨 + 3D 圆柱渐变 + 端点圆帽
 * - inclined：3D 倾斜模式，跨在支撑架上的倾斜双轨，含地面线与支撑架
 * - side-view：侧视斜劈模式，三角形斜劈 + 倾角 θ 弧线标注
 *
 * 导轨采用 3 层描边叠加实现圆柱金属质感
 */

/**
 * 3D 倾斜导轨的基准布局（默认 500×300 画布）
 * 所有坐标基于此布局，通过 scale 变换缩放
 */
const getInclinedLayout = (L: number) => {
  const scaleL = 0.5 + L * 0.125
  const dx = 60 * scaleL
  const dy = 40 * scaleL
  return {
    // 导轨1 后侧：低处 → 高处
    rail1StartX: 120,
    rail1StartY: 230,
    rail1EndX: 420,
    rail1EndY: 130,
    // 导轨2 前侧偏移
    dx,
    dy,
    // 地面线
    groundY: 280,
    groundX1: 80,
    groundX2: 520,
    // 支撑架位置
    supportX: 420,
    // 导轨粗细（3层叠加实现圆柱质感）
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
          {/* 侧视斜劈金属/塑料质感渐变 */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.neutral[50]} />
            <stop offset="100%" stopColor={colors.neutral[300]} />
          </linearGradient>
        </defs>
        {/* 斜劈填充 */}
        <polygon
          points={`${x0},${y0} ${rightX},${y0} ${rightX},${topY}`}
          fill={`url(#${gradientId})`}
          stroke={colors.neutral[400]} // slate-400
          strokeWidth="2"
        />
        {/* 斜面顶部高光边 */}
        <line
          x1={x0}
          y1={y0}
          x2={rightX}
          y2={topY}
          stroke={colors.neutral.white}
          strokeWidth="1.5"
          opacity="0.8"
          pointerEvents="none"
        />
        {/* 倾角弧线与标注 */}
        {theta > 0 && (
          <g transform={`translate(${x0}, ${y0})`}>
            <path
              d={`M 50 0 A 50 50 0 0 0 ${50 * Math.cos(thetaRad)} ${-50 * Math.sin(thetaRad)}`}
              fill="none"
              stroke={PHYSICS_COLORS.axis}
              strokeWidth="2"
            />
            <text
              x={60}
              y={-12}
              fontSize="12"
              fill={PHYSICS_COLORS.labelTextLight}
              fontWeight="bold"
            >
              θ = {theta.toFixed(0)}°
            </text>
          </g>
        )}
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图
    const layout = getInclinedLayout(L)
    const shadowGradId = `rails-shadow-grad-${uniqueId}`

    // 计算缩放比例（基于默认 500×300 画布）
    const scaleX = width / 500
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
            <stop offset="0%" stopColor={colors.primary[500]} stopOpacity="0.08" />
            <stop offset="100%" stopColor={colors.primary[500]} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* 支撑架和地面 */}
        <line x1={groundX1} y1={groundY} x2={groundX2} y2={groundY} stroke={colors.neutral[300]} strokeWidth="2" strokeDasharray="4,4" />
        
        {/* 斜面阴影/填充（半透明，增加立体感） */}
        <polygon
          points={`${r1sx},${r1sy} ${r1ex},${r1ey} ${r1ex + dx},${r1ey + dy} ${r1sx + dx},${r1sy + dy}`}
          fill={`url(#${shadowGradId})`}
        />

        {/* 导轨1（后侧）- 3层线宽叠加实现圆柱质感 */}
        <line x1={r1sx} y1={r1sy} x2={r1ex} y2={r1ey} stroke={colors.neutral[800]} strokeWidth={outerStroke} strokeLinecap="round" />
        <line x1={r1sx} y1={r1sy} x2={r1ex} y2={r1ey} stroke={colors.neutral[600]} strokeWidth={midStroke} strokeLinecap="round" />
        <line x1={r1sx} y1={r1sy - 0.8} x2={r1ex} y2={r1ey - 0.8} stroke={colors.neutral.white} strokeWidth={highlightStroke} strokeLinecap="round" opacity="0.65" />
        {/* 导轨1透视切面端盖 */}
        <ellipse cx={r1sx} cy={r1sy} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1sx}, ${r1sy})`} fill={colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth="1" />
        <ellipse cx={r1ex} cy={r1ey} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1ex}, ${r1ey})`} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />
        
        {/* 导轨1支撑架 */}
        <rect x={supportX - 3} y={groundY - 2} width="6" height="3" fill={colors.neutral[600]} rx="0.5" />
        <line x1={supportX} y1={r1ey} x2={supportX} y2={groundY} stroke={colors.neutral[600]} strokeWidth="4" />
        <line x1={supportX + 1.2} y1={r1ey} x2={supportX + 1.2} y2={groundY} stroke={colors.neutral[400]} strokeWidth="1.5" opacity="0.6" />

        {/* 导轨2（前侧）- 3层线宽叠加实现圆柱质感 */}
        <line x1={r1sx + dx} y1={r1sy + dy} x2={r1ex + dx} y2={r1ey + dy} stroke={colors.neutral[800]} strokeWidth={outerStroke} strokeLinecap="round" />
        <line x1={r1sx + dx} y1={r1sy + dy} x2={r1ex + dx} y2={r1ey + dy} stroke={colors.neutral[600]} strokeWidth={midStroke} strokeLinecap="round" />
        <line x1={r1sx + dx} y1={r1sy + dy - 0.8} x2={r1ex + dx} y2={r1ey + dy - 0.8} stroke={colors.neutral.white} strokeWidth={highlightStroke} strokeLinecap="round" opacity="0.65" />
        {/* 导轨2透视切面端盖 */}
        <ellipse cx={r1sx + dx} cy={r1sy + dy} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1sx + dx}, ${r1sy + dy})`} fill={colors.neutral[400]} stroke={colors.neutral[800]} strokeWidth="1" />
        <ellipse cx={r1ex + dx} cy={r1ey + dy} rx={capRx} ry={capRy} transform={`rotate(${capRotation}, ${r1ex + dx}, ${r1ey + dy})`} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />
        
        {/* 导轨2支撑架 */}
        <rect x={supportX + dx - 3} y={groundY - 2} width="6" height="3" fill={colors.neutral[600]} rx="0.5" />
        <line x1={supportX + dx} y1={r1ey + dy} x2={supportX + dx} y2={groundY} stroke={colors.neutral[600]} strokeWidth="4" />
        <line x1={supportX + dx + 1.2} y1={r1ey + dy} x2={supportX + dx + 1.2} y2={groundY} stroke={colors.neutral[400]} strokeWidth="1.5" opacity="0.6" />
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
  const bgPadX = 20       // 背景框水平内边距
  const bgPadY = 30       // 背景框垂直内边距
  const bgRx = 10         // 背景框圆角
  const bgInnerOffset = 1 // 内边框偏移
  const bgInnerRx = 9     // 内边框圆角
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
        {/* 轨道圆柱体 3D 渐变 */}
        <linearGradient id={railGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.neutral[700]} />
          <stop offset="25%" stopColor={colors.neutral[500]} />
          <stop offset="50%" stopColor={colors.neutral[200]} />
          <stop offset="75%" stopColor={colors.neutral[600]} />
          <stop offset="100%" stopColor={colors.neutral[800]} />
        </linearGradient>
      </defs>
      
      {/* 导轨架背景 */}
      <rect
        x={x1 - bgPadX}
        y={y1 - bgPadY}
        width={length + bgPadX * 2}
        height={spacing + bgPadY * 2}
        fill={`url(#${bgGradId})`}
        rx={bgRx}
        stroke={colors.neutral[200]}
        strokeWidth="1.5"
      />
      <rect
        x={x1 - bgPadX + bgInnerOffset}
        y={y1 - bgPadY + bgInnerOffset}
        width={length + (bgPadX - bgInnerOffset) * 2}
        height={spacing + (bgPadY - bgInnerOffset) * 2}
        fill="none"
        stroke={colors.neutral.white}
        strokeWidth="1.5"
        rx={bgInnerRx}
      />

      {/* 导轨 1 */}
      <rect x={x1} y={y1 - railH / 2 + railShadowOffset} width={length} height={railH} fill="none" stroke={colors.neutral[900]} strokeWidth="0.8" opacity="0.1" rx={railRx} />
      <rect x={x1} y={y1 - railH / 2} width={length} height={railH} fill={`url(#${railGradId})`} rx={railRx} />
      <line x1={x1 + endCapHighlightOffset} y1={y1 - railHighlightY} x2={x2 - endCapHighlightOffset} y2={y1 - railHighlightY} stroke={colors.neutral.white} strokeWidth="0.8" opacity="0.75" />
      <circle cx={x1} cy={y1} r={endCapR} fill={colors.neutral[500]} stroke={colors.neutral[800]} strokeWidth="1" />
      <circle cx={x2} cy={y1} r={endCapR} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />

      {/* 导轨 2 */}
      <rect x={x1} y={y2 - railH / 2 + railShadowOffset} width={length} height={railH} fill="none" stroke={colors.neutral[900]} strokeWidth="0.8" opacity="0.1" rx={railRx} />
      <rect x={x1} y={y2 - railH / 2} width={length} height={railH} fill={`url(#${railGradId})`} rx={railRx} />
      <line x1={x1 + endCapHighlightOffset} y1={y2 - railHighlightY} x2={x2 - endCapHighlightOffset} y2={y2 - railHighlightY} stroke={colors.neutral.white} strokeWidth="0.8" opacity="0.75" />
      <circle cx={x1} cy={y2} r={endCapR} fill={colors.neutral[500]} stroke={colors.neutral[800]} strokeWidth="1" />
      <circle cx={x2} cy={y2} r={endCapR} fill={colors.neutral[600]} stroke={colors.neutral[800]} strokeWidth="1" />
    </g>
  )
}

export default Rails
