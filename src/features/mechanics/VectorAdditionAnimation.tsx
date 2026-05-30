import { useEffect, useState, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function VectorAdditionAnimation() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [canvasSize, setCanvasSize] = useState({ width: 650, height: 450 })
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

  const { f1 = 10, f2 = 8, angle = 60 } = params
  const angleRad = (angle * Math.PI) / 180

  const f1x = f1
  const f1y = 0
  const f2x = f2 * Math.cos(angleRad)
  const f2y = f2 * Math.sin(angleRad)
  const fx = f1x + f2x
  const fy = f1y + f2y
  const fResultant = Math.sqrt(fx * fx + fy * fy)
  const resultAngle = Math.atan2(fy, fx) * (180 / Math.PI)

  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2
  const scale = 15

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

        <circle cx={centerX} cy={centerY} r={5} fill={PHYSICS_COLORS.labelText} />

        {showVectors && (
          <g>
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + f1x * scale}
              y2={centerY - f1y * scale}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-va-f1)"
            />
            <text
              x={centerX + f1x * scale / 2}
              y={centerY - 15}
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
              markerEnd="url(#arrowhead-va-f2)"
            />
            <text
              x={centerX + f2x * scale / 2}
              y={centerY - f2y * scale / 2 - 15}
              fontSize="14"
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              F₂
            </text>

            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + fx * scale}
              y2={centerY - fy * scale}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-va-fr)"
            />
            <text
              x={centerX + fx * scale / 2}
              y={centerY - fy * scale / 2 - 15}
              fontSize="14"
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              F
            </text>

            <line
              x1={centerX + f2x * scale}
              y1={centerY - f2y * scale}
              x2={centerX + fx * scale}
              y2={centerY - fy * scale}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              strokeDasharray={`${CANVAS_STYLE.dash.reference[0]},${CANVAS_STYLE.dash.reference[1]}`}
            />
            <line
              x1={centerX + f1x * scale}
              y1={centerY - f1y * scale}
              x2={centerX + fx * scale}
              y2={centerY - fy * scale}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              strokeDasharray={`${CANVAS_STYLE.dash.reference[0]},${CANVAS_STYLE.dash.reference[1]}`}
            />
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">力的合成与分解</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              F₁ = {f1} N
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              F₂ = {f2} N
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              夹角 θ = {angle}°
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              F₁x = {f1x.toFixed(1)} N, F₁y = {f1y.toFixed(1)} N
            </text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              F₂x = {f2x.toFixed(1)} N, F₂y = {f2y.toFixed(1)} N
            </text>
            <text x={0} y={135} fontSize="12" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F = {fResultant.toFixed(2)} N
            </text>
            <text x={0} y={155} fontSize="12" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              方向角 = {resultAngle.toFixed(1)}°
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-va-f1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-va-f2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
          <marker id="arrowhead-va-fr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
