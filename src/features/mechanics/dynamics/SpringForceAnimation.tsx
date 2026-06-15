import { useCanvasSize } from '@/utils'
import { computeScale } from '@/utils/coordinate'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, FONT, DASH } from '@/theme/physics'
import { Spring } from '@/components/UI'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

export default function SpringForceAnimation() {
    const {params, time, showVectors, showGrid} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 650, height: 400 })
  const { font } = canvasSize

  const { k = 100, m = 1 } = params
  
  const omega = Math.sqrt(k / m)
  const amplitude = 0.5
  const displacement = amplitude * Math.sin(omega * time)
  const springForce = -k * displacement

  // ── 科学布局坐标系 ──
  const eqX = canvasSize.width / 2 // 平衡位置在 Canvas 中心 (325px)
  const groundY = canvasSize.height / 2 + 30 // 地面 Y 坐标
  const boxSize = 44 // 振子方块大小
  const WORLD = { xMin: -0.6, xMax: 0.6, yMin: -0.3, yMax: 0.3 } as const
  const scale = computeScale(canvasSize.width, canvasSize.height, WORLD, 80)
  
  const currentX = displacement * scale // 当前偏离平衡位置的像素位移
  const centerX = eqX + currentX         // 振子当前的中心 X 坐标
  const wallRightX = 80                  // 墙体右侧边缘，即弹簧固定端位置

  const springScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: { force: k * amplitude },
  }
  const springSceneScale = createSceneScale(springScene)

  // ── 网格线绘制 ──
  const gridLines = []
  if (showGrid) {
    // 围绕平衡位置 eqX 绘制
    for (let i = -4; i <= 4; i++) {
      const xPos = eqX + i * (scale * 0.5)
      gridLines.push(
        <line
          key={`gridline-${i}`}
          x1={xPos}
          y1={groundY - 110}
          x2={xPos}
          y2={groundY + 40}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={STROKE.grid}
          strokeDasharray={DASH.axis.join(' ')}
        />
      )
    }
  }


  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* 1. 辅助网格 */}
        {gridLines}
        
        {/* 2. 精密实验室地面 */}
        <line
          x1={40}
          y1={groundY}
          x2={canvasSize.width - 40}
          y2={groundY}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.groundLine}
        />
        <line
          x1={40}
          y1={groundY + 1}
          x2={canvasSize.width - 40}
          y2={groundY + 1}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.8}
        />

        {/* 3. 左侧固定墙体 */}
        <g opacity={0.4}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={`wall-hatch-${i}`}
              x1={40}
              y1={groundY - 100 + i * 15}
              x2={75}
              y2={groundY - 100 + i * 15 + 15}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={1.5}
            />
          ))}
        </g>
        <rect
          x={40}
          y={groundY - 100}
          width={40}
          height={100}
          fill={PHYSICS_COLORS.objectFillNeutral}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
        />
        
        {/* 4. 动态螺旋弹簧 */}
        <Spring
          x1={wallRightX}
          y1={groundY - boxSize / 2}
          x2={centerX - boxSize / 2}
          y2={groundY - boxSize / 2}
          coils={12}
          radius={13}
        />

        {/* 5. 振子滑块 (质量块) */}
        <rect
          x={centerX - boxSize / 2}
          y={groundY - boxSize}
          width={boxSize}
          height={boxSize}
          fill={PHYSICS_COLORS.objectFill}
          stroke={PHYSICS_COLORS.objectStroke}
          strokeWidth={CANVAS_STYLE.stroke.objectLine}
          rx={6}
        />
        <text
          x={centerX}
          y={groundY - boxSize / 2 + 5}
          fontSize={FONT.axisSize}
          fill={PHYSICS_COLORS.objectStroke}
          textAnchor="middle"
          fontWeight="bold"
        >
          m = {m}kg
        </text>

        {/* 6. 平衡位置指示虚线 */}
        <line
          x1={eqX}
          y1={groundY - 110}
          x2={eqX}
          y2={groundY + 10}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <text
          x={eqX}
          y={groundY - 116}
          fontSize={FONT.axisSize}
          fill={PHYSICS_COLORS.labelTextLight}
          textAnchor="middle"
          fontWeight="bold"
        >
          平衡位置 (x=0)
        </text>

        {/* 7. 形变量 Δx 尺寸标注线 (仅在非平衡位置时显示) */}
        {Math.abs(displacement) > 0.01 && (
          <g>
            {/* 尺寸辅助延伸虚线 */}
            <line
              x1={centerX}
              y1={groundY - boxSize}
              x2={centerX}
              y2={groundY + 28}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.6}
            />
            <line
              x1={eqX}
              y1={groundY}
              x2={eqX}
              y2={groundY + 28}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.6}
            />
            {/* 尺寸双向箭头线 */}
            <line
              x1={eqX}
              y1={groundY + 24}
              x2={centerX}
              y2={groundY + 24}
              stroke={PHYSICS_COLORS.displacement}
              strokeWidth={1.2}
              markerStart="url(#arrow-displacement-start)"
              markerEnd="url(#arrow-displacement-end)"
            />
            {/* 形变量数值说明文本 */}
            <text
              x={(eqX + centerX) / 2}
              y={groundY + 36}
              fontSize={font(11)}
              fill={PHYSICS_COLORS.displacement}
              textAnchor="middle"
              fontWeight="bold"
            >
              x = {displacement > 0 ? '+' : ''}{displacement.toFixed(2)}m
            </text>
          </g>
        )}

        {/* 8. 弹力矢量 F_弹 */}
        {showVectors && Math.abs(springForce) > 0.1 && (
          <g>
            <VectorArrow
              origin={{ x: centerX, y: -(groundY - boxSize - 12) }}
              vector={{ x: springForce, y: 0 }}
              type="force"
              sceneScale={springSceneScale}
              color={PHYSICS_COLORS.elasticForce}
              strokeWidth={CANVAS_STYLE.stroke.vectorMain}
              pixelLength={Math.abs(springForce) * 2.2}
            />
            <text
              x={centerX + springForce * 2.2 + (springForce > 0 ? 8 : -20)}
              y={groundY - boxSize - 8}
              fontSize={FONT.axisSize}
              fill={PHYSICS_COLORS.elasticForce}
              fontWeight="bold"
            >
              F弹
            </text>
          </g>
        )}

        <defs>
          <VectorDefs colors={[PHYSICS_COLORS.elasticForce]} />
          {/* 尺寸线端点装饰箭头 (双向标注专用) */}
          <marker id="arrow-displacement-start" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <polygon points="6 1, 0 3, 6 5" fill={PHYSICS_COLORS.displacement} />
          </marker>
          <marker id="arrow-displacement-end" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 1, 6 3, 0 5" fill={PHYSICS_COLORS.displacement} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
