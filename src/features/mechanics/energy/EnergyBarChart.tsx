import { PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

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
  return (
    <g>
      <text x={chartLeft} y={barAreaTop + 10} fontSize={smallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
        {mode === 0 ? 'W重 = -ΔEp 等价验证' : 'W弹 = -ΔEp 等价验证'}
      </text>

      <line x1={chartLeft + 10} y1={barBaseY} x2={chartLeft + chartWidth * 0.6} y2={barBaseY} stroke={colors.neutral[400]} strokeWidth={0.8} />

      {/* W 柱 */}
      <rect x={chartLeft + chartWidth * 0.12} y={barBaseY - barW_H} width={chartWidth * 0.16} height={Math.max(barW_H, 0.5)} fill={PHYSICS_COLORS.work} opacity={0.85} rx={1} />
      <text x={chartLeft + chartWidth * 0.20} y={barBaseY - barW_H - 4} fontSize={font(8)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="bold">
        {state.W >= 0 ? '+' : ''}{state.W.toFixed(1)}J
      </text>
      <text x={chartLeft + chartWidth * 0.20} y={barBaseY + 12} fontSize={font(8)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="semibold">
        {mode === 0 ? 'W重' : 'W弹'}
      </text>

      {/* = */}
      <text x={chartLeft + chartWidth * 0.35} y={barBaseY - maxBarH * 0.4} fontSize={font(14)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">=</text>

      {/* -ΔEp 柱 */}
      <rect x={chartLeft + chartWidth * 0.42} y={barBaseY - barDeltaEp_H} width={chartWidth * 0.16} height={Math.max(barDeltaEp_H, 0.5)} fill={PHYSICS_COLORS.potentialEnergy} opacity={0.85} rx={1} />
      <text x={chartLeft + chartWidth * 0.50} y={barBaseY - barDeltaEp_H - 4} fontSize={font(8)} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="bold">
        {-deltaEp >= 0 ? '+' : ''}{(-deltaEp).toFixed(1)}J
      </text>
      <text x={chartLeft + chartWidth * 0.50} y={barBaseY + 12} fontSize={font(8)} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle" fontWeight="semibold">
        -ΔEp
      </text>
    </g>
  )
}
