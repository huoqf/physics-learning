import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateObliqueThrow, calculateObliqueThrowRange } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

export default function ObliqueThrowAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { v0 = 15, angle = 45, g = 9.8 } = params
  const { range, maxHeight, totalTime } = calculateObliqueThrowRange(v0, angle, g)

  const effectiveTime = Math.min(time, totalTime)
  const { x, y, vx, vy } = calculateObliqueThrow(v0, angle, g, effectiveTime)

  const effectiveVy = time <= totalTime ? vy : 0

  const isAtGround = time >= totalTime
  useEffect(() => {
    if (isAtGround && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtGround, time, setIsPlaying])

  const scaleX = (canvasSize.width - 100) / Math.max(range * 1.2, 50)
  const scaleY = (canvasSize.height - 100) / Math.max(maxHeight * 2.5, 20)
  const groundY = canvasSize.height - 50
  const originX = 50
  const originY = groundY

  const canvasX = originX + x * scaleX
  const canvasY = Math.min(groundY - 15, originY - y * scaleY)

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const xPos = originX + (i * (canvasSize.width - 100)) / 10
      gridLines.push(
        <line
          key={`vline-${i}`}
          x1={xPos}
          y1={originY - maxHeight * scaleY}
          x2={xPos}
          y2={originY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
    for (let i = 0; i <= 5; i++) {
      const yPos = originY - (i * maxHeight * scaleY) / 5
      gridLines.push(
        <line
          key={`hline-${i}`}
          x1={originX}
          y1={yPos}
          x2={canvasSize.width - 50}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )
    }
  }

  const pathPoints = []
  for (let t = 0; t <= Math.min(time, totalTime); t += 0.1) {
    const { x: px, y: py } = calculateObliqueThrow(v0, angle, g, t)
    const pathY = Math.min(groundY - 15, originY - py * scaleY)
    pathPoints.push(`${originX + px * scaleX},${pathY}`)
  }
  const pathD = pathPoints.length > 1 ? `M ${pathPoints.join(' L ')}` : ''

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}

        <line x1={originX} y1={originY} x2={canvasSize.width - 50} y2={originY} stroke={PHYSICS_COLORS.labelText} strokeWidth={2} />

        <line
          x1={originX}
          y1={originY}
          x2={originX + v0 * Math.cos((angle * Math.PI) / 180) * scaleX * 1.5}
          y2={originY - v0 * Math.sin((angle * Math.PI) / 180) * scaleY * 1.5}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.5}
        />

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={CANVAS_STYLE.stroke.trackHistory}
            strokeDasharray="6,4"
            opacity={0.5}
          />
        )}

        <circle
          cx={canvasX}
          cy={canvasY}
          r={12}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />

        {showVectors && (
          <g>
            <line
              x1={canvasX}
              y1={canvasY}
              x2={canvasX + vx * 4}
              y2={canvasY - effectiveVy * 4}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-ob)"
            />
            <text
              x={canvasX + vx * 4 + 5}
              y={canvasY - effectiveVy * 4 - 5}
              fontSize="12"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        <line
          x1={canvasX}
          y1={canvasY}
          x2={canvasX}
          y2={groundY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <text
          x={canvasX + 5}
          y={groundY - 5}
          fontSize="10"
          fill={PHYSICS_COLORS.axis}
        >
          {x.toFixed(1)}m
        </text>

        {showFormulas && (
          <g transform={`translate(${canvasSize.width - 180}, 20)`}>
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">斜抛运动公式</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>x = v₀cosθ · t</text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>y = v₀sinθ · t - ½gt²</text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>射程: R = v₀²sin2θ/g</text>
            <text x={0} y={85} fontSize="12" fill={PHYSICS_COLORS.axis}>射高: H = v₀²sin²θ/2g</text>
            <text x={0} y={110} fontSize="12" fill={PHYSICS_COLORS.axis}>
              当前: x={x.toFixed(1)}m, y={y.toFixed(1)}m
            </text>
            <text x={0} y={130} fontSize="12" fill={PHYSICS_COLORS.axis}>
              v₀={v0}m/s, θ={angle}°
            </text>
            <text x={0} y={150} fontSize="12" fill={PHYSICS_COLORS.displacement}>
              射程={range.toFixed(1)}m, 射高={maxHeight.toFixed(1)}m
            </text>
            <text x={0} y={170} fontSize="12" fill={PHYSICS_COLORS.axis}>
              飞行时间={totalTime.toFixed(2)}s
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-ob" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
