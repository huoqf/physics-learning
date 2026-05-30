import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateFreeFall } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physicsColors'

export default function FreeFallAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 600, height: 500 })

  const { v0 = 0, g = 9.8 } = params
  const scale = 20
  const groundY = canvasSize.height - 50
  const originY = 50
  
  // 计算落地时间（解二次方程 gt²/2 + v0t - h = 0）
  const h = (groundY - originY) / scale
  const discriminant = v0 * v0 + 2 * g * h
  const groundTime = g > 0 && discriminant > 0 ? (-v0 + Math.sqrt(discriminant)) / g : 0
  const effectiveTime = Math.min(time, groundTime)
  
  const { v, y } = calculateFreeFall(v0, g, effectiveTime)
  
  // 落地后速度为0
  const effectiveV = Math.abs(time <= groundTime ? v : 0)
  
  const canvasY = Math.min(groundY - 15, originY + y * scale)
  const canvasVy = effectiveV * scale

  useEffect(() => {
    if (time >= groundTime && time > 0) {
      setIsPlaying(false)
    }
  }, [time, groundTime, setIsPlaying])

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 10; i++) {
      const yPos = originY + (i * (groundY - originY)) / 10
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={50}
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

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}
        
        <line x1={50} y1={originY} x2={50} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        <line x1={50} y1={groundY} x2={canvasSize.width - 50} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        
        <text x={30} y={originY - 5} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">y=0</text>
        <text x={30} y={groundY + 20} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">y=-h</text>
        <text x={canvasSize.width - 30} y={groundY + 20} fontSize="12" fill={PHYSICS_COLORS.axis} textAnchor="middle">x</text>

        <circle
          cx={canvasSize.width / 2}
          cy={canvasY}
          r={15}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />
        
        {showVectors && effectiveV !== 0 && (
          <g>
            <line
              x1={canvasSize.width / 2}
              y1={canvasY}
              x2={canvasSize.width / 2}
              y2={canvasY + Math.min(canvasVy, 100)}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead)"
            />
            <text
              x={canvasSize.width / 2 + 20}
              y={canvasY + canvasVy / 2}
              fontSize="14"
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform={`translate(${canvasSize.width - 150}, ${originY + 30})`}>
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">公式</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              v = v₀ - gt
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              y = v₀t - ½gt²
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.axis}>
              当前: v={effectiveV.toFixed(1)} m/s, y={y.toFixed(1)} m
            </text>
          </g>
        )}

        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}