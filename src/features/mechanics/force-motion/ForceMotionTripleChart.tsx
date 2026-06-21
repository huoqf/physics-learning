import { useMemo } from 'react'
import { CHART_COLORS, FX_CHART_COLORS, VT_CHART_COLORS, DASH, FONT, STROKE } from '@/theme/physics'
import type { ChartAreaVariant } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { useCanvasSize } from '@/utils/useCanvasSize'
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
  points: ChartPoint[]
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
  points: Array<{ t: number; value: number }>
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

    const maxTime = Math.max(currentTime, points.at(-1)?.t ?? 1, 1)
    const values = points.map((p) => p.value)
    if (terminalValue != null) values.push(terminalValue)
    values.push(0)

    const maxAbs = Math.max(1, ...values.map(Math.abs))
    const minValue = zeroBased ? 0 : (values.some((v) => v < 0) ? -maxAbs : 0)
    const maxValue = maxAbs
    const valueSpan = Math.max(1, maxValue - minValue)

    const toX = (t: number) => left + (t / maxTime) * chartWidth
    const toY = (value: number) => bottom - ((value - minValue) / valueSpan) * chartHeight

    const curve = points.map((p) => ({ x: toX(p.t), y: toY(p.value) }))
    const zeroY = toY(0)
    const scanX = toX(Math.min(currentTime, maxTime))

    return { left, right, top, bottom, chartWidth, chartHeight, toX, toY, curve, zeroY, scanX }
  }, [points, currentTime, height, terminalValue, width, zeroBased])

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
  const areaPoints = useMemo(
    () => areaVariant ? points.filter((p) => p.t <= currentTime + 1e-9).map((p) => ({ x: p.t, y: p.value })) : [],
    [areaVariant, points, currentTime],
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

      {/* 扫描线 + 当前点（使用 ChartCursor） */}
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

      {/* 面积文字 */}
      <text x={layout.left + FONT.small} y={layout.top + FONT.label} fill={CHART_COLORS.titleText} fontSize={FONT.annotation} fontWeight={FONT.labelWeight}>{areaText}</text>
    </svg>
  )
}

export default function ForceMotionTripleChart({
  points,
  currentTime,
  currentValueF,
  currentValueV,
  currentValueX,
  terminalVelocity,
  areaTextF,
  areaTextV,
  areaTextX,
}: ForceMotionTripleChartProps) {
  const [containerRef, size] = useCanvasSize({ width: 900, height: 200 })
  const { width, height, font } = size

  const chartWidth = Math.max(1, Math.floor((width - 8) / 3))

  const fPoints = useMemo(() => points.map((p) => ({ t: p.t, value: p.F })), [points])
  const vPoints = useMemo(() => points.map((p) => ({ t: p.t, value: p.v })), [points])
  const xPoints = useMemo(() => points.map((p) => ({ t: p.t, value: Math.hypot(p.x, p.y) })), [points])

  return (
    <div ref={containerRef} className="w-full h-full grid grid-cols-3 gap-1">
      {/* F-t 图 — 橙色，面积 = 冲量 ∫Fdt */}
      <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden">
        <SingleChart
          width={chartWidth}
          height={height}
          points={fPoints}
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
