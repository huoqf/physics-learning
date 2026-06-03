import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateAcceleratedMotion } from '@/physics'
import { solveQuadraticTime } from '@/math/numerical'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE } from '@/theme/physics'

export default function UniformAccelerationAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 400 })

  const { v0 = 0, a = 1.5 } = params
  const scale = 25
  const groundY = canvasSize.height - 80
  const startX = 100
  const objectWidth = 50
  const maxVisibleX = canvasSize.width - 50 - objectWidth
  const maxDisplacement = (maxVisibleX - startX) / scale
  const { s: currentS } = calculateAcceleratedMotion(v0, a, time)
  const isAtBoundary = currentS >= maxDisplacement || currentS <= 0
  const displayTime = isAtBoundary
    ? currentS >= maxDisplacement
      ? solveQuadraticTime(v0, a, maxDisplacement)
      : solveQuadraticTime(v0, a, 0)
    : time
  const { v: displayV, s: displayS } = calculateAcceleratedMotion(v0, a, displayTime)
  const effectiveS = Math.max(0, Math.min(maxDisplacement, currentS))
  const currentX = startX + effectiveS * scale

  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 14; i++) {
      const xPos = startX + (i * (canvasSize.width - 200)) / 14
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
          strokeWidth={STROKE.groundLine}
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

        <text x={startX - 10} y={groundY + 35} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

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

        {showVectors && (
          <g>
            <line
              x1={currentX + 50}
              y1={groundY - 35}
              x2={currentX + 50 + displayV * 5}
              y2={groundY - 35}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-ua-v)"
            />
            <text
              x={currentX + 50 + displayV * 5 + 15}
              y={groundY - 30}
              fontSize="12"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>

            <line
              x1={currentX + 25}
              y1={groundY - 80}
              x2={currentX + 25 + a * 10}
              y2={groundY - 80}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-ua-a)"
            />
            <text
              x={currentX + 25 + a * 10 + 15}
              y={groundY - 75}
              fontSize="12"
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-ua-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-ua-a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
