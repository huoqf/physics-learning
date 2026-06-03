import { useCanvasSize } from '@/utils'
import { useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateProjectileMotion } from '@/physics'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'

export default function ProjectileAnimation() {
  const { params, time, showVectors, showFormulas, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 500 })

  const { v0x = 10, g = 9.8 } = params
  const scale = 15
  const groundY = canvasSize.height - 50
  const originX = 80
  const originY = 50
  
  // 计算落地时间
  const h = (groundY - originY) / scale
  const groundTime = g > 0 ? Math.sqrt(2 * h / g) : 0
  const effectiveTime = Math.min(time, groundTime)
  
  const { x, y, vx, vy, v } = calculateProjectileMotion(v0x, g, effectiveTime)
  
  const isAtGround = time >= groundTime
  useEffect(() => {
    if (isAtGround && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtGround, time, setIsPlaying])
  
  // 落地后速度垂直分量为0
  const effectiveVy = time <= groundTime ? vy : 0
  const effectiveV = time <= groundTime ? v : Math.abs(vx)

  const canvasX = originX + x * scale
  const canvasY = originY + y * scale

  const gridLines = []
  if (showGrid) {
    for (let i = 0; i <= 8; i++) {
      const yPos = originY + (i * (groundY - originY)) / 8
      gridLines.push(
        <line
          key={`h-${i}`}
          x1={originX}
          y1={yPos}
          x2={canvasSize.width - 50}
          y2={yPos}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
    for (let i = 0; i <= 10; i++) {
      const xPos = originX + (i * (canvasSize.width - 130)) / 10
      gridLines.push(
        <line
          key={`v-${i}`}
          x1={xPos}
          y1={originY}
          x2={xPos}
          y2={groundY}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
  }

  const pathPoints = []
  for (let t = 0; t <= effectiveTime; t += 0.1) {
    const { x: px, y: py } = calculateProjectileMotion(v0x, g, t)
    pathPoints.push(`${originX + px * scale},${originY + py * scale}`)
  }
  const pathD = pathPoints.length > 1 ? `M ${pathPoints.join(' L ')}` : ''

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {gridLines}
        
        <line x1={originX} y1={originY} x2={originX} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.axisBold} />
        <line x1={originX} y1={groundY} x2={canvasSize.width - 50} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.axisBold} />
        
        <text x={originX - 30} y={originY - 5} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">y=0</text>
        <text x={originX - 30} y={groundY + 20} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">y</text>
        <text x={canvasSize.width - 30} y={groundY + 20} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis} textAnchor="middle">x</text>

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={PHYSICS_COLORS.trackHistory}
            strokeWidth={CANVAS_STYLE.stroke.trackHistory}
            strokeDasharray={DASH.reference.join(' ')}
            opacity={0.5}
          />
        )}

        <circle
          cx={Math.min(canvasSize.width - 65, canvasX)}
          cy={Math.min(groundY - 15, canvasY)}
          r={12}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          className="transition-all duration-75"
        />

        {showVectors && effectiveV > 0 && (
          <g>
            <line
              x1={canvasX}
              y1={canvasY}
              x2={canvasX + vx * 5}
              y2={canvasY}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorSub}
              markerEnd="url(#arrowhead-green)"
            />
            <text x={canvasX + vx * 5 + 10} y={canvasY - 5} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">vₓ</text>
            
            {effectiveVy !== 0 && (
              <line
                x1={canvasX}
                y1={canvasY}
                x2={canvasX}
                y2={canvasY + effectiveVy * 5}
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={CANVAS_STYLE.stroke.vectorSub}
                markerEnd="url(#arrowhead-orange)"
              />
            )}
            {effectiveVy !== 0 && (
              <text x={canvasX + 15} y={canvasY + effectiveVy * 5} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">vᵧ</text>
            )}
            
            <line
              x1={canvasX}
              y1={canvasY}
              x2={canvasX + vx * 5}
              y2={canvasY + effectiveVy * 5}
              stroke={PHYSICS_COLORS.annotation}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-purple)"
            />
            <text
              x={canvasX + vx * 5 + 15}
              y={canvasY + effectiveVy * 5}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.annotation}
              fontWeight="bold"
            >
              v
            </text>
          </g>
        )}

        {showFormulas && (
          <g transform={`translate(${canvasSize.width - 180}, ${originY + 30})`}>
            <text fontSize={FONT.bodySize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">平抛运动公式</text>
            <text x={0} y={25} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>x = v₀ₓ · t</text>
            <text x={0} y={45} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>y = ½gt²</text>
            <text x={0} y={65} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>vₓ = v₀ₓ（匀速）</text>
            <text x={0} y={85} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>vᵧ = gt（自由落体）</text>
            <text x={0} y={110} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              当前: x={x.toFixed(1)}m, y={y.toFixed(1)}m
            </text>
            <text x={0} y={130} fontSize={FONT.axisSize} fill={PHYSICS_COLORS.axis}>
              v={effectiveV.toFixed(1)}m/s, θ={(Math.atan2(effectiveVy, vx) * 180 / Math.PI).toFixed(1)}°
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-orange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrowhead-purple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.annotation} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}