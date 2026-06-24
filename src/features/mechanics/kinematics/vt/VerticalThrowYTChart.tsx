import { useMemo } from 'react'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  XT_CHART_COLORS,
} from '@/theme/physics'
import {
  ChartCursor,
  ChartSecant,
  ChartTangent,
  DisplacementTimeChart,
} from '@/components/Chart'
import type { UseVerticalThrowChartLayoutResult } from '../useVerticalThrowChartLayout'
import type { UseVerticalThrowPhysicsResult } from '../useVerticalThrowPhysics'
import { FullCurve, CurrentPoint, PeakPulse, TimeScrubber } from './VTChartPlugins'
import { HorizontalMarker, TargetHeightLayer } from './VTMarkers'

interface YTChartProps {
  layout: UseVerticalThrowChartLayoutResult
  physics: UseVerticalThrowPhysicsResult
  advancedMode: number
  airResistance: number
  showDoubleTrack: boolean
  targetHeight: number
  onTimeChange: (time: number) => void
}

interface DisplacementPoint {
  t: number
  x: number
}

export function VerticalThrowYTChart({
  layout, physics, advancedMode, airResistance, showDoubleTrack, targetHeight, onTimeChange,
}: YTChartProps) {
  const { xMax, ytYMax } = layout
  const {
    trajectory, effectiveTime, effectiveV, isLanded, isAtPeak,
    maxHeight, maxHeightVac, maxHeightTime,
    targetHeightIntersections, interpolatePoints,
  } = physics

  const tDomain: [number, number] = [0, xMax]
  const yDomainMax = Math.max(ytYMax, maxHeight * 1.15, maxHeightVac * 1.15, 5)
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
      points={airYTPoints} domainPoints={airYTPoints}
      currentTime={activeTime} tMax={xMax} tDomain={tDomain}
      xRange={[0, yDomainMax]}
      title="位移-时间图像 (y-t 图)" xLabel="t/s" yLabel="y/m"
      showArea areaVariant="warm" areaIntensity="subtle"
      showCursor={false} series="success" className="w-full h-full"
      underlay={
        <>
          <FullCurve points={airFullPoints} color={XT_CHART_COLORS.positionCurve} strokeWidth={1} opacity={0.12} />
          {airResistance > 0 && (
            <FullCurve points={vacFullPoints} color={CHART_COLORS.asymptote}
              strokeWidth={1} strokeDasharray="3,3" opacity={0.55} />
          )}
        </>
      }
    >
      <HorizontalMarker y={maxHeight} label="H" color={CHART_COLORS.zeroline} opacity={0.55} />

      {advancedMode === 1 && targetHeight > 0 && targetHeight < maxHeight && (
        <TargetHeightLayer targetHeight={targetHeight} targetHeightIntersections={targetHeightIntersections} />
      )}

      {showDoubleTrack && !isLanded && (
        <FullCurve
          points={trajectory.vacuumPoints.filter((p) => p.t <= activeTime + 1e-9).map((p) => ({ x: p.t, y: Math.max(p.y, 0) }))}
          color={PHYSICS_COLORS.position} strokeWidth={1.5} opacity={0.75} />
      )}

      {advancedMode === 1 && activeTime > 0.05 && !isLanded && (
        <ChartSecant
          point={{ x: 0, y: 0 }}
          secantPoint={{ x: activeTime, y: Math.max(activeAir.y, 0) }}
          label="v̄" dxLabel="t" dyLabel="y"
          color={PHYSICS_COLORS.secantLine} showTriangle
          strokeWidth={1} strokeDasharray="3,2"
          lineOpacity={0.65} triangleOpacity={0.07} />
      )}

      {advancedMode === 1 && activeTime > 0.05 && !isLanded && (
        <ChartTangent
          point={{ x: activeTime, y: Math.max(activeAir.y, 0) }}
          slope={effectiveV}
          extent={Math.min(0.6, xMax * 0.08)} label="k = v"
          color={VT_CHART_COLORS.slopeTangent} strokeWidth={1}
          lineOpacity={0.75} showPoint={false} />
      )}

      {isAtPeak && <PeakPulse x={maxHeightTime} y={maxHeight} color={CHART_COLORS.highlight} />}
      {!isAtPeak && activeTime > 0 && (
        <CurrentPoint x={activeTime} y={Math.max(activeAir.y, 0)} color={XT_CHART_COLORS.positionCurve} />
      )}
      {showDoubleTrack && !isLanded && (
        <CurrentPoint x={activeTime} y={Math.max(activeVac.y, 0)} color={PHYSICS_COLORS.position} radius={3.5} />
      )}

      {activeTime > 0 && (
        <ChartCursor x={activeTime}
          dataPoints={[{ y: Math.max(activeAir.y, 0), label: 'y', series: 'success' }]}
          showLabels={false} />
      )}
      <TimeScrubber tDomain={tDomain} onTimeChange={onTimeChange} />
    </DisplacementTimeChart>
  )
}
