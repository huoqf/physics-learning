import { TimeSeriesChart } from './TimeSeriesChart'
import type { TimeSeriesChartProps } from './TimeSeriesChart'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartAreaVariant, ChartAreaIntensity, ChartSeriesVariant } from '@/theme/physics'

type ATPoint = { t: number; a: number }

interface StaticATProps {
  mode?: 'static'
  points: ATPoint[]
  domainPoints?: ATPoint[]
}

interface AnimatedATProps {
  mode: 'animated'
  points: ATPoint[]
  domainPoints: ATPoint[]
}

type AccelerationTimeChartProps = (StaticATProps | AnimatedATProps) & {
  currentTime: number
  tMax: number
  tDomain?: [number, number]
  aRange?: [number, number]
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
  primary: PHYSICS_COLORS.acceleration,
  secondary: PHYSICS_COLORS.angularAccel,
}

/**
 * AccelerationTimeChart — a-t 图像
 *
 * 薄包装层，委托 TimeSeriesChart 实现。
 * 数据点格式 `{ t, a }`，通过 yAccessor 映射。
 * 同时修复原版缺少 tDomain 下界过滤的 bug。
 */
export function AccelerationTimeChart({
  points,
  domainPoints,
  currentTime,
  tMax,
  tDomain,
  aRange,
  title = 'a-t 图像',
  xLabel = 't (s)',
  yLabel = 'a (m/s²)',
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
}: AccelerationTimeChartProps) {
  const tsProps = {
    mode,
    points: points as Array<{ t: number; [key: string]: number }>,
    domainPoints: domainPoints as Array<{ t: number; [key: string]: number }> | undefined,
    currentTime,
    tMax,
    tDomain,
    yRange: aRange,
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
    yAccessor: (p: { t: number; [key: string]: number }) => p.a,
    cursorLabel: 'a' as const,
    cursorFormat: (v: number) => `${v.toFixed(1)} m/s²`,
    underlay,
    children,
    className,
  }

  return <TimeSeriesChart {...(tsProps as TimeSeriesChartProps)} />
}
