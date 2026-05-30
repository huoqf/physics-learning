import { useEffect, useState, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function FrictionAnimation() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [canvasSize, setCanvasSize] = useState({ width: 650, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const { m = 5, mu = 0.3, angle = 0, g = 9.8 } = params
  const F_gravity = m * g
  const F_normal = F_gravity * Math.cos(angle * Math.PI / 180)
  const F_friction_max = mu * F_normal

  const groundY = canvasSize.height - 80
  const startX = 100
  const boxSize = 50

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = startX + (i * (canvasSize.width - 200)) / 10
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - 80}
          x2={xPos}
          y2={groundY + 20}
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
          y1={groundY}
          x2={canvasSize.width - 50}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />

        <path
          d={`M ${canvasSize.width - 100} ${groundY} L ${canvasSize.width - 90} ${groundY - 8} L ${canvasSize.width - 80} ${groundY} L ${canvasSize.width - 70} ${groundY - 8} L ${canvasSize.width - 60} ${groundY}`}
          fill="none"
          stroke={PHYSICS_COLORS.friction}
          strokeWidth={2}
          opacity={0.5}
        />

        <rect
          x={canvasSize.width / 2 - boxSize / 2}
          y={groundY - boxSize}
          width={boxSize}
          height={boxSize}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
        />

        <text
          x={canvasSize.width / 2}
          y={groundY - boxSize / 2 + 5}
          fontSize="12"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m={m}
        </text>

        {showVectors && (
          <g>
            <line
              x1={canvasSize.width / 2}
              y1={groundY - boxSize / 2}
              x2={canvasSize.width / 2}
              y2={groundY - boxSize / 2 - F_normal * 4}
              stroke={PHYSICS_COLORS.normalForce}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-fr-n)"
            />
            <text
              x={canvasSize.width / 2 - 25}
              y={groundY - boxSize / 2 - F_normal * 4 - 5}
              fontSize="12"
              fill={PHYSICS_COLORS.normalForce}
              fontWeight="bold"
            >
              F_N
            </text>

            <line
              x1={canvasSize.width / 2}
              y1={groundY - boxSize / 2}
              x2={canvasSize.width / 2}
              y2={groundY - boxSize / 2 + F_gravity * 4}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-fr-g)"
            />
            <text
              x={canvasSize.width / 2 + 25}
              y={groundY - boxSize / 2 + F_gravity * 4 + 15}
              fontSize="12"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              G
            </text>

            <line
              x1={canvasSize.width / 2}
              y1={groundY - boxSize / 2}
              x2={canvasSize.width / 2 - F_friction_max * 4}
              y2={groundY - boxSize / 2}
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-fr-f)"
            />
            <text
              x={canvasSize.width / 2 - F_friction_max * 4 - 30}
              y={groundY - boxSize / 2 + 5}
              fontSize="12"
              fill={PHYSICS_COLORS.friction}
              fontWeight="bold"
            >
              f
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">摩擦力演示</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              质量 m = {m} kg
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              重力加速度 g = {g} m/s²
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              重力 G = mg = {F_gravity.toFixed(1)} N
            </text>
            <text x={0} y={95} fontSize="12" fill={PHYSICS_COLORS.normalForce} fontWeight="bold">
              法向力 F_N = {F_normal.toFixed(1)} N
            </text>
            <text x={0} y={120} fontSize="12" fill={PHYSICS_COLORS.axis}>
              动摩擦系数 μ = {mu}
            </text>
            <text x={0} y={145} fontSize="12" fill={PHYSICS_COLORS.friction} fontWeight="bold">
              最大静摩擦力 f_max = μF_N = {F_friction_max.toFixed(1)} N
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-fr-n" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.normalForce} />
          </marker>
          <marker id="arrowhead-fr-g" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker id="arrowhead-fr-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.friction} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
