import { useMemo } from 'react'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
} from '@/theme/physics'
import {
  ChartCursor,
  ChartTangent,
  VelocityTimeChart,
} from '@/components/Chart'
import type { UseVerticalThrowChartLayoutResult } from '../useVerticalThrowChartLayout'
import type { UseVerticalThrowPhysicsResult } from '../useVerticalThrowPhysics'
import { FullCurve, VTAreaLayer, CurrentPoint, PeakPulse, AreaValuesBox, TimeScrubber } from './VTChartPlugins'
import { VTTargetMarkers } from './VTMarkers'

interface VTChartProps {
  layout: UseVerticalThrowChartLayoutResult
  physics: UseVerticalThrowPhysicsResult
  advancedMode: number
  sliceDensity: number
  airResistance: number
  showDoubleTrack: boolean
  g: number
  onTimeChange: (time: number) => void
}

interface TimePoint {
  t: number
  v: number
}

export function VerticalThrowVTChart({
  layout, physics, advancedMode, sliceDensity, airResistance, showDoubleTrack, g, onTimeChange,
}: VTChartProps) {
  const { xMax, vtVMax } = layout
  const {
    trajectory, effectiveTime, isLanded, isAtPeak, maxHeightTime,
    areaValues, targetHeightIntersections, vT1, vT2, interpolatePoints,
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
      points={airVTPoints} domainPoints={airVTPoints}
      currentTime={activeTime} tMax={xMax} tDomain={tDomain}
      vRange={[-vtVMax, vtVMax]}
      title="速度-时间图像 (v-t 图)" xLabel="t/s" yLabel="v/(m·s⁻¹)"
      showArea={false} showCursor={false} className="w-full h-full"
      underlay={
        <>
          <FullCurve points={airFullPoints} color={VT_CHART_COLORS.velocityCurve} strokeWidth={1} opacity={0.14} />
          {airResistance > 0 && (
            <FullCurve points={vacVTPoints} color={CHART_COLORS.asymptote}
              strokeWidth={1} strokeDasharray="3,3" opacity={0.55} />
          )}
          <VTAreaLayer
            trajectoryPoints={trajectory.points} activeTime={activeTime}
            peakTime={maxHeightTime} advancedMode={advancedMode}
            sliceDensity={sliceDensity} interpolatePoints={interpolatePoints}
          />
        </>
      }
    >
      {showDoubleTrack && !isLanded && (
        <FullCurve
          points={trajectory.vacuumPoints.filter((p) => p.t <= activeTime + 1e-9).map((p) => ({ x: p.t, y: p.v }))}
          color={PHYSICS_COLORS.position} strokeWidth={1.5} opacity={0.75} />
      )}

      {isAtPeak && (
        <g>
          <ChartTangent point={{ x: maxHeightTime, y: 0 }} slope={-g}
            extent={Math.min(0.5, xMax * 0.08)} label="k = -g"
            color={CHART_COLORS.criticalPt} strokeWidth={1}
            lineOpacity={0.85} showPoint={false} strokeDasharray="2,2" />
          <PeakPulse x={maxHeightTime} y={0} />
        </g>
      )}

      {advancedMode === 1 && targetHeightIntersections && (
        <VTTargetMarkers activeTime={activeTime}
          targetHeightIntersections={targetHeightIntersections}
          vT1={vT1} vT2={vT2} />
      )}

      {!isAtPeak && activeTime > 0 && (
        <CurrentPoint x={activeTime} y={activeAir.v} color={VT_CHART_COLORS.velocityCurve} />
      )}
      {showDoubleTrack && !isLanded && (
        <CurrentPoint x={activeTime} y={activeVac.v} color={PHYSICS_COLORS.position} radius={3.5} />
      )}

      {activeTime > 0 && (
        <ChartCursor x={activeTime}
          dataPoints={[{ y: activeAir.v, label: 'v', series: 'primary' }]}
          showLabels={false} />
      )}

      {advancedMode === 1 && areaValues && <AreaValuesBox areaValues={areaValues} />}
      <TimeScrubber tDomain={tDomain} onTimeChange={onTimeChange} />
    </VelocityTimeChart>
  )
}
