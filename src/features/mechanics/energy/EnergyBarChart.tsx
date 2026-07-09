import { SVGSingleBar } from '@/components/Physics'
import { PHYSICS_COLORS, CANVAS_COLORS } from '@/theme/physics'

interface EnergyBarChartProps {
  mode: number
  chartLeft: number; chartWidth: number
  barAreaTop: number; barBaseY: number; maxBarH: number
  barW_H: number; barDeltaEp_H: number
  state: { W: number; Ep: number }
  deltaEp: number
  font: (n: number) => number; smallFont: number
}

export function EnergyBarChart({
  mode, chartLeft, chartWidth,
  barAreaTop, barBaseY, maxBarH,
  barW_H, barDeltaEp_H,
  state, deltaEp,
  font, smallFont,
}: EnergyBarChartProps) {
  const wBarX = chartLeft + chartWidth * 0.12
  const wBarWidth = chartWidth * 0.16
  const epBarX = chartLeft + chartWidth * 0.42
  const epBarWidth = chartWidth * 0.16

  return (
    <g>
      <text x={chartLeft} y={barAreaTop + 10} fontSize={smallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
        {mode === 0 ? 'W重 = -ΔEp 等价验证' : 'W弹 = -ΔEp 等价验证'}
      </text>

      <line x1={chartLeft + 10} y1={barBaseY} x2={chartLeft + chartWidth * 0.6} y2={barBaseY} stroke={CANVAS_COLORS.trackHistory} strokeWidth={0.8} />

      {/* W 柱 */}
      <SVGSingleBar
        x={wBarX}
        baseY={barBaseY}
        height={barW_H}
        barWidth={wBarWidth}
        color={PHYSICS_COLORS.work}
        label={mode === 0 ? 'W重' : 'W弹'}
        valueText={`${state.W >= 0 ? '+' : ''}${state.W.toFixed(1)}J`}
        font={font}
        showTrack={false}
      />

      {/* = */}
      <text x={chartLeft + chartWidth * 0.35} y={barBaseY - maxBarH * 0.4} fontSize={font(14)} fill={CANVAS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">=</text>

      {/* -ΔEp 柱 */}
      <SVGSingleBar
        x={epBarX}
        baseY={barBaseY}
        height={barDeltaEp_H}
        barWidth={epBarWidth}
        color={PHYSICS_COLORS.potentialEnergy}
        label="-ΔEp"
        valueText={`${-deltaEp >= 0 ? '+' : ''}${(-deltaEp).toFixed(1)}J`}
        font={font}
        showTrack={false}
      />
    </g>
  )
}
