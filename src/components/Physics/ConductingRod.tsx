import React, { useId } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useAnimationStore } from '@/stores'

interface ConductingRodProps {
  type: 'horizontal' | 'inclined' | 'side-view'
  x?: number // 水平模式下的 x 坐标，或 3D 模式下的相对滑动比例 (0-1)
  theta?: number // 倾角，度
  currentDir?: 'in' | 'out' | 'none' // 电流方向
  spacing?: number // 水平导轨间距
  width?: number // 画布宽度（inclined 模式使用）
  height?: number // 画布高度
  L?: number // 导体有效物理长度
  /** 侧视截面半径，默认 16 */
  rodRadius?: number
}

/**
 * 3D 倾斜导轨的基准布局（与 Rails 组件共享同一坐标系）
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
    // 导轨1 长度方向跨度
    railDx: 300,
    railDy: -100,
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
    // 电流指示
    currentGlowStroke: 5,
    currentDashStroke: 3.5,
  }
}

export const ConductingRod: React.FC<ConductingRodProps> = ({
  type,
  x = 250,
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
  const time = useAnimationStore((s) => s.time)
  
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
          {/* 3D 铜棒截面径向渐变 */}
          <radialGradient id={radialGradId} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.coil.copperLight} />
            <stop offset="60%" stopColor={SCENE_COLORS.coil.copperBase} />
            <stop offset="100%" stopColor={SCENE_COLORS.coil.copperDark} />
          </radialGradient>
        </defs>
        {/* 导体棒截面圆 */}
        <circle cx={0} cy={0} r={r} fill={`url(#${radialGradId})`} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="2" />
        {/* 偏置受光高光点 */}
        <circle cx={-highlightOffset} cy={-highlightOffset} r={highlightR} fill={colors.neutral.white} opacity="0.65" pointerEvents="none" />
        
        {/* 电流方向符号 */}
        {currentDir === 'in' && (
          <g>
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={colors.neutral[800]} strokeWidth="3" opacity="0.25" />
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="2.5" />
            <line x1={-crossHalf} y1={-crossHalf} x2={crossHalf} y2={crossHalf} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="3" />
            <line x1={crossHalf} y1={-crossHalf} x2={-crossHalf} y2={crossHalf} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="3" />
          </g>
        )}
        {currentDir === 'out' && (
          <g>
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={colors.neutral[800]} strokeWidth="3" opacity="0.25" />
            <circle cx={0} cy={0} r={symbolR} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="2.5" />
            <circle cx={0} cy={0} r={dotR} fill={PHYSICS_COLORS.electricCurrent} />
          </g>
        )}
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图中的导体棒
    const layout = getInclinedLayout(L)

    // 计算缩放比例（基于默认 500×300 画布）
    const scaleX = width / 500
    const scaleY = height / 300
    const scale = Math.min(scaleX, scaleY)

    const k = x // 0-1 之间
    const {
      rail1StartX: r1sx, rail1StartY: r1sy,
      railDx, railDy,
      dx, dy,
      outerStroke, midStroke, innerStroke, highlightStroke,
      capRx, capRy,
      currentGlowStroke, currentDashStroke,
    } = layout

    const px1 = r1sx + railDx * k
    const py1 = r1sy + railDy * k
    const px2 = px1 + dx
    const py2 = py1 + dy

    // 计算旋转倾角，以便椭圆端面能够精确对齐
    const angle = Math.atan2(dy, dx) * 180 / Math.PI

    return (
      <g transform={`scale(${scale})`}>
        {/* 导体棒 - 4层描边实现 3D 圆柱铜棒效果 */}
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth={outerStroke} strokeLinecap="round" />
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperBase} strokeWidth={midStroke} strokeLinecap="round" />
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperLight} strokeWidth={innerStroke} strokeLinecap="round" />
        <line x1={px1} y1={py1 - 1.2} x2={px2} y2={py2 - 1.2} stroke={colors.neutral.white} strokeWidth={highlightStroke} strokeLinecap="round" opacity="0.65" />
        
        {/* 3D 椭圆端面 */}
        <ellipse cx={px1} cy={py1} rx={capRx} ry={capRy} transform={`rotate(${angle}, ${px1}, ${py1})`} fill={SCENE_COLORS.coil.copperLight} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />
        <ellipse cx={px2} cy={py2} rx={capRx} ry={capRy} transform={`rotate(${angle}, ${px2}, ${py2})`} fill={SCENE_COLORS.coil.copperBase} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />

        {/* 如果有电流，在棒中段加虚线指示电流流向 */}
        {currentDir !== 'none' && (
          <g>
            {/* 电流发光底条 */}
            <line
              x1={currentDir === 'in' ? px2 : px1}
              y1={currentDir === 'in' ? py2 : py1}
              x2={currentDir === 'in' ? px1 : px2}
              y2={currentDir === 'in' ? py1 : py2}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={currentGlowStroke}
              opacity="0.3"
              strokeLinecap="round"
            />
            {/* 动画流光虚线 */}
            <line
              x1={currentDir === 'in' ? px2 : px1}
              y1={currentDir === 'in' ? py2 : py1}
              x2={currentDir === 'in' ? px1 : px2}
              y2={currentDir === 'in' ? py1 : py2}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={currentDashStroke}
              strokeDasharray="6,5"
              strokeDashoffset={-time * 35}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    )
  }

  // 默认：horizontal 平面模式
  const y1 = height / 2 - spacing / 2 - 20
  const y2 = height / 2 + spacing / 2 + 20
  const showCurrentFlow = currentDir !== 'none'

  // 导体棒宽度参数化（基于默认 12px 宽）
  const rodHalfW = 6
  const shadowHalfW = 8
  const capRx = rodHalfW
  const capRy = 2.5
  const highlightW = 2.5
  const highlightOffsetX = rodHalfW - 2 // 反光条距棒中心的偏移
  const currentFlowInset = 10 // 流光动画距端点的内缩

  return (
    <g>
      <defs>
        {/* 水平模式下的 3D 铜棒线性渐变 (横向) */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={SCENE_COLORS.coil.copperDark} />
          <stop offset="30%" stopColor={SCENE_COLORS.coil.copperLight} />
          <stop offset="70%" stopColor={SCENE_COLORS.coil.copperBase} />
          <stop offset="100%" stopColor={SCENE_COLORS.coil.copperStroke} />
        </linearGradient>
      </defs>

      {/* 导体棒阴影 */}
      <rect x={x - shadowHalfW} y={y1} width={shadowHalfW * 2} height={y2 - y1} fill={SCENE_COLORS.coil.copperDark} rx={shadowHalfW * 0.75} opacity="0.4" />
      {/* 导体棒主体 */}
      <rect x={x - rodHalfW} y={y1} width={rodHalfW * 2} height={y2 - y1} fill={`url(#${gradientId})`} rx={rodHalfW * 0.5} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1.5" />
      
      {/* 3D 顶端和底端圆柱端盖 */}
      <ellipse cx={x} cy={y1} rx={capRx} ry={capRy} fill={SCENE_COLORS.coil.copperLight} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />
      <ellipse cx={x} cy={y2} rx={capRx} ry={capRy} fill={SCENE_COLORS.coil.copperBase} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />

      {/* 金属反光条 */}
      <rect x={x - highlightOffsetX} y={y1 + 4} width={highlightW} height={y2 - y1 - 8} fill={colors.neutral.white} opacity="0.5" rx="1" pointerEvents="none" />
      
      {/* 导体棒内部电流流光指示动画 */}
      {showCurrentFlow && (
        <g>
          {/* 流光发光背景层 */}
          <line
            x1={x}
            y1={currentDir === 'in' ? y2 - currentFlowInset : y1 + currentFlowInset}
            x2={x}
            y2={currentDir === 'in' ? y1 + currentFlowInset : y2 - currentFlowInset}
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="5"
            opacity="0.3"
            strokeLinecap="round"
          />
          {/* 流光动画线 */}
          <line
            x1={x}
            y1={currentDir === 'in' ? y2 - currentFlowInset : y1 + currentFlowInset}
            x2={x}
            y2={currentDir === 'in' ? y1 + currentFlowInset : y2 - currentFlowInset}
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="3.5"
            strokeDasharray="6,6"
            strokeDashoffset={-time * 30}
            strokeLinecap="round"
            opacity="0.9"
          />
        </g>
      )}
    </g>
  )
}

export default ConductingRod
