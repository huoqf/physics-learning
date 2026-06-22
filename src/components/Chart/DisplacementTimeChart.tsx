import { useMemo, type ReactNode } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

/** 静态模式：points 既是绘制数据也是定标数据 */
interface StaticDTChartProps {
  mode?: 'static'
  /** 主数据点序列（物理坐标）—— 用于绘制 */
  points: { t: number; x: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标）。静态模式可选，不传回退到 points */
  domainPoints?: { t: number; x: number }[]
}

/** 动画模式：points 截断绘制，domainPoints 必传定标 */
interface AnimatedDTChartProps {
  mode: 'animated'
  /** 主数据点序列（物理坐标）—— 用于绘制，可按 currentTime 截断 */
  points: { t: number; x: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标）—— 必传完整轨迹，防止 Y 轴抖动 */
  domainPoints: { t: number; x: number }[]
}

type DisplacementTimeChartProps = (StaticDTChartProps | AnimatedDTChartProps) & {
  currentTime: number
  /** 时间范围（兼容旧 API；未传 tDomain 时使用 [0, tMax]） */
  tMax: number
  /** 可选时间窗口，用于滑动窗口图表 */
  tDomain?: [number, number]
  /** 位移范围（不传则基于 domainPoints / points 自动计算） */
  xRange?: [number, number]
  title?: string
  /** X 轴标签，默认 t (s) */
  xLabel?: string
  /** Y 轴标签，默认 x (m) */
  yLabel?: string
  showArea?: boolean
  areaRange?: [number, number]
  areaVariant?: ChartAreaVariant
  areaIntensity?: ChartAreaIntensity
  showCursor?: boolean
  series?: ChartSeriesVariant
  /** 绘制在曲线下方的插件层 */
  underlay?: ReactNode
  /** 绘制在曲线上方的插件层 */
  children?: ReactNode
  className?: string
}

function STContent({
  points,
  currentTime,
  showArea,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor,
  series,
  tDomain,
  underlay,
  children,
}: Omit<DisplacementTimeChartProps, 'tMax' | 'xRange' | 'title' | 'className' | 'domainPoints' | 'mode'>) {
  const ctx = useChartContext()

  const visiblePoints = useMemo(() => {
    const [tMin, tMax] = tDomain ?? [0, Infinity]
    return points.filter((p) => p.t >= tMin - 1e-9 && p.t <= Math.min(currentTime, tMax) + 1e-9)
  }, [points, currentTime, tDomain])

  const curvePath = useMemo(() => {
    if (!ctx || visiblePoints.length < 2) return ''
    const { toSvgX, toSvgY } = ctx
    return (
      'M ' +
      visiblePoints
        .map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(p.x).toFixed(2)}`)
        .join(' L ')
    )
  }, [ctx, visiblePoints])

  const curveColor = PHYSICS_COLORS[series === 'secondary' ? 'angularVelocity' : 'displacement']

  if (!ctx) return null

  return (
    <g>
      {underlay}

      {showArea && visiblePoints.length >= 2 && (
        <ChartArea
          points={visiblePoints.map((p) => ({ x: p.t, y: p.x }))}
          xRange={areaRange ?? [0, currentTime]}
          baseline={0}
          variant={areaVariant ?? 'warm'}
          intensity={areaIntensity ?? 'subtle'}
        />
      )}

      {curvePath && (
        <path
          d={curvePath}
          fill="none"
          stroke={curveColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {children}

      {showCursor && visiblePoints.length > 0 && (
        <ChartCursor
          x={currentTime}
          dataPoints={[{ y: visiblePoints[visiblePoints.length - 1].x, label: 'x', series: series ?? 'primary' }]}
          formatValue={(v) => `${v.toFixed(1)} m`}
        />
      )}
    </g>
  )
}

export function DisplacementTimeChart({
  points,
  domainPoints,
  currentTime,
  tMax,
  tDomain,
  xRange,
  title = 'x-t 图像',
  xLabel = 't (s)',
  yLabel = 'x (m)',
  showArea = false,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor = true,
  series = 'primary',
  underlay,
  children,
  className = '',
  mode = 'static',
}: DisplacementTimeChartProps) {
  if (process.env.NODE_ENV !== 'production' && mode === 'animated' && !domainPoints) {
    console.warn(
      'DisplacementTimeChart: animated mode requires domainPoints to keep axis domain stable.'
    )
  }

  const computedXRange = useMemo((): [number, number] => {
    if (xRange) return xRange
    // 优先使用 domainPoints 定标，回退到 points
    const rangeSource = domainPoints ?? points
    if (rangeSource.length === 0) return [-5, 5]
    const vals = rangeSource.map((p) => p.x)
    const lo = Math.min(0, ...vals)
    const hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, domainPoints, xRange])

  return (
    <BasePhysicsChart
      xDomain={tDomain ?? [0, tMax]}
      yDomain={computedXRange}
      xLabel={xLabel}
      yLabel={yLabel}
      title={title}
      yBaseline={computedXRange[0] < 0 ? 0 : undefined}
      className={className}
    >
      <STContent
        points={points}
        currentTime={currentTime}
        showArea={showArea}
        areaRange={areaRange}
        areaVariant={areaVariant}
        areaIntensity={areaIntensity}
        showCursor={showCursor}
        series={series}
        tDomain={tDomain}
        underlay={underlay}
        children={children}
      />
    </BasePhysicsChart>
  )
}
