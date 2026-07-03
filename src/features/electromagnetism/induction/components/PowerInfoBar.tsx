/**
 * PowerInfoBar.tsx — 底部信息条：核心数据摘要
 *
 * 纯 SVG 渲染组件，零物理计算。
 */
import { PHYSICS_COLORS, TRANSMISSION_COLORS } from '@/theme/physics'

interface PowerInfoBarProps {
  eta: number
  I_line: number
  deltaU: number
  P_loss: number
  U4: number
  voltageRatio: number
  mode: number
  px: (v: number) => number
  font: (v: number) => number
  W: number
  H: number
}

export function PowerInfoBar({
  eta,
  I_line,
  deltaU,
  P_loss,
  U4,
  voltageRatio,
  mode,
  px,
  font,
  W,
  H,
}: PowerInfoBarProps) {
  const adviceColor = voltageRatio >= 1
    ? TRANSMISSION_COLORS.efficiency
    : voltageRatio > 0.8
      ? TRANSMISSION_COLORS.voltageHigh
      : TRANSMISSION_COLORS.powerLoss

  const adviceText = mode === 1
    ? (voltageRatio >= 1
      ? '✓ U₄ 达到标准 220V，用电器正常工作'
      : voltageRatio > 0.8
        ? `△ U₄ 低于标准 220V（差 ${(220 - U4).toFixed(0)}V），请调节变比 k 稳压`
        : `⚠ U₄ 严重偏低（${U4.toFixed(0)}V），用电器无法正常工作`)
    : (eta > 0.95
      ? '✓ 高压输电，损耗极低'
      : eta > 0.8
        ? '△ 中等损耗，可考虑提高输电电压'
        : '⚠ 损耗严重！必须提高输电电压或减小线路电阻')

  return (
    <g transform={`translate(${px(8)}, ${H - px(60)})`}>
      <rect width={W - px(16)} height={px(52)} rx={px(5)}
        fill={PHYSICS_COLORS.objectFill}
        opacity="0.9"
        stroke={PHYSICS_COLORS.grid}
        strokeWidth={px(1)} />

      <text x={px(10)} y={px(16)} fontSize={font(12)}
        fill={PHYSICS_COLORS.labelText} fontWeight="bold">
        输电效率 η = {(eta * 100).toFixed(1)}%
      </text>
      <text x={px(10)} y={px(32)} fontSize={font(10)} fill={PHYSICS_COLORS.axis}>
        I = {I_line.toFixed(1)} A
        &nbsp;|&nbsp;
        ΔU = {deltaU.toFixed(0)} V
        &nbsp;|&nbsp;
        ΔP = {(P_loss / 1000).toFixed(1)} kW
        &nbsp;|&nbsp;
        U₄ = {U4.toFixed(0)} V
      </text>
      <text x={px(10)} y={px(46)} fontSize={font(9)} fill={adviceColor}>
        {adviceText}
      </text>
    </g>
  )
}
