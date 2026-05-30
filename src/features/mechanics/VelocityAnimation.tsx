import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function VelocityAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 600, height: 300 })

  const { v = 5 } = params
  const scale = 30
  const groundY = canvasSize.height / 2 + 40
  const startX = 100
  const objectWidth = 50
  const maxVisibleX = canvasSize.width - 50 - objectWidth
  const rawX = startX + v * time * scale
  const isAtBoundary = v > 0 ? rawX >= maxVisibleX : false
  const currentX = Math.min(rawX, maxVisibleX)
  const displayTime = isAtBoundary ? (maxVisibleX - startX) / (v * scale) : time
  const displayDisplacement = v * displayTime

  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = startX + (i * (canvasSize.width - 200)) / 10
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - 60}
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
          y1={groundY - 80}
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
          <line
            x1={currentX + 50}
            y1={groundY - 35}
            x2={currentX + 50 + v * 8}
            y2={groundY - 35}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
            markerEnd="url(#arrowhead-v)"
          />
        )}

        {showVectors && (
          <text
            x={currentX + 50 + v * 8 + 15}
            y={groundY - 30}
            fontSize="14"
            fill={PHYSICS_COLORS.velocity}
            fontWeight="bold"
          >
            v
          </text>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">速度演示</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              速度 v = {v} m/s
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              时间 t = {displayTime.toFixed(2)} s
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              位移 s = v·t = {displayDisplacement.toFixed(2)} m
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
