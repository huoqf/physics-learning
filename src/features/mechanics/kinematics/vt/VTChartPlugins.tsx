import { useMemo, useRef, type MouseEvent } from 'react'
import { PHYSICS_COLORS, VT_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { ChartArea, useChartContext } from '@/components/Chart'
import type { UseVerticalThrowPhysicsResult, VerticalThrowTrajectoryPoint } from '../useVerticalThrowPhysics'
import { toSvgLocalX, buildPath } from './vtChartUtils'

export function FullCurve({
  points,
  color,
  strokeWidth = 1,
  strokeDasharray,
  opacity = 0.18,
}: {
  points: { x: number; y: number }[]
  color: string
  strokeWidth?: number
  strokeDasharray?: string
  opacity?: number
}) {
  const ctx = useChartContext()
  const d = useMemo(() => {
    if (!ctx) return ''
    return buildPath(points, ctx.toSvgX, ctx.toSvgY)
  }, [ctx, points])

  if (!d) return null
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      opacity={opacity}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/** 脉冲动画周期 (ms) */
const PULSE_PERIOD = 800

export function TimeScrubber({
  tDomain,
  onTimeChange,
}: {
  tDomain: [number, number]
  onTimeChange: (time: number) => void
}) {
  const ctx = useChartContext()
  const draggingRef = useRef(false)

  if (!ctx) return null

  const selectTime = (e: MouseEvent<SVGElement>) => {
    const localX = toSvgLocalX(e)
    const rawRatio = (localX - ctx.plotOrigin.x) / Math.max(ctx.plotSize.width, 1)
    const ratio = Math.min(1, Math.max(0, rawRatio))
    const t = tDomain[0] + ratio * (tDomain[1] - tDomain[0])
    onTimeChange(t)
  }

  return (
    <rect
      x={ctx.plotOrigin.x}
      y={ctx.plotOrigin.y}
      width={ctx.plotSize.width}
      height={ctx.plotSize.height}
      fill="transparent"
      cursor="crosshair"
      onMouseDown={(e) => { draggingRef.current = true; selectTime(e) }}
      onMouseMove={(e) => { if (draggingRef.current) selectTime(e) }}
      onMouseUp={() => { draggingRef.current = false }}
      onMouseLeave={() => { draggingRef.current = false }}
      onClick={selectTime}
    />
  )
}

export function VTAreaLayer({
  trajectoryPoints,
  activeTime,
  peakTime,
  advancedMode,
  sliceDensity,
  interpolatePoints,
}: {
  trajectoryPoints: VerticalThrowTrajectoryPoint[]
  activeTime: number
  peakTime: number
  advancedMode: number
  sliceDensity: number
  interpolatePoints: UseVerticalThrowPhysicsResult['interpolatePoints']
}) {
  const ctx = useChartContext()
  const areaPoints = useMemo(
    () => trajectoryPoints.map((p) => ({ x: p.t, y: p.v })),
    [trajectoryPoints],
  )

  const sliceRects = useMemo(() => {
    if (!ctx || advancedMode !== 1 || sliceDensity <= 0) return []
    const rects: Array<{ x: number; y: number; w: number; h: number; positive: boolean }> = []
    for (let t = 0; t < activeTime; t += sliceDensity) {
      const sliceEnd = Math.min(t + sliceDensity, activeTime)
      const { v } = interpolatePoints(t, trajectoryPoints)
      const x1 = ctx.toSvgX(t)
      const x2 = ctx.toSvgX(sliceEnd)
      const y0 = ctx.toSvgY(0)
      const yV = ctx.toSvgY(v)
      rects.push({
        x: x1,
        y: v >= 0 ? yV : y0,
        w: Math.max(0, x2 - x1),
        h: Math.abs(y0 - yV),
        positive: v >= 0,
      })
    }
    return rects
  }, [ctx, advancedMode, sliceDensity, activeTime, interpolatePoints, trajectoryPoints])

  if (advancedMode === 1 && sliceDensity > 0) {
    return (
      <g>
        {sliceRects.map((rect, idx) => (
          <rect
            key={`vt-slice-${idx}`}
            x={rect.x} y={rect.y} width={rect.w} height={rect.h}
            fill={rect.positive ? PHYSICS_COLORS.velocityX : PHYSICS_COLORS.acceleration}
            opacity={0.16}
          />
        ))}
      </g>
    )
  }

  return (
    <g>
      {activeTime > 0 && (
        <ChartArea points={areaPoints} xRange={[0, Math.min(peakTime, activeTime)]} baseline={0}
          variant="default" intensity="normal" stroke={PHYSICS_COLORS.velocity} strokeWidth={0.8} />
      )}
      {activeTime > peakTime && (
        <ChartArea points={areaPoints} xRange={[peakTime, activeTime]} baseline={0}
          variant="warm" intensity="normal" stroke={PHYSICS_COLORS.acceleration} strokeWidth={0.8} />
      )}
    </g>
  )
}

export function CurrentPoint({ x, y, color, radius = 4.5 }: { x: number; y: number; color: string; radius?: number }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return <circle cx={ctx.toSvgX(x)} cy={ctx.toSvgY(y)} r={radius} fill={color} opacity={0.9} />
}

export function PeakPulse({ x, y, color = VT_CHART_COLORS.zeroCrossing }: { x: number; y: number; color?: string }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g>
      <circle cx={ctx.toSvgX(x)} cy={ctx.toSvgY(y)} r={6} fill={color} opacity={0.6}>
        <animate attributeName="r" values="6;10;6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur={`${PULSE_PERIOD}ms`} repeatCount="indefinite" />
      </circle>
      <circle cx={ctx.toSvgX(x)} cy={ctx.toSvgY(y)} r={3} fill={color} />
    </g>
  )
}

export function AreaValuesBox({
  areaValues,
}: {
  areaValues: NonNullable<UseVerticalThrowPhysicsResult['areaValues']>
}) {
  const ctx = useChartContext()
  if (!ctx) return null

  const x = ctx.plotOrigin.x + ctx.plotSize.width - 116
  const y = ctx.plotOrigin.y + 6
  return (
    <g>
      <rect x={x} y={y} width={112} height={44} fill={PHYSICS_COLORS.objectFillNeutral}
        opacity={0.88} rx={3} stroke={CHART_COLORS.gridLine} strokeWidth={0.8} />
      <text x={x + 104} y={y + 13} fontSize={ctx.font(8)} fill={VT_CHART_COLORS.areaShade} textAnchor="end" fontWeight="bold">
        上升位移 S⁺ = {areaValues.positive.toFixed(2)} m
      </text>
      <text x={x + 104} y={y + 25} fontSize={ctx.font(8)} fill={VT_CHART_COLORS.zeroCrossing} textAnchor="end" fontWeight="bold">
        下落位移 S⁻ = {areaValues.negative.toFixed(2)} m
      </text>
      <text x={x + 104} y={y + 37} fontSize={ctx.font(8)} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">
        当前高度 y = {areaValues.net.toFixed(2)} m
      </text>
    </g>
  )
}
