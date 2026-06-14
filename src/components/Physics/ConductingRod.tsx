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
  height?: number // 画布高度
  L?: number // 导体有效物理长度
}

export const ConductingRod: React.FC<ConductingRodProps> = ({
  type,
  x = 250,
  currentDir = 'in',
  spacing = 100,
  height = 300,
  L = 4.0,
}) => {
  const uniqueId = useId().replace(/:/g, '-')
  const gradientId = `rod-grad-${uniqueId}`
  const radialGradId = `rod-radial-grad-${uniqueId}`
  const time = useAnimationStore((s) => s.time)
  
  if (type === 'side-view') {
    // 2D 侧视截面：圆形截面，中间画 ⊗ 或 ⊙
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
        <circle cx={0} cy={0} r="16" fill={`url(#${radialGradId})`} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="2" />
        {/* 偏置受光高光点 */}
        <circle cx={-5} cy={-5} r="3.5" fill={colors.neutral[0]} opacity="0.65" pointerEvents="none" />
        
        {/* 电流方向符号 */}
        {currentDir === 'in' && (
          <g>
            <circle cx={0} cy={0} r="11" fill="none" stroke={colors.neutral[800]} strokeWidth="3" opacity="0.25" />
            <circle cx={0} cy={0} r="11" fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="2.5" />
            <line x1="-7.5" y1="-7.5" x2="7.5" y2="7.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="3" />
            <line x1="7.5" y1="-7.5" x2="-7.5" y2="7.5" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="3" />
          </g>
        )}
        {currentDir === 'out' && (
          <g>
            <circle cx={0} cy={0} r="11" fill="none" stroke={colors.neutral[800]} strokeWidth="3" opacity="0.25" />
            <circle cx={0} cy={0} r="11" fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth="2.5" />
            <circle cx={0} cy={0} r="4.5" fill={PHYSICS_COLORS.electricCurrent} />
          </g>
        )}
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图中的导体棒
    // 导轨1后侧高处：(420, 130)，低处：(120, 230)
    // 导轨2前侧由 L 决定，相比导轨1偏移 dx = 60 * scaleL, dy = 40 * scaleL
    // 导体棒位置由 x 比例 (0 到 1) 决定，0 为最低端，1 为最高端
    const k = x // 0-1 之间
    const scaleL = 0.5 + L * 0.125
    const dx = 60 * scaleL
    const dy = 40 * scaleL
    const px1 = 120 + 300 * k
    const py1 = 230 - 100 * k
    const px2 = px1 + dx
    const py2 = py1 + dy

    // 计算旋转倾角，以便椭圆端面能够精确对齐
    const angle = Math.atan2(dy, dx) * 180 / Math.PI

    return (
      <g>
        {/* 导体棒 - 4层描边实现 3D 圆柱铜棒效果 */}
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="15" strokeLinecap="round" />
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperBase} strokeWidth="11" strokeLinecap="round" />
        <line x1={px1} y1={py1} x2={px2} y2={py2} stroke={SCENE_COLORS.coil.copperLight} strokeWidth="7" strokeLinecap="round" />
        <line x1={px1} y1={py1 - 1.2} x2={px2} y2={py2 - 1.2} stroke={colors.neutral[0]} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        
        {/* 3D 椭圆端面 */}
        <ellipse cx={px1} cy={py1} rx="3.5" ry="7.5" transform={`rotate(${angle}, ${px1}, ${py1})`} fill={SCENE_COLORS.coil.copperLight} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />
        <ellipse cx={px2} cy={py2} rx="3.5" ry="7.5" transform={`rotate(${angle}, ${px2}, ${py2})`} fill={SCENE_COLORS.coil.copperBase} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />

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
              strokeWidth="5"
              opacity="0.3"
              strokeLinecap="round"
            />
            {/* 动画流光虚线 */}
            <line
              x1={currentDir === 'in' ? px2 : px1}
              y1={currentDir === 'in' ? py2 : py1}
              x2={currentDir === 'in' ? px1 : px2} // 指向另一端
              y2={currentDir === 'in' ? py1 : py2}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth="3.5"
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
      <rect x={x - 8} y={y1} width="16" height={y2 - y1} fill={SCENE_COLORS.coil.copperDark} rx="6" opacity="0.4" />
      {/* 导体棒主体 */}
      <rect x={x - 6} y={y1} width="12" height={y2 - y1} fill={`url(#${gradientId})`} rx="3" stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1.5" />
      
      {/* 3D 顶端和底端圆柱端盖 */}
      <ellipse cx={x} cy={y1} rx={6} ry={2.5} fill={SCENE_COLORS.coil.copperLight} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />
      <ellipse cx={x} cy={y2} rx={6} ry={2.5} fill={SCENE_COLORS.coil.copperBase} stroke={SCENE_COLORS.coil.copperStroke} strokeWidth="1" />

      {/* 金属反光条 */}
      <rect x={x - 4} y={y1 + 4} width="2.5" height={y2 - y1 - 8} fill={colors.neutral[0]} opacity="0.5" rx="1" pointerEvents="none" />
      
      {/* 导体棒内部电流流光指示动画 */}
      {showCurrentFlow && (
        <g>
          {/* 流光发光背景层 */}
          <line
            x1={x}
            y1={currentDir === 'in' ? y2 - 10 : y1 + 10}
            x2={x}
            y2={currentDir === 'in' ? y1 + 10 : y2 - 10}
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="5"
            opacity="0.3"
            strokeLinecap="round"
          />
          {/* 流光动画线 */}
          <line
            x1={x}
            y1={currentDir === 'in' ? y2 - 10 : y1 + 10}
            x2={x}
            y2={currentDir === 'in' ? y1 + 10 : y2 - 10}
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
