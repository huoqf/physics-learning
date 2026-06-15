import React, { useMemo } from 'react'
import { colors } from '@/theme/colors'
import { PHYSICS_COLORS } from '@/theme/physics'

interface AmpereFIChartProps {
  x: number
  y: number
  w: number
  h: number
  I: number
  B: number
  L?: number
}

export const AmpereFIChart: React.FC<AmpereFIChartProps> = ({
  x,
  y,
  w,
  h,
  I,
  B,
  L = 4.0,
}) => {
  const padL = 25
  const padR = 15
  const padT = 20
  const padB = 20

  const chartW = w - padL - padR
  const chartH = h - padT - padB

  const cx = x + padL + chartW / 2
  const cy = y + padT + chartH / 2

  // 物理量范围
  const iMin = -10.0
  const iMax = 10.0
  // F 范围：2.0 T * 10.0 A * 4.0 m = 80 N。所以设为 [-80, 80]
  const fMax = 80.0

  // 坐标映射
  const toPixelX = (iVal: number) => {
    return cx + (iVal / iMax) * (chartW / 2)
  }

  const toPixelY = (fVal: number) => {
    // 物理上正力向上，SVG 坐标中向上是负，所以用减
    return cy - (fVal / fMax) * (chartH / 2)
  }

  // 核心斜率与方程线点
  const slopeK = B * L
  const lineX1 = toPixelX(iMin)
  const lineY1 = toPixelY(iMin * slopeK)
  const lineX2 = toPixelX(iMax)
  const lineY2 = toPixelY(iMax * slopeK)

  const currentF = -B * I * L // 物理安培力 (带方向)
  const dotX = toPixelX(I)
  const dotY = toPixelY(currentF)

  // 网格虚线 (3 条横线，3 条竖线，非 0 轴处)
  const gridLines = useMemo(() => {
    const lines: React.ReactElement[] = []
    const xVals = [-5, 5]
    const yVals = [-40, 40]

    xVals.forEach((xv) => {
      const px = toPixelX(xv)
      lines.push(
        <line
          key={`gx-${xv}`}
          x1={px}
          y1={y + padT}
          x2={px}
          y2={y + padT + chartH}
          stroke={colors.neutral[200]}
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      )
    })

    yVals.forEach((yv) => {
      const py = toPixelY(yv)
      lines.push(
        <line
          key={`gy-${yv}`}
          x1={x + padL}
          y1={py}
          x2={x + padL + chartW}
          y2={py}
          stroke={colors.neutral[200]}
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />
      )
    })

    return lines
  }, [x, y, w, h])

  return (
    <g>
      {/* 图像背景底板 */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={colors.neutral[50]}
        stroke={colors.neutral[200]}
        strokeWidth="1.2"
        rx="6"
      />

      {/* 标题 */}
      <text
        x={x + w / 2}
        y={y + 12}
        fontSize="7.5"
        fill={colors.neutral[700]}
        fontWeight="bold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        F - I 关系图像
      </text>

      {/* 网格线 */}
      {gridLines}

      {/* 坐标轴 (I轴) */}
      <line
        x1={x + padL - 5}
        y1={cy}
        x2={x + padL + chartW + 8}
        y2={cy}
        stroke={colors.neutral[500]}
        strokeWidth="1"
      />
      <polygon
        points={`${x + padL + chartW + 8},${cy - 2} ${x + padL + chartW + 13},${cy} ${x + padL + chartW + 8},${cy + 2}`}
        fill={colors.neutral[500]}
      />
      <text
        x={x + padL + chartW + 13}
        y={cy + 7}
        fontSize="6"
        fill={colors.neutral[600]}
        fontWeight="bold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        I (A)
      </text>

      {/* 坐标轴 (F轴) */}
      <line
        x1={cx}
        y1={y + padT + chartH + 5}
        x2={cx}
        y2={y + padT - 5}
        stroke={colors.neutral[500]}
        strokeWidth="1"
      />
      <polygon
        points={`${cx - 2},${y + padT - 5} ${cx},${y + padT - 10} ${cx + 2},${y + padT - 5}`}
        fill={colors.neutral[500]}
      />
      <text
        x={cx - 8}
        y={y + padT - 6}
        fontSize="6"
        fill={colors.neutral[600]}
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        F (N)
      </text>

      {/* 轴交点原点 0 */}
      <text
        x={cx - 5}
        y={cy + 7}
        fontSize="5"
        fill={colors.neutral[400]}
        style={{ userSelect: 'none' }}
      >
        0
      </text>

      {/* 刻度值标注 */}
      <text x={toPixelX(-10)} y={cy + 7} fontSize="5" fill={colors.neutral[400]} textAnchor="middle">-10</text>
      <text x={toPixelX(10)} y={cy + 7} fontSize="5" fill={colors.neutral[400]} textAnchor="middle">10</text>
      <text x={cx - 14} y={toPixelY(80) + 2} fontSize="5" fill={colors.neutral[400]} textAnchor="end">80</text>
      <text x={cx - 14} y={toPixelY(-80) + 2} fontSize="5" fill={colors.neutral[400]} textAnchor="end">-80</text>

      {/* 线性方程关系线 (F = BIL) */}
      <line
        x1={lineX1}
        y1={lineY1}
        x2={lineX2}
        y2={lineY2}
        stroke={PHYSICS_COLORS.forceNet}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 当前状态点 (红圈白心) */}
      <circle
        cx={dotX}
        cy={dotY}
        r="3"
        fill={colors.danger[500]}
        stroke={colors.neutral.white}
        strokeWidth="1"
      />

      {/* 斜率及方程显示 */}
      <g transform={`translate(${x + 10}, ${y + h - 12})`}>
        <text
          x="0"
          y="0"
          fontSize="5.5"
          fill={colors.neutral[500]}
          fontWeight="bold"
          style={{ userSelect: 'none' }}
        >
          斜率 k = BL = {slopeK.toFixed(1)} N/A
        </text>
        <text
          x="0"
          y="6"
          fontSize="5.5"
          fill={PHYSICS_COLORS.forceNet}
          fontWeight="extrabold"
          style={{ userSelect: 'none' }}
        >
          F = {currentF.toFixed(1)} N
        </text>
      </g>
    </g>
  )
}

export default AmpereFIChart
