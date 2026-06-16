import React from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 蹄形磁铁组件 Props
 */
interface MagnetProps {
  /** 渲染模式：'horizontal' = 平面水平视图，'inclined' = 3D 倾斜视图，'side-view' = 侧视切面视图 */
  type: 'horizontal' | 'inclined' | 'side-view'
  /** 磁感应强度 B (T)，正负决定 N/S 极朝向 */
  B?: number
  /** 磁铁 x 坐标 (px)，仅 horizontal 模式使用 */
  x?: number
  /** 磁铁 y 坐标 (px)，仅 horizontal 模式使用 */
  y?: number
  /** 磁铁宽度 (px)，默认 190（horizontal 模式） */
  width?: number
  /** 磁铁高度 (px)，默认 144（horizontal 模式） */
  height?: number
}

/**
 * 蹄形磁铁组件
 *
 * 绘制蹄形（U 形）磁铁，支持三种视角模式：
 * - horizontal：平面水平视图，开口朝右
 * - inclined：3D 倾斜视图，跨在导轨上方
 * - side-view：侧视切面视图，显示上下两磁极
 *
 * 根据 B 的正负自动翻转 N/S 极位置（红=N，蓝=S）
 */
export const Magnet: React.FC<MagnetProps> = ({
  type,
  B = 1,
  x = 350,
  y = 200,
  width = 190,
  height = 144,
}) => {
  const isBPositive = B >= 0
  const nColor = PHYSICS_COLORS.magnetNorth // 红色
  const sColor = PHYSICS_COLORS.magnetSouth // 蓝色

  // 计算缩放比例（基于默认尺寸）
  const defaultWidth = 190
  const defaultHeight = 144
  const scaleX = width / defaultWidth
  const scaleY = height / defaultHeight
  const scale = Math.min(scaleX, scaleY)

  if (type === 'side-view') {
    // 侧视切面模式下的磁极放置
    // 如果 B > 0，磁场竖直向上。根据物理规定：磁力线从 N 极指向 S 极。所以下方是 N 极（红色），上方是 S 极（蓝色）
    // 如果 B < 0，下方是 S 极（蓝色），上方是 N 极（红色）
    const topColor = isBPositive ? sColor : nColor
    const bottomColor = isBPositive ? nColor : sColor
    const topLabel = isBPositive ? 'S' : 'N'
    const bottomLabel = isBPositive ? 'N' : 'S'

    return (
      <g>
        {/* 上方磁极 */}
        <rect x="-24" y="-130" width="48" height="30" fill={topColor} rx="4" stroke={colors.neutral[600]} strokeWidth="2" />
        <text x="0" y="-110" fill={colors.neutral.white} fontSize="14" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          {topLabel}
        </text>
        
        {/* 下方磁极 */}
        <rect x="-24" y="80" width="48" height="30" fill={bottomColor} rx="4" stroke={colors.neutral[600]} strokeWidth="2" />
        <text x="0" y="100" fill={colors.neutral.white} fontSize="14" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          {bottomLabel}
        </text>
      </g>
    )
  }

  if (type === 'inclined') {
    // 3D 倾斜视图中的蹄形磁铁，跨在中央
    const topColor = isBPositive ? sColor : nColor
    const bottomColor = isBPositive ? nColor : sColor
    const topLabel = isBPositive ? 'S' : 'N'
    const bottomLabel = isBPositive ? 'N' : 'S'

    return (
      <g opacity="0.9">
        {/* 蹄形磁铁后弯曲支架（3D 阴影感） */}
        <path d="M 320,120 L 320,90 Q 320,55 350,55 Q 380,55 380,90 L 380,110" fill="none" stroke={colors.neutral[700]} strokeWidth="28" strokeLinecap="round" />
        <path d="M 320,120 L 320,90 Q 320,55 350,55 Q 380,55 380,90 L 380,110" fill="none" stroke={colors.neutral[800]} strokeWidth="24" strokeLinecap="round" />
        
        {/* 上方磁极 */}
        <path d="M 320,95 Q 320,70 345,70" fill="none" stroke={topColor} strokeWidth="20" />
        <rect x="306" y="95" width="28" height="24" fill={topColor} rx="2" />
        <text x="320" y="111" fill={colors.neutral.white} fontSize="11" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          {topLabel}
        </text>

        {/* 下方磁极 */}
        <path d="M 380,95 Q 380,70 355,70" fill="none" stroke={bottomColor} strokeWidth="20" />
        <rect x="366" y="95" width="28" height="24" fill={bottomColor} rx="2" />
        <text x="380" y="111" fill={colors.neutral.white} fontSize="11" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          {bottomLabel}
        </text>
      </g>
    )
  }

  // 默认：horizontal 平面模式，开口朝右的蹄形磁体
  const topColor = isBPositive ? sColor : nColor
  const bottomColor = isBPositive ? nColor : sColor
  const topLabel = isBPositive ? 'S' : 'N'
  const bottomLabel = isBPositive ? 'N' : 'S'

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {/* 磁体弯臂 */}
      <path d="M -30,-60 L -60,-60 Q -95,-60 -95,0 Q -95,60 -60,60 L -30,60" fill="none" stroke={colors.neutral[600]} strokeWidth="26" strokeLinecap="round" />
      <path d="M -30,-60 L -60,-60 Q -95,-60 -95,0 Q -95,60 -60,60 L -30,60" fill="none" stroke={colors.neutral[800]} strokeWidth="20" strokeLinecap="round" />
      
      {/* 上极 */}
      <rect x="-30" y="-72" width="55" height="24" fill={topColor} rx="4" stroke={colors.neutral[900]} strokeWidth="1" />
      <text x="-2.5" y="-55" fill={colors.neutral.white} fontSize="13" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
        {topLabel}
      </text>

      {/* 下极 */}
      <rect x="-30" y="48" width="55" height="24" fill={bottomColor} rx="4" stroke={colors.neutral[900]} strokeWidth="1" />
      <text x="-2.5" y="65" fill={colors.neutral.white} fontSize="13" fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
        {bottomLabel}
      </text>
    </g>
  )
}

export default Magnet
