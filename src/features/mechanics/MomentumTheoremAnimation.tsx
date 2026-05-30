import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function MomentumTheoremAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 400 })

  const { m = 2, F = 5, t_duration = 3, v0 = 0 } = params
  const a = F / m
  const impulse = F * t_duration
  const v_final = v0 + a * t_duration
  const p0 = m * v0
  const p_final = m * v_final
  const delta_p = p_final - p0

  const scale = 25
  const groundY = canvasSize.height - 80
  const startX = 100
  const currentTime = Math.min(time, t_duration)
  const currentV = v0 + a * currentTime
  const currentP = m * currentV
  const displacement = v0 * currentTime + 0.5 * a * currentTime * currentTime
  const currentX = startX + displacement * scale

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

        <line
          x1={startX}
          y1={groundY - 100}
          x2={startX}
          y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="8,4"
        />

        <text x={startX - 10} y={groundY + 35} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">t=0</text>

        <rect
          x={currentX}
          y={groundY - 60}
          width={50}
          height={50}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={6}
        />

        <text x={currentX + 25} y={groundY - 30} fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">m={m}</text>

        {showVectors && (
          <g>
            <line
              x1={currentX + 50}
              y1={groundY - 35}
              x2={currentX + 50 + F * 6}
              y2={groundY - 35}
              stroke={PHYSICS_COLORS.forceNet}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-mt-F)"
            />
            <text
              x={currentX + 50 + F * 6 + 10}
              y={groundY - 30}
              fontSize="12"
              fill={PHYSICS_COLORS.forceNet}
              fontWeight="bold"
            >
              F
            </text>

            {currentV > 0 && (
              <line
                x1={currentX + 25}
                y1={groundY - 80}
                x2={currentX + 25 + currentV * 5}
                y2={groundY - 80}
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                markerEnd="url(#arrowhead-mt-v)"
              />
            )}
            {currentV > 0 && (
              <text
                x={currentX + 25 + currentV * 5 + 10}
                y={groundY - 75}
                fontSize="12"
                fill={PHYSICS_COLORS.velocity}
                fontWeight="bold"
              >
                v
              </text>
            )}
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">动量定理</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              质量 m = {m} kg
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              力 F = {F} N
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              作用时间 Δt = {t_duration} s
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.momentum} fontWeight="bold">
              冲量 I = FΔt = {impulse.toFixed(1)} N·s
            </text>
            <text x={0} y={115} fontSize="12" fill={PHYSICS_COLORS.momentum} fontWeight="bold">
              Δp = p末 - p初 = {delta_p.toFixed(1)} kg·m/s
            </text>
            <text x={0} y={140} fontSize="12" fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold">
              I = Δp
            </text>
            <text x={0} y={165} fontSize="12" fill={PHYSICS_COLORS.axis}>
              当前 t = {currentTime.toFixed(2)} s
            </text>
            <text x={0} y={185} fontSize="12" fill={PHYSICS_COLORS.momentum}>
              当前 p = {currentP.toFixed(2)} kg·m/s
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-mt-F" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrowhead-mt-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
