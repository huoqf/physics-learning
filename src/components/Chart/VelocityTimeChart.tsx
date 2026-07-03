import { useMemo, type ReactNode } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS, CHART_COLORS, SERIES_MAP, FONT, STROKE, DASH } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

/**
 * 阶段背景着色（用于「过程被人为切分为若干语义阶段」的 v-t 场景，
 * 如 SatelliteAnimation Mode 1 的「发射/转弯/在轨」三阶段）。
 *
 * 每个 stage 渲染为：
 * - 全 Y 域的矩形背景（[from, to] × [yMin, yMax]，绘制在曲线下方）
 * - 顶部居中的阶段标签（可选）
 * - from/to 处的垂直虚线分隔（可选）
 *
 * stages 之间不强制相邻或互斥；越界部分（from/to 超出 xDomain）会被 clip。
 */
export interface VTStage {
  /** 阶段起始时间（物理坐标） */
  from: number
  /** 阶段结束时间（物理坐标） */
  to: number
  /** 矩形填充色（CSS color）；不传则不画矩形 */
  color?: string
  /** 矩形不透明度，默认 0.18 */
  opacity?: number
  /** 阶段标签（顶部居中）；不传则不画 */
  label?: string
  /** 标签颜色（不传则继承 color，否则 fallback 到 labelText） */
  labelColor?: string
  /** 是否画 from/to 处的垂直虚线分隔，默认 true */
  showDividers?: boolean
}

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
  underlay?: ReactNode
  /** 绘制在曲线上方的插件层（如割线、切线、游标扩展） */
  children?: ReactNode
  /**
   * 阶段背景着色（绘制于曲线/面积下方，不遮挡数据）。
   * 适用「过程被人为切分为若干语义阶段」的场景，如
   * SatelliteAnimation Mode 1 的「发射/转弯/在轨」三阶段。
   */
  stages?: VTStage[]
  /** 额外 className */
  className?: string
  /** 固定尺寸模式（直接返回 `<g>`，不走 useCanvasSize + foreignObject） */
  fixedSize?: { width: number; height: number }
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
  tDomain?: [number, number],
) {
  const [tMin, tMax] = tDomain ?? [0, Infinity]
  const visible = pts.filter((p) => p.t >= tMin - 1e-9 && p.t <= Math.min(currentTime, tMax) + 1e-9)
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
  domainPoints,
  currentTime,
  showArea,
  showReferenceLine,
  referencePoints,
  referenceColor,
  referenceOpacity,
  areaRange,
  areaVariant,
  areaIntensity,
  showCursor,
  series,
  additionalSeries,
  stages,
  tDomain,
  underlay,
  children,
}: Omit<VelocityTimeChartProps, 'tMax' | 'vRange' | 'title' | 'className' | 'mode'>) {
  const ctx = useChartContext()

  const mainColor = SERIES_MAP[series ?? 'primary']

  // 完整理论参考线：独立于 currentTime，避免“参考轨迹”和“已揭示轨迹”语义混用。
  const referenceCurve = useMemo(() => {
    if (!ctx || !showReferenceLine) return null
    const [tMin, tMax] = tDomain ?? [0, Infinity]
    const source = referencePoints ?? domainPoints ?? points
    const visible = source.filter((p) => p.t >= tMin - 1e-9 && p.t <= tMax + 1e-9)
    if (visible.length < 2) return null
    const pathD =
      'M ' +
      visible.map((p) => `${ctx.toSvgX(p.t).toFixed(2)},${ctx.toSvgY(p.v).toFixed(2)}`).join(' L ')
    return (
      <path
        d={pathD}
        fill="none"
        stroke={referenceColor ?? CHART_COLORS.reference}
        strokeWidth={STROKE.vectorThin}
        strokeDasharray={DASH.guide.join(',')}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={referenceOpacity ?? 0.45}
      />
    )
  }, [ctx, showReferenceLine, referencePoints, domainPoints, points, tDomain, referenceColor, referenceOpacity])

  // 主曲线
  const mainCurve = useMemo(() => {
    if (!ctx) return null
    return renderCurve(
      points, currentTime, ctx.toSvgX, ctx.toSvgY, mainColor,
      showArea ?? false, areaVariant ?? 'default', areaIntensity ?? 'normal', areaRange,
      tDomain,
    )
  }, [ctx, points, currentTime, mainColor, showArea, areaVariant, areaIntensity, areaRange, tDomain])

  // 额外曲线
  const extraCurves = useMemo(() => {
    if (!ctx || !additionalSeries?.length) return []
    return additionalSeries.map((s) => {
      const color = s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement
      return renderCurve(
        s.points, currentTime, ctx.toSvgX, ctx.toSvgY, color,
        s.showArea ?? false, s.areaVariant ?? 'alt', s.areaIntensity ?? 'subtle',
        undefined,
        tDomain,
      )
    })
  }, [ctx, additionalSeries, currentTime, tDomain])

  // 游标数据点
  const cursorPoints = useMemo(() => {
    const [tMin, tMax] = tDomain ?? [0, Infinity]
    const pts: Array<{ y: number; label: string; series: ChartSeriesVariant }> = []
    const mainVisible = points.filter((p) => p.t >= tMin - 1e-9 && p.t <= Math.min(currentTime, tMax) + 1e-9)
    if (mainVisible.length > 0) {
      pts.push({ y: mainVisible[mainVisible.length - 1].v, label: 'v', series: series ?? 'primary' })
    }
    additionalSeries?.forEach((s, i) => {
      const visible = s.points.filter((p) => p.t >= tMin - 1e-9 && p.t <= Math.min(currentTime, tMax) + 1e-9)
      if (visible.length > 0) {
        pts.push({
          y: visible[visible.length - 1].v,
          label: s.label ?? `v${i + 2}`,
          series: s.series ?? ('secondary' as ChartSeriesVariant),
        })
      }
    })
    return pts
  }, [points, additionalSeries, currentTime, series, tDomain])

  if (!ctx) return null
  const { plotOrigin, plotSize, font, toSvgX } = ctx

  const hasLegend = additionalSeries && additionalSeries.length > 0

  return (
    <g>
      {/* 阶段背景（绘制于曲线/面积下方，不遮挡数据） */}
      {stages && stages.length > 0 && (
        <g>
          {stages.map((stage, i) => {
            // 把 from/to clip 到 plot 区域内
            const x1 = toSvgX(stage.from)
            const x2 = toSvgX(stage.to)
            const clipLeft = Math.max(plotOrigin.x, Math.min(x1, x2))
            const clipRight = Math.min(plotOrigin.x + plotSize.width, Math.max(x1, x2))
            const w = Math.max(0, clipRight - clipLeft)
            const labelColor = stage.labelColor ?? stage.color ?? PHYSICS_COLORS.labelText
            const showDividers = stage.showDividers ?? true

            return (
              <g key={`stage-${i}`}>
                {/* 背景矩形 */}
                {stage.color && w > 0 && (
                  <rect
                    x={clipLeft}
                    y={plotOrigin.y}
                    width={w}
                    height={plotSize.height}
                    fill={stage.color}
                    opacity={stage.opacity ?? 0.18}
                  />
                )}
                {/* 分隔虚线：from / to 各一条（只在 plot 区域内的才画） */}
                {showDividers && x1 >= plotOrigin.x && x1 <= plotOrigin.x + plotSize.width && (
                  <line
                    x1={x1} y1={plotOrigin.y}
                    x2={x1} y2={plotOrigin.y + plotSize.height}
                    stroke={CHART_COLORS.gridLine}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.7}
                  />
                )}
                {showDividers && x2 >= plotOrigin.x && x2 <= plotOrigin.x + plotSize.width && (
                  <line
                    x1={x2} y1={plotOrigin.y}
                    x2={x2} y2={plotOrigin.y + plotSize.height}
                    stroke={CHART_COLORS.gridLine}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.7}
                  />
                )}
                {/* 阶段标签：顶部居中 */}
                {stage.label && w > 0 && (
                  <text
                    x={clipLeft + w / 2}
                    y={plotOrigin.y + font(FONT.small) + 2}
                    fontSize={font(FONT.small)}
                    fill={labelColor}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {stage.label}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      )}

      {/* 插件底层（面积/背景增强） */}
      {underlay}

      {/* 完整理论参考线（不随 currentTime 截断） */}
      {referenceCurve}

      {/* 面积 + 曲线 */}
      {mainCurve}
      {extraCurves}

      {/* 插件顶层（割线/切线/自定义游标） */}
      {children}

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

/**
 * VelocityTimeChart 速度-时间图像组件
 *
 * 【设计意图】
 * 1. 专门用于物理实验中的速度-时间（v-t）图像展示。
 * 2. 支持静态和动画两种模式：静态模式用于展示完整数据，动画模式用于实时模拟。
 * 3. 支持多数据系列对比，可同时展示多条曲线。
 * 4. 内置阶段背景着色，用于区分不同运动阶段（如发射/转弯/在轨）。
 * 5. 支持面积填充、参考线、游标等交互功能，增强数据可视化效果。
 *
 * @example
 * ```tsx
 * // 静态模式：展示完整 v-t 图像
 * <VelocityTimeChart
 *   points={[
 *     { t: 0, v: 0 },
 *     { t: 2, v: 10 },
 *     { t: 4, v: 10 },
 *     { t: 6, v: 0 },
 *   ]}
 *   currentTime={6}
 *   tMax={6}
 * />
 *
 * // 动画模式：实时模拟 v-t 图像
 * <VelocityTimeChart
 *   mode="animated"
 *   points={trajectoryPoints}
 *   domainPoints={fullTrajectory}
 *   currentTime={simulationTime}
 *   tMax={10}
 *   showArea={true}
 *   showCursor={true}
 * />
 *
 * // 多系列对比
 * <VelocityTimeChart
 *   points={seriesA}
 *   currentTime={5}
 *   tMax={5}
 *   additionalSeries={[
 *     { points: seriesB, label: 'B', series: 'secondary' }
 *   ]}
 * />
 * ```
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
  if (process.env.NODE_ENV !== 'production' && mode === 'animated' && !domainPoints) {
    console.warn(
      'VelocityTimeChart: animated mode requires domainPoints to keep axis domain stable. ' +
      'Without it, Y-axis will jitter as points are truncated over time.'
    )
  }

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
      xDomain={tDomain ?? [0, tMax]}
      yDomain={computedVRange}
      xLabel={xLabel}
      yLabel={yLabel}
      title={title}
      yBaseline={computedVRange[0] < 0 ? 0 : undefined}
      showGrid={showGrid}
      className={className}
      fixedSize={fixedSize}
    >
      <VTContent
        points={points}
        domainPoints={domainPoints}
        currentTime={currentTime}
        showArea={showArea}
        showReferenceLine={showReferenceLine}
        referencePoints={referencePoints}
        referenceColor={referenceColor}
        referenceOpacity={referenceOpacity}
        areaRange={areaRange}
        areaVariant={areaVariant}
        areaIntensity={areaIntensity}
        showCursor={showCursor}
        series={series}
        additionalSeries={additionalSeries}
        stages={stages}
        tDomain={tDomain}
        underlay={underlay}
        children={children}
      />
    </BasePhysicsChart>
  )
}
