/**
 * MiniChart — 迷你时序图表共享组件
 *
 * 支持：多曲线、静态参考线、当前时刻标记、图例、响应式尺寸
 * 颜色统一使用 PHYSICS_COLORS 和 theme/colors
 */
import { useMemo } from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useCanvasSize } from '@/utils'

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
  /** 图表标题 */
  title: string
  /** X 轴最小值 */
  xMin: number
  /** X 轴最大值 */
  xMax: number
  /** Y 轴最小值 */
  yMin: number
  /** Y 轴最大值 */
  yMax: number
  /** 数据点数组，每个点为 Record<string, number>，必须包含 xKey 对应的字段 */
  points: Record<string, number>[]
  /** 曲线定义列表 */
  lines: MiniChartLine[]
  /** X 轴数据字段名，默认 't' */
  xKey?: string
  /** Y 轴标签 */
  yLabel: string
  /** X 轴标签 */
  xLabel: string
  /** 当前时刻各曲线的值（用于焦点和图例） */
  currentVals: Record<string, number>
  /** 当前 X 轴位置值（如当前时间） */
  currentXVal: number
  /** 静态参考水平线 */
  staticLines?: MiniChartStaticLine[]
  /** 容器最小宽度 */
  minWidth?: number
  /** 容器最小高度 */
  minHeight?: number
  /** 额外 className */
  className?: string
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
  const [containerRef, size] = useCanvasSize({ width: minWidth, height: minHeight })
  const { width, height } = size

  const margin = { left: 48, right: 20, top: 22, bottom: 22 }
  const plotW = Math.max(10, width - margin.left - margin.right)
  const plotH = Math.max(10, height - margin.top - margin.bottom)

  const toSvgX = (xVal: number) => {
    const range = xMax - xMin || 1
    return margin.left + ((xVal - xMin) / range) * plotW
  }
  const toSvgY = (yVal: number) => {
    const range = yMax - yMin || 1
    return margin.top + plotH - ((yVal - yMin) / range) * plotH
  }

  // 过滤可见数据点
  const visiblePoints = useMemo(() => {
    if (xKey === 't') {
      return points.filter((p) => p.t <= currentXVal + 1e-9)
    }
    return points // 非时间自变量时绘制完整曲线
  }, [points, xKey, currentXVal])

  const px = toSvgX(Math.min(currentXVal, xMax))

  const fs = 11 // 标题字号
  const sfs = 9 // 轴标签/数据字号

  return (
    <div ref={containerRef} className={`w-full h-full min-h-0 ${className}`}>
      <svg width={width} height={height} className="w-full h-full select-none">
        {/* 标题 */}
        <text x={margin.left} y={margin.top - 7} fontSize={fs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {title}
        </text>

        {/* 坐标轴网格线 */}
        {Array.from({ length: 5 }).map((_, idx) => {
          const gridY = margin.top + (plotH * idx) / 4
          return (
            <line
              key={`grid-y-${idx}`}
              x1={margin.left} y1={gridY} x2={margin.left + plotW} y2={gridY}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.5}
              opacity={0.3}
            />
          )
        })}
        {Array.from({ length: 6 }).map((_, idx) => {
          const gridX = margin.left + (plotW * idx) / 5
          return (
            <line
              key={`grid-x-${idx}`}
              x1={gridX} y1={margin.top} x2={gridX} y2={margin.top + plotH}
              stroke={PHYSICS_COLORS.grid}
              strokeWidth={0.5}
              opacity={0.3}
            />
          )
        })}

        {/* 坐标轴线 */}
        <line x1={margin.left} y1={margin.top + plotH} x2={margin.left + plotW} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />
        <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke={PHYSICS_COLORS.labelText} strokeWidth={1} />

        {/* 零刻度虚线 */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={margin.left}
            y1={toSvgY(0)}
            x2={margin.left + plotW}
            y2={toSvgY(0)}
            stroke={PHYSICS_COLORS.labelText}
            strokeWidth={0.8}
            strokeDasharray="2,2"
            opacity={0.4}
          />
        )}

        {/* 静态参考水平线 */}
        {staticLines.map((sLine, idx) => (
          <g key={`sline-${idx}`}>
            <line
              x1={margin.left}
              y1={toSvgY(sLine.value)}
              x2={margin.left + plotW}
              y2={toSvgY(sLine.value)}
              stroke={sLine.color}
              strokeWidth={1}
              strokeDasharray={sLine.strokeDasharray}
            />
          </g>
        ))}

        {/* X 轴刻度 */}
        {Array.from({ length: 6 }, (_, i) => {
          const val = xMin + ((xMax - xMin) * i) / 5
          const x = toSvgX(val)
          return (
            <g key={`xval-${i}`}>
              <line x1={x} y1={margin.top + plotH} x2={x} y2={margin.top + plotH + 3} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.8} />
              <text x={x} y={margin.top + plotH + sfs + 3} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontFamily="monospace">
                {val.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[yMin, (yMin + yMax) / 2, yMax].map((val, idx) => {
          const y = toSvgY(val)
          return (
            <g key={`yval-${idx}`}>
              <line x1={margin.left - 3} y1={y} x2={margin.left} y2={y} stroke={PHYSICS_COLORS.labelText} strokeWidth={0.8} />
              <text x={margin.left - 5} y={y + sfs * 0.35} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} textAnchor="end" fontFamily="monospace">
                {val.toFixed(1)}
              </text>
            </g>
          )
        })}

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

        {/* 时间/物理量游标焦点 */}
        <g>
          <line
            x1={px}
            y1={margin.top}
            x2={px}
            y2={margin.top + plotH}
            stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={0.8}
            strokeDasharray="3,3"
            opacity={0.5}
          />
          {lines.map((line) => {
            const currentVal = currentVals[line.key] ?? 0
            const py = toSvgY(currentVal)
            return (
              <g key={`point-${line.key}`}>
                <circle cx={px} cy={py} r={3.5} fill={line.color} opacity={0.3} />
                <circle cx={px} cy={py} r={2} fill={line.color} stroke={colors.neutral.white} strokeWidth={0.8} />
              </g>
            )
          })}
        </g>

        {/* 坐标轴标签 */}
        <text x={margin.left + plotW - 10} y={margin.top + plotH + sfs + 3} fontSize={sfs} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {xLabel}
        </text>
        <text x={margin.left - 4} y={margin.top - 6} fontSize={sfs} fill={PHYSICS_COLORS.labelText} textAnchor="end" fontWeight="bold">
          {yLabel}
        </text>

        {/* 图例 */}
        <g transform={`translate(${margin.left + 15}, ${margin.top + 5})`}>
          {lines.map((line, idx) => {
            const currentVal = currentVals[line.key] ?? 0
            return (
              <g key={`legend-${line.key}`} transform={`translate(0, ${idx * 13})`}>
                <line x1={0} y1={-3} x2={10} y2={-3} stroke={line.color} strokeWidth={1.5} strokeDasharray={line.strokeDasharray} />
                <text x={14} y={1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} className="font-semibold select-none">
                  {line.name}: {currentVal.toFixed(1)}
                </text>
              </g>
            )
          })}
          {staticLines.map((sLine, idx) => {
            return (
              <g key={`legend-s-${idx}`} transform={`translate(0, ${(lines.length + idx) * 13})`}>
                <line x1={0} y1={-3} x2={10} y2={-3} stroke={sLine.color} strokeWidth={1.2} strokeDasharray={sLine.strokeDasharray} />
                <text x={14} y={1} fontSize={sfs} fill={PHYSICS_COLORS.labelTextLight} className="font-semibold select-none">
                  {sLine.name}: {sLine.value.toFixed(1)}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}

export default MiniChart
