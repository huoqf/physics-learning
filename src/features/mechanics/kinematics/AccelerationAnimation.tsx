import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { calculateDualObjectComparison } from '@/physics'
import { PHYSICS_COLORS, STROKE, DASH, FONT } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { SportsCar } from '@/components/Physics/SportsCar'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

/** 布局常量（语义化命名，替代魔法数字） */
const LAYOUT = {
  TRACK_TOP_RATIO: 0.28,
  TRACK_BOTTOM_RATIO: 0.68,
  TRACK_PADDING_RATIO: 0.08,
  VEHICLE_WIDTH: 56,
  VEHICLE_HEIGHT: 26,
  VEHICLE_PLANE_HEIGHT: 20,
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
    const {params, time, showVectors, showGrid, setIsPlaying} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    showVectors: s.showVectors,
    showGrid: s.showGrid,
    setIsPlaying: s.setIsPlaying,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { font } = canvasSize

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

  // ── 矢量场景配置 ──
  const accScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: Math.max(vA, 10) * 1.5, acceleration: aB * 2 },
  }
  const sceneScale = createSceneScale(accScene)

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
        {/* ── 1. 跑车赛道 ── */}
        <PhysicsGround
          x={padding} y={bottomTrackY}
          width={canvasSize.width - 2 * padding}
          appearance={{ color: PHYSICS_COLORS.labelText }}
          ruler={{
            domain: [0, vA * 10],
            pixelPerUnit: scale,
            tickInterval: vA * 2,
            unit: 'm',
          }}
        />

        {/* 起始参考线 */}
        <line
          x1={startX}
          y1={bottomTrackY - 80}
          x2={startX}
          y2={bottomTrackY + 20}
          stroke={PHYSICS_COLORS.axis}
          strokeWidth={2}
          strokeDasharray={DASH.reference.join(' ')}
        />
        <text x={startX - 10} y={bottomTrackY + 32} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* 赛道标签 */}
        <text x={padding + 4} y={bottomTrackY - 12} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} fontWeight="600">跑车 B（匀加速运动 aB={aB}m/s²）</text>

        {/* ── 3. 频闪打点计时器打点投影 ── */}
        {showGrid && (
          <g>
            {/* 飞机打点记录 */}
            {strobePoints.map((pt, idx) => (
              <g key={`pt-plane-${idx}`}>
                <circle cx={pt.planeX} cy={topTrackY + 6} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.6} />
                <text x={pt.planeX} y={topTrackY + 16} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">t={pt.time.toFixed(1)}s</text>
              </g>
            ))}
            {/* 跑车打点记录 */}
            {strobePoints.map((pt, idx) => (
              <g key={`pt-car-${idx}`}>
                <circle cx={pt.carX} cy={bottomTrackY + 6} r={3} fill={PHYSICS_COLORS.displacement} opacity={0.6} />
                <text x={pt.carX} y={bottomTrackY + 16} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle">t={pt.time.toFixed(1)}s</text>
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
                      <text x={midX} y={bottomTrackY + 36} fontSize={font(9)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
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
            <VectorArrow
              origin={{ x: clampedPlaneX + LAYOUT.VEHICLE_WIDTH, y: -(topTrackY - LAYOUT.VEHICLE_PLANE_HEIGHT / 2) }}
              vector={{ x: vA, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={clampedPlaneX + LAYOUT.VEHICLE_WIDTH + sceneScale.maxVectorLength * 0.4 + 8}
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
        <SportsCar
          x={clampedCarX}
          y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT}
          velocity={result.vB}
          time={time}
          width={LAYOUT.VEHICLE_WIDTH}
          height={LAYOUT.VEHICLE_HEIGHT}
        />

        {/* ── 7. 跑车速度矢量 ── */}
        {showVectors && result.vB > 0 && (
          <g>
            <VectorArrow
              origin={{ x: clampedCarX + LAYOUT.VEHICLE_WIDTH, y: -(bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2) }}
              vector={{ x: result.vB, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text
              x={clampedCarX + LAYOUT.VEHICLE_WIDTH + sceneScale.maxVectorLength * 0.4 + 8}
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
            <VectorArrow
              origin={{
                x: clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * 0.15,
                y: -(bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 14),
              }}
              vector={{ x: result.deltaVB, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
            <text
              x={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * 0.15 + sceneScale.maxVectorLength * 0.35 + 8}
              y={bottomTrackY - LAYOUT.VEHICLE_HEIGHT / 2 - 10}
              fontSize={FONT.small}
              fill={PHYSICS_COLORS.acceleration}
              fontWeight="bold"
            >
              Δv_B
            </text>
            <text
              x={clampedCarX + LAYOUT.VEHICLE_WIDTH + result.vB * 0.15 + sceneScale.maxVectorLength * 0.18}
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

        {/* ── 矢量标记定义 ── */}
        <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration]} />
      </svg>
    </div>
  )
}
