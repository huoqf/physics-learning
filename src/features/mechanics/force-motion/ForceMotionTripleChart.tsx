import { useMemo } from 'react'
import { CHART_COLORS, FX_CHART_COLORS, VT_CHART_COLORS, DASH, FONT, STROKE } from '@/theme/physics'
import type { ChartAreaVariant } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useCanvasSize } from '@/utils/useCanvasSize'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { BasePhysicsChart, ChartCursor, ChartArea, useChartContext } from '@/components/Chart'

interface ChartPoint {
  t: number
  F: number
  v: number
  x: number
  y: number
}

interface ForceMotionTripleChartProps {
  /** 实时数据：用于绘制曲线 + 面积 + 当前游标（按 currentTime 截断） */
  points: ChartPoint[]
  /**
   * 完整窗口数据：用于 X/Y 轴定标，不随 currentTime 变化。
   * 不传则回退到 `points`（保持向后兼容；但会让曲线末端随 time 扩张贴顶）。
   * 与 VelocityTimeChart 的 domainPoints 同思路（commit bbd1108）。
   */
  domainPoints?: ChartPoint[]
  currentTime: number
  currentValueF: number
  currentValueV: number
  currentValueX: number
  terminalVelocity?: number
  areaTextF: string
  areaTextV: string
  areaTextX: string
}

interface SingleChartProps {
  width: number
  height: number
  /** 实时数据：用于绘制曲线 + 面积 + 当前游标（按 currentTime 截断） */
  points: Array<{ t: number; value: number }>
  /**
   * 完整窗口数据：用于 X/Y 轴定标，不随 currentTime 变化。
   * 不传则回退到 `points`（保持向后兼容；但会让曲线末端随 time 扩张贴顶）。
   */
  domainPoints?: Array<{ t: number; value: number }>
  currentTime: number
  currentValue: number
  color: string
  yLabel: string
  areaText: string
  /** 曲线下方面积填充变体（不传则不画面积） */
  areaVariant?: ChartAreaVariant
  terminalValue?: number
  zeroBased: boolean
}

/**
 * 计算 Y 轴范围 + maxTime + 面积点集 + 游标可见性
 *
 * 定标用全量观察窗口数据，回退到实时 points（保持向后兼容）。
 * maxTime 仅由 rangeSource 决定，不再叠加 currentTime，
 * 避免播放超过观察窗口时 X 域被反向扩张。
 */
function useChartDomains({
  points, domainPoints, currentTime, terminalValue, zeroBased, areaVariant,
}: {
  points: Array<{ t: number; value: number }>
  domainPoints?: Array<{ t: number; value: number }>
  currentTime: number
  terminalValue?: number
  zeroBased: boolean
  areaVariant?: ChartAreaVariant
}) {
  return useMemo(() => {
    const rangeSource = domainPoints ?? points
    const maxTime = Math.max(rangeSource.at(-1)?.t ?? 1, 1)

    // Y 轴范围 + 15% padding（与 RelationChart / VelocityTimeChart 一致）
    // 避免恒值曲线（如恒力 F=const）整段贴图顶；同时让 terminalValue
    // 渐近线与曲线峰之间留出视觉缓冲。
    const baseValues = rangeSource.map((p) => p.value)
    const values = terminalValue != null ? [...baseValues, terminalValue, 0] : [...baseValues, 0]
    const maxAbs = Math.max(1, ...values.map(Math.abs))
    let minValue = zeroBased ? 0 : (values.some((v) => v < 0) ? -maxAbs : 0)
    let maxValue = maxAbs
    const rawSpan = maxValue - minValue
    const pad = rawSpan * 0.15 || 1
    if (zeroBased || minValue >= 0) {
      // 全正 / zeroBased：仅扩上界，保持从 0 起算的物理直觉
      maxValue += pad
    } else {
      // 跨零曲线（如简谐振动 v-t）：上下都留白，避免正负峰贴边
      minValue -= pad
      maxValue += pad
    }

    // 面积 points 在物理坐标系（x=t, y=value），按 currentTime 截断以与曲线动态一致
    // 面积同时按 currentTime 和观察窗口 maxTime 双截断：
    // 既反映播放进度，又不超出图表 X 域
    const areaPoints = areaVariant
      ? points
          .filter((p) => p.t <= Math.min(currentTime, maxTime) + 1e-9)
          .map((p) => ({ x: p.t, y: p.value }))
      : []

    // cursor 钳制：currentTime > maxTime 时不画（避免 cursor 跑出右边）
    const isCursorVisible = currentTime <= maxTime + 1e-9

    return { maxTime, minValue, maxValue, areaPoints, isCursorVisible }
  }, [points, domainPoints, currentTime, terminalValue, zeroBased, areaVariant])
}

