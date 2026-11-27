import React from 'react'
import {
  BasePhysicsChart,
  ChartCursor,
  ChartLine,
  useChartContext,
} from '@/components/Chart'
import {
  ACCEL_CYCLE_DURATION,
  formatRelativityBeta,
} from '@/physics/relativity'
import {
  CHART_COLORS,
  DASH,
  FONT,
  PHYSICS_COLORS,
  SERIES_MAP,
  STROKE,
  withAlpha,
} from '@/theme/physics'
import type { RelativityPhysicsState } from '../hooks/useRelativityPhysics'

interface RelativityChartsProps {
  physics: RelativityPhysicsState
}

interface ChartBandProps {
  axis: 'x' | 'y'
  from: number
  to: number
  color: string
  label?: string
}

function ChartBand({ axis, from, to, color, label }: ChartBandProps) {
  const ctx = useChartContext()
  if (!ctx) return null

  const { toSvgX, toSvgY, plotOrigin, plotSize, font } = ctx
  const fontSize = font(FONT.small)

  if (axis === 'y') {
    const yTop = toSvgY(to)
    const yBottom = toSvgY(from)
    const h = Math.max(0, yBottom - yTop)
    return (
      <g>
        <rect
          x={plotOrigin.x}
          y={yTop}
          width={plotSize.width}
          height={h}
          fill={withAlpha(color, 0.12)}
        />
        {label && (
          <text
            x={plotOrigin.x + plotSize.width - 6}
            y={yBottom - 5}
            textAnchor="end"
            fill={color}
            fontSize={fontSize}
            fontWeight="bold"
          >
            {label}
          </text>
        )}
      </g>
    )
  }

  const xLeft = toSvgX(from)
  const xRight = toSvgX(to)
  const w = Math.max(0, xRight - xLeft)
  return (
    <g>
      <rect
        x={xLeft}
        y={plotOrigin.y}
        width={w}
        height={plotSize.height}
        fill={withAlpha(color, 0.12)}
      />
      {label && (
        <text
          x={xRight + 6}
          y={plotOrigin.y + plotSize.height - 8}
          textAnchor="start"
          fill={color}
          fontSize={fontSize}
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  )
}

interface ChartRefLineProps {
  y: number
  color: string
  label: string
  labelOffsetY?: number
}

function ChartRefLine({ y, color, label, labelOffsetY = -5 }: ChartRefLineProps) {
  const ctx = useChartContext()
  if (!ctx) return null

  const { toSvgY, plotOrigin, plotSize, font } = ctx
  const py = toSvgY(y)

  return (
    <g>
      <line
        x1={plotOrigin.x}
        y1={py}
        x2={plotOrigin.x + plotSize.width}
        y2={py}
        stroke={color}
        strokeWidth={STROKE.vectorThin}
        strokeDasharray={DASH.reference.join(',')}
      />
      <text
        x={plotOrigin.x + plotSize.width - 6}
        y={py + labelOffsetY}
        textAnchor="end"
        fill={color}
        fontSize={font(FONT.small)}
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  )
}

interface ChartPointMarkerProps {
  x: number
  y: number
  color: string
}

function ChartPointMarker({ x, y, color }: ChartPointMarkerProps) {
  const ctx = useChartContext()
  if (!ctx) return null

  return (
    <circle
      cx={ctx.toSvgX(x)}
      cy={ctx.toSvgY(y)}
      r={4.5}
      fill="none"
      stroke={color}
      strokeWidth={STROKE.tickBold}
      strokeDasharray={DASH.projection.join(',')}
    />
  )
}

interface LegendItem {
  label: string
  color: string
  dashed?: boolean
}

function ChartLegend({ items }: { items: LegendItem[] }) {
  const ctx = useChartContext()
  if (!ctx) return null

  const { plotOrigin, font } = ctx
  const smallFont = font(FONT.small)
  const startX = plotOrigin.x + 10
  const startY = plotOrigin.y + 13

  return (
    <g>
      {items.map((item, idx) => {
        const y = startY + idx * (smallFont + 5)
        return (
          <g key={item.label}>
            <line
              x1={startX}
              y1={y - smallFont * 0.32}
              x2={startX + 18}
              y2={y - smallFont * 0.32}
              stroke={item.color}
              strokeWidth={STROKE.chartMain}
              strokeDasharray={item.dashed ? DASH.reference.join(',') : undefined}
            />
            <text
              x={startX + 24}
              y={y}
              fill={CHART_COLORS.labelText}
              fontSize={smallFont}
              fontWeight="bold"
            >
              {item.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

export const RelativityCharts: React.FC<RelativityChartsProps> = ({ physics }) => {
  const {
    mode,
    newtonChartType,
    accelState,
    accelCurves,
    lorentzCurve,
    energyCurves,
  } = physics

  // ── Mode 2: 牛顿力学局限性（v-t 加速曲线 vs γ-β 因子曲线）──
  if (mode === 2) {
    if (newtonChartType === 1) {
      return (
        <BasePhysicsChart
          xDomain={[0, 0.95]}
          yDomain={[1, 3.5]}
          xLabel="速度比 β = v/c"
          yLabel="洛伦兹因子 γ"
          title="洛伦兹因子 γ(β) 随速度比变化（低速区 γ ≈ 1）"
          formatX={(v) => `${v.toFixed(2)}`}
          formatY={(v) => v.toFixed(1)}
          gridCount={{ x: 5, y: 4 }}
        >
          <ChartBand
            axis="x"
            from={0}
            to={0.1}
            color={PHYSICS_COLORS.wavelengthGreen}
            label="低速区 (β≤0.1)"
          />
          <ChartRefLine
            y={1.0}
            color={PHYSICS_COLORS.wavelengthGreen}
            label="牛顿基准 γ = 1"
            labelOffsetY={-6}
          />
          <ChartLine points={lorentzCurve} series="warm" strokeWidth={STROKE.chartMain} />
          <ChartPointMarker
            x={accelState.targetBeta}
            y={accelState.targetGamma}
            color={SERIES_MAP.primary}
          />
          <ChartCursor
            x={accelState.currentBeta}
            dataPoints={[
              { y: accelState.currentGamma, label: 'γ', series: 'warm' },
            ]}
            formatValue={(v) => v.toFixed(3)}
          />
        </BasePhysicsChart>
      )
    }

    const vtNearOverlap =
      Math.abs(accelState.classicalBeta - accelState.currentBeta) < accelCurves.yMax * 0.08

    return (
      <BasePhysicsChart
        xDomain={[0, ACCEL_CYCLE_DURATION]}
        yDomain={[0, accelCurves.yMax]}
        xLabel="时间 t (s)"
        yLabel="速度比 v/c"
        title={`恒力加速速度演化：目标 β₀ = ${formatRelativityBeta(accelState.targetBeta)}`}
        formatX={(v) => `${v.toFixed(1)}s`}
        formatY={(v) => `${v.toFixed(2)}c`}
        gridCount={{ x: 4, y: 4 }}
      >
        <ChartBand
          axis="y"
          from={0}
          to={0.1}
          color={PHYSICS_COLORS.wavelengthGreen}
          label="低速近似区 (v ≤ 0.1c)"
        />
        <ChartRefLine
          y={1.0}
          color={PHYSICS_COLORS.acceleration}
          label="光速极限 v = c"
          labelOffsetY={-5}
        />
        <ChartLine
          points={accelCurves.classical}
          series="primary"
          strokeWidth={STROKE.chartSub}
          dash={DASH.reference}
        />
        <ChartLine
          points={accelCurves.relativistic}
          series="accent"
          strokeWidth={STROKE.chartMain}
        />
        <ChartLegend
          items={[
            { label: '牛顿预测 v_cl = a₀t', color: SERIES_MAP.primary, dashed: true },
            { label: '相对论实际 v(t) < c', color: SERIES_MAP.accent },
          ]}
        />
        <ChartCursor
          x={accelState.groundTime}
          dataPoints={
            vtNearOverlap
              ? [{ y: accelState.currentBeta, label: 'v≈v_cl', series: 'accent' }]
              : [
                  { y: accelState.classicalBeta, label: 'v_cl', series: 'primary' },
                  { y: accelState.currentBeta, label: 'v', series: 'accent' },
                ]
          }
          formatValue={(v) => `${v.toFixed(2)}c`}
        />
      </BasePhysicsChart>
    )
  }

  // ── Mode 3: 质能关系与相对论动能壁垒 ──
  const ekRel16 = accelState.currentEnergy.kineticEnergy / 1e16
  const ekCl16 = accelState.currentClassicalEk / 1e16
  const ekNearOverlap = Math.abs(ekRel16 - ekCl16) < energyCurves.yMax * 0.08

  return (
    <BasePhysicsChart
      xDomain={[0, 0.95]}
      yDomain={[0, energyCurves.yMax]}
      xLabel="速度比 β = v/c"
      yLabel="动能 (×10¹⁶ J)"
      title="动能演化对比：经典 ½m₀v² vs 相对论 (γ − 1)m₀c²"
      formatX={(v) => `${v.toFixed(2)}`}
      formatY={(v) => v.toFixed(1)}
      gridCount={{ x: 5, y: 4 }}
    >
      <ChartBand
        axis="x"
        from={0}
        to={0.2}
        color={PHYSICS_COLORS.wavelengthGreen}
        label="低速近似重合"
      />
      <ChartLine
        points={energyCurves.classical}
        series="primary"
        strokeWidth={STROKE.chartSub}
        dash={DASH.reference}
      />
      <ChartLine
        points={energyCurves.relativistic}
        series="secondary"
        strokeWidth={STROKE.chartMain}
      />
      <ChartLegend
        items={[
          { label: '经典动能 ½m₀v²', color: SERIES_MAP.primary, dashed: true },
          { label: '相对论动能 (γ−1)m₀c²', color: SERIES_MAP.secondary },
        ]}
      />
      <ChartCursor
        x={accelState.currentBeta}
        dataPoints={
          ekNearOverlap
            ? [{ y: ekRel16, label: 'E_k≈E_k0', series: 'secondary' }]
            : [
                { y: ekCl16, label: 'E_k0', series: 'primary' },
                { y: ekRel16, label: 'E_k', series: 'secondary' },
              ]
        }
        formatValue={(v) => v.toFixed(2)}
      />
    </BasePhysicsChart>
  )
}
