import { useMemo, useId } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { interpolateY } from './interpolation'
import {
  CHART_COLORS,
  SERIES_MAP,
  STROKE,
  DASH,
} from '@/theme/physics'
import type { ChartSeriesVariant } from '@/theme/physics'

export interface CharacteristicCurveSeries {
  /** 曲线点集（物理坐标） */
  points: { x: number; y: number }[]
  /** 曲线标识标签 */
  label?: string
  /** 语义颜色变体 */
  series?: ChartSeriesVariant
  /** 自定义颜色 */
  color?: string
  /** 笔触宽度 */
  strokeWidth?: number
  /** 虚线模式 */
  strokeDasharray?: number[]
}

export interface CharacteristicThreshold {
  /** 动作阈值 Y 值（如临界电压、临界电阻） */
  y: number
  /** 标签文本 */
  label: string
  /** 颜色 */
  color?: string
  /** 虚线样式 */
  dasharray?: string
}

export interface CharacteristicCurveProps {
  /** 主曲线数据点 */
  points: { x: number; y: number }[]
  /** 标题 */
  title?: string
  /** 横轴物理量标签，例如 "光照强度 E / lx"、"温度 T / ℃" */
  xLabel?: string
  /** 纵轴物理量标签，例如 "电阻 R / Ω"、"霍尔电压 UH / mV" */
  yLabel?: string
  /** 标尺 X 域 [min, max]，不传则由 points 自动计算 */
  xDomain?: [number, number]
  /** 标尺 Y 域 [min, max]，不传则由 points 自动计算 */
  yDomain?: [number, number]
  /** 当前工作点 X 坐标（自动在主曲线上插值出 Y 并高亮显示工作点及投影虚线） */
  currentX?: number
  /** 附加对比曲线（如 NTC vs PTC、开灯 vs 关灯） */
  additionalSeries?: CharacteristicCurveSeries[]
  /** 动作门限阈值线（如继电器闭合门限） */
  thresholds?: CharacteristicThreshold[]
  /** 主曲线颜色 */
  series?: ChartSeriesVariant
  /** 容器额外样式类名 */
  className?: string
  /** 是否紧凑模式 */
  compact?: boolean
}

