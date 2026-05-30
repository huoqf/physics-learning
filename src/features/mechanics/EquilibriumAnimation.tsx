import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function EquilibriumAnimation() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { f1 = 10, f2 = 8, f3 = 12 } = params

  const angle1 = 0
  const angle2 = (2 * Math.PI) / 3
  const angle3 = (4 * Math.PI) / 3

  const f1x = f1 * Math.cos(angle1)
  const f1y = f1 * Math.sin(angle1)
  const f2x = f2 * Math.cos(angle2)
  const f2y = f2 * Math.sin(angle2)
  const f3x = f3 * Math.cos(angle3)
  const f3y = f3 * Math.sin(angle3)

  const totalFx = f1x + f2x + f3x
  const totalFy = f1y + f2y + f3y

  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2
  const scale = 18

  const gridLines = []
  if (showGrid) {
    for (let i = -5; i <= 5; i++) {
      const xPos = centerX + i * 50
      const yPos = centerY + i * 50
      gridLines.push(
        <line
          key={`grid-x-${i}`}
          x1={xPos}
          y1={centerY - 200}
          x2={xPos}
          y2={centerY + 200}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />,
        <line
          key={`grid-y-${i}`}
          x1={centerX - 300}
          y1={yPos}
          x2={centerX + 300}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        <line
          x1={50}
          y1={centerY}
          x2={canvasSize.width - 50}
          y2={centerY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="4,4"
        />
        <line
          x1={centerX}
          y1={50}
          x2={centerX}
          y2={canvasSize.height - 50}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="4,4"
        />

        <circle cx={centerX} cy={centerY} r={12} fill={PHYSICS_COLORS.lightRay} stroke={PHYSICS_COLORS.lightRay} strokeWidth={CANVAS_STYLE.stroke.objectLine} />

        {showVectors && (
          <g>
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + f1x * scale}
              y2={centerY - f1y * scale}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-eq-f1)"
            />
            <text
              x={centerX + f1x * scale + 15}
              y={centerY - f1y * scale + 5}
              fontSize="14"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              F₁
            </text>

            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + f2x * scale}
              y2={centerY - f2y * scale}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-eq-f2)"
            />
            <text
              x={centerX + f2x * scale + 15}
              y={centerY - f2y * scale + 5}
              fontSize="14"
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              F₂
            </text>

            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + f3x * scale}
              y2={centerY - f3y * scale}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-eq-f3)"
            />
            <text
              x={centerX + f3x * scale + 15}
              y={centerY - f3y * scale + 5}
              fontSize="14"
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              F₃
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">共点力平衡</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              F₁ = {f1} N
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              F₂ = {f2} N
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              F₃ = {f3} N
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              F₁x = {f1x.toFixed(1)} N, F₁y = {f1y.toFixed(1)} N
            </text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              F₂x = {f2x.toFixed(1)} N, F₂y = {f2y.toFixed(1)} N
            </text>
            <text x={0} y={130} fontSize="12" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F₃x = {f3x.toFixed(1)} N, F₃y = {f3y.toFixed(1)} N
            </text>
            <text x={0} y={155} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              ΣFx = {totalFx.toFixed(2)} N
            </text>
            <text x={0} y={175} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              ΣFy = {totalFy.toFixed(2)} N
            </text>
            <text x={0} y={200} fontSize="12" fill={PHYSICS_COLORS.mechanicalEnergy} fontWeight="bold">
              平衡条件: ΣF = 0
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-eq-f1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-eq-f2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrowhead-eq-f3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
