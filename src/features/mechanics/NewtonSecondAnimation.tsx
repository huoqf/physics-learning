import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateNewtonSecond, calculateFriction, calculateAcceleratedMotion } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function NewtonSecondAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { F = 10, m = 2, mu = 0 } = params
  const g = 9.8
  const N = m * g
  const { f } = calculateFriction(mu, N, true)
  const F_net = F - f
  const { a } = calculateNewtonSecond(F_net, m)
  const { v, s } = calculateAcceleratedMotion(0, a, time)

  const scale = 15
  const groundY = canvasSize.height - 80
  const originX = 80
  const canvasS = s * scale

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 20; i++) {
      const xPos = originX + (i * (canvasSize.width - 130)) / 20
      gridLines.push(
        <line
          key={`vline-${i}`}
          x1={xPos}
          y1={groundY - 20}
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
          x1={originX}
          y1={groundY}
          x2={canvasSize.width - 50}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />

        <polygon
          points={`${originX - 10},${groundY} ${originX - 5},${groundY - 10} ${originX - 5},${groundY + 10}`}
          fill={PHYSICS_COLORS.labelText}
        />

        <rect
          x={originX + canvasS}
          y={groundY - 40 - m * 10}
          width={60}
          height={40 + m * 10}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
          className="transition-all duration-75"
        />

        <text
          x={originX + canvasS + 30}
          y={groundY - 50 - m * 10}
          fontSize="14"
          fill="#1e3a8a"
          textAnchor="middle"
          fontWeight="bold"
        >
          m={m}kg
        </text>

        {showVectors && (
          <g>
            <line
              x1={originX + canvasS + 60}
              y1={groundY - 20 - m * 5}
              x2={originX + canvasS + 60 + F * 3}
              y2={groundY - 20 - m * 5}
              stroke={PHYSICS_COLORS.elasticForce}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-newton)"
            />
            <text
              x={originX + canvasS + 60 + F * 3 + 15}
              y={groundY - 15 - m * 5}
              fontSize="14"
              fill={PHYSICS_COLORS.elasticForce}
              fontWeight="bold"
            >
              F={F}N
            </text>

            {mu > 0 && (
              <>
                <line
                  x1={originX + canvasS}
                  y1={groundY - 10 - m * 5}
                  x2={originX + canvasS - f * 3}
                  y2={groundY - 10 - m * 5}
                  stroke={PHYSICS_COLORS.friction}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-friction)"
                />
                <text
                  x={originX + canvasS - f * 3 - 15}
                  y={groundY - 5 - m * 5}
                  fontSize="12"
                  fill={PHYSICS_COLORS.friction}
                  fontWeight="bold"
                >
                  f={f.toFixed(1)}N
                </text>
              </>
            )}
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 30)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">牛顿第二定律 F=ma</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>F = {F}N</text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>m = {m}kg</text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>μ = {mu}</text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.axis}>
              N = mg = {N.toFixed(1)}N
            </text>
            {mu > 0 && (
              <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.axis}>
                f = μN = {f.toFixed(1)}N
              </text>
            )}
            <text x={0} y={135} fontSize="12" fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
              F合 = F - f = {F_net.toFixed(1)}N
            </text>
            <text x={0} y={160} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              a = F合/m = {a.toFixed(2)} m/s²
            </text>
            <text x={0} y={185} fontSize="12" fill={PHYSICS_COLORS.axis}>
              t = {time.toFixed(2)}s
            </text>
            <text x={0} y={205} fontSize="12" fill={PHYSICS_COLORS.axis}>
              v = at = {v.toFixed(2)} m/s
            </text>
            <text x={0} y={225} fontSize="12" fill={PHYSICS_COLORS.axis}>
              s = ½at² = {s.toFixed(2)} m
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-newton" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.elasticForce} />
          </marker>
          <marker id="arrowhead-friction" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.friction} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
