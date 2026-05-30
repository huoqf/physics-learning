import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function VerticalThrowAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 550, height: 550 })

  const { v0 = 15, g = 9.8 } = params
  const maxHeightTime = v0 / g
  const maxHeight = (v0 * v0) / (2 * g)
  const totalTime = (2 * v0) / g
  
  const groundY = canvasSize.height - 80
  const startY = groundY - 20
  const topBoundary = 50
  const availableHeight = startY - topBoundary - 15
  
  const displayMaxHeight = Math.max(maxHeight, 1)
  const scale = availableHeight / displayMaxHeight

  const y = v0 * time - 0.5 * g * time * time

  const isAtBottomBoundary = time >= totalTime
  
  useEffect(() => {
    if (isAtBottomBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBottomBoundary, time, setIsPlaying])
  
  const effectiveTime = isAtBottomBoundary ? totalTime : time
  
  const effectiveV = v0 - g * effectiveTime
  const effectiveY = v0 * effectiveTime - 0.5 * g * effectiveTime * effectiveTime
  
  const clampedY = Math.max(y, 0)
  const currentY = startY - clampedY * scale

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const yPos = startY - i * (startY - 60) / 10
      gridLines.push(
        <line
          key={`gridline-${i}`}
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

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}
        
        <line
          x1={80}
          y1={groundY}
          x2={canvasSize.width - 80}
          y2={groundY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={3}
        />
        
        <line
          x1={canvasSize.width / 2}
          y1={50}
          x2={canvasSize.width / 2}
          y2={groundY + 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray="8,4"
        />
        
        <text x={canvasSize.width / 2 + 15} y={startY + 5} fontSize="12" fill={PHYSICS_COLORS.axis}>y=0</text>
        <text x={canvasSize.width / 2 + 15} y={groundY + 15} fontSize="12" fill={PHYSICS_COLORS.axis}>y (地面)</text>

        <circle
          cx={canvasSize.width / 2}
          cy={currentY}
          r={15}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />

        {showVectors && (
          <g>
            {effectiveV !== 0 && (
              <line
                x1={canvasSize.width / 2}
                y1={currentY}
                x2={canvasSize.width / 2}
                y2={currentY - effectiveV * 4}
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={CANVAS_STYLE.stroke.vectorMain}
                markerEnd="url(#arrowhead-vt-v)"
              />
            )}
            {effectiveV !== 0 && (
              <text
                x={canvasSize.width / 2 + 20}
                y={currentY - effectiveV * 2}
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
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">竖直上抛运动</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              初速度 v₀ = {v0} m/s
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              重力加速度 g = {g} m/s²
            </text>
            <text x={0} y={65} fontSize="12" fill={PHYSICS_COLORS.axis}>
              时间 t = {effectiveTime.toFixed(2)} s
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              v = v₀ - gt = {effectiveV.toFixed(2)} m/s
            </text>
            <text x={0} y={115} fontSize="12" fill={PHYSICS_COLORS.displacement} fontWeight="bold">
              y = v₀t - ½gt² = {effectiveY.toFixed(2)} m
            </text>
            <text x={0} y={140} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              最高点 t = {maxHeightTime.toFixed(2)} s, y = {maxHeight.toFixed(2)} m
            </text>
            <text x={0} y={165} fontSize="12" fill={PHYSICS_COLORS.axis}>
              落地时间 t = {totalTime.toFixed(2)} s
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-vt-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
