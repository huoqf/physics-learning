import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateFaradayEMF } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

const GRID_MARGIN = 40
const FONT = {
  title: 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  magnetic: 16,
}
const COIL_TURNS_SPACING = 8

export default function FaradayLaw() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { N = 10, B = 1, S = 50, angle = 0, dPhiMode = 0 } = params

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2

  const angleRad = (angle * Math.PI) / 180
  const cosTheta = Math.cos(angleRad)

  const omegaAnim = 0.5
  const tAnim = time * omegaAnim
  const mode1Omega = (30 * Math.PI) / 180
  let B_anim = B
  let angle_anim = angle
  let S_anim = S
  let Phi_anim = B * (S * 1e-4) * cosTheta
  let dPhi_dt = 0

  if (dPhiMode === 0) {
    B_anim = B * Math.sin(tAnim)
    Phi_anim = B_anim * (S * 1e-4) * cosTheta
    dPhi_dt = B * omegaAnim * Math.cos(tAnim) * (S * 1e-4) * cosTheta
  } else if (dPhiMode === 1) {
    angle_anim = (angle + time * 30) % 360
    const angleAnimRad = (angle_anim * Math.PI) / 180
    Phi_anim = B * (S * 1e-4) * Math.cos(angleAnimRad)
    dPhi_dt = -B * (S * 1e-4) * mode1Omega * Math.sin(angleAnimRad)
  } else {
    S_anim = S * (0.5 + 0.5 * Math.sin(tAnim))
    Phi_anim = B * (S_anim * 1e-4) * cosTheta
    dPhi_dt = B * (S * 1e-4) * 0.5 * omegaAnim * Math.cos(tAnim) * cosTheta
  }

  const { EMF } = calculateFaradayEMF(N, dPhi_dt)

  const coilW = 120
  const coilH = 80

  const displayAngleRad = dPhiMode === 1
    ? (angle_anim * Math.PI) / 180
    : angleRad
  const coilRx = coilW / 2 * Math.max(0.15, Math.abs(Math.cos(displayAngleRad)))

  const gridCols = 8
  const gridRows = 5
  const gridSpacingX = (canvasSize.width - 120) / (gridCols - 1)
  const gridSpacingY = (canvasSize.height - 120) / (gridRows - 1)

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

  const turns = Math.min(Math.max(Math.round(N / 2), 3), 12)
  const coilElements = []
  for (let i = 0; i < turns; i++) {
    const offsetX = i * COIL_TURNS_SPACING - (turns * COIL_TURNS_SPACING) / 2
    coilElements.push(
      <ellipse
        key={`coil-${i}`}
        cx={cx + offsetX}
        cy={cy}
        rx={coilRx}
        ry={coilH / 2}
        fill="none"
        stroke={PHYSICS_COLORS.electricCurrent}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
        opacity={0.7 + i * 0.03}
      />
    )
  }

  const fluxArrowLen = Math.min(80, Math.max(20, Math.abs(Phi_anim) * 5000))
  const fluxDir = Phi_anim >= 0 ? -1 : 1
  const currentDir = EMF >= 0 ? 1 : -1

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrow-flux" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.magneticField} />
          </marker>
          <marker id="arrow-emf" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.electricCurrent} />
          </marker>
        </defs>

        {gridLines}

        <g>
          <text x={cx} y={GRID_MARGIN} fontSize={FONT.title} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
            B = {B_anim.toFixed(2)} T（垂直纸面向里 ⊗）
          </text>
          {Array.from({ length: gridCols }).map((_, i) =>
            Array.from({ length: gridRows }).map((_, j) => (
              <text
                key={`b-${i}-${j}`}
                x={60 + i * gridSpacingX}
                y={70 + j * gridSpacingY}
                fontSize={FONT.magnetic}
                fill={PHYSICS_COLORS.magneticField}
                opacity={0.25}
                textAnchor="middle"
              >
                ⊗
              </text>
            ))
          )}
        </g>

        {coilElements}

        <line
          x1={cx}
          y1={cy}
          x2={cx + 60 * Math.cos(displayAngleRad)}
          y2={cy - 60 * Math.sin(displayAngleRad)}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.reference}
          strokeDasharray="4,4"
        />
        <text
          x={cx + 70 * Math.cos(displayAngleRad)}
          y={cy - 70 * Math.sin(displayAngleRad)}
          fontSize={FONT.axis}
          fill={PHYSICS_COLORS.labelText}
        >
          n
        </text>

        {showVectors && fluxArrowLen > 5 && (
          <g>
            <line
              x1={cx}
              y1={cy + fluxDir * 60}
              x2={cx}
              y2={cy + fluxDir * (60 + fluxArrowLen)}
              stroke={PHYSICS_COLORS.magneticField}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrow-flux)"
              opacity={0.7}
            />
            <text
              x={cx + 14}
              y={cy + fluxDir * (60 + fluxArrowLen / 2)}
              fontSize={FONT.label}
              fill={PHYSICS_COLORS.magneticField}
              fontWeight="bold"
            >
              Φ
            </text>
          </g>
        )}

        {Math.abs(EMF) > 0.001 && (
          <g>
            <path
              d={`M ${cx - 30} ${cy - coilH / 2 - 15} A 30 30 0 0 ${currentDir > 0 ? 1 : 0} ${cx + 30} ${cy - coilH / 2 - 15}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrow-emf)"
            />
            <text
              x={cx}
              y={cy - coilH / 2 - 30}
              fontSize={FONT.label}
              fill={PHYSICS_COLORS.electricCurrent}
              textAnchor="middle"
              fontWeight="bold"
            >
              I（感应电流）
            </text>
          </g>
        )}

        <text
          x={cx + coilW / 2 + 30}
          y={cy}
          fontSize={FONT.axis}
          fill={PHYSICS_COLORS.labelText}
          textAnchor="start"
        >
          N = {N} 匝
        </text>

        <text
          x={cx}
          y={cy + coilH / 2 + 24}
          fontSize={FONT.axis}
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
        >
          S = {S_anim.toFixed(1)} cm²
        </text>

        {showFormulas && (
          <g transform={`translate(20, ${canvasSize.height - 140})`}>
            <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">法拉第电磁感应定律</text>
            <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>EMF = N·|dΦ/dt|</text>
            <text x={0} y={42} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>Φ = B·S·cosθ</text>
            <text x={0} y={64} fontSize={FONT.label} fill={PHYSICS_COLORS.magneticField} fontWeight="bold">
              Φ = {Phi_anim.toExponential(2)} Wb
            </text>
            <text x={0} y={84} fontSize={FONT.label} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              EMF = {Math.abs(EMF).toExponential(2)} V
            </text>
            <text x={0} y={104} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText}>
              变化方式: {dPhiMode === 0 ? 'B 正弦变化' : dPhiMode === 1 ? '角度旋转' : 'S 变化'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
