import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { RelationChart } from '@/components/Chart'

interface EnergyTimeChartProps {
  mode: number
  chartLeft: number; chartWidth: number
  barAreaBottom: number; etAreaBottom: number
  visiblePoints: { t: number; Ep: number; Ek: number }[]
  springCurvePoints: { x: number; y: number }[]
  tMax: number; gravityMaxE: number; springMaxE: number
  state: { t: number; pos: number; Ep: number }
}

export function EnergyTimeChart({
  mode, chartLeft, chartWidth,
  barAreaBottom, etAreaBottom,
  visiblePoints, springCurvePoints,
  tMax, gravityMaxE, springMaxE, state,
}: EnergyTimeChartProps) {
  const height = etAreaBottom - barAreaBottom + 10
  return mode === 0 ? (
    <div className="absolute" style={{ left: chartLeft - 30, top: barAreaBottom, width: chartWidth + 50, height }}>
      <RelationChart
        points={visiblePoints.map(p => ({ x: p.t, y: p.Ep }))}
        additionalSeries={[
          { points: visiblePoints.map(p => ({ x: p.t, y: p.Ek })), label: 'Ek', series: 'secondary', color: PHYSICS_COLORS.kineticEnergy },
          { points: visiblePoints.map(p => ({ x: p.t, y: p.Ep + p.Ek })), label: 'E总', series: 'secondary', color: colors.neutral[500], strokeDasharray: [4, 2], strokeWidth: 1.2 },
        ]}
        xDomain={[0, tMax]} yDomain={[-gravityMaxE * 1.15, gravityMaxE * 1.15]}
        xLabel="t (s)" yLabel="E (J)" title="E-t (重力势能、动能及机械能变化 图像)"
        color={PHYSICS_COLORS.potentialEnergy} cursorX={state.t} cursorLabel={() => null} showZeroLine
      />
    </div>
  ) : (
    <div className="absolute" style={{ left: chartLeft - 30, top: barAreaBottom, width: chartWidth + 50, height }}>
      <RelationChart
        points={springCurvePoints}
        xDomain={[-3.2, 3.2]} yDomain={[0, springMaxE * 1.15]}
        xLabel="x (m)" yLabel="E_p (J)" title="E_p-x (弹性势能抛物线对称图像)"
        color={PHYSICS_COLORS.potentialElastic} cursorX={state.pos} cursorLabel={() => null}
        markers={Math.abs(state.pos) > 0.05 ? [
          { axis: 'point', x: -state.pos, y: state.Ep, label: '对称点', color: PHYSICS_COLORS.potentialElastic },
        ] : []}
      />
    </div>
  )
}
