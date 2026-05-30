import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { calculateOrbitalSpeed } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

const G = 6.67e-11
const M = 5.97e24
const TIME_SCALE = 120

export default function SatelliteAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { r = 7 } = params
  const scale = 25
  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2

  const planetRadius = 30
  const satelliteRadius = 8

  const r_meters = r * 1e6
  const { v, T: T_seconds } = calculateOrbitalSpeed(M, r_meters, G)
  const T_minutes = T_seconds / 60

  const angularSpeed = (2 * Math.PI) / T_seconds
  const currentAngle = angularSpeed * time * TIME_SCALE

  const satelliteX = centerX + r * scale * Math.cos(currentAngle)
  const satelliteY = centerY - r * scale * Math.sin(currentAngle)

  const orbitRadius = r * scale

  const gridLines = []
  if (showGrid) {
    for (let i = -4; i <= 4; i++) {
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
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="5,5"
        />

        <circle
          cx={centerX}
          cy={centerY}
          r={planetRadius}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={centerX}
          y={centerY + 5}
          fontSize="12"
          fill="white"
          textAnchor="middle"
          fontWeight="bold"
        >
          地球
        </text>

        <circle
          cx={satelliteX}
          cy={satelliteY}
          r={satelliteRadius}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={satelliteX + 15}
          y={satelliteY - 10}
          fontSize="12"
          fill={PHYSICS_COLORS.velocity}
          fontWeight="bold"
        >
          卫星
        </text>

        {showVectors && (
          <g>
            <line
              x1={satelliteX}
              y1={satelliteY}
              x2={satelliteX - (satelliteX - centerX) * 0.3}
              y2={satelliteY - (satelliteY - centerY) * 0.3}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-s-f)"
            />
            <text
              x={satelliteX - (satelliteX - centerX) * 0.3 - 10}
              y={satelliteY - (satelliteY - centerY) * 0.3 - 5}
              fontSize="12"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              F引
            </text>

            <line
              x1={satelliteX}
              y1={satelliteY}
              x2={satelliteX + (satelliteY - centerY) * 0.3}
              y2={satelliteY - (satelliteX - centerX) * 0.3}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-s-v)"
            />
            <text
              x={satelliteX + (satelliteY - centerY) * 0.3 + 10}
              y={satelliteY - (satelliteX - centerX) * 0.3}
              fontSize="12"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">人造卫星</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              轨道半径 r = {r} × 10⁶ m
            </text>
            <text x={0} y={50} fontSize="13" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              线速度 v = √(GM / r)
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v ≈ {v.toFixed(0)} m/s
            </text>
            <text x={0} y={95} fontSize="13" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              周期 T = 2πr / v
            </text>
            <text x={0} y={115} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              T ≈ {T_minutes.toFixed(1)} 分钟
            </text>
            <text x={0} y={140} fontSize="11" fill={PHYSICS_COLORS.axis}>
              G = 6.67×10⁻¹¹ N·m²/kg²
            </text>
            <text x={0} y={160} fontSize="11" fill={PHYSICS_COLORS.axis}>
              M = 5.97×10²⁴ kg (地球质量)
            </text>
            <text x={0} y={180} fontSize="11" fill={PHYSICS_COLORS.gravity}>
              引力提供向心力：GMm/r² = mv²/r
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-s-f" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker id="arrowhead-s-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
