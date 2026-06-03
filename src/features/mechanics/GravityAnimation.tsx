import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

export default function GravityAnimation() {
  const { params, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { m1 = 1000, m2 = 10, r = 5 } = params
  const G = 6.67e-11
  const F = G * m1 * m2 / (r * r)

  const scale = 30
  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2

  const radius1 = Math.min(Math.log(m1 + 1) * 5, 40)
  const radius2 = Math.min(Math.log(m2 + 1) * 5, 30)

  const obj1X = centerX - r * scale / 2
  const obj1Y = centerY
  const obj2X = centerX + r * scale / 2
  const obj2Y = centerY

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

        <circle
          cx={obj1X}
          cy={obj1Y}
          r={radius1}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={obj1X}
          y={obj1Y + radius1 + 20}
          fontSize="12"
          fill={PHYSICS_COLORS.objectStroke}
          textAnchor="middle"
          fontWeight="bold"
        >
          m₁={m1}
        </text>

        <circle
          cx={obj2X}
          cy={obj2Y}
          r={radius2}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={obj2X}
          y={obj2Y + radius2 + 20}
          fontSize="12"
          fill={PHYSICS_COLORS.objectStroke}
          textAnchor="middle"
          fontWeight="bold"
        >
          m₂={m2}
        </text>

        <line
          x1={obj1X}
          y1={obj1Y}
          x2={obj2X}
          y2={obj2Y}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="5,5"
        />
        <text
          x={centerX}
          y={obj1Y - 15}
          fontSize="12"
          fill={PHYSICS_COLORS.axis}
          textAnchor="middle"
        >
          r={r}
        </text>

        {showVectors && (
          <g>
            <line
              x1={obj1X + radius1}
              y1={obj1Y}
              x2={obj1X + radius1 + 30}
              y2={obj1Y}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-g-f1)"
            />
            <text
              x={obj1X + radius1 + 15}
              y={obj1Y - 10}
              fontSize="12"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              F
            </text>

            <line
              x1={obj2X - radius2}
              y1={obj2Y}
              x2={obj2X - radius2 - 30}
              y2={obj2Y}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-g-f2)"
            />
            <text
              x={obj2X - radius2 - 15}
              y={obj2Y - 10}
              fontSize="12"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              F
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">万有引力定律</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              m₁ = {m1} (相对质量单位)
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              m₂ = {m2} (相对质量单位)
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              r = {r} (相对距离单位)
            </text>
            <text x={0} y={90} fontSize="13" fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              F = G·m₁·m₂ / r²
            </text>
            <text x={0} y={115} fontSize="11" fill={PHYSICS_COLORS.axis}>
              G = 6.67×10⁻¹¹ N·m²/kg²
            </text>
            <text x={0} y={140} fontSize="12" fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              F (相对值) ≈ {F.toExponential(2)}
            </text>
            <text x={0} y={160} fontSize="11" fill={PHYSICS_COLORS.axis}>
              引力大小与质量成正比，与距离平方成反比
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-g-f1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker id="arrowhead-g-f2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.gravity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
