import { TimeSeriesChart } from './TimeSeriesChart'
import type { TimeSeriesChartProps, VTStage, ChartDataSeries, TSPoint } from './TimeSeriesChart'
import { PHYSICS_COLORS } from '@/theme/physics'
import type { ChartAreaVariant, ChartAreaIntensity, ChartSeriesVariant } from '@/theme/physics'

// ── 重导出类型（向后兼容） ──
export type { VTStage, ChartDataSeries }

/** 静态模式：points 既是绘制数据也是定标数据 */
interface StaticChartProps {
  mode?: 'static'
  /** 主数据点序列（物理坐标）—— 用于绘制 */
  points: { t: number; v: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标）。静态模式可选，不传回退到 points */
  domainPoints?: { t: number; v: number }[]
  /** 额外数据系列（多曲线对比） */
  additionalSeries?: ChartDataSeries[]
}

/** 动画模式：points 截断绘制，domainPoints 必传定标 */
interface AnimatedChartProps {
  mode: 'animated'
  /** 主数据点序列（物理坐标）—— 用于绘制，可按 currentTime 截断 */
  points: { t: number; v: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标）—— 必传完整轨迹，防止 Y 轴抖动 */
  domainPoints: { t: number; v: number }[]
  /** 额外数据系列（多曲线对比） */
  additionalSeries?: ChartDataSeries[]
}

type VelocityTimeChartProps = (StaticChartProps | AnimatedChartProps) & {
  /** 当前时间（物理坐标） */
  currentTime: number
  /** 时间范围（兼容旧 API；未传 tDomain 时使用 [0, tMax]） */
  tMax: number
  /** 可选时间窗口，用于滑动窗口图表 */
  tDomain?: [number, number]
  /** 速度范围（不传则基于 domainPoints / additionalSeries.domainPoints 自动计算） */
  vRange?: [number, number]
  /** 标题 */
  title?: string
  /** X 轴标签，默认 t (s) */
  xLabel?: string
  /** Y 轴标签，默认 v (m/s) */
  yLabel?: string
  /** 主系列是否显示面积填充 */
  showArea?: boolean
  /** 是否显示完整理论参考线（不随 currentTime 截断） */
  showReferenceLine?: boolean
  /** 理论参考线数据；不传时默认使用主系列 domainPoints ?? points */
  referencePoints?: { t: number; v: number }[]
  /** 理论参考线颜色，默认 CHART_COLORS.reference */
  referenceColor?: string
  /** 理论参考线不透明度，默认 0.45 */
  referenceOpacity?: number
  /** 面积截取区间（物理坐标），默认 [0, currentTime] */
  areaRange?: [number, number]
  /** 面积填充变体 */
  areaVariant?: ChartAreaVariant
  /** 面积填充强度 */
  areaIntensity?: ChartAreaIntensity
  /** 是否显示游标 */
  showCursor?: boolean
  /** 主曲线颜色变体 */
  series?: ChartSeriesVariant
  /** 是否显示网格线 */
  showGrid?: boolean
  /** 绘制在曲线下方的插件层（如额外面积填充） */
  underlay?: React.ReactNode
  /** 绘制在曲线上方的插件层（如割线、切线、游标扩展） */
  children?: React.ReactNode
  /**
   * 阶段背景着色（绘制于曲线/面积下方，不遮挡数据）。
   */
  stages?: VTStage[]
  /** 额外 className */
  className?: string
  /** 固定尺寸模式（直接返回 `<g>`，不走 useCanvasSize + foreignObject） */
  fixedSize?: { width: number; height: number }
}

const curveColorMap: Record<string, string> = {
  primary: PHYSICS_COLORS.velocity,
  secondary: PHYSICS_COLORS.angularVelocity,
}

/**
 * VelocityTimeChart — v-t 图像
 *
 * 薄包装层，委托 TimeSeriesChart 实现。
 * 数据点格式 `{ t, v }`，通过 yAccessor 映射。
 */
export function VelocityTimeChart({
  points,
  domainPoints,
  currentTime,
  tMax,
  tDomain,
  vRange,
  title = 'v-t 图像',
  xLabel = 't (s)',
  yLabel = 'v (m/s)',
  showArea = false,
  showReferenceLine = false,
  referencePoints,
  referenceColor,
  referenceOpacity,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor = true,
  series = 'primary',
  showGrid = true,
  additionalSeries,
  underlay,
  children,
  stages,
  className = '',
  mode = 'static',
  fixedSize,
}: VelocityTimeChartProps) {
  const tsProps = {
    mode,
    points: points as TSPoint[],
    domainPoints: domainPoints as TSPoint[] | undefined,
    currentTime,
    tMax,
    tDomain,
    yRange: vRange,
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
    yAccessor: (p: TSPoint) => p.v,
    cursorLabel: 'v' as const,
    cursorFormat: (v: number) => `${v.toFixed(1)} m/s`,
    showReferenceLine,
    referencePoints: referencePoints as TSPoint[] | undefined,
    referenceColor,
    referenceOpacity,
    additionalSeries,
    stages,
    showGrid,
    underlay,
    children,
    className,
    fixedSize,
  }

  return <TimeSeriesChart {...(tsProps as TimeSeriesChartProps)} />
}
