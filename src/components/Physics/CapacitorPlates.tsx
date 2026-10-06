import React from 'react'
import { useUniqueSvgId } from '@/hooks'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { ChargeSign } from './types'

interface CapacitorPlatesProps {
  /** 极板中心/起始 X 像素坐标（horizontal 模式下为极板左端 X；vertical 模式下为两极板水平中心 X） */
  x: number
  /** 两极板中心 Y 像素坐标 */
  y: number
  /** 极板长度（horizontal 模式下为极板宽度；vertical 模式下为极板竖直高度，默认 80） */
  width?: number
  /** vertical 模式下极板竖直高度（若未传则使用 width 或默认 80） */
  height?: number
  /** 极板像素间距（horizontal 模式为垂直间距；vertical 模式为水平间距） */
  gap: number
  /** 极板排列朝向：'horizontal'（默认水平两板）| 'vertical'（垂直两板，符合教材 LC 振荡回路标准） */
  orientation?: 'horizontal' | 'vertical'
  /**
   * 是否带电。
   * - 支持新版 ChargeSign ('+' | '-' | 'none')
   * - 兼容旧版 number: >0表示正极在上/左，<0表示正极在下/右，0表示不带电
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
 * 绘制高质感的金属极板，支持水平放置（上/下极板）与垂直放置（左/右极板），
 * 并动态分布正负电荷标记与匀强电场线箭头。
 */
export const CapacitorPlates: React.FC<CapacitorPlatesProps> = ({
  x,
  y,
  width = 120,
  height,
  gap,
  orientation = 'horizontal',
  chargeSign = 'none' as ChargeSign,
  showField = true,
  thickness = 10,
  chargeDensity = 10,
  showElectricFieldLines = false,
}) => {
  const gradId = useUniqueSvgId()
  const halfGap = gap / 2

  // 解析电性
  let sign: ChargeSign = 'none'
  if (typeof chargeSign === 'number') {
    if (chargeSign > 0) sign = '+'
    else if (chargeSign < 0) sign = '-'
  } else {
    sign = chargeSign
  }

  const isPositiveFirst = sign === '+'
  const isCharged = sign !== 'none'

  // 单侧极板电荷符号数量：水平模式上限 15，垂直模式根据板高动态收敛以保证行距 > 字号
  const isVertical = orientation === 'vertical'
  const plateDimension = isVertical ? (height ?? width) : width
  const maxSafeDensity = Math.max(2, Math.min(15, Math.floor(plateDimension / 16)))
  const density = Math.max(2, Math.min(maxSafeDensity, chargeDensity))
  const fieldLineCount = 5

  if (orientation === 'vertical') {
    // ─── 垂直两板（左极板 A、右极板 B），符合人教版教材 LC 回路标准画法 ───
    const plateH = height ?? width
    const leftPlateRightX = x - halfGap
    const leftPlateLeftX = leftPlateRightX - thickness
    const rightPlateLeftX = x + halfGap
    const plateTopY = y - plateH / 2
    const chargeSpacing = plateH / (density + 1)
    const fieldLineSpacing = plateH / (fieldLineCount + 1)
    // 电荷符号距离极板内表面的安全横向偏移（在窄板距下自适应收缩）
    const safeChargeXOffset = Math.max(4, Math.min(8, halfGap * 0.35))
    const chargeFontSize = plateH < 80 || halfGap < 18 ? 10 : 12

    return (
      <g className="select-none">
        <defs>
          {/* 金属拉丝渐变（水平向右渐变） */}
          <linearGradient id={`metal-plate-v-${gradId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.neutral[500]} />
            <stop offset="30%" stopColor={colors.neutral[300]} />
            <stop offset="50%" stopColor={colors.neutral[100]} />
            <stop offset="70%" stopColor={colors.neutral[300]} />
            <stop offset="100%" stopColor={colors.neutral[600]} />
          </linearGradient>

          {/* 电场线箭头 */}
          {isCharged && (
            <marker
              id={`electric-field-arrow-v-${gradId}`}
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

        {/* 极板间水平匀强电场线 */}
        {showElectricFieldLines && isCharged && (
          <g>
            {Array.from({ length: fieldLineCount }).map((_, i) => {
              const flY = plateTopY + (i + 1) * fieldLineSpacing
              // 电场方向：从正极板指向负极板
              const xStart = isPositiveFirst ? leftPlateRightX + 2 : rightPlateLeftX - 2
              const xEnd = isPositiveFirst ? rightPlateLeftX - 2 : leftPlateRightX + 2
              return (
                <line
                  key={`field-line-v-${i}`}
                  x1={xStart}
                  y1={flY}
                  x2={xEnd}
                  y2={flY}
                  stroke={PHYSICS_COLORS.electricFieldLine}
                  strokeWidth={1.5}
                  markerEnd={`url(#electric-field-arrow-v-${gradId})`}
                />
              )
            })}
          </g>
        )}

        {/* 左极板 (A) */}
        <rect
          x={leftPlateLeftX}
          y={plateTopY}
          width={thickness}
          height={plateH}
          rx={3}
          fill={`url(#metal-plate-v-${gradId})`}
          stroke={colors.neutral[600]}
          strokeWidth={1.5}
        />

        {/* 右极板 (B) */}
        <rect
          x={rightPlateLeftX}
          y={plateTopY}
          width={thickness}
          height={plateH}
          rx={3}
          fill={`url(#metal-plate-v-${gradId})`}
          stroke={colors.neutral[600]}
          strokeWidth={1.5}
        />

        {/* 电荷分布标记（贴于极板内表面） */}
        {showField && isCharged && (
          <g>
            {Array.from({ length: density }).map((_, i) => {
              const chargeY = plateTopY + (i + 1) * chargeSpacing

              return (
                <g key={`charge-v-${i}`}>
                  {/* 左极板电荷 */}
                  <text
                    x={leftPlateRightX + safeChargeXOffset}
                    y={chargeY + 4}
                    fontSize={chargeFontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    fill={isPositiveFirst ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge}
                  >
                    {isPositiveFirst ? '+' : '−'}
                  </text>
                  {/* 右极板电荷 */}
                  <text
                    x={rightPlateLeftX - safeChargeXOffset}
                    y={chargeY + 4}
                    fontSize={chargeFontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    fill={isPositiveFirst ? PHYSICS_COLORS.negativeCharge : PHYSICS_COLORS.positiveCharge}
                  >
                    {isPositiveFirst ? '−' : '+'}
                  </text>
                </g>
              )
            })}
          </g>
        )}
      </g>
    )
  }

  // ─── 水平两板（默认模式）───
  const topY = y - halfGap - thickness
  const bottomY = y + halfGap
  const isTopPositive = isPositiveFirst
  const chargeSpacing = width / (density + 1)
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
