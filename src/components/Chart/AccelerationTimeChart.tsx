import { useMemo } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

/** 静态模式：points 既是绘制数据也是定标数据 */
interface StaticATChartProps {
  mode?: 'static'
  /** 主数据点序列（物理坐标）—— 用于绘制 */
  points: { t: number; a: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标）。静态模式可选，不传回退到 points */
  domainPoints?: { t: number; a: number }[]
}

/** 动画模式：points 截断绘制，domainPoints 必传定标 */
interface AnimatedATChartProps {
  mode: 'animated'
  /** 主数据点序列（物理坐标）—— 用于绘制，可按 currentTime 截断 */
  points: { t: number; a: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标）—— 必传完整轨迹，防止 Y 轴抖动 */
  domainPoints: { t: number; a: number }[]
}

type AccelerationTimeChartProps = (StaticATChartProps | AnimatedATChartProps) & {
  currentTime: number
  tMax: number
  /** 加速度范围（不传则基于 domainPoints / points 自动计算） */
  aRange?: [number, number]
  title?: string
  showArea?: boolean
  areaRange?: [number, number]
  areaVariant?: ChartAreaVariant
  areaIntensity?: ChartAreaIntensity
  showCursor?: boolean
  series?: ChartSeriesVariant
  className?: string
}

function ATContent({
  points,
  currentTime,
  showArea,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor,
  series,
}: Omit<AccelerationTimeChartProps, 'tMax' | 'aRange' | 'title' | 'className' | 'domainPoints' | 'mode'>) {
  const ctx = useChartContext()

  const visiblePoints = useMemo(
    () => points.filter((p) => p.t <= currentTime + 1e-9),
    [points, currentTime],
  )

  const curvePath = useMemo(() => {
    if (!ctx || visiblePoints.length < 2) return ''
    const { toSvgX, toSvgY } = ctx
    return (
      'M ' +
      visiblePoints
        .map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(p.a).toFixed(2)}`)
        .join(' L ')
    )
  }, [ctx, visiblePoints])

  const curveColor = PHYSICS_COLORS[series === 'secondary' ? 'angularAccel' : 'acceleration']

  if (!ctx) return null

  return (
    <g>
      {showArea && visiblePoints.length >= 2 && (
        <ChartArea
          points={visiblePoints.map((p) => ({ x: p.t, y: p.a }))}
          xRange={areaRange ?? [0, currentTime]}
          baseline={0}
          variant={areaVariant ?? 'alt'}
          intensity={areaIntensity ?? 'normal'}
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

      {showCursor && visiblePoints.length > 0 && (
        <ChartCursor
          x={currentTime}
          dataPoints={[{ y: visiblePoints[visiblePoints.length - 1].a, label: 'a', series: series ?? 'primary' }]}
          formatValue={(v) => `${v.toFixed(1)} m/s²`}
        />
      )}
    </g>
  )
}

export function AccelerationTimeChart({
  points,
  domainPoints,
  currentTime,
  tMax,
  aRange,
  title = 'a-t 图像',
  showArea = false,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor = true,
  series = 'primary',
  className = '',
  mode = 'static',
}: AccelerationTimeChartProps) {
  if (process.env.NODE_ENV !== 'production' && mode === 'animated' && !domainPoints) {
    console.warn(
      'AccelerationTimeChart: animated mode requires domainPoints to keep axis domain stable.'
    )
  }

  const computedARange = useMemo((): [number, number] => {
    if (aRange) return aRange
    // 优先使用 domainPoints 定标，回退到 points
    const rangeSource = domainPoints ?? points
    if (rangeSource.length === 0) return [-5, 5]
    const vals = rangeSource.map((p) => p.a)
    const lo = Math.min(0, ...vals)
    const hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, domainPoints, aRange])

  return (
    <BasePhysicsChart
      xDomain={[0, tMax]}
      yDomain={computedARange}
      xLabel="t (s)"
      yLabel="a (m/s²)"
      title={title}
      yBaseline={computedARange[0] < 0 ? 0 : undefined}
      className={className}
    >
      <ATContent
        points={points}
        currentTime={currentTime}
        showArea={showArea}
        areaRange={areaRange}
        areaVariant={areaVariant}
        areaIntensity={areaIntensity}
        showCursor={showCursor}
        series={series}
      />
    </BasePhysicsChart>
  )
}
