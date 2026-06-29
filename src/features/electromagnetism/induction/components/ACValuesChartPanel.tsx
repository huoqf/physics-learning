import React, { useMemo } from 'react'
import { STROKE, DASH, FONT } from '@/theme/physics'
import { ChartCursor, VelocityTimeChart, useChartContext } from '@/components/Chart'
import { VISUAL_PERIOD } from '../hooks/useACValuesPhysics'

function ChartHorizontalLine({
  y,
  label,
  color,
  dash = DASH.reference.join(' '),
  opacity = 0.75,
}: {
  y: number
  label?: string
  color: string
  dash?: string
  opacity?: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const py = ctx.toSvgY(y)
  return (
    <g opacity={opacity}>
      <line
        x1={ctx.plotOrigin.x}
        y1={py}
        x2={ctx.plotOrigin.x + ctx.plotSize.width}
        y2={py}
        stroke={color}
        strokeWidth={STROKE.reference}
        strokeDasharray={dash}
      />
      {label && (
        <text
          x={ctx.plotOrigin.x + ctx.plotSize.width - 4}
          y={py - 4}
          fontSize={ctx.font(FONT.small)}
          fill={color}
          textAnchor="end"
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  )
}

function ChartVerticalLines({
  times,
  color,
  activeTime,
  activeColor,
}: {
  times: number[]
  color: string
  activeTime?: number
  activeColor?: string
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g>
      {times.map((timeValue) => {
        const x = ctx.toSvgX(timeValue)
        const active = activeTime != null && Math.abs(activeTime - timeValue) < VISUAL_PERIOD * 0.05
        return (
          <g key={`period-${timeValue}`}>
            <line
              x1={x}
              y1={ctx.plotOrigin.y}
              x2={x}
              y2={ctx.plotOrigin.y + ctx.plotSize.height}
              stroke={active && activeColor ? activeColor : color}
              strokeWidth={active ? STROKE.reference : STROKE.guide}
              strokeDasharray={DASH.projection.join(' ')}
              opacity={active ? 0.75 : 0.35}
            />
            <text
              x={x + 2}
              y={ctx.plotOrigin.y + ctx.plotSize.height - 3}
              fontSize={ctx.font(7.5)}
              fill={color}
              opacity={0.65}
            >
              {`${Math.round(timeValue / VISUAL_PERIOD)}T`}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function ChartPointPulse({
  x,
  y,
  color,
}: {
  x: number
  y: number
  color: string
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const cx = ctx.toSvgX(x)
  const cy = ctx.toSvgY(y)
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={color} stroke="white" strokeWidth={2} opacity={0.9} />
      <circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
    </g>
  )
}

export interface ACValuesChartPanelProps {
  wavePoints: { t: number; v: number }[]
  qPoints: { t: number; qAc: number; qDc: number }[]
  maxT: number
  t: number
  iNow: number
  Im: number
  Idc: number
  iAxisRange: number
  maxQ: number
  isSuccess: boolean
  atPeriodEnd: boolean
  qAc: number
  qDc: number
  colors: {
    iAC: string
    iDC: string
    im: string
    qAc: string
    qDc: string
    period: string
    success: string
  }
}

export const ACValuesChartPanel = React.memo(function ACValuesChartPanel({
  wavePoints,
  qPoints,
  maxT,
  t,
  iNow,
  Im,
  Idc,
  iAxisRange,
  maxQ,
  isSuccess,
  atPeriodEnd,
  qAc,
  qDc,
  colors: chartColors,
}: ACValuesChartPanelProps) {
  const periodLines = useMemo(() => {
    const count = Math.ceil(maxT / VISUAL_PERIOD)
    return Array.from({ length: count }, (_, i) => (i + 1) * VISUAL_PERIOD).filter((v) => v <= maxT + 1e-9)
  }, [maxT])

  const qAcSeries = useMemo(
    () => qPoints.map((p) => ({ t: p.t, v: p.qAc })),
    [qPoints]
  )
  const qDcSeries = useMemo(
    () => qPoints.map((p) => ({ t: p.t, v: p.qDc })),
    [qPoints]
  )

  return (
    <div className="w-full h-full flex flex-col gap-1">
      <div className="flex-1 min-h-0">
        <VelocityTimeChart
          points={wavePoints}
          domainPoints={wavePoints}
          currentTime={maxT}
          tMax={maxT}
          tDomain={[0, maxT]}
          vRange={[-iAxisRange, iAxisRange]}
          title="① 电流对比"
          xLabel="t/s"
          yLabel="i/A"
          showCursor={false}
          showArea={false}
          series="primary"
          className="w-full h-full"
        >
          <ChartVerticalLines times={periodLines} color={chartColors.period} />
          <ChartHorizontalLine y={Im} label={`Im=${Im.toFixed(1)}A`} color={chartColors.im} opacity={0.55} />
          {Idc > 0 && (
            <ChartHorizontalLine
              y={Idc}
              label={`Idc=${Idc.toFixed(2)}A`}
              color={chartColors.iDC}
              dash="8,4"
              opacity={0.85}
            />
          )}
          <ChartCursor
            x={t}
            dataPoints={[{ y: iNow, label: 'i', series: 'primary' }]}
            formatValue={(v) => `${v.toFixed(2)} A`}
            showLabels
          />
        </VelocityTimeChart>
      </div>

      <div className="flex-1 min-h-0">
        <VelocityTimeChart
          points={qAcSeries}
          domainPoints={qAcSeries}
          currentTime={t}
          tMax={maxT}
          tDomain={[0, maxT]}
          vRange={[0, maxQ]}
          title="② 热量赛跑"
          xLabel="t/s"
          yLabel="Q/J"
          showCursor={false}
          showArea={false}
          series="success"
          additionalSeries={[{ points: qDcSeries, domainPoints: qDcSeries, label: 'Qdc', series: 'warm' }]}
          className="w-full h-full"
        >
          <ChartVerticalLines
            times={periodLines}
            color={chartColors.period}
            activeTime={isSuccess && atPeriodEnd ? t : undefined}
            activeColor={chartColors.success}
          />
          <ChartCursor
            x={t}
            dataPoints={[
              { y: qAc, label: 'Qac', series: 'success' },
              { y: qDc, label: 'Qdc', series: 'warm' },
            ]}
            formatValue={(v) => `${v.toFixed(1)} J`}
            showLabels
          />
          {isSuccess && atPeriodEnd && <ChartPointPulse x={t} y={qAc} color={chartColors.success} />}
        </VelocityTimeChart>
      </div>
    </div>
  )
})
