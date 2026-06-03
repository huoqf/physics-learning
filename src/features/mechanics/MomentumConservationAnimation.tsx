import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'

export default function MomentumConservationAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { m1 = 2, v1 = 4, m2 = 1, v2 = 0, e = 0.8 } = params

  const totalP_before = m1 * v1 + m2 * v2

  const v1_final = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / (m1 + m2)
  const v2_final = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / (m1 + m2)

  const totalP_after = m1 * v1_final + m2 * v2_final

  const r1 = 15 + m1 * 2
  const r2 = 15 + m2 * 2

  const startX1 = 150
  const startX2 = 550

  const scale = 40
  const approachSpeed = (v1 - v2) * scale
  const distanceBeforeCollision = startX2 - startX1 - r1 - r2
  const collisionTime = approachSpeed > 0 ? distanceBeforeCollision / approachSpeed : Infinity

  let x1: number
  let x2: number
  let currentV1: number
  let currentV2: number

  if (time < collisionTime) {
    x1 = startX1 + v1 * time * scale
    x2 = startX2 + v2 * time * scale
    currentV1 = v1
    currentV2 = v2
  } else {
    const afterCollisionTime = time - collisionTime
    x1 = startX1 + v1 * collisionTime * scale + v1_final * afterCollisionTime * scale
    x2 = startX2 + v2 * collisionTime * scale + v2_final * afterCollisionTime * scale
    currentV1 = v1_final
    currentV2 = v2_final
  }

  const groundY = canvasSize.height - 80

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = 50 + (i * (canvasSize.width - 100)) / 10
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - 80}
          x2={xPos}
          y2={groundY + 20}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
  }

  const collisionX = startX1 + v1 * collisionTime * scale + r1

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
          strokeWidth={STROKE.groundLine}
        />

        {time >= collisionTime && (
          <line
            x1={collisionX}
            y1={groundY - 100}
            x2={collisionX}
            y2={groundY + 20}
            stroke={PHYSICS_COLORS.potentialEnergy}
            strokeWidth={STROKE.axisBold}
            strokeDasharray={DASH.reference.join(' ')}
          />
        )}
        <text x={collisionX} y={groundY + 35} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.potentialEnergy} textAnchor="middle">碰撞点</text>

        <circle
          cx={x1}
          cy={groundY - 30}
          r={15 + m1 * 2}
          fill={PHYSICS_COLORS.momentum}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={x1}
          y={groundY - 25}
          fontSize={FONT.smallSize}
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m₁={m1}
        </text>

        <circle
          cx={x2}
          cy={groundY - 30}
          r={15 + m2 * 2}
          fill={PHYSICS_COLORS.velocity}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={x2}
          y={groundY - 25}
          fontSize={FONT.smallSize}
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m₂={m2}
        </text>

        {showVectors && (
          <g>
            {currentV1 !== 0 && (
              <>
                <line
                  x1={x1}
                  y1={groundY - 30}
                  x2={x1 + currentV1 * 10}
                  y2={groundY - 30}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-mc-v1)"
                />
                <text
                  x={x1 + currentV1 * 10 + (currentV1 > 0 ? 10 : -40)}
                  y={groundY - 25}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.forceNet}
                  fontWeight="bold"
                >
                  v₁={currentV1.toFixed(1)}
                </text>
              </>
            )}

            {currentV2 !== 0 && (
              <>
                <line
                  x1={x2}
                  y1={groundY - 30}
                  x2={x2 + currentV2 * 10}
                  y2={groundY - 30}
                  stroke={PHYSICS_COLORS.elasticForce}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-mc-v2)"
                />
                <text
                  x={x2 + currentV2 * 10 + (currentV2 > 0 ? 10 : -40)}
                  y={groundY - 25}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.elasticForce}
                  fontWeight="bold"
                >
                  v₂={currentV2.toFixed(1)}
                </text>
              </>
            )}
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize={FONT.bodySize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">动量守恒</text>
            <text x={0} y={25} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              m₁ = {m1} kg, v₁₀ = {v1} m/s
            </text>
            <text x={0} y={45} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              m₂ = {m2} kg, v₂₀ = {v2} m/s
            </text>
            <text x={0} y={70} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.momentum} fontWeight="bold">
              碰撞前总动量 p前 = {totalP_before.toFixed(2)} kg·m/s
            </text>
            <text x={0} y={95} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              碰撞后总动量 p后 = {totalP_after.toFixed(2)} kg·m/s
            </text>
            <text x={0} y={120} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              动量守恒: p前 ≈ p后
            </text>
            <text x={0} y={145} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              恢复系数 e = {e}
            </text>
            {time >= collisionTime && (
              <g>
                <text x={0} y={170} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.velocity}>
                  v₁末 = {v1_final.toFixed(2)} m/s
                </text>
                <text x={0} y={190} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.tension}>
                  v₂末 = {v2_final.toFixed(2)} m/s
                </text>
              </g>
            )}
          </g>
        )}

        <defs>
          <marker id="arrowhead-mc-v1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-mc-v2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.tension} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
