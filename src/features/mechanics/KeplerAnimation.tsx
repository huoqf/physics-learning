import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'

export default function KeplerAnimation() {
  const { params, time, showVectors, showFormulas, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { a = 5, b = 3, period = 10 } = params
  const scale = 30
  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2
  const c = Math.sqrt(a * a - b * b)
  
  const angularSpeed = (2 * Math.PI) / period
  const currentAngle = angularSpeed * time
  
  const planetX = a * Math.cos(currentAngle)
  const planetY = b * Math.sin(currentAngle)
  
  const areaSpeed = (a * b) / (2 * period)
  const r_ellipse = Math.sqrt(Math.pow(planetX + c, 2) + Math.pow(planetY, 2))
  const speed = (2 * areaSpeed) / r_ellipse

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
        
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={a * scale}
          ry={b * scale}
          fill="none"
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        
        <circle
          cx={centerX + c * scale}
          cy={centerY}
          r={8}
          fill={PHYSICS_COLORS.electricField}
        />
        <text
          x={centerX + c * scale + 15}
          y={centerY - 15}
          fontSize="12"
          fill={PHYSICS_COLORS.electricField}
          fontWeight="bold"
        >
          太阳
        </text>
        
        <circle
          cx={centerX - c * scale}
          cy={centerY}
          r={4}
          fill={PHYSICS_COLORS.axis}
        />
        
        <circle
          cx={centerX + planetX * scale}
          cy={centerY - planetY * scale}
          r={10}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        <text
          x={centerX + planetX * scale + 15}
          y={centerY - planetY * scale - 10}
          fontSize="12"
          fill={PHYSICS_COLORS.objectStroke}
          fontWeight="bold"
        >
          行星
        </text>

        {showVectors && (
          <g>
            <line
              x1={centerX + c * scale}
              y1={centerY}
              x2={centerX + planetX * scale}
              y2={centerY - planetY * scale}
              stroke={PHYSICS_COLORS.elasticForce}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            
            <line
              x1={centerX + planetX * scale}
              y1={centerY - planetY * scale}
              x2={centerX + planetX * scale - (planetY * scale * 0.3)}
              y2={centerY - planetY * scale - (planetX * scale * 0.3)}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-kp-v)"
            />
            <text
              x={centerX + planetX * scale - (planetY * scale * 0.3) - 10}
              y={centerY - planetY * scale - (planetX * scale * 0.3) - 10}
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
            <text fontSize="14" fill={PHYSICS_COLORS.labelText} fontWeight="bold">开普勒定律</text>
            <text x={0} y={25} fontSize="12" fill={PHYSICS_COLORS.axis}>
              半长轴 a = {a}, 半短轴 b = {b}
            </text>
            <text x={0} y={45} fontSize="12" fill={PHYSICS_COLORS.axis}>
              周期 T = {period} s
            </text>
            <text x={0} y={70} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              开普勒第一定律: 椭圆轨道
            </text>
            <text x={0} y={90} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              开普勒第二定律: 面积定律
            </text>
            <text x={0} y={115} fontSize="12" fill={PHYSICS_COLORS.potentialEnergy} fontWeight="bold">
              开普勒第三定律: T² ∝ a³
            </text>
            <text x={0} y={140} fontSize="12" fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              当前速度 v ≈ {speed.toFixed(2)} (相对值)
            </text>
            <text x={0} y={160} fontSize="11" fill={PHYSICS_COLORS.axis}>
              (近日点速度快, 远日点速度慢)
            </text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-kp-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
