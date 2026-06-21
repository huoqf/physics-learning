import { useMemo } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

interface DisplacementTimeChartProps {
  points: { t: number; x: number }[]
  currentTime: number
  tMax: number
  xRange?: [number, number]
  title?: string
  showArea?: boolean
  areaRange?: [number, number]
  areaVariant?: ChartAreaVariant
  areaIntensity?: ChartAreaIntensity
  showCursor?: boolean
  series?: ChartSeriesVariant
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
}: Omit<DisplacementTimeChartProps, 'tMax' | 'xRange' | 'title' | 'className'>) {
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
        .map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(p.x).toFixed(2)}`)
        .join(' L ')
    )
  }, [visiblePoints, toSvgX, toSvgY])

  const curveColor = PHYSICS_COLORS[series === 'secondary' ? 'angularVelocity' : 'displacement']

  return (
    <g>
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
  currentTime,
  tMax,
  xRange,
  title = 'x-t 图像',
  showArea = false,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor = true,
  series = 'primary',
  className = '',
}: DisplacementTimeChartProps) {
  const computedXRange = useMemo((): [number, number] => {
    if (xRange) return xRange
    if (points.length === 0) return [-5, 5]
    const vals = points.map((p) => p.x)
    let lo = Math.min(0, ...vals)
    let hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, xRange])

  return (
    <BasePhysicsChart
      xDomain={[0, tMax]}
      yDomain={computedXRange}
      xLabel="t (s)"
      yLabel="x (m)"
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
      />
    </BasePhysicsChart>
  )
}
