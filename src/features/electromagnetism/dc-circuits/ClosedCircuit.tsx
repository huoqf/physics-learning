import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateClosedCircuit } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physics'

/**
 * 闭合电路欧姆定律 I = EMF/(R+r)，路端电压 U = EMF - Ir，效率 η = P出/P总。
 * 参数：EMF(电动势,V) / r(内阻,Ω) / R(外电阻,Ω)
 */
export default function ClosedCircuit() {
  const { params, showFormulas } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })

  const { EMF = 6, r = 1, R = 5 } = params
  const { I, U_terminal, P_output, P_total, eta } = calculateClosedCircuit(EMF, r, R)

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const wire = PHYSICS_COLORS.labelText
  const left = 110, right = canvasSize.width - 110, top = cy - 90, bot = cy + 90

  // 效率条
  const barX = 40, barY = 40, barW = 160, barH = 14

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 回路 */}
        <rect x={left} y={top} width={right - left} height={bot - top} fill="none" stroke={wire} strokeWidth={2} />

        {/* 电源（含内阻 r） */}
        <line x1={left} y1={cy - 26} x2={left} y2={cy + 26} stroke={PHYSICS_COLORS.forceNet} strokeWidth={4} />
        <text x={left - 60} y={cy - 4} fontSize="13" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">EMF={EMF}V</text>
        <text x={left - 50} y={cy + 16} fontSize="12" fill={PHYSICS_COLORS.axis}>r={r}Ω</text>

        {/* 外电阻 R（顶部） */}
        <rect x={cx - 45} y={top - 12} width={90} height={24} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={2} rx={3} />
        <text x={cx} y={top - 18} fontSize="13" fill={PHYSICS_COLORS.labelText} textAnchor="middle">R = {R}Ω</text>

        {/* 电流方向箭头 */}
        <polygon points={`${cx - 6},${top - 6} ${cx + 6},${top} ${cx - 6},${top + 6}`} fill={PHYSICS_COLORS.electricCurrent} />
        <text x={cx + 70} y={top + 4} fontSize="12" fill={PHYSICS_COLORS.electricCurrent}>I = {I.toFixed(2)} A</text>

        {/* 路端电压（右边） */}
        <text x={right + 6} y={cy} fontSize="12" fill={PHYSICS_COLORS.electricPotential}>U端</text>
        <text x={right + 6} y={cy + 18} fontSize="12" fill={PHYSICS_COLORS.electricPotential} fontWeight="bold">{U_terminal.toFixed(2)}V</text>

        {/* 效率条 */}
        <text x={barX} y={barY - 6} fontSize="12" fill={PHYSICS_COLORS.labelText}>效率 η = {(eta * 100).toFixed(1)}%</text>
        <rect x={barX} y={barY} width={barW} height={barH} fill={PHYSICS_COLORS.grid} rx={3} />
        <rect x={barX} y={barY} width={barW * eta} height={barH} fill={PHYSICS_COLORS.kineticEnergy} rx={3} />

        {showFormulas && (
          <g transform={`translate(${cx - 120}, ${bot + 24})`}>
            <text fontSize="13" fill={PHYSICS_COLORS.axis}>I = EMF/(R+r) = {I.toFixed(2)} A</text>
            <text x={0} y={20} fontSize="13" fill={PHYSICS_COLORS.electricPotential}>U端 = EMF − Ir = {U_terminal.toFixed(2)} V</text>
            <text x={0} y={40} fontSize="12" fill={PHYSICS_COLORS.axis}>
              P出 = {P_output.toFixed(2)}W，P总 = {P_total.toFixed(2)}W
            </text>
            <text x={0} y={60} fontSize="11" fill={PHYSICS_COLORS.axis}>R↓→I↑、U端↓；短路 R=0 时 I 最大、U端=0</text>
          </g>
        )}
      </svg>
    </div>
  )
}
