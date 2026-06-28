import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateAcceleratedMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  STROKE,
  DASH,
} from '@/theme/physics'
import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'
import { SportsCar } from '@/components/Physics/SportsCar'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

/**
 * 频闪虚影 (GhostCar)
 * 遵循 project_rules.md 视觉规范，仅本地复用。
 */
function GhostCar({ x, y, width = 56, height = 26, isHighlighted }: { x: number, y: number, width?: number, height?: number, isHighlighted?: boolean }) {
  const scaleX = width / 56;
  const scaleY = height / 26;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scaleX}, ${scaleY})`}>
      <path
        d="M 2,22 Q 4,11 14,9 L 22,5 Q 32,3 40,9 L 50,13 Q 54,17 54,22 Z"
        fill="none"
        stroke={isHighlighted ? PHYSICS_COLORS.referencePoint : PHYSICS_COLORS.objectStroke}
        strokeWidth={isHighlighted ? 2 : 1}
        strokeDasharray="3 3"
      />
      {/* 轮子 */}
      <circle cx={12.32} cy={22} r={5} fill="none" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={0.5} strokeDasharray="1 1" />
      <circle cx={43.68} cy={22} r={5} fill="none" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={0.5} strokeDasharray="1 1" />
    </g>
  );
}

/**
 * 频闪虚影及逐差对齐对比动画
 */
export function StroboscopicAnimation({
  v0, a, time, physics, showVectors, hoveredFlashIdx,
}: {
  v0: number; a: number; time: number
  physics: ReturnType<typeof useUniformAccelerationPhysics>
  showVectors: boolean
  hoveredFlashIdx: number | null
}) {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 180 })
  const { font } = canvasSize

  const padding = canvasSize.width * 0.08
  const groundY = canvasSize.height * 0.52
  const objW = canvasSize.width * 0.05
  const objH = objW * 0.7
  const fontSize = Math.max(10, canvasSize.width * 0.018)

  const maxVel = Math.max(Math.abs(v0) + Math.abs(a) * 8, 10)
  const maxAcc = Math.max(Math.abs(a) * 2, 5)
  const scene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: maxVel, acceleration: maxAcc },
  }
  const sceneScale = createSceneScale(scene)

  const maxS = useMemo(() => {
    const endS = Math.abs(calculateAcceleratedMotion(v0, a, 8).s)
    return Math.max(endS, 10) * 1.2
  }, [v0, a])
  
  const scale = (canvasSize.width - 2 * padding) / (2 * maxS)
  const originX = canvasSize.width * 0.3
  const currentX = originX + physics.s * scale

  // 小车跑出画布后自动暂停
    const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const isOffscreen = currentX > canvasSize.width - padding + objW || currentX < padding - objW
  useEffect(() => {
    if (isOffscreen && physics.s !== 0) {
      setIsPlaying(false)
    }
  }, [isOffscreen, physics.s, setIsPlaying])

  // 频闪虚影生成 (高精线框车)
  const flashGhosts = useMemo(() => {
    return physics.flashPoints.map((pt, i) => {
      const px = originX + pt.displacement * scale
      const opacity = 0.12 + 0.35 * (i / Math.max(physics.flashPoints.length - 1, 1))
      // 如果该频闪段被鼠标高亮联动
      const isSegmentHighlighted = hoveredFlashIdx !== null && (hoveredFlashIdx === i || hoveredFlashIdx === i + 1)
      return { px, opacity, index: i, time: pt.time, isHighlighted: isSegmentHighlighted }
    })
  }, [physics.flashPoints, originX, scale, hoveredFlashIdx])

  // 测量尺大括号标注线
  const deltaAnnotations = useMemo(() => {
    const annotations: { x1: number; x2: number; deltaX: number; label: string; index: number }[] = []
    const pts = physics.flashPoints
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].displacement - pts[i - 1].displacement
      annotations.push({
        x1: originX + pts[i - 1].displacement * scale,
        x2: originX + pts[i].displacement * scale,
        deltaX: dx,
        label: `Δx${i}`,
        index: i,
      })
    }
    return annotations.slice(-6)
  }, [physics.flashPoints, originX, scale])

  // ── 逐差段平行对齐平移对比 ──
  const alignmentGeometry = useMemo(() => {
    if (hoveredFlashIdx === null || hoveredFlashIdx <= 0 || hoveredFlashIdx >= physics.flashPoints.length) {
      return null
    }
    const idx = hoveredFlashIdx
    const pts = physics.flashPoints
    const s_prev = pts[idx - 1].displacement
    const s_curr = pts[idx].displacement
    const s_next = pts[idx + 1] ? pts[idx + 1].displacement : null

    if (s_next === null) return null

    const d1 = s_curr - s_prev // 第 idx 段位移
    const d2 = s_next - s_curr // 第 idx+1 段位移
    const w1 = d1 * scale
    const w2 = d2 * scale

    return { w1, w2, label1: `Δx${idx}`, label2: `Δx${idx+1}`, val1: d1, val2: d2, diff: d2 - d1 }
  }, [hoveredFlashIdx, physics.flashPoints, scale])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg">
        {/* 测距厘米轨道尺 */}
        <PhysicsGround
          x={padding * 0.5} y={groundY}
          width={canvasSize.width - padding}
          appearance={{ color: PHYSICS_COLORS.labelText }}
          ruler={{
            domain: [0, 100],
            pixelPerUnit: scale,
            tickInterval: 20,
            unit: 'm',
          }}
        />

        {/* 原点标记 */}
        <line x1={originX} y1={groundY - objH * 2.2} x2={originX} y2={groundY + 4} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(',')} />
        <text x={originX} y={groundY + fontSize + 4} fontSize={fontSize * 0.8} fill={PHYSICS_COLORS.axis} textAnchor="middle" fontWeight="bold">0</text>

        {/* 频闪快门闪烁曝光圆圈 (小车刚经过频闪时刻 0.25s 内播放扩散闪烁) */}
        {physics.flashPoints.map((pt, i) => {
          const dtPassed = time - pt.time
          if (dtPassed > 0 && dtPassed < 0.25) {
            const px = originX + pt.displacement * scale + objW * 0.5
            return (
              <circle
                key={`flash-circle-${i}`}
                cx={px}
                cy={groundY - objH * 0.5}
                r={12 + dtPassed * 60}
                stroke={PHYSICS_COLORS.referencePoint}
                strokeWidth={1.5}
                fill="none"
                opacity={1 - dtPassed * 4}
              />
            )
          }
          return null
        })}

        {/* 频闪虚影 (精密虚线线框车) */}
        {flashGhosts.map((ghost) => (
          <GhostCar
            key={`ghost-${ghost.index}`}
            x={ghost.px}
            y={groundY - objH}
            width={objW}
            height={objH}
            isHighlighted={ghost.isHighlighted}
          />
        ))}

        {/* 逐差段位移标注线 */}
        {deltaAnnotations.map((ann) => {
          const isHighlighted = hoveredFlashIdx !== null && hoveredFlashIdx === ann.index
          const y = groundY + 12
          return (
            <g key={`delta-${ann.index}`} opacity={hoveredFlashIdx === null || isHighlighted ? 1 : 0.4}>
              <line x1={ann.x1} y1={y} x2={ann.x2} y2={y} stroke={isHighlighted ? PHYSICS_COLORS.referencePoint : PHYSICS_COLORS.displacement} strokeWidth={isHighlighted ? 2 : STROKE.vectorThin} />
              <line x1={ann.x1} y1={y - 3} x2={ann.x1} y2={y + 3} stroke={isHighlighted ? PHYSICS_COLORS.referencePoint : PHYSICS_COLORS.displacement} strokeWidth={1.5} />
              <line x1={ann.x2} y1={y - 3} x2={ann.x2} y2={y + 3} stroke={isHighlighted ? PHYSICS_COLORS.referencePoint : PHYSICS_COLORS.displacement} strokeWidth={1.5} />
              <text x={(ann.x1 + ann.x2) / 2} y={y - 3} fontSize={font(8)} fill={isHighlighted ? PHYSICS_COLORS.referencePoint : PHYSICS_COLORS.displacement} textAnchor="middle" fontWeight="bold">
                {ann.label}={ann.deltaX.toFixed(2)}m
              </text>
            </g>
          )
        })}

        {/* ── 逐差位移平行对齐对比槽 ── */}
        {alignmentGeometry && (
          <g>
            {/* 对齐对比背景框 */}
            <rect x={originX - 10} y={groundY + 32} width={canvasSize.width - originX - 10} height="42" rx="4" fill={PHYSICS_COLORS.objectFillNeutral} stroke={CHART_COLORS.gridLine} strokeWidth={1} />
            
            {/* 第一段线段 (Δx_k) */}
            <g>
              <line x1={originX} y1={groundY + 44} x2={originX + alignmentGeometry.w1} y2={groundY + 44} stroke={PHYSICS_COLORS.displacement} strokeWidth={2} />
              <line x1={originX} y1={groundY + 41} x2={originX} y2={groundY + 47} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5} />
              <line x1={originX + alignmentGeometry.w1} y1={groundY + 41} x2={originX + alignmentGeometry.w1} y2={groundY + 47} stroke={PHYSICS_COLORS.displacement} strokeWidth={1.5} />
              <text x={originX + alignmentGeometry.w1 + 6} y={groundY + 47} fontSize={font(8)} fill={PHYSICS_COLORS.displacement} fontWeight="bold">
                {alignmentGeometry.label1} = {alignmentGeometry.val1.toFixed(2)}m
              </text>
            </g>

            {/* 第二段线段 (Δx_k+1) */}
            <g>
              {/* 重叠部分 (与第一段等长) 用灰色线 */}
              <line x1={originX} y1={groundY + 60} x2={originX + alignmentGeometry.w1} y2={groundY + 60} stroke={CHART_COLORS.asymptote} strokeWidth={1.5} strokeDasharray="3 2" />
              {/* 增量部分 (aT^2 长度) 用高亮红线 */}
              <line x1={originX + alignmentGeometry.w1} y1={groundY + 60} x2={originX + alignmentGeometry.w2} y2={groundY + 60} stroke={PHYSICS_COLORS.acceleration} strokeWidth={2.5} />
              
              <line x1={originX} y1={groundY + 57} x2={originX} y2={groundY + 63} stroke={CHART_COLORS.asymptote} strokeWidth={1.5} />
              <line x1={originX + alignmentGeometry.w2} y1={groundY + 57} x2={originX + alignmentGeometry.w2} y2={groundY + 63} stroke={PHYSICS_COLORS.acceleration} strokeWidth={1.5} />
              
              {/* 差值大括号或高亮标示 */}
              <path
                d={`M ${originX + alignmentGeometry.w1},${groundY + 64} L ${originX + alignmentGeometry.w1},${groundY + 70} M ${(originX + alignmentGeometry.w1 + originX + alignmentGeometry.w2) / 2},${groundY + 67} L ${(originX + alignmentGeometry.w1 + originX + alignmentGeometry.w2) / 2},${groundY + 67} M ${originX + alignmentGeometry.w2},${groundY + 64} L ${originX + alignmentGeometry.w2},${groundY + 70}`}
                stroke={PHYSICS_COLORS.acceleration}
                strokeWidth={1}
                fill="none"
              />
              <text x={(originX + alignmentGeometry.w1 + originX + alignmentGeometry.w2) / 2} y={groundY + 73} fontSize={font(8)} fill={PHYSICS_COLORS.acceleration} textAnchor="middle" fontWeight="bold">
                增量 aT² = {alignmentGeometry.diff.toFixed(2)}m
              </text>
              
              <text x={originX + alignmentGeometry.w2 + 6} y={groundY + 63} fontSize={font(8)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
                {alignmentGeometry.label2} = {alignmentGeometry.val2.toFixed(2)}m
              </text>
            </g>

            {/* 对准垂直投影线 */}
            <line x1={originX + alignmentGeometry.w1} y1={groundY + 16} x2={originX + alignmentGeometry.w1} y2={groundY + 64} stroke={CHART_COLORS.asymptote} strokeWidth={0.5} strokeDasharray="3 3" />
          </g>
        )}

        {/* 当前流线工程小车 */}
        {!isOffscreen && (
          <SportsCar
            x={currentX}
            y={groundY - objH}
            width={objW}
            height={objH}
            velocity={physics.v}
            time={time}
          />
        )}

        {/* 速度及加速度矢量 */}
        {showVectors && Math.abs(physics.v) > 0.1 && (
          <g>
            <VectorArrow
              origin={{ x: currentX + (physics.v > 0 ? objW + 4 : -4), y: -(groundY - objH * 0.5) }}
              vector={{ x: physics.v, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorMain}
            />
            <text x={currentX + (physics.v > 0 ? objW + 8 : -8) + sceneScale.maxVectorLength * 0.35} y={groundY - objH * 0.5 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 加速度矢量 */}
        {showVectors && Math.abs(a) > 0.05 && (
          <g>
            <VectorArrow
              origin={{ x: currentX + objW * 0.5, y: -(groundY - objH - 6) }}
              vector={{ x: a, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
            <text x={currentX + objW * 0.5 + sceneScale.maxVectorLength * 0.35 + 6} y={groundY - objH - 6 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">a</text>
          </g>
        )}

        <VectorDefs colors={[PHYSICS_COLORS.velocity, PHYSICS_COLORS.acceleration]} />
      </svg>
    </div>
  )
}