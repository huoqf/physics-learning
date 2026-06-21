import { useMemo } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

interface AccelerationTimeChartProps {
  points: { t: number; a: number }[]
  currentTime: number
  tMax: number
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
}: Omit<AccelerationTimeChartProps, 'tMax' | 'aRange' | 'title' | 'className'>) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const visiblePoints = useMemo(
    () => points.filter((p) => p.t <= currentTime + 1e-9),
    [points, currentTime],
  )

  const curvePath = useMemo(() => {
    if (visiblePoints.length < 2) return ''
    return (
      'M ' +
      visiblePoints
        .map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(p.a).toFixed(2)}`)
        .join(' L ')
    )
  }, [visiblePoints, toSvgX, toSvgY])

  const curveColor = PHYSICS_COLORS[series === 'secondary' ? 'angularAccel' : 'acceleration']

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
}: AccelerationTimeChartProps) {
  const computedARange = useMemo((): [number, number] => {
    if (aRange) return aRange
    if (points.length === 0) return [-5, 5]
    const vals = points.map((p) => p.a)
    let lo = Math.min(0, ...vals)
    let hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, aRange])

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
