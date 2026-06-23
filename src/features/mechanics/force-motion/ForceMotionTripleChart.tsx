import { useMemo } from 'react'
import { CHART_COLORS, FX_CHART_COLORS, VT_CHART_COLORS, DASH, FONT, STROKE } from '@/theme/physics'
import type { ChartAreaVariant } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useCanvasSize } from '@/utils/useCanvasSize'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { FORCE_MOTION_CHART_PADDING_RATIO } from './forceMotionLayout'
import { ChartCursor, ChartArea, ChartContext } from '@/components/Chart'
import type { ChartContextValue } from '@/components/Chart'

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

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
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
  font: (base: number) => number
}

function SingleChart({
  width,
  height,
  points,
  domainPoints,
  currentTime,
  currentValue,
  color,
  yLabel,
  areaText,
  areaVariant,
  terminalValue,
  zeroBased,
  font,
}: SingleChartProps) {
  const layout = useMemo(() => {
    const padding = Math.max(Math.min(width, height) * FORCE_MOTION_CHART_PADDING_RATIO, FONT.labelBold)
    const left = padding * 1.2
    const right = width - padding * 0.6
    const top = padding * 0.8
    const bottom = height - padding * 1.1
    const chartWidth = Math.max(1, right - left)
    const chartHeight = Math.max(1, bottom - top)

    // 定标用全量观察窗口数据，回退到实时 points（保持向后兼容）。
    // 关键：maxTime 仅由 rangeSource 决定，不再叠加 currentTime，
    // 避免播放超过观察窗口时 X 域被反向扩张。
    const rangeSource = domainPoints ?? points
    const maxTime = Math.max(rangeSource.at(-1)?.t ?? 1, 1)
    const values = rangeSource.map((p) => p.value)
    if (terminalValue != null) values.push(terminalValue)
    values.push(0)

    // Y 轴范围 + 15% padding（与 RelationChart / VelocityTimeChart 一致）
    // 避免恒值曲线（如恒力 F=const）整段贴图顶；同时让 terminalValue
    // 渐近线与曲线峰之间留出视觉缓冲。
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
    const valueSpan = Math.max(1, maxValue - minValue)

    const toX = (t: number) => left + (t / maxTime) * chartWidth
    const toY = (value: number) => bottom - ((value - minValue) / valueSpan) * chartHeight

    // 绘制点过滤：超出观察窗口 (t > maxTime) 的点不画
    // 避免曲线伸出绘图区右边，与 cursor 隐藏策略保持一致
    const visiblePoints = points.filter((p) => p.t <= maxTime + 1e-9)
    const curve = visiblePoints.map((p) => ({ x: toX(p.t), y: toY(p.value) }))
    const zeroY = toY(0)
    // cursor 钳制：currentTime > maxTime 时不画（由调用方判断 isCursorVisible）
    const isCursorVisible = currentTime <= maxTime + 1e-9
    const scanX = toX(Math.min(currentTime, maxTime))

    return {
      left, right, top, bottom, chartWidth, chartHeight,
      toX, toY, curve, zeroY, scanX, maxTime, isCursorVisible,
    }
  }, [points, domainPoints, currentTime, height, terminalValue, width, zeroBased])

  const curvePath = buildPath(layout.curve)

  // 仅当显示面积时构造 ChartContext：让 ChartArea 共用 SingleChart 的坐标系
  const chartCtx: ChartContextValue | null = useMemo(() => {
    if (!areaVariant) return null
    return {
      toSvgX: layout.toX,
      toSvgY: layout.toY,
      plotOrigin: { x: layout.left, y: layout.top },
      plotSize: { width: layout.chartWidth, height: layout.chartHeight },
      font,
      px: (n) => n,
    }
  }, [areaVariant, layout, font])

  // 面积 points 在物理坐标系（x=t, y=value），按 currentTime 截断以与曲线动态一致
  // 面积同时按 currentTime 和观察窗口 maxTime 双截断：
  // 既反映播放进度，又不超出图表 X 域
  const areaPoints = useMemo(
    () => {
      if (!areaVariant) return []
      const cap = Math.min(currentTime, layout.maxTime)
      return points.filter((p) => p.t <= cap + 1e-9).map((p) => ({ x: p.t, y: p.value }))
    },
    [areaVariant, points, currentTime, layout.maxTime],
  )

  return (
    <svg width={width} height={height} className="w-full h-full select-none">
      {/* 网格 */}
      {[0.25, 0.5, 0.75].map((ratio) => {
        const y = layout.top + ratio * layout.chartHeight
        return (
          <line
            key={`row-${ratio}`}
            x1={layout.left}
            x2={layout.right}
            y1={y}
            y2={y}
            stroke={CHART_COLORS.gridLine}
            strokeWidth={STROKE.grid}
            strokeDasharray={DASH.guide.join(' ')}
          />
        )
      })}
      {[0.25, 0.5, 0.75].map((ratio) => {
        const x = layout.left + ratio * layout.chartWidth
        return (
          <line
            key={`col-${ratio}`}
            x1={x}
            x2={x}
            y1={layout.top}
            y2={layout.bottom}
            stroke={CHART_COLORS.gridLine}
            strokeWidth={STROKE.grid}
            strokeDasharray={DASH.guide.join(' ')}
          />
        )
      })}

      {/* 坐标轴 */}
      <line x1={layout.left} x2={layout.right} y1={layout.bottom} y2={layout.bottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axis} />
      <line x1={layout.left} x2={layout.left} y1={layout.top} y2={layout.bottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axis} />

      {/* 标签 */}
      <text x={layout.right} y={layout.bottom + FONT.axis} textAnchor="end" fill={CHART_COLORS.labelText} fontSize={FONT.axis}>t/s</text>
      <text x={layout.left} y={Math.max(FONT.axis, layout.top - FONT.small)} fill={color} fontSize={FONT.axis} fontWeight="bold">{yLabel}</text>

      {/* 面积填充（曲线下方，使用 ChartArea；按 currentTime 截断） */}
      {chartCtx && areaPoints.length >= 2 && (
        <ChartContext.Provider value={chartCtx}>
          <ChartArea
            points={areaPoints}
            baseline={0}
            variant={areaVariant!}
            intensity="subtle"
            stroke={color}
            strokeWidth={STROKE.guide}
          />
        </ChartContext.Provider>
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
          x1={layout.left}
          x2={layout.right}
          y1={layout.toY(terminalValue)}
          y2={layout.toY(terminalValue)}
          stroke={CHART_COLORS.asymptote}
          strokeWidth={STROKE.chartRef}
          strokeDasharray={DASH.boundary.join(' ')}
        />
      )}

      {/* 扫描线 + 当前点（使用 ChartCursor）
          当 currentTime 超出观察窗口 maxTime 时隐藏，避免 cursor 跑出右边 */}
      {layout.isCursorVisible && (
        <ChartCursor
          x={currentTime}
          dataPoints={[{ y: currentValue, label: yLabel.split('/')[0], series: 'primary' }]}
          showLabels={false}
          toSvgX={layout.toX}
          toSvgY={layout.toY}
          plotOrigin={{ x: layout.left, y: layout.top }}
          plotSize={{ width: layout.chartWidth, height: layout.chartHeight }}
          font={font}
        />
      )}

      {/* 面积文字 */}
      <text x={layout.left + FONT.small} y={layout.top + FONT.label} fill={CHART_COLORS.titleText} fontSize={FONT.annotation} fontWeight={FONT.labelWeight}>{areaText}</text>
    </svg>
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
  const [containerRef, size] = useCanvasSize(CANVAS_PRESETS.extraWide)
  const { width, height, font } = size

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
          font={font}
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
          font={font}
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
          font={font}
        />
      </div>
    </div>
  )
}
