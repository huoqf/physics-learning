import { useEffect, useState, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { solveQuadraticTime } from '@/math/numerical'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function AccelerationAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 350 })
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

  const { v0 = 0, a = 2 } = params
  const scale = 20
  const groundY = canvasSize.height - 80
  const startX = 100
  const objectWidth = 50
  const maxVisibleX = canvasSize.width - 50 - objectWidth
  const rawS = v0 * time + 0.5 * a * time * time
  const maxDisplacement = (maxVisibleX - startX) / scale
  const effectiveS = Math.max(-(maxVisibleX - startX) / scale, Math.min(maxDisplacement, rawS))
  const isAtBoundary = rawS >= maxDisplacement || rawS <= -(maxVisibleX - startX) / scale
  const currentX = startX + effectiveS * scale
  const displayTime = isAtBoundary
    ? rawS >= maxDisplacement
      ? solveQuadraticTime(v0, a, maxDisplacement)
      : solveQuadraticTime(v0, a, -(maxVisibleX - startX) / scale)
    : time
  const displayV = v0 + a * displayTime
  const displayS = v0 * displayTime + 0.5 * a * displayTime * displayTime

  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 12; i++) {
      const xPos = startX + (i * (canvasSize.width - 200)) / 12
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - 70}
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
          x1={50}
          y1={groundY}
          x2={canvasSize.width - 50}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />
        
        <line
          x1={startX}
          y1={groundY - 90}
          x2={startX}
          y2={groundY + 10}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="8,4"
        />
        
        <text x={startX - 10} y={groundY + 30} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

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
              x2={currentX + 50 + displayV * 6}
              y2={groundY - 35}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-acc-v)"
            />
            <text
              x={currentX + 50 + displayV * 6 + 15}
              y={groundY - 30}
              fontSize="12"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
            
            <line
              x1={currentX + 25}
              y1={groundY - 75}
              x2={currentX + 25 + a * 8}
              y2={groundY - 75}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-acc-a)"
            />
            <text
              x={currentX + 25 + a * 8 + 15}
              y={groundY - 70}
              fontSize="12"
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              a
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform="translate(20, 20)">
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">加速度演示</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              初速度 v₀ = {v0} m/s
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              加速度 a = {a} m/s²
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              时间 t = {displayTime.toFixed(2)} s
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v = v₀ + at = {displayV.toFixed(2)} m/s
            </text>
            <text x={0} y={115} fontSize="12" fill={PHYSICS_COLORS.displacement} fontWeight="bold">
              s = v₀t + ½at² = {displayS.toFixed(2)} m
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-acc-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-acc-a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
