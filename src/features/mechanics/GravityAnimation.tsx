import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import { physicsToCanvas } from '@/utils/coordinate'

export default function GravityAnimation() {
  const { params, showVectors, showGrid } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 450 })

  const { m1 = 1000, m2 = 10, r = 5 } = params
  
  // ── 科学坐标转换 ──
  const scale = 26 // 物理坐标到 Canvas 像素的比例尺
  
  // 天体 1 放置在左侧 -r/2，天体 2 放置在右侧 r/2
  const pos1 = physicsToCanvas(-r / 2, 0, canvasSize.width, canvasSize.height, scale)
  const pos2 = physicsToCanvas(r / 2, 0, canvasSize.width, canvasSize.height, scale)

  const obj1X = pos1.cx
  const obj1Y = pos1.cy
  const obj2X = pos2.cx
  const obj2Y = pos2.cy

  // 天体半径与质量的对数关系，防止质量过大时圆圈超出限制
  const radius1 = Math.min(Math.log(m1 + 1) * 4.8, 38)
  const radius2 = Math.min(Math.log(m2 + 1) * 4.8, 28)

  // ── 辅助网格 ──
  const gridLines = []
  if (showGrid) {
    const gridSpacing = 40
    const cols = Math.floor(canvasSize.width / gridSpacing)
    const rows = Math.floor(canvasSize.height / gridSpacing)
    
    for (let i = 0; i <= cols; i++) {
      const x = i * gridSpacing
      gridLines.push(
        <line
          key={`grid-x-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={canvasSize.height}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.5}
          strokeDasharray="2,3"
        />
      )
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * gridSpacing
      gridLines.push(
        <line
          key={`grid-y-${j}`}
          x1={0}
          y1={y}
          x2={canvasSize.width}
          y2={y}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.5}
          strokeDasharray="2,3"
        />
      )
    }
  }

  // ── 动态引力场同心涟漪圈数与半径 ──
  // 涟漪半径与质量成正比，并随距离呈衰减
  const ripples1 = [radius1 + 16, radius1 + 36, radius1 + 60]
  const ripples2 = [radius2 + 12, radius2 + 28, radius2 + 48]

  // ── 计算引力矢量的长度 ──
  // 引力大小相对值 F_rel = m1 * m2 / r^2
  const F_rel = (m1 * m2) / (r * r)
  // 非线性映射箭头长度，限制在 [12px, 65px] 之间
  const arrowLen = 12 + Math.min(Math.log10(F_rel + 1) * 11, 55)

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        <defs>
          {/* 天体 1 的科技质感径向渐变 (冷灰钢体) */}
          <radialGradient id="天体1渐变" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="45%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
          {/* 天体 2 的科技质感径向渐变 (冷蓝钢体) */}
          <radialGradient id="天体2渐变" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="45%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </radialGradient>
          {/* 引力矢量箭头 */}
          <marker id="arrowhead-gravity-right" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.gravity} />
          </marker>
          <marker id="arrowhead-gravity-left" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.gravity} />
          </marker>
        </defs>

        {/* 1. 网格背景 */}
        {gridLines}

        {/* 2. 淡蓝色引力场同心涟漪波纹 (表现引力场的相互吸引作用) */}
        <g opacity={0.25}>
          {ripples1.map((rRip, idx) => (
            <circle
              key={`ripple1-${idx}`}
              cx={obj1X}
              cy={obj1Y}
              r={rRip}
              fill="none"
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={0.5}
              strokeDasharray="3,6"
            />
          ))}
          {ripples2.map((rRip, idx) => (
            <circle
              key={`ripple2-${idx}`}
              cx={obj2X}
              cy={obj2Y}
              r={rRip}
              fill="none"
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={0.5}
              strokeDasharray="3,6"
            />
          ))}
        </g>

        {/* 3. 两天体中心连线 (轴线) */}
        <line
          x1={obj1X}
          y1={obj1Y}
          x2={obj2X}
          y2={obj2Y}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={1.5}
          strokeDasharray="4,4"
        />
        {/* 距离 r 尺寸标注线 */}
        <g>
          {/* 尺寸线 */}
          <line
            x1={obj1X}
            y1={obj1Y + 70}
            x2={obj2X}
            y2={obj2Y + 70}
            stroke={PHYSICS_COLORS.axis}
            strokeWidth={1}
          />
          {/* 边界短竖线 */}
          <line x1={obj1X} y1={obj1Y + 66} x2={obj1X} y2={obj1Y + 74} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
          <line x1={obj2X} y1={obj2Y + 66} x2={obj2X} y2={obj2Y + 74} stroke={PHYSICS_COLORS.axis} strokeWidth={1} />
          {/* 距离文本 (可见标注 1/5) */}
          <text
            x={(obj1X + obj2X) / 2}
            y={obj1Y + 84}
            fontSize="12"
            fill={PHYSICS_COLORS.labelTextLight}
            textAnchor="middle"
            fontWeight="bold"
          >
            r = {r} 相对单位
          </text>
        </g>

        {/* 4. 天体 1 (球体 + 质量文本) */}
        <circle
          cx={obj1X}
          cy={obj1Y}
          r={radius1}
          fill="url(#天体1渐变)"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        {/* 天体 1 标注 (可见标注 2/5) */}
        <text
          x={obj1X}
          y={obj1Y - radius1 - 10}
          fontSize="12"
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          m₁ = {m1}
        </text>

        {/* 5. 天体 2 (球体 + 质量文本) */}
        <circle
          cx={obj2X}
          cy={obj2Y}
          r={radius2}
          fill="url(#天体2渐变)"
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        {/* 天体 2 标注 (可见标注 3/5) */}
        <text
          x={obj2X}
          y={obj2Y - radius2 - 10}
          fontSize="12"
          fill={PHYSICS_COLORS.labelText}
          textAnchor="middle"
          fontWeight="bold"
        >
          m₂ = {m2}
        </text>

        {/* 6. 引力矢量 F 箭头 */}
        {showVectors && (
          <g>
            {/* 天体 1 受力 F₁ (向右吸引) */}
            <line
              x1={obj1X + radius1}
              y1={obj1Y}
              x2={obj1X + radius1 + arrowLen}
              y2={obj1Y}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-gravity-right)"
            />
            {/* 受力标注 F (可见标注 4/5) */}
            <text
              x={obj1X + radius1 + arrowLen / 2}
              y={obj1Y - 8}
              fontSize="11"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_引
            </text>

            {/* 天体 2 受力 F₂ (向左吸引) */}
            <line
              x1={obj2X - radius2}
              y1={obj2Y}
              x2={obj2X - radius2 - arrowLen}
              y2={obj2Y}
              stroke={PHYSICS_COLORS.gravity}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              markerEnd="url(#arrowhead-gravity-left)"
            />
            {/* 受力标注 F (可见标注 5/5) */}
            <text
              x={obj2X - radius2 - arrowLen / 2}
              y={obj2Y - 8}
              fontSize="11"
              fill={PHYSICS_COLORS.gravity}
              fontWeight="bold"
              textAnchor="middle"
            >
              F_引
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
