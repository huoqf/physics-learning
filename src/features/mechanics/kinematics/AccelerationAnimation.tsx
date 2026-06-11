import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateDualObjectComparison } from '@/physics'
import { PHYSICS_COLORS, STROKE, DASH, FONT } from '@/theme/physics'

/** 布局常量（语义化命名，替代魔法数字） */
const LAYOUT = {
  TRACK_TOP_RATIO: 0.28,
  TRACK_BOTTOM_RATIO: 0.68,
  TRACK_PADDING_RATIO: 0.08,
  VEHICLE_WIDTH: 56,
  VEHICLE_HEIGHT: 26,
  VEHICLE_PLANE_HEIGHT: 20,
  ARROW_SCALE_V: 0.15,
  ARROW_SCALE_DELTA_V: 6,
  START_X_RATIO: 0.12,
  MAX_X_MARGIN: 60,
} as const

/**
 * 加速度基础版动画 —— "速度变化快慢的赛跑"
 *
 * 飞机A做匀速运动（a=0），跑车B从静止做匀加速运动。
 * 遵循 project_rules.md 设计规范：精密科学仪器风、干净轴线、精准标注，严禁粒子爆炸。
 */
export default function AccelerationAnimation() {
  const { params, time, showVectors, showGrid, setIsPlaying } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 350 })

  const vA = params.vA ?? 200
  const aB = params.aB ?? 5
  const deltaT = params.deltaT ?? 1 // 频闪打点周期 T 对齐观测微元 deltaT

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

  // ── 频闪打点计时器点集生成 ──
  const strobePoints = useMemo(() => {
    const points: { time: number; planeX: number; carX: number; key: string }[] = []
    const T = deltaT
    const maxI = Math.floor(time / T)
    for (let i = 0; i <= maxI; i++) {
      const t_i = i * T
      const sA_i = vA * t_i
      const sB_i = 0.5 * aB * t_i * t_i
      const pX = startX + sA_i * scale
      const cX = startX + sB_i * scale
      if (pX <= maxVisibleX && cX <= maxVisibleX) {
        points.push({
          time: t_i,
          planeX: pX,
          carX: cX,
          key: `strobe-${i}`,
        })
      }
    }
    return points
  }, [deltaT, time, vA, aB, startX, scale, maxVisibleX])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg shadow-inner">
        {/* ── 1. 网格线 ── */}
        {gridLines.map((g) => (
          <line
            key={g.key}
            x1={g.x}
            y1={topTrackY - 20}
            x2={g.x}
            y2={bottomTrackY + 20}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={STROKE.grid}
            strokeDasharray={DASH.reference.join(' ')}
          />
        ))}

        {/* ── 2. 双轨精密测距尺赛道 ── */}
        {/* 飞机轨道主线 */}
        <line
          x1={padding}
          y1={topTrackY}
          x2={canvasSize.width - padding}
          y2={topTrackY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />
        {/* 飞机轨道精细刻度 (每10px一格，50px一大格) */}
        {Array.from({ length: Math.floor((canvasSize.width - 2 * padding) / 10) + 1 }).map((_, idx) => {
          const tickX = padding + idx * 10
          const isMajor = idx % 5 === 0
          const tickHeight = isMajor ? 6 : 3
          return (
            <line
              key={`tick-top-${idx}`}
              x1={tickX}
              y1={topTrackY}
              x2={tickX}
              y2={topTrackY + tickHeight}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={STROKE.tick}
            />
          )
        })}

        {/* 跑车轨道主线 */}
        <line
          x1={padding}
          y1={bottomTrackY}
          x2={canvasSize.width - padding}
          y2={bottomTrackY}
          stroke={PHYSICS_COLORS.labelText}
          strokeWidth={STROKE.groundLine}
        />
        {/* 跑车轨道精细刻度 */}
        {Array.from({ length: Math.floor((canvasSize.width - 2 * padding) / 10) + 1 }).map((_, idx) => {
          const tickX = padding + idx * 10
          const isMajor = idx % 5 === 0
          const tickHeight = isMajor ? 6 : 3
          return (
            <line
              key={`tick-bottom-${idx}`}
              x1={tickX}
              y1={bottomTrackY}
              x2={tickX}
              y2={bottomTrackY + tickHeight}
              stroke={PHYSICS_COLORS.axis}
              strokeWidth={STROKE.tick}
            />
          )
        })}

        {/* 起始参考线 */}
        <line
          x1={startX}
          y1={topTrackY - 30}
          x2={startX}
          y2={bottomTrackY + 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <text x={startX - 10} y={bottomTrackY + 32} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* 赛道标签 */}
        <text x={padding + 4} y={topTrackY - 12} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} fontWeight="600">飞机 A（匀速运动 vA={vA}m/s）</text>
        <text x={padding + 4} y={bottomTrackY - 12} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} fontWeight="600">跑车 B（匀加速运动 aB={aB}m/s²）</text>

        {/* ── 3. 频闪打点计时器打点投影 ── */}
        {showGrid && (
          <g>
            {/* 飞机打点记录 */}
            {strobePoints.map((pt, idx) => (
              <g key={`pt-plane-${idx}`}>
                <circle cx={pt.planeX} cy={topTrackY + 6} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.6} />
                <text x={pt.planeX} y={topTrackY + 16} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">t={pt.time.toFixed(1)}s</text>
              </g>
            ))}
            {/* 跑车打点记录 */}
            {strobePoints.map((pt, idx) => (
              <g key={`pt-car-${idx}`}>
                <circle cx={pt.carX} cy={bottomTrackY + 6} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.6} />
                <text x={pt.carX} y={bottomTrackY + 16} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">t={pt.time.toFixed(1)}s</text>
              </g>
            ))}
            {/* 纸带区段间距括号标注 (仅在已打出至少两个点时绘制，且至多展示最近的两个区间，防止元素过载) */}
            {strobePoints.length >= 2 && (
              <g>
                {strobePoints.slice(-3, -1).map((pt) => {
                  const i = strobePoints.indexOf(pt)
                  const nextPt = strobePoints[i + 1]
                  if (!nextPt) return null
                  const midX = (pt.carX + nextPt.carX) / 2
                  const dist = (0.5 * aB * nextPt.time * nextPt.time) - (0.5 * aB * pt.time * pt.time)
                  return (
                    <g key={`bracket-${i}`} opacity={0.85}>
                      {/* 测量尺标注线 */}
                      <path
                        d={`M ${pt.carX},${bottomTrackY + 22} L ${pt.carX},${bottomTrackY + 28} M ${pt.carX},${bottomTrackY + 25} L ${nextPt.carX},${bottomTrackY + 25} M ${nextPt.carX},${bottomTrackY + 22} L ${nextPt.carX},${bottomTrackY + 28}`}
                        stroke={PHYSICS_COLORS.labelTextLight}
                        strokeWidth={1}
                        fill="none"
                      />
                      <text x={midX} y={bottomTrackY + 36} fontSize={9} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
                        s_{i+1}={dist.toFixed(1)}m
                      </text>
                    </g>
                  )
                })}
              </g>
            )}
          </g>
        )}

        {/* ── 4. 飞机 A ── */}
        <g transform={`translate(${clampedPlaneX}, ${topTrackY - LAYOUT.VEHICLE_PLANE_HEIGHT})`}>
          {/* 飞机空气层流线 (流线型速度感，符合科学仪器定位) */}
          {time > 0 && (
            <g opacity={0.5} transform={`translate(-10, 0)`}>
              <line x1="-15" y1="4" x2="-2" y2="4" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} strokeDasharray="4 2" />
              <line x1="-24" y1="10" x2="-4" y2="10" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1.5} />
              <line x1="-12" y1="16" x2="-2" y2="16" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} strokeDasharray="4 2" />
            </g>
          )}
          {/* 科学线框流线飞机 */}
          <path
            d="M 2,10 Q 12,5 20,7 L 36,3 Q 44,1 50,7 L 54,10 L 50,13 Q 44,19 36,17 L 20,13 Q 12,15 2,10 Z"
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 上机翼 */}
          <path
            d="M 22,8 L 28,1 L 33,1 L 27,8 Z"
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 下机翼 */}
          <path
            d="M 22,12 L 28,19 L 33,19 L 27,12 Z"
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 尾翼 */}
          <path
            d="M 4,8 L 1,1 L 4,1 L 7,8 Z"
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
        </g>

        {/* ── 5. 飞机速度矢量 ── */}
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

        {/* ── 6. 跑车 B ── */}
        <g transform={`translate(${clampedCarX}, ${bottomTrackY - LAYOUT.VEHICLE_HEIGHT})`}>
          {/* 跑车后空气尾流线 (随速度和加速度变长，层流线体现动感) */}
          {result.vB > 0 && (
            <g opacity={0.5} transform={`translate(-10, 0)`}>
              <line x1={-8 - result.vB * 0.15} y1="6" x2="-2" y2="6" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} strokeDasharray="3 2" />
              <line x1={-14 - result.vB * 0.2} y1="13" x2="-4" y2="13" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1.5} />
              <line x1={-6 - result.vB * 0.1} y1="20" x2="-2" y2="20" stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} strokeDasharray="3 2" />
            </g>
          )}
          {/* 科学流线跑车车身 */}
          <path
            d="M 2,22 Q 4,11 14,9 L 22,5 Q 32,3 40,9 L 50,13 Q 54,17 54,22 Z"
            fill={PHYSICS_COLORS.objectFillNeutral}
            stroke={PHYSICS_COLORS.objectStroke}
            strokeWidth={STROKE.objectLine}
          />
          {/* 精密十字辐条车轮，随速度转动 */}
          {/* 车轮 1 */}
          <g transform={`translate(${LAYOUT.VEHICLE_WIDTH * 0.22}, ${LAYOUT.VEHICLE_HEIGHT - 4})`}>
            <circle cx="0" cy="0" r="5" fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
            <g transform={`rotate(${(result.vB * time * 35) % 360})`}>
              <line x1="-5" y1="0" x2="5" y2="0" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
              <line x1="0" y1="-5" x2="0" y2="5" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
            </g>
          </g>
          {/* 车轮 2 */}
          <g transform={`translate(${LAYOUT.VEHICLE_WIDTH * 0.78}, ${LAYOUT.VEHICLE_HEIGHT - 4})`}>
            <circle cx="0" cy="0" r="5" fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
            <g transform={`rotate(${(result.vB * time * 35) % 360})`}>
              <line x1="-5" y1="0" x2="5" y2="0" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
              <line x1="0" y1="-5" x2="0" y2="5" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
            </g>
          </g>
        </g>

        {/* ── 7. 跑车速度矢量 ── */}
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

        {/* ── 8. Δv 虚线箭头（跑车在 deltaT 内的速度增量）── */}
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
              y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 20}
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

        {/* ── 9. 垂直对准线（一维参考线，辅助判断相对位置） ── */}
        {showAlignLine && (
          <line
            x1={clampedCarX + LAYOUT.VEHICLE_WIDTH / 2}
            y1={topTrackY - 30}
            x2={clampedCarX + LAYOUT.VEHICLE_WIDTH / 2}
            y2={bottomTrackY + 20}
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
