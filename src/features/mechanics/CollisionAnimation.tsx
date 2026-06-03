import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateElasticCollision, calculateInelasticCollision, calculateMomentum } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'

export default function CollisionAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { m1 = 2, m2 = 3, v1 = 5, v2 = -2, isElastic = 1 } = params
  const isElasticCollision = isElastic === 1

  const elasticResult = calculateElasticCollision(m1, v1, m2, v2)
  const inelasticResult = calculateInelasticCollision(m1, v1, m2, v2)

  const { p: p1_initial } = calculateMomentum(m1, v1)
  const { p: p2_initial } = calculateMomentum(m2, v2)
  const totalMomentumInitial = p1_initial + p2_initial

  const v1f = isElasticCollision ? elasticResult.v1f : inelasticResult.vf
  const v2f = isElasticCollision ? elasticResult.v2f : inelasticResult.vf

  const totalMomentumFinal = m1 * v1f + m2 * v2f

  const groundY = canvasSize.height / 2
  const scale = 25

  const r1 = 15 + m1 * 3
  const r2 = 15 + m2 * 3

  const startX1 = canvasSize.width / 2 - 150
  const startX2 = canvasSize.width / 2 + 150

  const approachSpeed = (v1 - v2) * scale
  const distanceBeforeCollision = startX2 - startX1 - r1 - r2
  const collisionTime = approachSpeed > 0 ? distanceBeforeCollision / approachSpeed : Infinity
  const actualCollisionX = startX1 + v1 * collisionTime * scale + r1

  let canvas1X: number
  let canvas2X: number
  let currentV1: number
  let currentV2: number

  if (time < collisionTime) {
    canvas1X = startX1 + v1 * time * scale
    canvas2X = startX2 + v2 * time * scale
    currentV1 = v1
    currentV2 = v2
  } else {
    const afterCollisionTime = time - collisionTime
    canvas1X = actualCollisionX - r1 + v1f * afterCollisionTime * scale
    canvas2X = actualCollisionX + r2 + v2f * afterCollisionTime * scale
    currentV1 = v1f
    currentV2 = v2f
  }

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 14; i++) {
      const xPos = 50 + (i * (canvasSize.width - 100)) / 14
      gridLines.push(
        <line
          key={`vline-${i}`}
          x1={xPos}
          y1={groundY - 50}
          x2={xPos}
          y2={groundY + 50}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
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
          strokeWidth={STROKE.axisBold}
        />

        <line
          x1={actualCollisionX}
          y1={groundY - 60}
          x2={actualCollisionX}
          y2={groundY + 60}
          stroke={PHYSICS_COLORS.friction}
          strokeWidth={STROKE.axisBold}
          strokeDasharray={`${CANVAS_STYLE.dash.reference[0]},${CANVAS_STYLE.dash.reference[1]}`}
        />
        <text
          x={actualCollisionX}
          y={groundY - 70}
          fontSize={FONT.axisSize}
          fill={PHYSICS_COLORS.friction}
          textAnchor="middle"
        >
          碰撞点
        </text>

        <circle
          cx={canvas1X}
          cy={groundY}
          r={r1}
          fill={isElasticCollision ? PHYSICS_COLORS.objectFill : PHYSICS_COLORS.electricForce}
          stroke={isElasticCollision ? PHYSICS_COLORS.objectStroke : PHYSICS_COLORS.forceNetArrow}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />
        <text
          x={canvas1X}
          y={groundY + 4}
          fontSize={FONT.axisSize}
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m₁
        </text>

        <circle
          cx={canvas2X}
          cy={groundY}
          r={r2}
          fill={isElasticCollision ? PHYSICS_COLORS.elasticForce : PHYSICS_COLORS.potentialEnergy}
          stroke={isElasticCollision ? PHYSICS_COLORS.elasticForce : PHYSICS_COLORS.potentialEnergy}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={canvas2X}
          y={groundY + 4}
          fontSize={FONT.axisSize}
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m₂
        </text>

        {showVectors && (
          <g>
            {currentV1 !== 0 && (
              <>
                <line
                  x1={canvas1X}
                  y1={groundY - r1 - 15}
                  x2={canvas1X + currentV1 * 8}
                  y2={groundY - r1 - 15}
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-col)"
                />
                <text
                  x={canvas1X + currentV1 * 8 + (currentV1 > 0 ? 10 : -40)}
                  y={groundY - r1 - 10}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.velocity}
                  fontWeight="bold"
                >
                  v₁={currentV1.toFixed(1)}m/s
                </text>
              </>
            )}
            {currentV2 !== 0 && (
              <>
                <line
                  x1={canvas2X}
                  y1={groundY - r2 - 15}
                  x2={canvas2X + currentV2 * 8}
                  y2={groundY - r2 - 15}
                  stroke={PHYSICS_COLORS.momentum}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-col2)"
                />
                <text
                  x={canvas2X + currentV2 * 8 + (currentV2 > 0 ? 10 : -40)}
                  y={groundY - r2 - 10}
                  fontSize={FONT.axisSize}
                  fill={PHYSICS_COLORS.momentum}
                  fontWeight="bold"
                >
                  v₂={currentV2.toFixed(1)}m/s
                </text>
              </>
            )}
          </g>
        )}

        {showFormulas && (
          <g transform={`translate(${canvasSize.width - 220}, 20)`}>
            <text fontSize={FONT.bodySize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              {isElasticCollision ? '弹性碰撞' : '完全非弹性碰撞'}
            </text>
            <text x={0} y={25} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>m₁ = {m1}kg, v₁₀ = {v1}m/s</text>
            <text x={0} y={45} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>m₂ = {m2}kg, v₂₀ = {v2}m/s</text>

            <text x={0} y={75} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>碰撞前系统动量:</text>
            <text x={0} y={95} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              p = m₁v₁ + m₂v₂ = {totalMomentumInitial.toFixed(2)} kg·m/s
            </text>

            {isElasticCollision ? (
              <>
                <text x={0} y={125} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">碰撞后速度:</text>
                <text x={0} y={145} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
                  v₁' = {v1f.toFixed(2)} m/s
                </text>
                <text x={0} y={165} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
                  v₂' = {v2f.toFixed(2)} m/s
                </text>
              </>
            ) : (
              <>
                <text x={0} y={125} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">碰撞后速度:</text>
                <text x={0} y={145} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
                  v' = {v1f.toFixed(2)} m/s
                </text>
              </>
            )}

            <text x={0} y={195} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>碰撞后系统动量:</text>
            <text x={0} y={215} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              p' = {totalMomentumFinal.toFixed(2)} kg·m/s
            </text>

            <text x={0} y={245} fontSize={FONT.axisSize} fill={Math.abs(totalMomentumInitial - totalMomentumFinal) < 0.01 ? PHYSICS_COLORS.elasticForce : PHYSICS_COLORS.friction} fontWeight="bold">
              动量守恒: {Math.abs(totalMomentumInitial - totalMomentumFinal) < 0.01 ? '✓ 成立' : '✗ 不成立'}
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-col" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-col2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.momentum} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
