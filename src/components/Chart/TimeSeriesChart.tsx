import { useMemo, type ReactNode } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { ChartCursor } from './ChartCursor'
import { ChartArea } from './ChartArea'
import { PHYSICS_COLORS, CHART_COLORS, SERIES_MAP, FONT, STROKE, DASH } from '@/theme/physics'
import type { ChartSeriesVariant, ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

// ── 通用时间序列点 ──

/** 任意时间序列数据点，至少包含 t 字段，yAccessor 从中提取数值 */
export type TSPoint = { t: number; [key: string]: number }

// ── 阶段背景 / 额外系列类型（原定义于 VelocityTimeChart，现提升为通用） ──

/**
 * 阶段背景着色（用于「过程被人为切分为若干语义阶段」的 v-t 场景，
 * 如 SatelliteAnimation Mode 1 的「发射/转弯/在轨」三阶段）。
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

/** 单条数据系列（保持 { t, v } 格式以向后兼容调用方） */
export interface ChartDataSeries {
  /** 数据点序列（物理坐标）—— 用于绘制 */
  points: { t: number; v: number }[]
  /** 用于坐标轴定标的数据点序列（物理坐标），不传时回退到 points */
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

// ── Props ──

/** 静态模式 */
interface StaticTSProps {
  mode?: 'static'
  points: TSPoint[]
  domainPoints?: TSPoint[]
  additionalSeries?: ChartDataSeries[]
}

/** 动画模式 */
interface AnimatedTSProps {
  mode: 'animated'
  points: TSPoint[]
  domainPoints: TSPoint[]
  additionalSeries?: ChartDataSeries[]
}

export type TimeSeriesChartProps = (StaticTSProps | AnimatedTSProps) & {
  /** 从数据点中提取 Y 值的函数。默认 p => p.v */
  yAccessor?: (p: TSPoint) => number
  /** 游标标签名（如 'x', 'v', 'a'）。默认 'v' */
  cursorLabel?: string
  /** 游标格式化函数 */
  cursorFormat?: (v: number) => string
  /** 曲线颜色。传入 CSS color 字符串，或使用 series 变体 */
  curveColor?: string

  currentTime: number
  tMax: number
  tDomain?: [number, number]
  yRange?: [number, number]
  title?: string
  xLabel?: string
  yLabel?: string
  showArea?: boolean
  areaRange?: [number, number]
  areaVariant?: ChartAreaVariant
  areaIntensity?: ChartAreaIntensity
  showCursor?: boolean
  series?: ChartSeriesVariant
  showGrid?: boolean
  underlay?: ReactNode
  children?: ReactNode
  stages?: VTStage[]
  showReferenceLine?: boolean
  referencePoints?: TSPoint[]
  referenceColor?: string
  referenceOpacity?: number
  className?: string
  fixedSize?: { width: number; height: number }
}

// ── 渲染单条曲线 + 面积 ──

function renderCurve(
  pts: TSPoint[],
  yAccessor: (p: TSPoint) => number,
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
    visible.map((p) => `${toSvgX(p.t).toFixed(2)},${toSvgY(yAccessor(p)).toFixed(2)}`).join(' L ')

  return (
    <g key={`curve-${color}`}>
      {showArea && (
        <ChartArea
          points={visible.map((p) => ({ x: p.t, y: yAccessor(p) }))}
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

// ── 内容组件 ──

function TSContent({
  points,
  domainPoints,
  currentTime,
  yAccessor,
  cursorLabel,
  cursorFormat,
  curveColor,
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
}: Omit<TimeSeriesChartProps, 'tMax' | 'yRange' | 'title' | 'xLabel' | 'yLabel' | 'className' | 'mode' | 'showGrid' | 'fixedSize'>) {
  const ctx = useChartContext()
  const defaultYAcc = useMemo(() => (p: TSPoint) => p.v, [])
  const yAcc = yAccessor ?? defaultYAcc
  const label = cursorLabel ?? 'v'

  const mainColor = curveColor ?? SERIES_MAP[series ?? 'primary']

  // 完整理论参考线
  const referenceCurve = useMemo(() => {
    if (!ctx || !showReferenceLine) return null
    const [tMin, tMax] = tDomain ?? [0, Infinity]
    const source = (referencePoints as TSPoint[] | undefined) ?? domainPoints ?? points
    const visible = source.filter((p) => p.t >= tMin - 1e-9 && p.t <= tMax + 1e-9)
    if (visible.length < 2) return null
    const pathD =
      'M ' +
      visible.map((p) => `${ctx.toSvgX(p.t).toFixed(2)},${ctx.toSvgY(yAcc(p)).toFixed(2)}`).join(' L ')
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
  }, [ctx, showReferenceLine, referencePoints, domainPoints, points, tDomain, referenceColor, referenceOpacity, yAcc])

  // 主曲线
  const mainCurve = useMemo(() => {
    if (!ctx) return null
    return renderCurve(
      points, yAcc, currentTime, ctx.toSvgX, ctx.toSvgY, mainColor,
      showArea ?? false, areaVariant ?? 'default', areaIntensity ?? 'normal', areaRange,
      tDomain,
    )
  }, [ctx, points, yAcc, currentTime, mainColor, showArea, areaVariant, areaIntensity, areaRange, tDomain])

  // 额外曲线
  const extraCurves = useMemo(() => {
    if (!ctx || !additionalSeries?.length) return []
    return additionalSeries.map((s) => {
      const color = s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement
      return renderCurve(
        s.points as TSPoint[], yAcc, currentTime, ctx.toSvgX, ctx.toSvgY, color,
        s.showArea ?? false, s.areaVariant ?? 'alt', s.areaIntensity ?? 'subtle',
        undefined,
        tDomain,
      )
    })
  }, [ctx, additionalSeries, currentTime, tDomain, yAcc])

  // 游标数据点
  const cursorPoints = useMemo(() => {
    const [tMin, tMax] = tDomain ?? [0, Infinity]
    const pts: Array<{ y: number; label: string; series: ChartSeriesVariant }> = []
    const mainVisible = points.filter((p) => p.t >= tMin - 1e-9 && p.t <= Math.min(currentTime, tMax) + 1e-9)
    if (mainVisible.length > 0) {
      pts.push({ y: yAcc(mainVisible[mainVisible.length - 1]), label, series: series ?? 'primary' })
    }
    additionalSeries?.forEach((s, i) => {
      const visible = s.points.filter((p) => p.t >= tMin - 1e-9 && p.t <= Math.min(currentTime, tMax) + 1e-9)
      if (visible.length > 0) {
        pts.push({
          y: visible[visible.length - 1].v,
          label: s.label ?? `${label}${i + 2}`,
          series: s.series ?? ('secondary' as ChartSeriesVariant),
        })
      }
    })
    return pts
  }, [points, additionalSeries, currentTime, series, tDomain, yAcc, label])

  if (!ctx) return null
  const { plotOrigin, plotSize, font, toSvgX } = ctx

  const hasLegend = additionalSeries && additionalSeries.length > 0

  return (
    <g>
      {/* 阶段背景 */}
      {stages && stages.length > 0 && (
        <g>
          {stages.map((stage, i) => {
            const x1 = toSvgX(stage.from)
            const x2 = toSvgX(stage.to)
            const clipLeft = Math.max(plotOrigin.x, Math.min(x1, x2))
            const clipRight = Math.min(plotOrigin.x + plotSize.width, Math.max(x1, x2))
            const w = Math.max(0, clipRight - clipLeft)
            const labelColor = stage.labelColor ?? stage.color ?? PHYSICS_COLORS.labelText
            const showDividers = stage.showDividers ?? true

            return (
              <g key={`stage-${i}`}>
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

      {underlay}
      {referenceCurve}
      {mainCurve}
      {extraCurves}
      {children}

      {showCursor && cursorPoints.length > 0 && (
        <ChartCursor
          x={currentTime}
          dataPoints={cursorPoints}
          formatValue={cursorFormat ?? ((v) => `${v.toFixed(1)}`)}
        />
      )}

      {hasLegend && (
        <g>
          <line x1={plotOrigin.x + plotSize.width - 130} y1={plotOrigin.y + 10}
            x2={plotOrigin.x + plotSize.width - 115} y2={plotOrigin.y + 10}
            stroke={mainColor} strokeWidth={2} />
          <text x={plotOrigin.x + plotSize.width - 110} y={plotOrigin.y + 13}
            fontSize={font(FONT.small)} fill={PHYSICS_COLORS.labelText}>
            {points.length > 0 ? (series === 'primary' ? 'A' : '') : ''}
          </text>

          {additionalSeries.map((s, i) => {
            const color = s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement
            return (
              <g key={`legend-${i}`}>
                <line x1={plotOrigin.x + plotSize.width - 70} y1={plotOrigin.y + 10}
                  x2={plotOrigin.x + plotSize.width - 55} y2={plotOrigin.y + 10}
                  stroke={color} strokeWidth={2} />
                <text x={plotOrigin.x + plotSize.width - 50} y={plotOrigin.y + 13}
                  fontSize={font(FONT.small)} fill={PHYSICS_COLORS.labelText}>
                  {s.label ?? 'B'}
                </text>
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
}

// ── 主组件 ──

export function TimeSeriesChart({
  points,
  domainPoints,
  currentTime,
  tMax,
  tDomain,
  yRange,
  title = 't 图像',
  xLabel = 't (s)',
  yLabel = '',
  showArea = false,
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
  showReferenceLine,
  referencePoints,
  referenceColor,
  referenceOpacity,
  className = '',
  mode = 'static',
  fixedSize,
  yAccessor,
  cursorLabel,
  cursorFormat,
  curveColor,
}: TimeSeriesChartProps) {
  if (process.env.NODE_ENV !== 'production' && mode === 'animated' && !domainPoints) {
    console.warn(
      'TimeSeriesChart: animated mode requires domainPoints to keep axis domain stable.'
    )
  }

  const defaultYAcc = useMemo(() => (p: TSPoint) => p.v, [])
  const yAcc = yAccessor ?? defaultYAcc

  const computedYRange = useMemo((): [number, number] => {
    if (yRange) return yRange
    const mainSource = (domainPoints ?? points) as TSPoint[]
    const allVals: number[] = mainSource.map((p) => yAcc(p))
    additionalSeries?.forEach((s) => {
      const src = s.domainPoints ?? s.points
      src.forEach((p) => allVals.push(p.v))
    })
    if (allVals.length === 0) return [-5, 5]
    const lo = Math.min(0, ...allVals)
    const hi = Math.max(0, ...allVals)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, domainPoints, additionalSeries, yRange, yAcc])

  return (
    <BasePhysicsChart
      xDomain={tDomain ?? [0, tMax]}
      yDomain={computedYRange}
      xLabel={xLabel}
      yLabel={yLabel}
      title={title}
      yBaseline={computedYRange[0] < 0 ? 0 : undefined}
      showGrid={showGrid}
      className={className}
      fixedSize={fixedSize}
    >
      <TSContent
        points={points}
        domainPoints={domainPoints}
        currentTime={currentTime}
        yAccessor={yAccessor}
        cursorLabel={cursorLabel}
        cursorFormat={cursorFormat}
        curveColor={curveColor}
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