/** SingleChart 内部内容：通过 useChartContext 获取 BasePhysicsChart 提供的坐标系 */
function SingleChartContent({
  points, currentTime, currentValue, color, yLabel, areaText,
  areaVariant, terminalValue, maxTime, areaPoints, isCursorVisible,
}: {
  points: Array<{ t: number; value: number }>
  currentTime: number
  currentValue: number
  color: string
  yLabel: string
  areaText: string
  areaVariant?: ChartAreaVariant
  terminalValue?: number
  maxTime: number
  areaPoints: Array<{ x: number; y: number }>
  isCursorVisible: boolean
}) {
  const ctx = useChartContext()

  // 绘制点过滤：超出观察窗口 (t > maxTime) 的点不画
  // 避免曲线伸出绘图区右边，与 cursor 隐藏策略保持一致
  const curvePath = useMemo(() => {
    if (!ctx) return ''
    const visible = points.filter((p) => p.t <= maxTime + 1e-9)
    if (visible.length < 2) return ''
    return 'M ' + visible.map((p) => `${ctx.toSvgX(p.t).toFixed(2)},${ctx.toSvgY(p.value).toFixed(2)}`).join(' L ')
  }, [ctx, points, maxTime])

  if (!ctx) return null

  return (
    <g>
      {/* 面积填充（曲线下方，使用 ChartArea；按 currentTime 截断） */}
      {areaVariant && areaPoints.length >= 2 && (
        <ChartArea
          points={areaPoints}
          baseline={0}
          variant={areaVariant}
          intensity="subtle"
          stroke={color}
          strokeWidth={STROKE.guide}
        />
      )}

      {/* 曲线 */}
      {curvePath && (
        <path
          d={curvePath}
          fill="none"
          stroke={color}
          strokeWidth={STROKE.chartMain}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* 渐近线 */}
      {terminalValue != null && (
        <line
          x1={ctx.plotOrigin.x}
          x2={ctx.plotOrigin.x + ctx.plotSize.width}
          y1={ctx.toSvgY(terminalValue)}
          y2={ctx.toSvgY(terminalValue)}
          stroke={CHART_COLORS.asymptote}
          strokeWidth={STROKE.chartRef}
          strokeDasharray={DASH.boundary.join(' ')}
        />
      )}

      {/* 扫描线 + 当前点（使用 ChartCursor，自动消费 ChartContext）
          当 currentTime 超出观察窗口 maxTime 时隐藏，避免 cursor 跑出右边 */}
      {isCursorVisible && (
        <ChartCursor
          x={currentTime}
          dataPoints={[{ y: currentValue, label: yLabel.split('/')[0], series: 'primary' }]}
          showLabels={false}
        />
      )}

      {/* 面积文字 */}
      <text
        x={ctx.plotOrigin.x + ctx.font(FONT.small)}
        y={ctx.plotOrigin.y + ctx.font(FONT.label)}
        fill={CHART_COLORS.titleText}
        fontSize={ctx.font(FONT.annotation)}
        fontWeight={FONT.labelWeight}
      >
        {areaText}
      </text>
    </g>
  )
}

function SingleChart({
  width, height, points, domainPoints, currentTime, currentValue,
  color, yLabel, areaText, areaVariant, terminalValue, zeroBased,
}: SingleChartProps) {
  const { maxTime, minValue, maxValue, areaPoints, isCursorVisible } = useChartDomains({
    points, domainPoints, currentTime, terminalValue, zeroBased, areaVariant,
  })

  return (
    <BasePhysicsChart
      xDomain={[0, maxTime]}
      yDomain={[minValue, maxValue]}
      xLabel="t/s"
      yLabel={yLabel}
      yBaseline={minValue < 0 ? 0 : undefined}
      initialSize={{ width, height }}
      variant="mini"
      showGrid={true}
    >
      <SingleChartContent
        points={points}
        currentTime={currentTime}
        currentValue={currentValue}
        color={color}
        yLabel={yLabel}
        areaText={areaText}
        areaVariant={areaVariant}
        terminalValue={terminalValue}
        maxTime={maxTime}
        areaPoints={areaPoints}
        isCursorVisible={isCursorVisible}
      />
    </BasePhysicsChart>
  )
}

export default function ForceMotionTripleChart({
  points,
  domainPoints,
  currentTime,
  currentValueF,
  currentValueV,
  currentValueX,
  terminalVelocity,
  areaTextF,
  areaTextV,
  areaTextX,
}: ForceMotionTripleChartProps) {
  const [containerRef, size] = useCanvasSize(CANVAS_PRESETS.wide)
  const { width, height } = size

  const chartWidth = Math.max(1, Math.floor((width - 8) / 3))

  // 实时绘制数据（按 currentTime 截断）
  const fPoints = useMemo(() => points.map((p) => ({ t: p.t, value: p.F })), [points])
  const vPoints = useMemo(() => points.map((p) => ({ t: p.t, value: p.v })), [points])
  const xPoints = useMemo(() => points.map((p) => ({ t: p.t, value: Math.hypot(p.x, p.y) })), [points])

  // 定标数据：完整观察窗口的全量轨迹（仅随 params 变化，不每帧重算）
  const fDomain = useMemo(() => domainPoints?.map((p) => ({ t: p.t, value: p.F })), [domainPoints])
  const vDomain = useMemo(() => domainPoints?.map((p) => ({ t: p.t, value: p.v })), [domainPoints])
  const xDomain = useMemo(() => domainPoints?.map((p) => ({ t: p.t, value: Math.hypot(p.x, p.y) })), [domainPoints])

  return (
    <div ref={containerRef} className="w-full h-full grid grid-cols-3 gap-1">
      {/* F-t 图 — 橙色，面积 = 冲量 ∫Fdt */}
      <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden">
        <SingleChart
          width={chartWidth}
          height={height}
          points={fPoints}
          domainPoints={fDomain}
          currentTime={currentTime}
          currentValue={currentValueF}
          color={FX_CHART_COLORS.forceCurve}
          yLabel="F/N"
          areaText={areaTextF}
          areaVariant="warm"
          zeroBased={false}
        />
      </div>

      {/* v-t 图 — 蓝色，面积 = 位移 ∫vdt */}
      <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden">
        <SingleChart
          width={chartWidth}
          height={height}
          points={vPoints}
          domainPoints={vDomain}
          currentTime={currentTime}
          currentValue={currentValueV}
          color={VT_CHART_COLORS.velocityCurve}
          yLabel="v/(m·s⁻¹)"
          areaText={areaTextV}
          areaVariant="default"
          terminalValue={terminalVelocity}
          zeroBased={true}
        />
      </div>

      {/* x-t 图 — 灰色（位移轨迹本身就是积分结果，不画面积避免重复） */}
      <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden">
        <SingleChart
          width={chartWidth}
          height={height}
          points={xPoints}
          domainPoints={xDomain}
          currentTime={currentTime}
          currentValue={currentValueX}
          color={colors.neutral[500]}
          yLabel="x/m"
          areaText={areaTextX}
          zeroBased={true}
        />
      </div>
    </div>
  )
}
