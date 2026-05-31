import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateLorentzForce } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

const GRID_MARGIN = 40
const FONT = {
  title: 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  magnetic: 16,
}
const CHARGE_RADIUS = 14

/** 洛伦兹力 F = qvB·sinθ：带电粒子在磁场中受力，q/v/B/θ 可调，左手定则演示 */
export default function LorentzForce() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { q = 1, v = 10, B = 1, angle = 90 } = params
  const { F } = calculateLorentzForce(Math.abs(q), Math.abs(v), B, angle)

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2
  const pxPerUnit = 15
  const vDir = v >= 0 ? 1 : -1
  const vLen = Math.abs(v) * pxPerUnit

  const F_max = Math.abs(q) * Math.abs(v) * B
  const fLen = F < 0.001 ? 0 : Math.min(120, Math.max(15, (F / Math.max(F_max, 0.01)) * 80))
  const forceDir = q >= 0 ? -1 : 1

  const isPerpendicular = angle === 90
  const angleRad = (angle * Math.PI) / 180
  const sinTheta = Math.sin(angleRad)

  const gridCols = 6
  const gridRows = 4
  const gridSpacingX = (canvasSize.width - 160) / (gridCols - 1)
  const gridSpacingY = (canvasSize.height - 140) / (gridRows - 1)

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = (i * canvasSize.width) / 10
      const yPos = (i * canvasSize.height) / 10
      gridLines.push(
        <line key={`gv-${i}`} x1={xPos} y1={GRID_MARGIN} x2={xPos} y2={canvasSize.height - GRID_MARGIN}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />,
        <line key={`gh-${i}`} x1={GRID_MARGIN} y1={yPos} x2={canvasSize.width - GRID_MARGIN} y2={yPos}
          stroke={PHYSICS_COLORS.grid} strokeWidth={CANVAS_STYLE.stroke.reference} strokeDasharray="4,4" />
      )
    }
  }

  const chargeColor = q >= 0 ? PHYSICS_COLORS.positiveCharge : PHYSICS_COLORS.negativeCharge

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrow-lorentz-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-lorentz-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>

        {gridLines}

        {/* 磁场 B 方向 */}
        <g>
          <text x={cx} y={GRID_MARGIN} fontSize={FONT.title} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
            B = {B.toFixed(1)} T（垂直纸面向里 ⊗）
          </text>
          {Array.from({ length: gridCols }).map((_, i) =>
            Array.from({ length: gridRows }).map((_, j) => (
              <text
                key={`b-${i}-${j}`}
                x={80 + i * gridSpacingX}
                y={80 + j * gridSpacingY}
                fontSize={FONT.magnetic}
                fill={PHYSICS_COLORS.magneticField}
                opacity={0.3}
                textAnchor="middle"
              >
                ⊗
              </text>
            ))
          )}
        </g>

        {/* 带电粒子 */}
        <circle cx={cx} cy={cy} r={CHARGE_RADIUS} fill={chargeColor} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <text x={cx} y={cy + 5} fontSize={FONT.magnetic} fill={PHYSICS_COLORS.objectFill} textAnchor="middle" fontWeight="bold">
          {q >= 0 ? '+' : '−'}
        </text>
        <text x={cx} y={cy + CHARGE_RADIUS + 18} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          q = {q.toFixed(1)} C
        </text>

        {/* 速度矢量（方向随 v 正负翻转） */}
        {showVectors && (
          <g>
            <line x1={cx - vDir * vLen} y1={cy} x2={cx} y2={cy}
              stroke={PHYSICS_COLORS.velocity} strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrow-lorentz-v)" />
            <text x={cx - vDir * vLen / 2} y={cy - 10} fontSize={FONT.label} fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
              v
            </text>
          </g>
        )}

        {/* 洛伦兹力矢量（方向随电荷正负翻转） */}
        {showVectors && fLen > 0 && (
          <g>
            <line x1={cx} y1={cy} x2={cx} y2={cy + forceDir * fLen}
              stroke={PHYSICS_COLORS.forceNet} strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrow-lorentz-f)" />
            <text x={cx + 14} y={cy + forceDir * fLen / 2} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F
            </text>
          </g>
        )}

        {/* 夹角 θ 标注（v 与 B 的夹角） */}
        {!isPerpendicular && (
          <g>
            <path d={`M ${cx + 30} ${cy} A 30 30 0 0 0 ${cx + 30 * Math.cos(angleRad)} ${cy - 30 * Math.sin(angleRad)}`}
              fill="none" stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.reference} />
            <text x={cx + 40} y={cy - 10} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText}>
              θ = {angle.toFixed(0)}°
            </text>
            <text x={cx + 40} y={cy + 6} fontSize={FONT.axis} fill={PHYSICS_COLORS.magneticField}>
              sinθ = {sinTheta.toFixed(3)}
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">洛伦兹力</text>
            <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>F = qvB·sinθ</text>
            <text x={0} y={44} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>方向：左手定则（始终⊥v）</text>
            <text x={0} y={64} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>特点：永不做功（F⊥v）</text>
            <text x={0} y={88} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F = {F.toExponential(2)} N
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
