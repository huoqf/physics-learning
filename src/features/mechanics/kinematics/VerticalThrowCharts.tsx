import { useMemo, useRef, type MouseEvent } from 'react'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  XT_CHART_COLORS,
  STROKE,
  DASH,
  FONT,
} from '@/theme/physics'
import {
  ChartArea,
  ChartCursor,
  ChartSecant,
  ChartTangent,
  DisplacementTimeChart,
  VelocityTimeChart,
  useChartContext,
} from '@/components/Chart'
import type { UseVerticalThrowChartLayoutResult } from './useVerticalThrowChartLayout'
import type { UseVerticalThrowPhysicsResult, VerticalThrowTrajectoryPoint } from './useVerticalThrowPhysics'

/** 脉冲动画周期 (ms) */
const PULSE_PERIOD = 800

interface VerticalThrowChartsProps {
  layout: UseVerticalThrowChartLayoutResult
  physics: UseVerticalThrowPhysicsResult
  advancedMode: number
  sliceDensity: number
  airResistance: number
  showDoubleTrack: boolean
  targetHeight: number
  g: number
  onTimeChange: (time: number) => void
}

interface TimePoint {
  t: number
  v: number
}

interface DisplacementPoint {
  t: number
  x: number
}

function toSvgLocalX(e: MouseEvent<SVGElement>): number {
  const svg = e.currentTarget.ownerSVGElement
  if (!svg) return 0
  const rect = svg.getBoundingClientRect()
  const svgWidth = svg.viewBox.baseVal.width || svg.width.baseVal.value || rect.width
  return (e.clientX - rect.left) * (svgWidth / Math.max(rect.width, 1))
}

