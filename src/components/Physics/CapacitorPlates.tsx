import React, { useId } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { ChargeSign } from './types'

interface CapacitorPlatesProps {
  /** 极板左侧 X 像素坐标 */
  x: number
  /** 两极板垂直中心 Y 像素坐标 */
  y: number
  /** 极板像素宽度 */
  width: number
  /** 极板像素间距 */
  gap: number
  /**
   * 是否带电。
   * - 支持新版 ChargeSign ('+' | '-' | 'none')
   * - 兼容旧版 number: >0表示上正下负，<0表示上负下正，0表示不带电
   */
  chargeSign?: ChargeSign | number
  /** 是否开启电荷符号绘制（若为 false 则不绘制电荷符号，默认 true） */
  showField?: boolean
  /** 极板厚度，默认 10 像素 */
  thickness?: number
  /** 电量密度（单侧极板电荷符号数量），限制在 [2, 15] 之间，默认 10 */
  chargeDensity?: number
  /** 是否绘制极板间的匀强电场线，默认 false */
  showElectricFieldLines?: boolean
}

/**
 * 平行金属板电容器组件。
 * 
 * 绘制高质感的上下金属极板，并支持在带电时动态分布正负电荷标记与电场线。
 */
export const CapacitorPlates: React.FC<CapacitorPlatesProps> = ({
  x,
  y,
  width,
  gap,
  chargeSign = 'none' as ChargeSign,
  showField = true,
  thickness = 10,
  chargeDensity = 10,
  showElectricFieldLines = false,
}) => {
  const gradId = useId()
  const halfGap = gap / 2
  const topY = y - halfGap - thickness
  const bottomY = y + halfGap

  // 解析电性
  let sign: ChargeSign = 'none'
  if (typeof chargeSign === 'number') {
    if (chargeSign > 0) sign = '+'
    else if (chargeSign < 0) sign = '-'
  } else {
    sign = chargeSign
  }

  const isTopPositive = sign === '+'
  const isCharged = sign !== 'none'

  // 单侧极板电荷符号数量 clamp 在 [2, 15] 之间
  const density = Math.max(2, Math.min(15, chargeDensity))
  const chargeSpacing = width / (density + 1)

  // 匀强电场线数量
  const fieldLineCount = 5
  const fieldLineSpacing = width / (fieldLineCount + 1)

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

        {/* 电场线箭头 */}
        {isCharged && (
          <marker
            id={`electric-field-arrow-${gradId}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={PHYSICS_COLORS.electricField} />
          </marker>
        )}
      </defs>

      {/* 极板间匀强电场线 */}
      {showElectricFieldLines && isCharged && (
        <g>
          {Array.from({ length: fieldLineCount }).map((_, i) => {
            const flX = x + (i + 1) * fieldLineSpacing
            // 电场方向：从正极板指向负极板
            const yStart = isTopPositive ? topY + thickness + 2 : bottomY - 2
            const yEnd = isTopPositive ? bottomY - 2 : topY + thickness + 2
            return (
              <line
                key={`field-line-${i}`}
                x1={flX}
                y1={yStart}
                x2={flX}
                y2={yEnd}
                stroke={PHYSICS_COLORS.electricFieldLine}
                strokeWidth={1.5}
                markerEnd={`url(#electric-field-arrow-${gradId})`}
              />
            )
          })}
        </g>
      )}

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
      {showField && isCharged && (
        <g>
          {Array.from({ length: density }).map((_, i) => {
            const chargeX = x + (i + 1) * chargeSpacing

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