function CharacteristicCurveContent({
  points,
  currentX,
  additionalSeries = [],
  thresholds = [],
  series = 'primary',
  xDomain,
  yDomain,
}: {
  points: { x: number; y: number }[]
  currentX?: number
  additionalSeries?: CharacteristicCurveSeries[]
  thresholds?: CharacteristicThreshold[]
  series?: ChartSeriesVariant
  xDomain: [number, number]
  yDomain: [number, number]
}) {
  const ctx = useChartContext()
  const clipId = useId()

  const mainColor = SERIES_MAP[series] || CHART_COLORS.primary

  const currentY = useMemo(() => {
    if (currentX == null || points.length === 0) return null
    return interpolateY(points, currentX)
  }, [points, currentX])

  if (!ctx) return null
  const { toSvgX, toSvgY, plotOrigin, plotSize, font } = ctx

  const renderPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return ''
    return pts.reduce((acc, pt, idx) => {
      const sx = toSvgX(pt.x)
      const sy = toSvgY(pt.y)
      return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`
    }, '')
  }

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={plotOrigin.x}
            y={plotOrigin.y}
            width={plotSize.width}
            height={plotSize.height}
          />
        </clipPath>
      </defs>

      {/* 门限参考线 */}
      {thresholds.map((th, i) => {
        if (th.y < yDomain[0] || th.y > yDomain[1]) return null
        const sy = toSvgY(th.y)
        const lineCol = th.color || '#ef4444'
        return (
          <g key={i}>
            <line
              x1={plotOrigin.x}
              x2={plotOrigin.x + plotSize.width}
              y1={sy}
              y2={sy}
              stroke={lineCol}
              strokeWidth={STROKE.vectorSub}
              strokeDasharray={th.dasharray || DASH.reference.join(' ')}
              opacity={0.8}
            />
            <text
              x={plotOrigin.x + plotSize.width - 6}
              y={sy - 4}
              textAnchor="end"
              fontSize={font(11)}
              fill={lineCol}
              fontWeight={600}
            >
              {th.label}
            </text>
          </g>
        )
      })}

      {/* 曲线主体层（带裁剪） */}
      <g clipPath={`url(#${clipId})`}>
        {/* 附加对比曲线 */}
        {additionalSeries.map((s, idx) => {
          const col = s.color || (s.series ? SERIES_MAP[s.series] : '#64748b')
          return (
            <path
              key={idx}
              d={renderPath(s.points)}
              fill="none"
              stroke={col}
              strokeWidth={s.strokeWidth ?? STROKE.vectorMain}
              strokeDasharray={s.strokeDasharray?.join(' ')}
            />
          )
        })}

        {/* 主特性曲线 */}
        <path
          d={renderPath(points)}
          fill="none"
          stroke={mainColor}
          strokeWidth={2.5}
        />
      </g>

      {/* 当前动态工作点标线与高亮 */}
      {currentX != null && currentY != null && (
        (() => {
          const cx = toSvgX(currentX)
          const cy = toSvgY(currentY)
          const inBounds = currentX >= xDomain[0] && currentX <= xDomain[1]
          if (!inBounds) return null

          return (
            <g pointerEvents="none">
              {/* X/Y 轴垂直投影虚线 */}
              <line
                x1={cx}
                x2={cx}
                y1={toSvgY(yDomain[0])}
                y2={cy}
                stroke="#3b82f6"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                opacity={0.7}
              />
              <line
                x1={plotOrigin.x}
                x2={cx}
                y1={cy}
                y2={cy}
                stroke="#3b82f6"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                opacity={0.7}
              />

              {/* 工作点光晕 */}
              <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="#3b82f6"
                opacity={0.3}
              />
              <circle
                cx={cx}
                cy={cy}
                r={3.5}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={2}
              />

              {/* 实时采样数值气泡 */}
              <rect
                x={Math.min(cx + 8, plotOrigin.x + plotSize.width - 90)}
                y={Math.max(cy - 26, plotOrigin.y + 4)}
                width={86}
                height={22}
                rx={4}
                fill="#1e293b"
                opacity={0.88}
              />
              <text
                x={Math.min(cx + 8, plotOrigin.x + plotSize.width - 90) + 43}
                y={Math.max(cy - 26, plotOrigin.y + 4) + 15}
                textAnchor="middle"
                fontSize={font(11)}
                fill="#ffffff"
                fontFamily="sans-serif"
              >
                {`(${currentX.toFixed(1)}, ${currentY.toFixed(1)})`}
              </text>
            </g>
          )
        })()
      )}
    </g>
  )
}

export function CharacteristicCurve({
  points,
  title,
  xLabel = 'X',
  yLabel = 'Y',
  xDomain: xDomainProp,
  yDomain: yDomainProp,
  currentX,
  additionalSeries,
  thresholds,
  series = 'primary',
  className = 'w-full h-full flex flex-col',
}: CharacteristicCurveProps) {
  const xDomain = useMemo<[number, number]>(() => {
    if (xDomainProp) return xDomainProp
    if (points.length === 0) return [0, 10]
    const xs = points.map((p) => p.x)
    return [Math.min(...xs), Math.max(...xs)]
  }, [xDomainProp, points])

  const yDomain = useMemo<[number, number]>(() => {
    if (yDomainProp) return yDomainProp
    if (points.length === 0) return [0, 10]
    let allPoints = [...points]
    if (additionalSeries) {
      additionalSeries.forEach((s) => {
        allPoints = allPoints.concat(s.points)
      })
    }
    const ys = allPoints.map((p) => p.y)
    const minY = Math.min(0, ...ys)
    const maxY = Math.max(...ys) * 1.15 || 10
    return [minY, maxY]
  }, [yDomainProp, points, additionalSeries])

  return (
    <div className={className}>
      {title && (
        <div className="text-xs font-semibold text-slate-700 px-3 pt-1 shrink-0 flex items-center justify-between">
          <span>{title}</span>
        </div>
      )}
      <div className="flex-1 min-h-0 relative">
        <BasePhysicsChart
          xDomain={xDomain}
          yDomain={yDomain}
          xLabel={xLabel}
          yLabel={yLabel}
        >
          <CharacteristicCurveContent
            points={points}
            currentX={currentX}
            additionalSeries={additionalSeries}
            thresholds={thresholds}
            series={series}
            xDomain={xDomain}
            yDomain={yDomain}
          />
        </BasePhysicsChart>
      </div>
    </div>
  )
}