function buildPath(
  points: { x: number; y: number }[],
  toSvgX: (v: number) => number,
  toSvgY: (v: number) => number,
): string {
  if (points.length < 2) return ''
  return (
    'M ' +
    points
      .map((p) => `${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
      .join(' L ')
  )
}

function FullCurve({
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

function TimeScrubber({
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
      onMouseDown={(e) => {
        draggingRef.current = true
        selectTime(e)
      }}
      onMouseMove={(e) => {
        if (draggingRef.current) selectTime(e)
      }}
      onMouseUp={() => {
        draggingRef.current = false
      }}
      onMouseLeave={() => {
        draggingRef.current = false
      }}
      onClick={selectTime}
    />
  )
}

function VTAreaLayer({
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
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
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
        <ChartArea
          points={areaPoints}
          xRange={[0, Math.min(peakTime, activeTime)]}
          baseline={0}
          variant="default"
          intensity="normal"
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={0.8}
        />
      )}
      {activeTime > peakTime && (
        <ChartArea
          points={areaPoints}
          xRange={[peakTime, activeTime]}
          baseline={0}
          variant="warm"
          intensity="normal"
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={0.8}
        />
      )}
    </g>
  )
}

function VerticalThrowVTChart({
  layout,
  physics,
  advancedMode,
  sliceDensity,
  airResistance,
  showDoubleTrack,
  g,
  onTimeChange,
}: Pick<VerticalThrowChartsProps, 'layout' | 'physics' | 'advancedMode' | 'sliceDensity' | 'airResistance' | 'showDoubleTrack' | 'g' | 'onTimeChange'>) {
  const {
    xMax,
    vtVMax,
  } = layout
  const {
    trajectory,
    effectiveTime,
    isLanded,
    isAtPeak,
    maxHeightTime,
    areaValues,
    targetHeightIntersections,
    vT1,
    vT2,
    interpolatePoints,
  } = physics

  const tDomain: [number, number] = [0, xMax]
  const activeTime = Math.min(effectiveTime, xMax)
  const activeAir = interpolatePoints(activeTime, trajectory.points)
  const activeVac = interpolatePoints(activeTime, trajectory.vacuumPoints)

  const airVTPoints = useMemo<TimePoint[]>(
    () => trajectory.points.map((p) => ({ t: p.t, v: p.v })),
    [trajectory.points],
  )
  const vacVTPoints = useMemo(
    () => trajectory.vacuumPoints.filter((p) => p.t <= xMax + 1e-9).map((p) => ({ x: p.t, y: p.v })),
    [trajectory.vacuumPoints, xMax],
  )
  const airFullPoints = useMemo(
    () => trajectory.points.filter((p) => p.t <= xMax + 1e-9).map((p) => ({ x: p.t, y: p.v })),
    [trajectory.points, xMax],
  )

  return (
    <VelocityTimeChart
      points={airVTPoints}
      domainPoints={airVTPoints}
      currentTime={activeTime}
      tMax={xMax}
      tDomain={tDomain}
      vRange={[-vtVMax, vtVMax]}
      title="速度-时间图像 (v-t 图)"
      xLabel="t/s"
      yLabel="v/(m·s⁻¹)"
      showArea={false}
      showCursor={false}
      className="w-full h-full"
      underlay={
        <>
          <FullCurve points={airFullPoints} color={VT_CHART_COLORS.velocityCurve} strokeWidth={1} opacity={0.14} />
          {airResistance > 0 && (
            <FullCurve
              points={vacVTPoints}
              color={CHART_COLORS.asymptote}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.55}
            />
          )}
          <VTAreaLayer
            trajectoryPoints={trajectory.points}
            activeTime={activeTime}
            peakTime={maxHeightTime}
            advancedMode={advancedMode}
            sliceDensity={sliceDensity}
            interpolatePoints={interpolatePoints}
          />
        </>
      }
    >
      {showDoubleTrack && !isLanded && (
        <FullCurve
          points={trajectory.vacuumPoints.filter((p) => p.t <= activeTime + 1e-9).map((p) => ({ x: p.t, y: p.v }))}
          color={PHYSICS_COLORS.position}
          strokeWidth={1.5}
          opacity={0.75}
        />
      )}

      {isAtPeak && (
        <g>
          <ChartTangent
            point={{ x: maxHeightTime, y: 0 }}
            slope={-g}
            extent={Math.min(0.5, xMax * 0.08)}
            label="k = -g"
            color={CHART_COLORS.criticalPt}
            strokeWidth={1}
            lineOpacity={0.85}
            showPoint={false}
            strokeDasharray="2,2"
          />
          <circle cx={0} cy={0} r={0} fill="none" />
          <PeakPulse x={maxHeightTime} y={0} />
        </g>
      )}

      {advancedMode === 1 && targetHeightIntersections && (
        <VTTargetMarkers
          activeTime={activeTime}
          targetHeightIntersections={targetHeightIntersections}
          vT1={vT1}
          vT2={vT2}
        />
      )}

      {!isAtPeak && activeTime > 0 && (
        <CurrentPoint x={activeTime} y={activeAir.v} color={VT_CHART_COLORS.velocityCurve} />
      )}
      {showDoubleTrack && !isLanded && (
        <CurrentPoint x={activeTime} y={activeVac.v} color={PHYSICS_COLORS.position} radius={3.5} />
      )}

      {activeTime > 0 && (
        <ChartCursor
          x={activeTime}
          dataPoints={[{ y: activeAir.v, label: 'v', series: 'primary' }]}
          showLabels={false}
        />
      )}

      {advancedMode === 1 && areaValues && <AreaValuesBox areaValues={areaValues} />}
      <TimeScrubber tDomain={tDomain} onTimeChange={onTimeChange} />
    </VelocityTimeChart>
  )
}

function VerticalThrowYTChart({
  layout,
  physics,
  advancedMode,
  airResistance,
  showDoubleTrack,
  targetHeight,
  onTimeChange,
}: Pick<VerticalThrowChartsProps, 'layout' | 'physics' | 'advancedMode' | 'airResistance' | 'showDoubleTrack' | 'targetHeight' | 'onTimeChange'>) {
  const { xMax, ytYMax } = layout
  const {
    trajectory,
    effectiveTime,
    effectiveV,
    isLanded,
    isAtPeak,
    maxHeight,
    maxHeightTime,
    targetHeightIntersections,
    interpolatePoints,
  } = physics

  const tDomain: [number, number] = [0, xMax]
  const activeTime = Math.min(effectiveTime, xMax)
  const activeAir = interpolatePoints(activeTime, trajectory.points)
  const activeVac = interpolatePoints(activeTime, trajectory.vacuumPoints)

  const airYTPoints = useMemo<DisplacementPoint[]>(
    () => trajectory.points.map((p) => ({ t: p.t, x: Math.max(p.y, 0) })),
    [trajectory.points],
  )
  const airFullPoints = useMemo(
    () => trajectory.points.filter((p) => p.t <= xMax + 1e-9).map((p) => ({ x: p.t, y: Math.max(p.y, 0) })),
    [trajectory.points, xMax],
  )
  const vacFullPoints = useMemo(
    () => trajectory.vacuumPoints.filter((p) => p.t <= xMax + 1e-9).map((p) => ({ x: p.t, y: Math.max(p.y, 0) })),
    [trajectory.vacuumPoints, xMax],
  )

  return (
    <DisplacementTimeChart
      points={airYTPoints}
      domainPoints={airYTPoints}
      currentTime={activeTime}
      tMax={xMax}
      tDomain={tDomain}
      xRange={[0, ytYMax]}
      title="位移-时间图像 (y-t 图)"
      xLabel="t/s"
      yLabel="y/m"
      showArea
      areaVariant="warm"
      areaIntensity="subtle"
      showCursor={false}
      series="success"
      className="w-full h-full"
      underlay={
        <>
          <FullCurve points={airFullPoints} color={XT_CHART_COLORS.positionCurve} strokeWidth={1} opacity={0.12} />
          {airResistance > 0 && (
            <FullCurve
              points={vacFullPoints}
              color={CHART_COLORS.asymptote}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.55}
            />
          )}
        </>
      }
    >
      <HorizontalMarker y={maxHeight} label="H" color={CHART_COLORS.zeroline} opacity={0.55} />

      {advancedMode === 1 && targetHeight > 0 && targetHeight < maxHeight && (
        <TargetHeightLayer
          targetHeight={targetHeight}
          targetHeightIntersections={targetHeightIntersections}
        />
      )}

      {showDoubleTrack && !isLanded && (
        <FullCurve
          points={trajectory.vacuumPoints.filter((p) => p.t <= activeTime + 1e-9).map((p) => ({ x: p.t, y: Math.max(p.y, 0) }))}
          color={PHYSICS_COLORS.position}
          strokeWidth={1.5}
          opacity={0.75}
        />
      )}

      {advancedMode === 1 && activeTime > 0.05 && !isLanded && (
        <ChartSecant
          point={{ x: 0, y: 0 }}
          secantPoint={{ x: activeTime, y: Math.max(activeAir.y, 0) }}
          label="v̄"
          dxLabel="t"
          dyLabel="y"
          color={PHYSICS_COLORS.secantLine}
          showTriangle
          strokeWidth={1}
          strokeDasharray="3,2"
          lineOpacity={0.65}
          triangleOpacity={0.07}
        />
      )}

      {advancedMode === 1 && activeTime > 0.05 && !isLanded && (
        <ChartTangent
          point={{ x: activeTime, y: Math.max(activeAir.y, 0) }}
          slope={effectiveV}
          extent={Math.min(0.6, xMax * 0.08)}
          label="k = v"
          color={VT_CHART_COLORS.slopeTangent}
          strokeWidth={1}
          lineOpacity={0.75}
          showPoint={false}
        />
      )}

      {isAtPeak && <PeakPulse x={maxHeightTime} y={maxHeight} color={CHART_COLORS.highlight} />}
      {!isAtPeak && activeTime > 0 && (
        <CurrentPoint x={activeTime} y={Math.max(activeAir.y, 0)} color={XT_CHART_COLORS.positionCurve} />
      )}
      {showDoubleTrack && !isLanded && (
        <CurrentPoint x={activeTime} y={Math.max(activeVac.y, 0)} color={PHYSICS_COLORS.position} radius={3.5} />
      )}

      {activeTime > 0 && (
        <ChartCursor
          x={activeTime}
          dataPoints={[{ y: Math.max(activeAir.y, 0), label: 'y', series: 'success' }]}
          showLabels={false}
        />
      )}
      <TimeScrubber tDomain={tDomain} onTimeChange={onTimeChange} />
    </DisplacementTimeChart>
  )
}

function CurrentPoint({ x, y, color, radius = 4.5 }: { x: number; y: number; color: string; radius?: number }) {
  const ctx = useChartContext()
  if (!ctx) return null
  return <circle cx={ctx.toSvgX(x)} cy={ctx.toSvgY(y)} r={radius} fill={color} opacity={0.9} />
}

function PeakPulse({ x, y, color = VT_CHART_COLORS.zeroCrossing }: { x: number; y: number; color?: string }) {
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

function VTTargetMarkers({
  activeTime,
  targetHeightIntersections,
  vT1,
  vT2,
}: {
  activeTime: number
  targetHeightIntersections: { t1: number; t2: number }
  vT1: number
  vT2: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const opacity = Math.abs(activeTime - targetHeightIntersections.t1) < 0.2 || Math.abs(activeTime - targetHeightIntersections.t2) < 0.2 ? 0.95 : 0.25
  return (
    <g opacity={opacity}>
      {[{ t: targetHeightIntersections.t1, v: vT1 }, { t: targetHeightIntersections.t2, v: vT2 }].map((p, idx) => (
        <g key={`vt-target-${idx}`}>
          <line
            x1={ctx.plotOrigin.x} y1={ctx.toSvgY(p.v)}
            x2={ctx.toSvgX(p.t)} y2={ctx.toSvgY(p.v)}
            stroke={CHART_COLORS.highlight}
            strokeWidth={0.8}
            strokeDasharray="2,2"
          />
          <circle cx={ctx.toSvgX(p.t)} cy={ctx.toSvgY(p.v)} r={3.5} fill={CHART_COLORS.highlight} />
        </g>
      ))}
    </g>
  )
}

function HorizontalMarker({
  y,
  label,
  color,
  opacity = 0.6,
}: {
  y: number
  label?: string
  color: string
  opacity?: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g opacity={opacity}>
      <line
        x1={ctx.plotOrigin.x}
        y1={ctx.toSvgY(y)}
        x2={ctx.plotOrigin.x + ctx.plotSize.width}
        y2={ctx.toSvgY(y)}
        stroke={color}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.reference.join(' ')}
      />
      {label && (
        <text
          x={ctx.plotOrigin.x + ctx.plotSize.width - 4}
          y={ctx.toSvgY(y) - 4}
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

function TargetHeightLayer({
  targetHeight,
  targetHeightIntersections,
}: {
  targetHeight: number
  targetHeightIntersections: { t1: number; t2: number } | null
}) {
  const ctx = useChartContext()
  if (!ctx) return null

  return (
    <g>
      <HorizontalMarker y={targetHeight} label={`y=${targetHeight}m`} color={CHART_COLORS.highlight} opacity={0.75} />
      {targetHeightIntersections && (
        <>
          {[targetHeightIntersections.t1, targetHeightIntersections.t2].map((t, idx) => (
            <g key={`yt-target-${idx}`}>
              <line
                x1={ctx.toSvgX(t)} y1={ctx.plotOrigin.y}
                x2={ctx.toSvgX(t)} y2={ctx.plotOrigin.y + ctx.plotSize.height}
                stroke={CHART_COLORS.highlight}
                strokeWidth={0.8}
                strokeDasharray={DASH.tangent.join(' ')}
                opacity={0.5}
              />
              <text
                x={ctx.toSvgX(t)}
                y={ctx.plotOrigin.y + ctx.plotSize.height + ctx.font(8)}
                fontSize={ctx.font(8)}
                fill={CHART_COLORS.highlight}
                textAnchor="middle"
              >
                t{idx + 1}={t.toFixed(2)}s
              </text>
            </g>
          ))}
        </>
      )}
    </g>
  )
}

function AreaValuesBox({
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
      <rect
        x={x}
        y={y}
        width={112}
        height={44}
        fill={PHYSICS_COLORS.objectFillNeutral}
        opacity={0.88}
        rx={3}
        stroke={CHART_COLORS.gridLine}
        strokeWidth={0.8}
      />
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

/**
 * 竖直上抛右侧双图表区。
 *
 * 这里完成高难度三件套的最后一步：右侧 v-t / y-t 图迁入
 * VelocityTimeChart / DisplacementTimeChart 预设，仅保留上抛专题特有的
 * 标记、割线、切线、目标高度与面积信息作为插件层。
 */
export function VerticalThrowCharts({
  layout,
  physics,
  advancedMode,
  sliceDensity,
  airResistance,
  showDoubleTrack,
  targetHeight,
  g,
  onTimeChange,
}: VerticalThrowChartsProps) {
  const {
    dataX,
    dataWidth,
    vtChartTop,
    vtChartHeight,
    ytChartTop,
    ytChartHeight,
  } = layout

  return (
    <>
      <foreignObject x={dataX} y={vtChartTop} width={dataWidth} height={vtChartHeight}>
        <div className="w-full h-full">
          <VerticalThrowVTChart
            layout={layout}
            physics={physics}
            advancedMode={advancedMode}
            sliceDensity={sliceDensity}
            airResistance={airResistance}
            showDoubleTrack={showDoubleTrack}
            g={g}
            onTimeChange={onTimeChange}
          />
        </div>
      </foreignObject>

      <foreignObject x={dataX} y={ytChartTop} width={dataWidth} height={ytChartHeight}>
        <div className="w-full h-full">
          <VerticalThrowYTChart
            layout={layout}
            physics={physics}
            advancedMode={advancedMode}
            airResistance={airResistance}
            showDoubleTrack={showDoubleTrack}
            targetHeight={targetHeight}
            onTimeChange={onTimeChange}
          />
        </div>
      </foreignObject>
    </>
  )
}

export default VerticalThrowCharts
