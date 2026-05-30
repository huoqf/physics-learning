import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function KineticEnergyAnimation() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { m = 2, v0 = 0, F = 10, s = 5 } = params
  const a = F / m
  const v = Math.sqrt(v0 * v0 + 2 * a * s)
  const work = F * s
  const initialEk = 0.5 * m * v0 * v0
  const finalEk = 0.5 * m * v * v

  const scale = 60
  const groundY = canvasSize.height - 80
  const startX = 80
  const currentX = Math.min(startX + s * scale, canvasSize.width - 100)

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = startX + (i * (canvasSize.width - 180)) / 10
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={xPos}
          y1={groundY - 40}
          x2={xPos}
          y2={groundY + 10}
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
          x1={startX}
          y1={groundY}
          x2={canvasSize.width - 50}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />

        <rect
          x={currentX}
          y={groundY - 50}
          width={50}
          height={50}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
        />

        <text
          x={currentX + 25}
          y={groundY - 25}
          fontSize="14"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m={m}kg
        </text>

        {showVectors && (
          <>
            <line
              x1={currentX + 50}
              y1={groundY - 25}
              x2={currentX + 50 + F * 5}
              y2={groundY - 25}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-kinetic)"
            />
            <text
              x={currentX + 50 + F * 5 + 10}
              y={groundY - 20}
              fontSize="14"
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              F={F}N
            </text>
          </>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">动能定理</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              W = F·s = {work.toFixed(1)} J
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              ΔEk = Ek末 - Ek初 = {finalEk.toFixed(1)} - {initialEk.toFixed(1)} = {(finalEk - initialEk).toFixed(1)} J
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold">
              W = ΔEk
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.axis}>
              初速度: v₀ = {v0}m/s
            </text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.axis}>
              末速度: v = {v.toFixed(2)}m/s
            </text>
            <text x={0} y={130} fontSize="12" fill={PHYSICS_COLORS.axis}>
              位移: s = {s}m
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-kinetic" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
