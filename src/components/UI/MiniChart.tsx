/**
 * MiniChart — 迷你时序图表共享组件
 *
 * 支持：多曲线、静态参考线、当前时刻标记、图例、响应式尺寸
 * 基于 BasePhysicsChart 实现，颜色统一使用 theme token
 */
import { useEffect, useMemo } from 'react'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { CHART_COLORS, FONT } from '@/theme/physics'

/** 曲线定义 */
export interface MiniChartLine {
  key: string
  color: string
  strokeWidth?: number
  strokeDasharray?: string
  name: string
  showValueInLegend?: boolean
  /**
   * 图例数值的小数位数，默认 1。
   * 量级很小的量（如 Φ ≈ 0.02 Wb）固定 1 位会全被显示成 0.0，
   * 必须由调用方按物理量级指定。
   */
  valueDigits?: number
}

/** 静态参考水平线 */
export interface MiniChartStaticLine {
  value: number
  color: string
  strokeDasharray?: string
  name: string
  showValueInLegend?: boolean
  /** 图例数值的小数位数，默认 1 */
  valueDigits?: number
}

export interface MiniChartProps {
  title: string
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  points: Record<string, number>[]
  lines: MiniChartLine[]
  xKey?: string
  yLabel: string
  xLabel: string
  currentVals: Record<string, number>
  currentXVal: number
  staticLines?: MiniChartStaticLine[]
  /**
   * 阴影面积：把某条曲线在 `[xMin, 游标]` 区间与 y = 0 之间填充。
   * 用于「图线下的面积有物理意义」的场景（i–t 图下面积 = ΔQ）。
   */
  shadedArea?: { key: string; color: string; opacity?: number }
  minWidth?: number
  minHeight?: number
  className?: string
}

