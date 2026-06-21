/**
 * MiniChart — 迷你时序图表共享组件
 *
 * 支持：多曲线、静态参考线、当前时刻标记、图例、响应式尺寸
 * 基于 BasePhysicsChart 实现，颜色统一使用 theme token
 */
import { useMemo } from 'react'
import { BasePhysicsChart, useChartContext } from '@/components/Chart'
import { CHART_COLORS, FONT } from '@/theme/physics'

/** 曲线定义 */
export interface MiniChartLine {
  key: string
  color: string
  strokeWidth?: number
  strokeDasharray?: string
  name: string
}

/** 静态参考水平线 */
export interface MiniChartStaticLine {
  value: number
  color: string
  strokeDasharray?: string
  name: string
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
  minWidth?: number
  minHeight?: number
  className?: string
}

function MiniChartContent({
  points,
  lines,
  xKey,
  currentVals,
  currentXVal,
  staticLines,
}: {
  points: Record<string, number>[]
  lines: MiniChartLine[]
  xKey: string
  currentVals: Record<string, number>
  currentXVal: number
  staticLines: MiniChartStaticLine[]
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, plotOrigin, plotSize, font } = ctx

  const visiblePoints = useMemo(() => {
    if (xKey === 't') {
      return points.filter((p) => p.t <= currentXVal + 1e-9)
    }
    return points
  }, [points, xKey, currentXVal])

  const cursorX = toSvgX(Math.min(currentXVal, Infinity))

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
          return (
            <g key={`legend-${line.key}`} transform={`translate(0, ${idx * font(11)})`}>
              <line x1={0} y1={-3} x2={10} y2={-3} stroke={line.color} strokeWidth={1.5} strokeDasharray={line.strokeDasharray} />
              <text x={14} y={1} fontSize={font(FONT.small)} fill={CHART_COLORS.tickLabel} fontWeight="600" className="select-none">
                {line.name}: {currentVal.toFixed(1)}
              </text>
            </g>
          )
        })}
        {staticLines.map((sLine, idx) => (
          <g key={`legend-s-${idx}`} transform={`translate(0, ${(lines.length + idx) * font(11)})`}>
            <line x1={0} y1={-3} x2={10} y2={-3} stroke={sLine.color} strokeWidth={1.2} strokeDasharray={sLine.strokeDasharray} />
            <text x={14} y={1} fontSize={font(FONT.small)} fill={CHART_COLORS.tickLabel} fontWeight="600" className="select-none">
              {sLine.name}: {sLine.value.toFixed(1)}
            </text>
          </g>
        ))}
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
  minWidth = 300,
  minHeight = 130,
  className = '',
}: MiniChartProps) {
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
        currentVals={currentVals}
        currentXVal={currentXVal}
        staticLines={staticLines}
      />
    </BasePhysicsChart>
  )
}

export default MiniChart
