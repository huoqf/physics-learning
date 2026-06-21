import { useMemo } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS, SERIES_MAP, FONT } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

/** 单条数据系列 */
export interface ChartDataSeries {
  /** 数据点序列（物理坐标）—— 用于绘制，可由调用方按 currentTime 截断或交给图表内部截断 */
  points: { t: number; v: number }[]
  /**
   * 用于坐标轴定标的数据点序列（物理坐标）。
   * 与 `points` 解耦：`points` 决定“画什么”（随时间增长的轨迹），
   * `domainPoints` 决定“坐标系多大”（应为完整、稳定的整段轨迹）。
   * 不传时回退到 `points`（保持向后兼容）。
   */
  domainPoints?: { t: number; v: number }[]
  /** 系列标签（图例显示） */
  label?: string
  /** 曲线颜色变体 */
  series?: ChartSeriesVariant
  /** 是否显示面积填充 */
  showArea?: boolean
  /** 面积填充变体 */
  areaVariant?: ChartAreaVariant
  /** 面积填充强度 */
  areaIntensity?: ChartAreaIntensity
}

interface VelocityTimeChartProps {
  /** 主数据点序列（物理坐标）—— 用于绘制 */
  points: { t: number; v: number }[]
  /**
   * 用于坐标轴定标的主数据点序列（物理坐标）。
   * 与 `points` 解耦：`points` 决定“画什么”，`domainPoints` 决定“坐标系多大”。
   * 不传时回退到 `points`（保持向后兼容）。
   * 推荐做法：传入完整未截断的整段轨迹，避免 Y 轴随时间扩张产生“一根贴着 Y 轴的竖线被拉斜”的视觉错觉。
   */
  domainPoints?: { t: number; v: number }[]
  /** 当前时间（物理坐标） */
  currentTime: number
  /** 时间范围 */
  tMax: number
  /** 速度范围（不传则基于 domainPoints / additionalSeries.domainPoints 自动计算） */
  vRange?: [number, number]
  /** 标题 */
  title?: string
  /** 主系列是否显示面积填充 */
  showArea?: boolean
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
  /** 额外数据系列（多曲线对比） */
  additionalSeries?: ChartDataSeries[]
  /** 额外 className */
  className?: string
}