function MiniChartContent({
  points,
  lines,
  xKey,
  xMin,
  xMax,
  currentVals,
  currentXVal,
  staticLines,
  shadedArea,
}: {
  points: Record<string, number>[]
  lines: MiniChartLine[]
  xKey: string
  xMin: number
  xMax: number
  currentVals: Record<string, number>
  currentXVal: number
  staticLines: MiniChartStaticLine[]
  shadedArea?: { key: string; color: string; opacity?: number }
}) {
  const ctx = useChartContext()

  const clampedCurrentX = Math.max(xMin, Math.min(xMax, currentXVal))

  const visiblePoints = useMemo(() => {
    if (xKey === 't') {
      return points.filter((p) => p.t >= xMin - 1e-9 && p.t <= clampedCurrentX + 1e-9)
    }
    return points
  }, [points, xKey, xMin, clampedCurrentX])

  if (!ctx) return null
  const { toSvgX, toSvgY, plotOrigin, plotSize, font } = ctx

  const cursorX = toSvgX(clampedCurrentX)

  return (
    <g>
      {/* 静态参考水平线 */}
      {staticLines.map((sLine, idx) => (
        <line
          key={`sline-${idx}`}
          x1={plotOrigin.x}
          y1={toSvgY(sLine.value)}
          x2={plotOrigin.x + plotSize.width}
          y2={toSvgY(sLine.value)}
          stroke={sLine.color}
          strokeWidth={1}
          strokeDasharray={sLine.strokeDasharray}
        />
      ))}

      {/* 阴影面积（图线下的积分量，如 i–t 图下面积 = ΔQ） */}
      {shadedArea && visiblePoints.length >= 2 && (() => {
        const baseY = Math.max(plotOrigin.y, Math.min(plotOrigin.y + plotSize.height, toSvgY(0)))
        const pts = visiblePoints
          .map((p) => `${toSvgX(p[xKey])},${toSvgY(p[shadedArea.key])}`)
          .join(' L ')
        const d = `M ${toSvgX(visiblePoints[0][xKey])},${baseY} L ${pts} L ${toSvgX(
          visiblePoints[visiblePoints.length - 1][xKey],
        )},${baseY} Z`
        return <path d={d} fill={shadedArea.color} opacity={shadedArea.opacity ?? 0.18} stroke="none" />
      })()}

      {/* 绘制轨迹曲线 */}
      {visiblePoints.length >= 2 &&
        lines.map((line) => {
          const pathD = visiblePoints
            .map((p, idx) => {
              const x = toSvgX(p[xKey])
              const y = toSvgY(p[line.key])
              return `${idx === 0 ? 'M' : 'L'} ${x},${y}`
            })
            .join(' ')

          return (
            <path
              key={line.key}
              d={pathD}
              fill="none"
              stroke={line.color}
              strokeWidth={line.strokeWidth ?? 1.5}
              strokeDasharray={line.strokeDasharray}
            />
          )
        })}

      {/* 游标焦点 */}
      <g>
        <line
          x1={cursorX} y1={plotOrigin.y}
          x2={cursorX} y2={plotOrigin.y + plotSize.height}
          stroke={CHART_COLORS.reference}
          strokeWidth={0.8}
          strokeDasharray="3,3"
          opacity={0.5}
        />
        {lines.map((line) => {
          const currentVal = currentVals[line.key] ?? 0
          const py = toSvgY(currentVal)
          return (
            <g key={`point-${line.key}`}>
              <circle cx={cursorX} cy={py} r={3.5} fill={line.color} opacity={0.3} />
              <circle cx={cursorX} cy={py} r={2} fill={line.color} stroke={CHART_COLORS.highlight} strokeWidth={0.8} />
            </g>
          )
        })}
      </g>

      {/* 图例 */}
      <g transform={`translate(${plotOrigin.x + font(12)}, ${plotOrigin.y + font(4)})`}>
        {lines.map((line, idx) => {
          const currentVal = currentVals[line.key] ?? 0
          const showVal = line.showValueInLegend ?? true
          return (
            <g key={`legend-${line.key}`} transform={`translate(0, ${idx * font(11)})`}>
              <line x1={0} y1={-3} x2={10} y2={-3} stroke={line.color} strokeWidth={1.5} strokeDasharray={line.strokeDasharray} />
              <text x={14} y={1} fontSize={font(FONT.small)} fill={CHART_COLORS.tickLabel} fontWeight="600" className="select-none">
                {line.name}{showVal ? `: ${currentVal.toFixed(line.valueDigits ?? 1)}` : ''}
              </text>
            </g>
          )
        })}
        {staticLines.map((sLine, idx) => {
          const showVal = sLine.showValueInLegend ?? true
          return (
            <g key={`legend-s-${idx}`} transform={`translate(0, ${(lines.length + idx) * font(11)})`}>
              <line x1={0} y1={-3} x2={10} y2={-3} stroke={sLine.color} strokeWidth={1.2} strokeDasharray={sLine.strokeDasharray} />
              <text x={14} y={1} fontSize={font(FONT.small)} fill={CHART_COLORS.tickLabel} fontWeight="600" className="select-none">
                {sLine.name}{showVal ? `: ${sLine.value.toFixed(sLine.valueDigits ?? 1)}` : ''}
              </text>
            </g>
          )
        })}
      </g>
    </g>
  )
}

export function MiniChart({
  title,
  xMin,
  xMax,
  yMin,
  yMax,
  points,
  lines,
  xKey = 't',
  yLabel,
  xLabel,
  currentVals,
  currentXVal,
  staticLines = [],
  shadedArea,
  minWidth = 300,
  minHeight = 130,
  className = '',
}: MiniChartProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && (currentXVal < xMin || currentXVal > xMax)) {
      console.warn(
        `MiniChart: currentXVal (${currentXVal}) is outside xDomain [${xMin}, ${xMax}]. ` +
        'Cursor is clamped to the chart domain.'
      )
    }
  }, [currentXVal, xMin, xMax])

  return (
    <BasePhysicsChart
      xDomain={[xMin, xMax]}
      yDomain={[yMin, yMax]}
      xLabel={xLabel}
      yLabel={yLabel}
      title={title}
      variant="mini"
      initialSize={{ width: minWidth, height: minHeight }}
      className={className}
    >
      <MiniChartContent
        points={points}
        lines={lines}
        xKey={xKey}
        xMin={xMin}
        xMax={xMax}
        currentVals={currentVals}
        currentXVal={currentXVal}
        staticLines={staticLines}
        shadedArea={shadedArea}
      />
    </BasePhysicsChart>
  )
}

