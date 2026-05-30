import { useEffect, useState, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { solveQuadraticTime } from '@/math/numerical'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function WeightlessnessAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [canvasSize, setCanvasSize] = useState({ width: 650, height: 500 })
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

  const { a = 0, g = 9.8, m = 50 } = params
  const weight = m * g
  const normalForce = m * (g + a)
  const isOverweight = a > 0
  const isUnderweight = a < 0 && Math.abs(a) < g
  const isWeightless = Math.abs(a + g) < 0.1

  const elevatorWidth = 160
  const elevatorHeight = 200
  const centerX = canvasSize.width / 2
  const shaftTop = 40
  const shaftBottom = canvasSize.height - 60
  const shaftHeight = shaftBottom - shaftTop
  const maxTravel = (shaftHeight - elevatorHeight) / 2
  const elevatorStartY = shaftTop + shaftHeight / 2 - elevatorHeight / 2

  const maxDisplacementTime = maxTravel > 0 && Math.abs(a) > 0.01
    ? (a > 0 ? solveQuadraticTime(0, a, maxTravel) : solveQuadraticTime(0, a, -maxTravel))
    : Infinity
  const isAtBoundary = a !== 0 && time >= maxDisplacementTime
  const effectiveTime = isAtBoundary ? maxDisplacementTime : time

  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  const elevatorDisp = 0.5 * a * effectiveTime * effectiveTime
  const elevatorY = elevatorStartY - Math.min(Math.max(elevatorDisp, -maxTravel), maxTravel)

  const displayTime = isAtBoundary ? maxDisplacementTime : time
  const displayVelocity = Math.abs(a) > 0.01 ? a * displayTime : 0
  const displayDisplacement = 0.5 * a * displayTime * displayTime

  const floorY = elevatorY + elevatorHeight - 15
  const objectBaseY = floorY - 25
  const objectX = centerX

  const directionArrow = a > 0 ? '↑' : a < 0 ? '↓' : ''
  const movementText = a > 0 ? '向上加速' : a < 0 ? '向下加速' : '静止'

  const gridLines = []
  if (showGrid) {
    const gridCount = 10
    for (let i = 0; i <= gridCount; i++) {
      const yPos = shaftTop + (i * (shaftBottom - shaftTop)) / gridCount
      gridLines.push(
        <line
          key={`grid-y-${i}`}
          x1={centerX - 140}
          y1={yPos}
          x2={centerX + 140}
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

        <line x1={centerX - 110} y1={shaftTop} x2={centerX - 110} y2={shaftBottom} stroke={PHYSICS_COLORS.axis} strokeWidth={4} />
        <line x1={centerX + 110} y1={shaftTop} x2={centerX + 110} y2={shaftBottom} stroke={PHYSICS_COLORS.axis} strokeWidth={4} />

        <rect
          x={centerX - 80}
          y={elevatorY}
          width={elevatorWidth}
          height={elevatorHeight}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={3}
        />

        <rect
          x={centerX - 60}
          y={floorY}
          width={120}
          height={10}
          fill={PHYSICS_COLORS.axis}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={2}
        />

        <circle
          cx={objectX}
          cy={objectBaseY - 15}
          r={15}
          fill={PHYSICS_COLORS.electricField}
        />
        <rect
          x={objectX - 12}
          y={objectBaseY}
          width={24}
          height={30}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={1.5}
        />

        {isWeightless && (
          <g>
            <text
              x={centerX}
              y={elevatorY - 10}
              fontSize="12"
              fill={PHYSICS_COLORS.potentialEnergy}
              fontWeight="bold"
              textAnchor="middle"
            >
              完全失重 (N = 0)
            </text>
          </g>
        )}

        {a !== 0 && !isWeightless && (
          <g>
            <text
              x={centerX}
              y={elevatorY - 10}
              fontSize="14"
              fill={PHYSICS_COLORS.elasticForce}
              fontWeight="bold"
              textAnchor="middle"
            >
              {directionArrow} {movementText}
            </text>
          </g>
        )}

        {showVectors && (
          <g>
            <line
              x1={objectX}
              y1={objectBaseY - 5}
              x2={objectX}
              y2={objectBaseY - 5 + weight * 0.4}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-wl-g)"
            />
            <text
              x={objectX + 20}
              y={objectBaseY - 5 + weight * 0.2 + 5}
              fontSize="14"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
            >
              G
            </text>

            {!isWeightless && (
              <>
                <line
                  x1={objectX}
                  y1={objectBaseY + 35}
                  x2={objectX}
                  y2={objectBaseY + 35 - normalForce * 0.4}
                  stroke={PHYSICS_COLORS.normalForce}
                  strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                  markerEnd="url(#arrowhead-wl-n)"
                />
                <text
                  x={objectX + 20}
                  y={objectBaseY + 35 - normalForce * 0.2 + 5}
                  fontSize="14"
                  fill={PHYSICS_COLORS.normalForce}
                  fontWeight="bold"
                >
                  N
                </text>
              </>
            )}

            {a !== 0 && (
              <>
                <line
                  x1={objectX + 50}
                  y1={objectBaseY - 20}
                  x2={objectX + 50}
                  y2={objectBaseY - 20 - a * 3}
                  stroke={PHYSICS_COLORS.acceleration}
                  strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                  markerEnd="url(#arrowhead-wl-a)"
                />
                <text
                  x={objectX + 60}
                  y={objectBaseY - 20 - a * 1.5}
                  fontSize="14"
                  fill={PHYSICS_COLORS.acceleration}
                  fontWeight="bold"
                >
                  a
                </text>
              </>
            )}
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">超重与失重</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              质量 m = {m} kg
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              重力加速度 g = {g} m/s²
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              电梯加速度 a = {a} m/s²
            </text>
            <text x={0} y={85} fontSize="12" fill={PHYSICS_COLORS.axis}>
              时间 t = {displayTime.toFixed(2)} s
            </text>
            <text x={0} y={105} fontSize="12" fill={PHYSICS_COLORS.axis}>
              速度 v = {displayVelocity.toFixed(1)} m/s
            </text>
            <text x={0} y={125} fontSize="12" fill={PHYSICS_COLORS.axis}>
              位移 s = {displayDisplacement.toFixed(1)} m
            </text>
            <text x={0} y={150} fontSize="12" fill={PHYSICS_COLORS.gravity} fontWeight="bold">
              重力 G = {weight.toFixed(1)} N
            </text>
            <text x={0} y={170} fontSize="12" fill={PHYSICS_COLORS.normalForce} fontWeight="bold">
              支持力 N = {normalForce.toFixed(1)} N
            </text>
            <text x={0} y={195} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              公式: N = m(g + a)
            </text>
            {isOverweight && (
              <text x={0} y={220} fontSize="12" fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
                状态: 超重 (N &gt; G)
              </text>
            )}
            {isUnderweight && !isWeightless && (
              <text x={0} y={220} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
                状态: 失重 (N &lt; G)
              </text>
            )}
            {isWeightless && (
              <text x={0} y={220} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
                状态: 完全失重 (N = 0)
              </text>
            )}
          </g>
        )}

        <defs>
          <marker id="arrowhead-wl-g" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker id="arrowhead-wl-n" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.normalForce} />
          </marker>
          <marker id="arrowhead-wl-a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
