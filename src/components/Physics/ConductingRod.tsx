import React, { useId } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 导电棒组件 Props
 */
interface ConductingRodProps {
  /** 渲染模式：'horizontal' = 水平平面，'inclined' = 3D 倾斜，'side-view' = 侧视截面 */
  type: 'horizontal' | 'inclined' | 'side-view'
  /** 水平模式下 x 坐标 (px)；3D 模式下滑动比例 (0-1) */
  x?: number
  /** 倾角 (°)，inclined 模式使用 */
  theta?: number
  /** 电流方向：'in' = 流入（⊗），'out' = 流出（⊙），'none' = 无电流 */
  currentDir?: 'in' | 'out' | 'none'
  /** 水平导轨间距 (px) */
  spacing?: number
  /** 画布宽度 (px)，inclined 模式使用 */
  width?: number
  /** 画布高度 (px) */
  height?: number
  /** 导体有效物理长度 L */
  L?: number
  /** 侧视截面半径 (px)，默认 16 */
  rodRadius?: number
}

/**
 * 3D 倾斜导轨的基准布局（与 Rails 组件共享同一坐标系）
 * 所有坐标基于此布局，通过 scale 变换缩放
 */
const getInclinedLayout = (L: number, theta: number = 30) => {
  const scaleL = 0.5 + L * 0.125
  const dx = 60 * scaleL
  const dy = 40 * scaleL

  // 与 Rails.tsx 的 3D 斜面布局保持一致：用压缩后的屏幕倾角表达真实 θ，
  // 既保留角度变化趋势，又避免大角度时导轨挤出主视图。
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
    // 导体棒粗细（4层叠加实现圆柱质感）
    outerStroke: 15,
    midStroke: 11,
    innerStroke: 7,
    highlightStroke: 2,
    // 端盖
    capRx: 3.5,
    capRy: 7.5,
  }
}

