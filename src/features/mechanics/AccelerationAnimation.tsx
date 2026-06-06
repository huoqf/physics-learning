import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateDualObjectComparison } from '@/physics'
import { PHYSICS_COLORS, STROKE, DASH, FONT } from '@/theme/physics'

/** 布局常量（语义化命名，替代魔法数字） */
const LAYOUT = {
  TRACK_TOP_RATIO: 0.32,
  TRACK_BOTTOM_RATIO: 0.72,
  TRACK_PADDING_RATIO: 0.08,
  VEHICLE_WIDTH: 56,
  VEHICLE_HEIGHT: 28,
  VEHICLE_PLANE_HEIGHT: 22,
  ARROW_SCALE_V: 0.15,
  ARROW_SCALE_DELTA_V: 6,
  START_X_RATIO: 0.12,
  MAX_X_MARGIN: 60,
} as const

/**
 * 加速度基础版动画 —— "速度变化快慢的赛跑"
 *
 * 飞机A做匀速运动（a=0），跑车B从静止做匀加速运动。
 * Canvas 6 元素 / 5 标注（严格上限）
 */
export default function AccelerationAnimation() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 350 })

  const vA = params.vA ?? 200
  const aB = params.aB ?? 5
  const deltaT = params.deltaT ?? 1

  // ── 布局计算 ──
  const padding = canvasSize.width * LAYOUT.TRACK_PADDING_RATIO
  const topTrackY = canvasSize.height * LAYOUT.TRACK_TOP_RATIO
  const bottomTrackY = canvasSize.height * LAYOUT.TRACK_BOTTOM_RATIO
  const startX = canvasSize.width * LAYOUT.START_X_RATIO
  const maxVisibleX = canvasSize.width - LAYOUT.MAX_X_MARGIN

  // ── 物理计算 ──
  const result = useMemo(
    () => calculateDualObjectComparison(vA, aB, deltaT, time),
    [vA, aB, deltaT, time]
  )

  // 位移缩放：以飞机在 10s 内的位移填满赛道
  const scale = useMemo(
    () => (maxVisibleX - startX) / (vA * 10 || 1),
    [maxVisibleX, startX, vA]
  )

  const planeX = startX + result.sA * scale
  const carX = startX + result.sB * scale

  // 边界检测
  const isAtBoundary = planeX >= maxVisibleX || carX >= maxVisibleX
  useEffect(() => {
    if (isAtBoundary && time > 0) {
      setIsPlaying(false)
    }
  }, [isAtBoundary, time, setIsPlaying])

  const clampedPlaneX = Math.min(planeX, maxVisibleX)
  const clampedCarX = Math.min(carX, maxVisibleX)

  // ── Δv 箭头：仅在跑车速度变化时显示 ──
  const showDeltaVArrow = showVectors && result.deltaVB > 0 && time > 0

  // ── 垂直对齐辅助线（toggle 控制）──
  const showAlignLine = showGrid && time > 0

  // ── 网格线 ──
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: { x: number; key: string }[] = []
    const gridCount = Math.max(8, Math.floor(canvasSize.width / 80))
    for (let i = 0; i <= gridCount; i++) {
      lines.push({
        x: startX + (i * (maxVisibleX - startX)) / gridCount,
        key: `grid-${i}`,
      })
    }
    return lines
  }, [showGrid, canvasSize.width, startX, maxVisibleX])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* ── 1. 双轨赛道 ── */}
        <line
          x1={padding}
          y1={topTrackY}
          x2={canvasSize.width - padding}
          y2={topTrackY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />
        <line
          x1={padding}
          y1={bottomTrackY}
          x2={canvasSize.width - padding}
          y2={bottomTrackY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />

        {/* 起始线 */}
        <line
          x1={startX}
          y1={topTrackY - 30}
          x2={startX}
          y2={bottomTrackY + 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <text x={startX - 10} y={bottomTrackY + 35} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* 赛道标签 */}
        <text x={padding + 4} y={topTrackY - 8} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight}>飞机 A（匀速）</text>
        <text x={padding + 4} y={bottomTrackY - 8} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight}>跑车 B（匀加速）</text>

        {/* 网格线 */}
        {gridLines.map((g) => (
          <line
            key={g.key}
            x1={g.x}
            y1={topTrackY - 20}
            x2={g.x}
            y2={bottomTrackY + 10}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={STROKE.grid}
            strokeDasharray={DASH.reference.join(' ')}
          />
        ))}

        {/* ── 2. 飞机 A ── */}
        <g transform={`translate(${clampedPlaneX}, ${topTrackY - LAYOUT.VEHICLE_PLANE_HEIGHT})`}>
          {/* 机身 */}
          <rect
            width={LAYOUT.VEHICLE_WIDTH}
            height={LAYOUT.VEHICLE_PLANE_HEIGHT}
            rx={4}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 机翼 */}
          <line
            x1={LAYOUT.VEHICLE_WIDTH * 0.3}
            y1={LAYOUT.VEHICLE_PLANE_HEIGHT}
            x2={LAYOUT.VEHICLE_WIDTH * 0.15}
            y2={LAYOUT.VEHICLE_PLANE_HEIGHT + 8}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          <line
            x1={LAYOUT.VEHICLE_WIDTH * 0.7}
            y1={LAYOUT.VEHICLE_PLANE_HEIGHT}
            x2={LAYOUT.VEHICLE_WIDTH * 0.85}
            y2={LAYOUT.VEHICLE_PLANE_HEIGHT + 8}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 尾翼 */}
          <line
            x1={2}
            y1={4}
            x2={2}
            y2={LAYOUT.VEHICLE_PLANE_HEIGHT - 2}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
        </g>

        {/* ── 3. 飞机速度箭头 ── */}
        {showVectors && (
          <g>
            <line
              x1={clampedPlaneX + LAYOUT.VEHICLE_WIDTH}
              y1={topTrackY - LAYOUT.VEHICLE_PLANE_HEIGHT / 2}
              x2={clampedPlaneX + LAYOUT.VEHICLE_WIDTH + vA * LAYOUT.ARROW_SCALE_V}
              y2={topTrackY - LAYOUT.VEHICLE_PLANE_HEIGHT / 2}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-acc-plane-v)"
            />
            {/* 标注1: v_A */}
            <text
              x={clampedPlaneX + LAYOUT.VEHICLE_WIDTH + vA * LAYOUT.ARROW_SCALE_V + 8}
              y={topTrackY - LAYOUT.VEHICLE_PLANE_HEIGHT / 2 + 4}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v_A
            </text>
          </g>
        )}

        {/* ── 4. 跑车 B ── */}
        <g transform={`translate(${clampedCarX}, ${bottomTrackY - LAYOUT.VEHICLE_HEIGHT})`}>
          {/* 车身 */}
          <rect
            width={LAYOUT.VEHICLE_WIDTH}
            height={LAYOUT.VEHICLE_HEIGHT}
            rx={4}
            fill={PHYSICS_COLORS.objectFill}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 车顶 */}
          <rect
            x={LAYOUT.VEHICLE_WIDTH * 0.25}
            y={-8}
            width={LAYOUT.VEHICLE_WIDTH * 0.45}
            height={10}
            rx={3}
            fill={PHYSICS_COLORS.grid}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 车轮 */}
          <circle cx={LAYOUT.VEHICLE_WIDTH * 0.2} cy={LAYOUT.VEHICLE_HEIGHT - 2} r={5} fill={PHYSICS_COLORS.labelText} />
          <circle cx={LAYOUT.VEHICLE_WIDTH * 0.8} cy={LAYOUT.VEHICLE_HEIGHT - 2} r={5} fill={PHYSICS_COLORS.labelText} />
        </g>

        {/* ── 5. 跑车速度箭头 ── */}
        {showVectors && result.vB > 0 && (
          <g>
            <line
              x1={clampedCarX + LAYOUT.VEHICLE_WIDTH}
              y1={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2}
              x2={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * LAYOUT.ARROW_SCALE_V}
              y2={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-acc-car-v)"
            />
            {/* 标注2: v_B */}
            <text
              x={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * LAYOUT.ARROW_SCALE_V + 8}
              y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 + 4}
              fontSize={FONT.bodySize}
              fill={PHYSICS_COLORS.velocity}
              fontWeight="bold"
            >
              v_B
            </text>
          </g>
        )}

        {/* ── 6. Δv 虚线箭头（跑车速度增量）── */}
        {showDeltaVArrow && (
          <g>
            <line
              x1={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * LAYOUT.ARROW_SCALE_V}
              y1={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 14}
              x2={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * LAYOUT.ARROW_SCALE_V + result.deltaVB * LAYOUT.ARROW_SCALE_DELTA_V}
              y2={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 14}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorSub}
              strokeDasharray={DASH.reference.join(' ')}
              markerEnd="url(#arrowhead-acc-delta-v)"
            />
            {/* 标注4: Δv_B */}
            <text
              x={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * LAYOUT.ARROW_SCALE_V + result.deltaVB * LAYOUT.ARROW_SCALE_DELTA_V + 8}
              y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 10}
              fontSize={FONT.small}
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              Δv_B
            </text>
            {/* 标注3: Δt */}
            <text
              x={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * LAYOUT.ARROW_SCALE_V + result.deltaVB * LAYOUT.ARROW_SCALE_DELTA_V / 2}
              y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 22}
              fontSize={FONT.small}
              fill={PHYSICS_COLORS.labelText}
              textAnchor="middle"
            >
              Δt={deltaT}s
            </text>
          </g>
        )}

        {/* 标注5: a_B（加速度标示，始终显示在跑车上方） */}
        {showVectors && aB > 0 && (
          <text
            x={clampedCarX + LAYOUT.VEHICLE_WIDTH / 2}
            y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT - 12}
            fontSize={FONT.bodySize}
            fill={PHYSICS_COLORS.acceleration}
            fontWeight="bold"
            textAnchor="middle"
          >
            a_B={aB} m/s²
          </text>
        )}

        {/* ── 7. 垂直对齐辅助线（toggle） ── */}
        {showAlignLine && (
          <line
            x1={clampedCarX + LAYOUT.VEHICLE_WIDTH / 2}
            y1={topTrackY - 30}
            x2={clampedCarX + LAYOUT.VEHICLE_WIDTH / 2}
            y2={bottomTrackY + 10}
            stroke={PHYSICS_COLORS.referencePoint}
            strokeWidth={1}
            strokeDasharray={DASH.reference.join(' ')}
            opacity={0.6}
          />
        )}

        {/* ── 箭头标记定义 ── */}
        <defs>
          <marker id="arrowhead-acc-plane-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-acc-car-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-acc-delta-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}
