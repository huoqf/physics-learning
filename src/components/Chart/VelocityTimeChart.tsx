import { useMemo } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

interface VelocityTimeChartProps {
  /** 数据点序列（物理坐标） */
  points: { t: number; v: number }[]
  /** 当前时间（物理坐标） */
  currentTime: number
  /** 时间范围 */
  tMax: number
  /** 速度范围（不传则自动计算） */
  vRange?: [number, number]
  /** 标题 */
  title?: string
  /** 是否显示面积填充 */
  showArea?: boolean
  /** 面积截取区间（物理坐标），默认 [0, currentTime] */
  areaRange?: [number, number]
  /** 面积填充变体 */
  areaVariant?: ChartAreaVariant
  /** 面积填充强度 */
  areaIntensity?: ChartAreaIntensity
  /** 是否显示游标 */
  showCursor?: boolean
  /** 曲线颜色变体 */
  series?: ChartSeriesVariant
  /** 是否显示网格线 */
  showGrid?: boolean
  /** 额外 className */
  className?: string
}

function VTContent({
  points,
  currentTime,
  showArea,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor,
  series,
}: Omit<VelocityTimeChartProps, 'tMax' | 'vRange' | 'title' | 'className'>) {
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
        .map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(p.v).toFixed(2)}`)
        .join(' L ')
    )
  }, [visiblePoints, toSvgX, toSvgY])

  const curveColor = PHYSICS_COLORS[series === 'secondary' ? 'displacement' : 'velocity']

  return (
    <g>
      {/* 面积填充 */}
      {showArea && visiblePoints.length >= 2 && (
        <ChartArea
          points={visiblePoints.map((p) => ({ x: p.t, y: p.v }))}
          xRange={areaRange ?? [0, currentTime]}
          baseline={0}
          variant={areaVariant ?? 'default'}
          intensity={areaIntensity ?? 'normal'}
        />
      )}

      {/* 速度曲线 */}
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

      {/* 游标 */}
      {showCursor && visiblePoints.length > 0 && (
        <ChartCursor
          x={currentTime}
          dataPoints={[{ y: visiblePoints[visiblePoints.length - 1].v, label: 'v', series: series ?? 'primary' }]}
          formatValue={(v) => `${v.toFixed(1)} m/s`}
        />
      )}
    </g>
  )
}

export function VelocityTimeChart({
  points,
  currentTime,
  tMax,
  vRange,
  title = 'v-t 图像',
  showArea = false,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor = true,
  series = 'primary',
  showGrid = true,
  className = '',
}: VelocityTimeChartProps) {
  const computedVRange = useMemo((): [number, number] => {
    if (vRange) return vRange
    if (points.length === 0) return [-5, 5]
    const vals = points.map((p) => p.v)
    let lo = Math.min(0, ...vals)
    let hi = Math.max(0, ...vals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, vRange])

  return (
    <BasePhysicsChart
      xDomain={[0, tMax]}
      yDomain={computedVRange}
      xLabel="t (s)"
      yLabel="v (m/s)"
      title={title}
      yBaseline={computedVRange[0] < 0 ? 0 : undefined}
      showGrid={showGrid}
      className={className}
    >
      <VTContent
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
