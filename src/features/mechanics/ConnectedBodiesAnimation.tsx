import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function ConnectedBodiesAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 400 })

  const { m1 = 2, m2 = 3, F = 15, mu = 0.1 } = params
  const g = 9.8
  const totalMass = m1 + m2
  const frictionForce1 = mu * m1 * g
  const frictionForce2 = mu * m2 * g
  const netForce = F - frictionForce1 - frictionForce2
  const acceleration = netForce / totalMass
  const tension = m2 * acceleration + frictionForce2

  const v0 = 0
  const displacement = v0 * time + 0.5 * acceleration * time * time
  const startX = 100
  const currentX = startX + Math.min(displacement * 5, canvasSize.width - 300)

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = startX + (i * (canvasSize.width - 200)) / 10
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={100}
          x2={xPos}
          y2={canvasSize.height - 50}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
  }

  const groundY = canvasSize.height - 80

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        <line
          x1={50}
          y1={groundY}
          x2={canvasSize.width - 50}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />

        <rect
          x={currentX}
          y={groundY - 50}
          width={60}
          height={50}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
        />

        <text
          x={currentX + 30}
          y={groundY - 20}
          fontSize="14"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m₁={m1}
        </text>

        <rect
          x={currentX + 90}
          y={groundY - 50}
          width={60}
          height={50}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.normalForce}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
        />

        <text
          x={currentX + 120}
          y={groundY - 20}
          fontSize="14"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m₂={m2}
        </text>

        <line
          x1={currentX + 60}
          y1={groundY - 25}
          x2={currentX + 90}
          y2={groundY - 25}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
        />

        {showVectors && (
          <g>
            <line
              x1={currentX}
              y1={groundY - 35}
              x2={currentX - 40}
              y2={groundY - 35}
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cb-f1)"
            />
            <text
              x={currentX - 20}
              y={groundY - 45}
              fontSize="12"
              fill={PHYSICS_COLORS.friction}
              fontWeight="bold"
            >
              f₁
            </text>

            <line
              x1={currentX + 90}
              y1={groundY - 35}
              x2={currentX + 50}
              y2={groundY - 35}
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cb-f2)"
            />
            <text
              x={currentX + 70}
              y={groundY - 45}
              fontSize="12"
              fill={PHYSICS_COLORS.friction}
              fontWeight="bold"
            >
              f₂
            </text>

            <line
              x1={currentX + 150}
              y1={groundY - 25}
              x2={currentX + 150 + F * 3}
              y2={groundY - 25}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cb-f)"
            />
            <text
              x={currentX + 150 + F * 3 + 10}
              y={groundY - 20}
              fontSize="12"
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              F
            </text>

            <line
              x1={currentX + 60}
              y1={groundY - 25}
              x2={currentX + 60 + tension * 2}
              y2={groundY - 25}
              stroke={PHYSICS_COLORS.tension}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-cb-t)"
            />
            <text
              x={currentX + 60 + tension * 2 + 5}
              y={groundY - 35}
              fontSize="12"
              fill={PHYSICS_COLORS.tension}
              fontWeight="bold"
            >
              T
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">连接体问题</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              m₁ = {m1} kg, m₂ = {m2} kg
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              F = {F} N, μ = {mu}
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.friction} fontWeight="bold">
              f₁ = {frictionForce1.toFixed(1)} N, f₂ = {frictionForce2.toFixed(1)} N
            </text>
            <text x={0} y={95} fontSize="12" fill={PHYSICS_COLORS.tension} fontWeight="bold">
              加速度 a = {acceleration.toFixed(2)} m/s²
            </text>
            <text x={0} y={115} fontSize="12" fill={PHYSICS_COLORS.tension} fontWeight="bold">
              张力 T = {tension.toFixed(1)} N
            </text>
            <text x={0} y={140} fontSize="11" fill={PHYSICS_COLORS.axis}>
              F - f₁ - f₂ = (m₁ + m₂)a
            </text>
            <text x={0} y={160} fontSize="11" fill={PHYSICS_COLORS.axis}>
              T - f₂ = m₂a
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-cb-f1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.friction} />
          </marker>
          <marker id="arrowhead-cb-f2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.friction} />
          </marker>
          <marker id="arrowhead-cb-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrowhead-cb-t" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.tension} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
