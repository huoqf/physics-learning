import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateCircularMotion } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function CircularMotionAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 600, height: 600 })

  const { r = 2, omega = 1 } = params
  const { x, y, v, a_c, period } = calculateCircularMotion(r, omega, time)

  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2
  const scale = 50
  const canvasX = centerX + x * scale
  const canvasY = centerY - y * scale

  const gridCircles = []
  if (showGrid) {
    for (let i = 1; i <= 5; i++) {
      gridCircles.push(
        <circle
          key={`grid-${i}`}
          cx={centerX}
          cy={centerY}
          r={i * scale}
          fill="none"
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180
      const x1 = centerX
      const y1 = centerY
      const x2 = centerX + Math.cos(rad) * scale * 5
      const y2 = centerY - Math.sin(rad) * scale * 5
      gridCircles.push(
        <line
          key={`angle-${angle}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
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
        {gridCircles}

        <circle
          cx={centerX}
          cy={centerY}
          r={r * scale}
          fill="none"
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />

        <line
          x1={centerX - r * scale - 20}
          y1={centerY}
          x2={centerX + r * scale + 20}
          y2={centerY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={2}
        />
        <line
          x1={centerX}
          y1={centerY - r * scale - 20}
          x2={centerX}
          y2={centerY + r * scale + 20}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={2}
        />

        <text x={centerX + r * scale + 10} y={centerY + 5} fontSize="12" fill={PHYSICS_COLORS.axis}>x</text>
        <text x={centerX + 5} y={centerY - r * scale - 10} fontSize="12" fill={PHYSICS_COLORS.axis}>y</text>

        <line
          x1={centerX}
          y1={centerY}
          x2={canvasX}
          y2={canvasY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        <circle
          cx={canvasX}
          cy={canvasY}
          r={15}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />

        {showVectors && v > 0 && (
          <g>
            <line
              x1={canvasX}
              y1={canvasY}
              x2={canvasX - y * omega * 80}
              y2={canvasY - x * omega * 80}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-circular)"
            />
            <text
              x={canvasX - y * omega * 80 - 30}
              y={canvasY - x * omega * 80}
              fontSize="14"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>

            <line
              x1={canvasX}
              y1={canvasY}
              x2={centerX}
              y2={centerY}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-radial)"
            />
            <text
              x={(canvasX + centerX) / 2 - 15}
              y={(canvasY + centerY) / 2}
              fontSize="14"
              fill={PHYSICS_COLORS.displacement}
              fontWeight="bold"
            >
              r
            </text>

            <line
              x1={canvasX}
              y1={canvasY}
              x2={canvasX - x * a_c * 20}
              y2={canvasY + y * a_c * 20}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-ac)"
            />
            <text
              x={canvasX - x * a_c * 20 - 20}
              y={canvasY + y * a_c * 20 - 10}
              fontSize="14"
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">匀速圆周运动公式</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>ω = v / r</text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>a = ω²r = v²/r</text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>T = 2π/ω</text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.axis}>
              当前: ω={omega.toFixed(2)} rad/s
            </text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.axis}>
              v={v.toFixed(2)} m/s
            </text>
            <text x={0} y={130} fontSize="12" fill={PHYSICS_COLORS.axis}>
              a={a_c.toFixed(2)} m/s²
            </text>
            <text x={0} y={150} fontSize="12" fill={PHYSICS_COLORS.axis}>
              T={period.toFixed(2)} s
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-circular" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-radial" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.displacement} />
          </marker>
          <marker id="arrowhead-ac" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
