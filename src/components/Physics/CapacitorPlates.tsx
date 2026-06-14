import React, { useId } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

interface CapacitorPlatesProps {
  /** 极板左侧 X 像素坐标 */
  x: number
  /** 两极板垂直中心 Y 像素坐标 */
  y: number
  /** 极板像素宽度 */
  width: number
  /** 极板像素间距 */
  gap: number
  /** 是否带电，用于决定电荷分布，>0表示上正下负，<0表示上负下正，0表示不带电 */
  chargeSign?: number
  /** 是否开启电场指示（如果为 false 则不绘制电荷符号） */
  showField?: boolean
  /** 极板厚度，默认 10 像素 */
  thickness?: number
}

/**
 * 平行金属板电容器组件。
 * 
 * 绘制高质感的上下金属极板，并支持在带电时动态分布正负电荷标记。
 */
export const CapacitorPlates: React.FC<CapacitorPlatesProps> = ({
  x,
  y,
  width,
  gap,
  chargeSign = 0,
  showField = true,
  thickness = 10,
}) => {
  const gradId = useId()
  const halfGap = gap / 2
  const topY = y - halfGap - thickness
  const bottomY = y + halfGap

  // 均匀分布电荷的个数
  const chargeCount = 10
  const chargeSpacing = width / (chargeCount + 1)

  return (
    <g className="select-none">
      <defs>
        {/* 金属拉丝渐变效果 */}
        <linearGradient id={`metal-plate-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.neutral[500]} />
          <stop offset="30%" stopColor={colors.neutral[300]} />
          <stop offset="50%" stopColor={colors.neutral[100]} />
          <stop offset="70%" stopColor={colors.neutral[300]} />
          <stop offset="100%" stopColor={colors.neutral[600]} />
        </linearGradient>
      </defs>

      {/* 上极板 */}
      <rect
        x={x}
        y={topY}
        width={width}
        height={thickness}
        rx={3}
        fill={`url(#metal-plate-${gradId})`}
        stroke={colors.neutral[600]}
        strokeWidth={1.5}
      />

      {/* 下极板 */}
      <rect
        x={x}
        y={bottomY}
        width={width}
        height={thickness}
        rx={3}
        fill={`url(#metal-plate-${gradId})`}
        stroke={colors.neutral[600]}
        strokeWidth={1.5}
      />

      {/* 电荷分布标记 */}
      {showField && chargeSign !== 0 && (
        <g>
          {Array.from({ length: chargeCount }).map((_, i) => {
            const chargeX = x + (i + 1) * chargeSpacing
            const isTopPositive = chargeSign > 0

            return (
              <g key={`charge-${i}`}>
                {/* 上极板电荷 */}
                <text
                  x={chargeX}
                  y={topY + thickness + 12}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={isTopPositive ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
                >
                  {isTopPositive ? '+' : '−'}
                </text>
                {/* 下极板电荷 */}
                <text
                  x={chargeX}
                  y={bottomY - 4}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={isTopPositive ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
                >
                  {isTopPositive ? '−' : '+'}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
}
