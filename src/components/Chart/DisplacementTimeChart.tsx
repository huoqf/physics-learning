import { TimeSeriesChart } from './TimeSeriesChart'
import type { TimeSeriesChartProps } from './TimeSeriesChart'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartAreaVariant, ChartAreaIntensity, ChartSeriesVariant } from '@/theme/physics'

type DTPoint = { t: number; x: number }

interface StaticDTProps {
  mode?: 'static'
  points: DTPoint[]
  domainPoints?: DTPoint[]
}

interface AnimatedDTProps {
  mode: 'animated'
  points: DTPoint[]
  domainPoints: DTPoint[]
}

type DisplacementTimeChartProps = (StaticDTProps | AnimatedDTProps) & {
  currentTime: number
  tMax: number
  tDomain?: [number, number]
  xRange?: [number, number]
  title?: string
  xLabel?: string
  yLabel?: string
  showArea?: boolean
  areaRange?: [number, number]
  areaVariant?: ChartAreaVariant
  areaIntensity?: ChartAreaIntensity
  showCursor?: boolean
  series?: ChartSeriesVariant
  underlay?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const curveColorMap: Record<string, string> = {
  primary: PHYSICS_COLORS.displacement,
  secondary: PHYSICS_COLORS.angularVelocity,
}

/**
 * DisplacementTimeChart — x-t 图像
 *
 * 薄包装层，委托 TimeSeriesChart 实现。
 * 数据点格式 `{ t, x }`，通过 yAccessor 映射。
 */
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
  const tsProps = {
    mode,
    points: points as Array<{ t: number; [key: string]: number }>,
    domainPoints: domainPoints as Array<{ t: number; [key: string]: number }> | undefined,
    currentTime,
    tMax,
    tDomain,
    yRange: xRange,
    title,
    xLabel,
    yLabel,
    showArea,
    areaRange,
    areaVariant,
    areaIntensity,
    showCursor,
    series,
    curveColor: curveColorMap[series] ?? curveColorMap.primary,
    yAccessor: (p: { t: number; [key: string]: number }) => p.x,
    cursorLabel: 'x' as const,
    cursorFormat: (v: number) => `${v.toFixed(1)} m`,
    underlay,
    children,
    className,
  }

  return <TimeSeriesChart {...(tsProps as TimeSeriesChartProps)} />
}
