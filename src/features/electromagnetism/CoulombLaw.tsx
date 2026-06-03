import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateCoulombForce } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { colors } from '@/theme/colors'

/** 库仑定律 F = kq₁q₂/r²：两点电荷间引力/斥力，电量/距离可调 */
export default function CoulombLaw() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  // 电量单位 μC，距离单位 cm（用于显示）；计算用 SI
  const { q1 = 2, q2 = -3, r = 4 } = params
  const k = 9e9
  const q1SI = q1 * 1e-6
  const q2SI = q2 * 1e-6
  const rSI = r * 0.01
  const { F } = calculateCoulombForce(k, Math.abs(q1SI), Math.abs(q2SI), rSI || 1e-9)

  const attractive = q1 * q2 < 0 // 异号相吸
  const centerY = canvasSize.height / 2
  const pxPerCm = 28
  const gap = r * pxPerCm
  const cx = canvasSize.width / 2
  const x1 = cx - gap / 2
  const x2 = cx + gap / 2
  const chargeR = 22

  // 力箭头长度（对数压缩，避免极端值溢出画面）
  const arrowLen = Math.max(20, Math.min(90, 30 * Math.log10(F * 1e3 + 10)))

  const colorOf = (q: number) => (q >= 0 ? PHYSICS_COLORS.forceNet : PHYSICS_COLORS.electricField)

  // 斥力箭头朝外，引力箭头朝内
  const leftArrowDir = attractive ? 1 : -1 // +1 指向右(朝对方)
  const rightArrowDir = attractive ? -1 : 1

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = (i * canvasSize.width) / 10
      gridLines.push(
        <line key={`g-${i}`} x1={xPos} y1={40} x2={xPos} y2={canvasSize.height - 40}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.grid} strokeDasharray={CANVAS_STYLE.dash.axis.join(' ')} />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        {/* 距离标注 */}
        <line x1={x1} y1={centerY + 50} x2={x2} y2={centerY + 50} stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.grid} />
        <text x={cx} y={centerY + 70} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">
          r = {r.toFixed(1)} cm
        </text>

        {/* 力矢量 */}
        {showVectors && (
          <g>
            <line x1={x1} y1={centerY} x2={x1 + leftArrowDir * arrowLen} y2={centerY}
              stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrow-coulomb)" />
            <line x1={x2} y1={centerY} x2={x2 + rightArrowDir * arrowLen} y2={centerY}
              stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrow-coulomb)" />
          </g>
        )}

        {/* 电荷 1 */}
        <circle cx={x1} cy={centerY} r={chargeR} fill={colorOf(q1)} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={x1} y={centerY + 6} fontSize="20" fill={colors.neutral[0]} textAnchor="middle" fontWeight="bold">
          {q1 >= 0 ? '+' : '−'}
        </text>
        <text x={x1} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          q₁ = {q1} μC
        </text>

        {/* 电荷 2 */}
        <circle cx={x2} cy={centerY} r={chargeR} fill={colorOf(q2)} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={x2} y={centerY + 6} fontSize="20" fill={colors.neutral[0]} textAnchor="middle" fontWeight="bold">
          {q2 >= 0 ? '+' : '−'}
        </text>
        <text x={x2} y={centerY - chargeR - 8} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          q₂ = {q2} μC
        </text>

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">库仑定律</text>
            <text x={0} y={24} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>F = k·q₁q₂/r²</text>
            <text x={0} y={44} fontSize={CANVAS_STYLE.font.axisSize} fill={PHYSICS_COLORS.axis}>k = 9×10⁹ N·m²/C²</text>
            <text x={0} y={68} fontSize={CANVAS_STYLE.font.labelSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F = {F.toExponential(2)} N
            </text>
            <text x={0} y={88} fontSize={CANVAS_STYLE.font.axisSize} fill={attractive ? PHYSICS_COLORS.electricField : PHYSICS_COLORS.forceNet}>
              {attractive ? '异号电荷 → 相互吸引' : '同号电荷 → 相互排斥'}
            </text>
          </g>
        )}

        <defs>
          <marker id="arrow-coulomb" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