export const ConductingRod: React.FC<ConductingRodProps> = ({
  type,
  x = 250,
  theta = 30,
  currentDir = 'in',
  spacing = 100,
  width = 500,
  height = 300,
  L = 4.0,
  rodRadius = 16,
}) => {
  const uniqueId = useId().replace(/:/g, '-')
  const gradientId = `rod-grad-${uniqueId}`
  const radialGradId = `rod-radial-grad-${uniqueId}`
  
  if (type === 'side-view') {
    // 2D 侧视截面：圆形截面，中间画 ⊗ 或 ⊙
    const r = rodRadius
    const symbolR = r * 0.6875 // 11/16
    const dotR = r * 0.28125 // 4.5/16
    const crossHalf = r * 0.46875 // 7.5/16
    const highlightOffset = r * 0.3125 // 5/16
    const highlightR = r * 0.21875 // 3.5/16

    return (
      <g>
        <defs>
          {/* 3D 铜棒截面极富立体感的径向渐变 */}
          <radialGradient id={radialGradId} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.coil.copperLight} />
            <stop offset="60%" stopColor={SCENE_COLORS.coil.copperBase} />
            <stop offset="100%" stopColor={SCENE_COLORS.coil.copperDark} />
          </radialGradient>
        </defs>
        
        {/* 导体棒截面底投影 */}
        <circle cx={1} cy={2} r={r} fill={colors.neutral[900]} opacity={CANVAS_STYLE.opacity.shadow} />
        
        {/* 导体棒截面圆 */}
        <circle cx={0} cy={0} r={r} fill={`url(#${radialGradId})`} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        {/* 偏置受光高光点 */}
        <circle cx={-highlightOffset} cy={-highlightOffset} r={highlightR} fill={colors.neutral.white} opacity="0.75" pointerEvents="none" />
        
        {/* 电流方向符号 */}
        {currentDir === 'in' && (
          <g>
            {/* 荧光发光底圈 */}
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain * 2.2} opacity="0.22" style={{ filter: `drop-shadow(0 0 2px ${PHYSICS_COLORS.electricCurrent})` }} />
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.vectorMain} opacity="0.25" />
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.chartMain} />
            <line x1={-crossHalf} y1={-crossHalf} x2={crossHalf} y2={crossHalf} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain} />
            <line x1={crossHalf} y1={-crossHalf} x2={-crossHalf} y2={crossHalf} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain} />
          </g>
        )}
        {currentDir === 'out' && (
          <g>
            {/* 荧光发光底圈 */}
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.vectorMain * 2.2} opacity="0.22" style={{ filter: `drop-shadow(0 0 2px ${PHYSICS_COLORS.electricCurrent})` }} />
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={colors.neutral[800]} strokeWidth={CANVAS_STYLE.stroke.vectorMain} opacity="0.25" />
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.chartMain} />
            <circle cx={0} cy={0} r={dotR} fill={PHYSICS_COLORS.electricCurrent} />
          </g>
        )}
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图中的导体棒
    const layout = getInclinedLayout(L, theta)

    // 计算缩放比例（基于默认 500×300 画布）
    const scaleX = width / 600
    const scaleY = height / 300
    const scale = Math.min(scaleX, scaleY)

    const k = x // 0-1 之间
    const {
      rail1StartX: r1sx, rail1StartY: r1sy,
      railDx, railDy,
      dx, dy,
      outerStroke, midStroke, innerStroke, highlightStroke,
      capRx, capRy,
    } = layout

    const px1 = r1sx + railDx * k
    const py1 = r1sy + railDy * k
    const px2 = px1 + dx
    const py2 = py1 + dy

    // 计算旋转倾角，以便椭圆端面能够精确对齐
    const angle = Math.atan2(dy, dx) * 180 / Math.PI

    return (
      <g transform={`scale(${scale})`}>
        {/* 3D 投影层，使导体棒具有立体悬浮感 */}
        <line x1={px1 + 1} y1={py1 + 4} x2={px2 + 1} y2={py2 + 4} stroke={colors.neutral[900]} strokeWidth={outerStroke} strokeLinecap="round" opacity={CANVAS_STYLE.opacity.shadow} />
        
        {/* 导体棒 - 4层描边实现 3D 圆柱铜棒效果 */}
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={outerStroke} strokeLinecap="round" />
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperBase} strokeWidth={midStroke} strokeLinecap="round" />
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperLight} strokeWidth={innerStroke} strokeLinecap="round" />
        <line x1={px1} y1={py1 - 1.2} x2={px2} y2={py2 - 1.2} stroke={colors.neutral.white} strokeWidth={highlightStroke} strokeLinecap="round" opacity="0.75" />
        
        {/* 3D 椭圆端面 */}
        <ellipse cx={px1} cy={py1} rx={capRx} ry={capRy} transform={`rotate(${angle}, ${px1}, ${py1})`} fill={SCENE_COLORS.coil.copperLight} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={CANVAS_STYLE.stroke.tick} />
        <ellipse cx={px2} cy={py2} rx={capRx} ry={capRy} transform={`rotate(${angle}, ${px2}, ${py2})`} fill={SCENE_COLORS.coil.copperBase} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={CANVAS_STYLE.stroke.tick} />
      </g>
    )
  }

  // 默认：horizontal 平面模式
  const y1 = height / 2 - spacing / 2 - 20
  const y2 = height / 2 + spacing / 2 + 20

  // 导体棒宽度参数化（基于默认 12px 宽）
  const rodHalfW = 6
  const shadowHalfW = 8
  const capRx = rodHalfW
  const capRy = 2.5
  const highlightW = 2.5
  const highlightOffsetX = rodHalfW - 2 // 反光条距棒中心的偏移

  return (
    <g>
      <defs>
        {/* 水平模式下的 3D 铜棒线性渐变 (横向) */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.coil.copperDark} />
          <stop offset="20%" stopColor={SCENE_COLORS.coil.copperMid} />
          <stop offset="45%" stopColor={SCENE_COLORS.coil.copperLight} />
          <stop offset="70%" stopColor={SCENE_COLORS.coil.copperBase} />
          <stop offset="100%" stopColor={SCENE_COLORS.coil.copperStroke} />
        </linearGradient>
      </defs>

      {/* 导体棒软阴影 */}
      <rect x={x - shadowHalfW} y={y1} width={shadowHalfW * 2} height={y2 - y1} fill={colors.neutral[900]} rx={shadowHalfW * 0.75} opacity={CANVAS_STYLE.opacity.shadow} />
      {/* 导体棒主体 */}
      <rect x={x - rodHalfW} y={y1} width={rodHalfW * 2} height={y2 - y1} fill={`url(#${gradientId})`} rx={rodHalfW * 0.5} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={CANVAS_STYLE.stroke.objectThin} />
      
      {/* 3D 顶端和底端圆柱端盖 */}
      <ellipse cx={x} cy={y1} rx={capRx} ry={capRy} fill={SCENE_COLORS.coil.copperLight} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={CANVAS_STYLE.stroke.tick} />
      <ellipse cx={x} cy={y2} rx={capRx} ry={capRy} fill={SCENE_COLORS.coil.copperBase} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={CANVAS_STYLE.stroke.tick} />

      {/* 金属反光条 */}
      <rect x={x - highlightOffsetX} y={y1 + 4} width={highlightW} height={y2 - y1 - 8} fill={colors.neutral.white} opacity="0.6" rx="1" pointerEvents="none" />
    </g>
  )
}


