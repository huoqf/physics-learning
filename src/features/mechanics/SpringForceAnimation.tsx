import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function SpringForceAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 600, height: 400 })

  const { k = 100, m = 1 } = params
  
  const omega = Math.sqrt(k / m)
  const amplitude = 0.5
  const displacement = amplitude * Math.sin(omega * time)
  const springForce = -k * displacement

  const fixedX = canvasSize.width / 2
  const groundY = canvasSize.height / 2
  const boxSize = 40
  const scale = 100
  const currentX = displacement * scale

  const gridLines = []
  if (showGrid) {
    for (let i = -3; i <= 3; i++) {
      const xPos = fixedX + i * 50
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - 60}
          x2={xPos}
          y2={groundY + 60}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
  }

  const springPath = (startX: number, endX: number) => {
    const points = []
    const segments = 15
    const amplitude = 15
    const totalLength = endX - startX
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = startX + t * totalLength
      const y = groundY + (i % 2 === 0 ? -amplitude : amplitude) * (i === 0 || i === segments ? 0 : 1)
      points.push(`${x},${y}`)
    }
    return points.join(' ')
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}
        
        <rect
          x={fixedX - 30}
          y={groundY - 70}
          width={60}
          height={140}
          fill={PHYSICS_COLORS.axis}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={2}
        />
        
        <polyline
          points={springPath(fixedX + 30, fixedX + currentX - boxSize / 2)}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
        />

        <rect
          x={fixedX + currentX - boxSize / 2}
          y={groundY - boxSize / 2}
          width={boxSize}
          height={boxSize}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={4}
        />
        
        <text
          x={fixedX + currentX}
          y={groundY + 5}
          fontSize="12"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          m={m}
        </text>
        
        <line
          x1={fixedX}
          y1={groundY - 80}
          x2={fixedX}
          y2={groundY + 80}
          stroke={PHYSICS_COLORS.acceleration}
          strokeWidth={1}
          strokeDasharray="6,4"
        />
        <text
          x={fixedX}
          y={groundY - 90}
          fontSize="12"
          fill={PHYSICS_COLORS.acceleration}
          textAnchor="middle"
        >
          平衡位置
        </text>

        {showVectors && (
          <g>
            {springForce !== 0 && (
              <line
                x1={fixedX + currentX}
                y1={groundY}
                x2={fixedX + currentX + springForce * 2}
                y2={groundY}
                stroke={PHYSICS_COLORS.elasticForce}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                markerEnd="url(#arrowhead-sf-f)"
              />
            )}
            {springForce !== 0 && (
              <text
                x={fixedX + currentX + springForce * 2 + (springForce > 0 ? 10 : -30)}
                y={groundY - 10}
                fontSize="12"
                fill={PHYSICS_COLORS.elasticForce}
                fontWeight="bold"
              >
                F弹
              </text>
            )}
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">弹力演示（胡克定律）</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              劲度系数 k = {k} N/m
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              质量 m = {m} kg
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              胡克定律: F = -kx
            </text>
            <text x={0} y={95} fontSize="12" fill={PHYSICS_COLORS.displacement}>
              当前位移 x = {displacement.toFixed(2)} m
            </text>
            <text x={0} y={120} fontSize="12" fill={PHYSICS_COLORS.elasticForce}>
              弹力 F = {springForce.toFixed(1)} N
            </text>
            <text x={0} y={145} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy}>
              角频率 ω = {omega.toFixed(2)} rad/s
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-sf-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.elasticForce} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
