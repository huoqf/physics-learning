import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateMechanicalEnergy, calculateFreeFall } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, ENERGY_BAR_COLORS } from '@/theme/physicsColors'

export default function EnergyConservationAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { m = 2, h = 10, v0 = 0, g = 9.8 } = params
  const scale = 30
  const groundY = canvasSize.height - 80
  const startY = groundY - h * scale
  
  const fallTime = Math.sqrt(2 * h / g)
  const effectiveTime = Math.min(time, fallTime)
  
  const { v, y } = calculateFreeFall(v0, g, effectiveTime)
  
  const effectiveV = time <= fallTime ? v : 0
  const effectiveY = time <= fallTime ? y : h
  
  const currentY = Math.min(groundY - 15, startY + effectiveY * scale)

  const { E, Ek, Ep } = calculateMechanicalEnergy(m, effectiveV, g, h - effectiveY)
  const { E: initialE } = calculateMechanicalEnergy(m, v0, g, h)

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const yPos = startY + (i * (groundY - startY)) / 10
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={80}
          y1={yPos}
          x2={canvasSize.width - 80}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
  }

  const barWidth = 40
  const maxEnergy = Math.max(initialE * 1.2, 200)
  const ekHeight = (Ek / maxEnergy) * 200
  const epHeight = (Ep / maxEnergy) * 200
  const totalHeight = (E / maxEnergy) * 200

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        <line x1={80} y1={startY} x2={80} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />
        <line x1={80} y1={groundY} x2={canvasSize.width - 200} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={3} />
        <text x={60} y={startY - 10} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">h={h}m</text>

        <circle
          cx={150}
          cy={currentY}
          r={15}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text x={150} y={currentY + 5} fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">
          m={m}
        </text>

        {showVectors && effectiveV > 0 && (
          <line
            x1={150}
            y1={currentY}
            x2={150}
            y2={currentY + effectiveV * 5}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrowhead-energy)"
          />
        )}

        <g transform={`translate(${canvasSize.width - 180}, ${startY})`}>
          <rect
            x={0}
            y={200 - ekHeight}
            width={barWidth}
            height={ekHeight}
            fill={ENERGY_BAR_COLORS.kinetic}
            stroke={ENERGY_BAR_COLORS.kinetic}
            strokeWidth={1}
          />
          <text x={barWidth / 2} y={200 - ekHeight - 5} fontSize="12" fill={ENERGY_BAR_COLORS.kinetic} textAnchor="middle">
            Ek
          </text>

          <rect
            x={barWidth + 20}
            y={200 - epHeight}
            width={barWidth}
            height={epHeight}
            fill={ENERGY_BAR_COLORS.potential}
            stroke={ENERGY_BAR_COLORS.potential}
            strokeWidth={1}
          />
          <text x={barWidth + 20 + barWidth / 2} y={200 - epHeight - 5} fontSize="12" fill={ENERGY_BAR_COLORS.potential} textAnchor="middle">
            Ep
          </text>

          <rect
            x={2 * (barWidth + 20)}
            y={200 - totalHeight}
            width={barWidth}
            height={totalHeight}
            fill={ENERGY_BAR_COLORS.mechanical}
            stroke={ENERGY_BAR_COLORS.mechanical}
            strokeWidth={1}
          />
          <text x={2 * (barWidth + 20) + barWidth / 2} y={200 - totalHeight - 5} fontSize="12" fill={ENERGY_BAR_COLORS.mechanical} textAnchor="middle">
            E
          </text>
        </g>

        {showFormulas && (
          <g transform="translate(200, 30)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">机械能守恒定律</text>
            <text x={0} y={25} fontSize="12" fill={ENERGY_BAR_COLORS.kinetic}>
              动能: Ek = ½mv² = {Ek.toFixed(1)}J
            </text>
            <text x={0} y={45} fontSize="12" fill={ENERGY_BAR_COLORS.potential}>
              势能: Ep = mgh = {Ep.toFixed(1)}J
            </text>
            <text x={0} y={65} fontSize="12" fill={ENERGY_BAR_COLORS.mechanical} fontWeight="bold">
              总机械能: E = Ek + Ep = {E.toFixed(1)}J
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.axis}>
              初始总机械能: E₀ = {initialE.toFixed(1)}J
            </text>
            <text x={0} y={110} fontSize="12" fill="#8b5cf6" fontWeight="bold">
              机械能守恒: E = E₀ = 常量
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-energy" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
