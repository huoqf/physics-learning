import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateAmpereForce } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

const GRID_MARGIN = 40
const FONT = {
  title: 14,
  label: CANVAS_STYLE.font.labelSize,
  axis: CANVAS_STYLE.font.axisSize,
  magnetic: 16,
}

export default function CuttingEMF() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { B = 1, L = 0.5, v = 2, R = 2 } = params

  const cx = canvasSize.width / 2
  const cy = canvasSize.height / 2 + 40

  const railW = 300
  const railH = 120
  const railLeft = cx - railW / 2
  const railRight = cx + railW / 2
  const railTop = cy - railH / 2
  const railBottom = cy + railH / 2

  const pxPerUnit = 30
  const maxTravel = railW / pxPerUnit
  const rawDist = (v * time * 0.3) % (2 * maxTravel)
  const travelDist = rawDist < maxTravel ? rawDist : 2 * maxTravel - rawDist
  const rodX = railLeft + travelDist * pxPerUnit

  const rodDirection = rawDist < maxTravel ? 1 : -1

  const EMF = B * L * v * rodDirection

  const I = R > 0 ? EMF / R : 0

  const { F: F_ampere } = calculateAmpereForce(B, Math.abs(I), L, 90)

  const gridCols = 10
  const gridRows = 4
  const gridSpacingX = railW / (gridCols - 1)
  const gridSpacingY = railH / (gridRows - 1)

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

  const bSymbols = []
  for (let i = 0; i < gridCols; i++) {
    for (let j = 0; j < gridRows; j++) {
      bSymbols.push(
        <text
          key={`b-${i}-${j}`}
          x={railLeft + 10 + i * gridSpacingX}
          y={railTop + 20 + j * gridSpacingY}
          fontSize={FONT.magnetic}
          fill={PHYSICS_COLORS.magneticField}
          opacity={0.25}
          textAnchor="middle"
        >
          ⊗
        </text>
      )
    }
  }

  const rodW = 6
  const rodH = railH + 10

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          <marker id="arrow-cut-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrow-cut-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrow-cut-emf" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.electricCurrent} />
          </marker>
        </defs>

        {gridLines}

        <text x={cx} y={GRID_MARGIN} fontSize={FONT.title} fill={PHYSICS_COLORS.magneticField} textAnchor="middle" fontWeight="bold">
          B = {B.toFixed(1)} T（垂直纸面向里 ⊗）
        </text>

        {bSymbols}

        <line x1={railLeft} y1={railTop} x2={railRight} y2={railTop}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />
        <line x1={railLeft} y1={railBottom} x2={railRight} y2={railBottom}
          stroke={PHYSICS_COLORS.axis} strokeWidth={CANVAS_STYLE.stroke.axis} />

        <rect x={railRight + 4} y={railTop - 4} width={12} height={railH + 8}
          fill="none" stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={CANVAS_STYLE.stroke.objectLine} rx={2} />
        <text x={railRight + 24} y={cy} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="start">
          R = {R.toFixed(1)} Ω
        </text>

        <rect
          x={rodX - rodW / 2}
          y={cy - rodH / 2}
          width={rodW}
          height={rodH}
          fill={PHYSICS_COLORS.electricCurrent}
          rx={2}
          opacity={0.9}
        />
        <text x={rodX} y={cy + 4} fontSize={FONT.axis} fill="white" textAnchor="middle" fontWeight="bold">
          ab
        </text>

        {showVectors && (
          <g>
            <line
              x1={rodX}
              y1={railTop - 30}
              x2={rodX + rodDirection * 40}
              y2={railTop - 30}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrow-cut-v)"
            />
            <text x={rodX + rodDirection * 20} y={railTop - 36} fontSize={FONT.label} fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
              v = {v.toFixed(1)} m/s
            </text>
          </g>
        )}

        {showVectors && F_ampere > 0.001 && (
          <g>
            <line
              x1={rodX}
              y1={railBottom + 30}
              x2={rodX - rodDirection * Math.min(60, F_ampere * 20)}
              y2={railBottom + 30}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrow-cut-f)"
            />
            <text x={rodX - rodDirection * 20} y={railBottom + 48} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" textAnchor="middle">
              F安 = {F_ampere.toFixed(3)} N
            </text>
          </g>
        )}

        {showVectors && Math.abs(EMF) > 0.001 && (
          <g>
            <line
              x1={rodX + 15}
              y1={railBottom - 10}
              x2={rodX + 15}
              y2={railTop + 10}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrow-cut-emf)"
              opacity={0.7}
            />
            <text x={rodX + 28} y={cy} fontSize={FONT.axis} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              EMF
            </text>
          </g>
        )}

        <text x={railLeft} y={railBottom + 20} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText}>
          L = {L.toFixed(2)} m
        </text>

        <text x={rodX} y={railBottom + 36} fontSize={FONT.axis} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
          x = {travelDist.toFixed(2)} m
        </text>

        {showFormulas && (
          <g transform={`translate(20, ${canvasSize.height - 160})`}>
            <text fontSize={FONT.title} fill={PHYSICS_COLORS.labelText} fontWeight="bold">导体切割磁感线</text>
            <text x={0} y={24} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>EMF = BLv</text>
            <text x={0} y={42} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>I = EMF/R = BLv/R</text>
            <text x={0} y={60} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis}>F安 = BIL = B²L²v/R</text>
            <text x={0} y={84} fontSize={FONT.label} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              EMF = {Math.abs(EMF).toFixed(3)} V
            </text>
            <text x={0} y={102} fontSize={FONT.label} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
              I = {Math.abs(I).toFixed(3)} A
            </text>
            <text x={0} y={120} fontSize={FONT.label} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F安 = {F_ampere.toFixed(3)} N
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
