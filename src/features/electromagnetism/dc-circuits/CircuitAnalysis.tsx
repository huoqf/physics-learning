import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateSeriesResistance, calculateParallelResistance, calculateOhmLaw } from '@/physics'
import { PHYSICS_COLORS } from '@/theme/physics'

/**
 * 串并联电路：串联 I 相同、U 按 R 分配；并联 U 相同、I 按 1/R 分配。
 * 参数：U(电源,V) / R1 / R2 / mode(0=串联 1=并联)
 */
export default function CircuitAnalysis() {
  const { params, showFormulas } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })

  const { U = 12, R1 = 4, R2 = 2, mode = 0 } = params
  const series = mode < 0.5

  const Rtotal = series
    ? calculateSeriesResistance([R1, R2]).R_total
    : calculateParallelResistance([R1, R2]).R_total
  const Itotal = Rtotal > 0 ? calculateOhmLaw(U, Rtotal).I : 0

  // 各元件电流/电压
  let I1: number, I2: number, U1: number, U2: number
  if (series) {
    I1 = I2 = Itotal
    U1 = I1 * R1
    U2 = I2 * R2
  } else {
    U1 = U2 = U
    I1 = calculateOhmLaw(U, R1).I
    I2 = calculateOhmLaw(U, R2).I
  }

  const cy = canvasSize.height / 2
  const battColor = PHYSICS_COLORS.forceNet
  const wire = PHYSICS_COLORS.labelText

  // 简化电路示意：电源在左侧，两电阻按模式排布
  const Resistor = ({ x, y, w, label, r, i, u }: { x: number; y: number; w: number; label: string; r: number; i: number; u: number }) => (
    <g>
      <rect x={x} y={y - 12} width={w} height={24} fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={2} rx={3} />
      <text x={x + w / 2} y={y - 18} fontSize="12" fill={PHYSICS_COLORS.labelText} textAnchor="middle">{label} = {r}Ω</text>
      <text x={x + w / 2} y={y + 30} fontSize="11" fill={PHYSICS_COLORS.electricCurrent} textAnchor="middle">
        I={i.toFixed(2)}A · U={u.toFixed(1)}V
      </text>
    </g>
  )

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 电源 */}
        <line x1={80} y1={cy - 60} x2={80} y2={cy + 60} stroke={battColor} strokeWidth={3} />
        <text x={60} y={cy} fontSize="14" fill={battColor} fontWeight="bold">U={U}V</text>

        {series ? (
          <g>
            {/* 串联：电源 → R1 → R2 → 回 */}
            <polyline points={`80,${cy - 60} 200,${cy - 60} 200,${cy - 60}`} fill="none" stroke={wire} strokeWidth={2} />
            <line x1={80} y1={cy - 60} x2={240} y2={cy - 60} stroke={wire} strokeWidth={2} />
            <Resistor x={240} y={cy - 60} w={90} label="R₁" r={R1} i={I1} u={U1} />
            <line x1={330} y1={cy - 60} x2={420} y2={cy - 60} stroke={wire} strokeWidth={2} />
            <Resistor x={420} y={cy - 60} w={90} label="R₂" r={R2} i={I2} u={U2} />
            <polyline points={`510,${cy - 60} 600,${cy - 60} 600,${cy + 60} 80,${cy + 60}`} fill="none" stroke={wire} strokeWidth={2} />
          </g>
        ) : (
          <g>
            {/* 并联：两支路 */}
            <line x1={80} y1={cy - 60} x2={250} y2={cy - 60} stroke={wire} strokeWidth={2} />
            <line x1={250} y1={cy - 60} x2={250} y2={cy + 60} stroke={wire} strokeWidth={2} />
            {/* 支路1 */}
            <line x1={250} y1={cy - 40} x2={320} y2={cy - 40} stroke={wire} strokeWidth={2} />
            <Resistor x={320} y={cy - 40} w={90} label="R₁" r={R1} i={I1} u={U1} />
            <line x1={410} y1={cy - 40} x2={500} y2={cy - 40} stroke={wire} strokeWidth={2} />
            {/* 支路2 */}
            <line x1={250} y1={cy + 40} x2={320} y2={cy + 40} stroke={wire} strokeWidth={2} />
            <Resistor x={320} y={cy + 40} w={90} label="R₂" r={R2} i={I2} u={U2} />
            <line x1={410} y1={cy + 40} x2={500} y2={cy + 40} stroke={wire} strokeWidth={2} />
            {/* 汇合 */}
            <line x1={500} y1={cy - 40} x2={500} y2={cy + 40} stroke={wire} strokeWidth={2} />
            <polyline points={`500,${cy} 600,${cy} 600,${cy + 60} 80,${cy + 60}`} fill="none" stroke={wire} strokeWidth={2} />
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              {series ? '串联电路' : '并联电路'}
            </text>
            <text x={0} y={22} fontSize="12" fill={PHYSICS_COLORS.axis}>
              {series ? 'I 相同，U 按 R 分配，R总 = R₁+R₂' : 'U 相同，I 按 1/R 分配，1/R总 = 1/R₁+1/R₂'}
            </text>
            <text x={0} y={44} fontSize="13" fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              R总 = {Rtotal.toFixed(2)} Ω，I总 = {Itotal.toFixed(2)} A
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