/** 渲染单条曲线 + 面积 */
function renderCurve(
  pts: { t: number; v: number }[],
  currentTime: number,
  toSvgX: (v: number) => number,
  toSvgY: (v: number) => number,
  color: string,
  showArea: boolean,
  areaVariant: ChartAreaVariant,
  areaIntensity: ChartAreaIntensity,
  areaRange?: [number, number],
) {
  const visible = pts.filter((p) => p.t <= currentTime + 1e-9)
  if (visible.length < 2) return null

  const pathD =
    'M ' +
    visible.map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(p.v).toFixed(2)}`).join(' L ')

  return (
    <g key={`curve-${color}`}>
      {showArea && (
        <ChartArea
          points={visible.map((p) => ({ x: p.t, y: p.v }))}
          xRange={areaRange ?? [0, currentTime]}
          baseline={0}
          variant={areaVariant}
          intensity={areaIntensity}
        />
      )}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
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
  additionalSeries,
}: Omit<VelocityTimeChartProps, 'tMax' | 'vRange' | 'title' | 'className' | 'domainPoints'>) {
  const ctx = useChartContext()

  const mainColor = SERIES_MAP[series ?? 'primary']

  // 主曲线
  const mainCurve = useMemo(() => {
    if (!ctx) return null
    return renderCurve(
      points, currentTime, ctx.toSvgX, ctx.toSvgY, mainColor,
      showArea ?? false, areaVariant ?? 'default', areaIntensity ?? 'normal', areaRange,
    )
  }, [ctx, points, currentTime, mainColor, showArea, areaVariant, areaIntensity, areaRange])

  // 额外曲线
  const extraCurves = useMemo(() => {
    if (!ctx || !additionalSeries?.length) return []
    return additionalSeries.map((s) => {
      const color = s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement
      return renderCurve(
        s.points, currentTime, ctx.toSvgX, ctx.toSvgY, color,
        s.showArea ?? false, s.areaVariant ?? 'alt', s.areaIntensity ?? 'subtle',
      )
    })
  }, [ctx, additionalSeries, currentTime])

  // 游标数据点
  const cursorPoints = useMemo(() => {
    const pts: Array<{ y: number; label: string; series: ChartSeriesVariant }> = []
    const mainVisible = points.filter((p) => p.t <= currentTime + 1e-9)
    if (mainVisible.length > 0) {
      pts.push({ y: mainVisible[mainVisible.length - 1].v, label: 'v', series: series ?? 'primary' })
    }
    additionalSeries?.forEach((s, i) => {
      const visible = s.points.filter((p) => p.t <= currentTime + 1e-9)
      if (visible.length > 0) {
        pts.push({
          y: visible[visible.length - 1].v,
          label: s.label ?? `v${i + 2}`,
          series: s.series ?? ('secondary' as ChartSeriesVariant),
        })
      }
    })
    return pts
  }, [points, additionalSeries, currentTime, series])

  if (!ctx) return null
  const { plotOrigin, plotSize, font } = ctx

  const hasLegend = additionalSeries && additionalSeries.length > 0

  return (
    <g>
      {/* 面积 + 曲线 */}
      {mainCurve}
      {extraCurves}

      {/* 游标 */}
      {showCursor && cursorPoints.length > 0 && (
        <ChartCursor
          x={currentTime}
          dataPoints={cursorPoints}
          formatValue={(v) => `${v.toFixed(1)} m/s`}
        />
      )}

      {/* 图例（多系列时显示） */}
      {hasLegend && (
        <g>
          {/* 主系列图例 */}
          <line x1={plotOrigin.x + plotSize.width - 130} y1={plotOrigin.y + 10}
            x2={plotOrigin.x + plotSize.width - 115} y2={plotOrigin.y + 10}
            stroke={mainColor} strokeWidth={2} />
          <text x={plotOrigin.x + plotSize.width - 110} y={plotOrigin.y + 13}
            fontSize={font(FONT.small)} fill={PHYSICS_COLORS.labelText}>
            {points.length > 0 ? (series === 'primary' ? 'A' : '') : ''}
          </text>

          {/* 额外系列图例 */}
          {additionalSeries.map((s, i) => {
            const color = s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement
            return (
              <g key={`legend-${i}`}>
                <line x1={plotOrigin.x + plotSize.width - 70} y1={plotOrigin.y + 10}
                  x2={plotOrigin.x + plotSize.width - 55} y2={plotOrigin.y + 10}
                  stroke={color} strokeWidth={2} />
                <text x={plotOrigin.x + plotSize.width - 50} y={plotOrigin.y + 13}
                  fontSize={font(FONT.small)} fill={PHYSICS_COLORS.labelText}>
                  {s.label ?? `B`}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
}

export function VelocityTimeChart({
  points,
  domainPoints,
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
  additionalSeries,
  className = '',
}: VelocityTimeChartProps) {
  const computedVRange = useMemo((): [number, number] => {
    if (vRange) return vRange
    // 收集所有系列的“定标数据”——优先用 domainPoints，回退到 points
    const mainSource = domainPoints ?? points
    const allVals: number[] = mainSource.map((p) => p.v)
    additionalSeries?.forEach((s) => {
      const src = s.domainPoints ?? s.points
      src.forEach((p) => allVals.push(p.v))
    })
    if (allVals.length === 0) return [-5, 5]
    const lo = Math.min(0, ...allVals)
    const hi = Math.max(0, ...allVals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, domainPoints, additionalSeries, vRange])

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
        additionalSeries={additionalSeries}
      />
    </BasePhysicsChart>
  )
}
