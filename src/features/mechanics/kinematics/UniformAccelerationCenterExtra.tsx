import { useCanvasSize } from '@/utils'
import { useEffect, useMemo, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateAcceleratedMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  VT_CHART_COLORS,
  STROKE,
  DASH,
} from '@/theme/physics'
import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'
import { AnimationControls } from '@/components/UI'
import { SportsCar } from '@/components/Physics/SportsCar'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { VelocityTimeChart } from '@/components/Chart'
import { useChartContext } from '@/components/Chart'
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
 * 匀变速直线运动 · 进阶模式 CenterExtra
 *
 * 遵循 project_rules.md 规范：冷白背景、工程线框风格、可见元素 ≤ 7、精密三屏联动。
 */
export default function UniformAccelerationCenterExtra() {
    const {params, time, isPlaying, speed, showVectors, setIsPlaying, setTime, setSpeed} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    speed: s.speed,
    showVectors: s.showVectors,
    setIsPlaying: s.setIsPlaying,
    setTime: s.setTime,
    setSpeed: s.setSpeed,
    }))
  )

  const { v0 = 0, a = 1.5, flashPeriod = 1 } = params
  const physics = useUniformAccelerationPhysics(v0, a, time, flashPeriod)

  // 三屏联动：当前悬停高亮的频闪位移段索引 (globalIndex)
  const [hoveredFlashIdx, setHoveredFlashIdx] = useState<number | null>(null)

  const T = flashPeriod

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* ── 上半部分：数据表 + v-t图(含公式推导) 并列 ── */}
      <div className="w-full flex-[3] flex flex-row gap-2">
        {/* 左侧：频闪数据表 */}
        <div className="w-[35%] bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
          <FlashDataTable
            flashPoints={physics.flashPoints}
            a={a}
            T={T}
            hoveredFlashIdx={hoveredFlashIdx}
            setHoveredFlashIdx={setHoveredFlashIdx}
          />
        </div>
        {/* 右侧：v-t 图 + 公式推导 */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col">
          <div className="flex-[3]">
            <VtChartWithArea
              v0={v0}
              a={a}
              time={time}
              physics={physics}
              T={T}
              hoveredFlashIdx={hoveredFlashIdx}
            />
          </div>
          <div className="flex-1 border-t border-neutral-100 px-4 py-2">
            <DerivationPanel v0={v0} a={a} time={time} T={T} />
          </div>
        </div>
      </div>

      {/* ── 下半部分：频闪虚影动画（精密对比槽） ── */}
      <div className="w-full flex-[2] bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <StroboscopicAnimation
          v0={v0}
          a={a}
          time={time}
          physics={physics}
          showVectors={showVectors}
          hoveredFlashIdx={hoveredFlashIdx}
        />
      </div>

      {/* ── 动画控制栏 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-sm border border-neutral-100 p-2">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={30}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => { setTime(0); setIsPlaying(false) }}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 子组件：频闪虚影及逐差对齐对比动画
// ═══════════════════════════════════════════════════════════════
function StroboscopicAnimation({
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
  }, [hoveredFlashIdx, physics.flashPoints, scale, originX])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg">
        {/* 测距厘米轨道尺 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        {Array.from({ length: Math.floor((canvasSize.width - padding) / 10) + 1 }).map((_, idx) => {
          const tickX = padding * 0.5 + idx * 10
          const isMajor = idx % 5 === 0
          const tickHeight = isMajor ? 5 : 2.5
          return (
            <line key={`gt-${idx}`} x1={tickX} y1={groundY} x2={tickX} y2={groundY + tickHeight} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.tick} />
          )
        })}

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

// ═══════════════════════════════════════════════════════════════
// 子组件：v-t 图 + 面积差平行四边形几何证明
// ═══════════════════════════════════════════════════════════════
function VtChartWithArea({
  v0, a, time, physics, T, hoveredFlashIdx,
}: {
  v0: number; a: number; time: number
  physics: ReturnType<typeof useUniformAccelerationPhysics>
  T: number
  hoveredFlashIdx: number | null
}) {
  const VT_X_MAX = 8
  const { vtYMin, vtYMax } = useMemo(() => {
    const vEnd = v0 + a * VT_X_MAX
    const vMax = Math.max(v0, vEnd, 0) + 2
    const vMin = Math.min(v0, vEnd, 0) - 2
    return { vtYMin: Math.floor(vMin), vtYMax: Math.ceil(vMax) }
  }, [v0, a])

  // VelocityTimeChart 数据
  const vtPoints = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= VT_X_MAX; t += 0.05) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, t)
      pts.push({ t, v: vel })
    }
    return pts
  }, [v0, a])

  const vtActivePoints = useMemo(
    () => vtPoints.filter(p => p.t <= time + 0.01),
    [vtPoints, time]
  )

  // 平行四边形差值面积 children
  const areaChildren = useMemo(() => {
    if (hoveredFlashIdx === null || hoveredFlashIdx <= 0 || hoveredFlashIdx >= physics.flashPoints.length) {
      return null
    }
    const idx = hoveredFlashIdx
    const t_prev = (idx - 1) * T
    const t_curr = idx * T
    const t_next = (idx + 1) * T
    if (t_next > VT_X_MAX) return null

    const v_prev = v0 + a * t_prev
    const v_curr = v0 + a * t_curr
    const v_next = v0 + a * t_next

    return { t_prev, t_curr, t_next, v_prev, v_curr, v_next }
  }, [hoveredFlashIdx, T, v0, a, physics.flashPoints.length, VT_X_MAX])

  return (
    <div className="w-full h-full relative">
      <VelocityTimeChart
        mode="animated"
        points={vtActivePoints}
        domainPoints={vtPoints}
        currentTime={time}
        tMax={VT_X_MAX}
        vRange={[vtYMin, vtYMax]}
        title="匀变速直线运动 v-t 图象"
        showArea
        showCursor={time > 0 && time <= VT_X_MAX}
        showGrid
      >
        {/* 频闪点 */}
        <FlashDotOverlay flashPoints={physics.flashPoints} />
        {/* 平行四边形差值面积叠加层 */}
        {areaChildren && (
          <AreaDifferenceOverlay {...areaChildren} />
        )}
      </VelocityTimeChart>
      {/* 分析窗口标注 */}
      <div className="absolute bottom-1 right-2 text-[10px] text-neutral-400 pointer-events-none select-none">
        分析窗口 0–{VT_X_MAX}s
      </div>
    </div>
  )
}

/** 频闪点插件层 */
function FlashDotOverlay({
  flashPoints,
}: {
  flashPoints: { time: number; velocity: number }[]
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  return (
    <g>
      {flashPoints.map((pt, i) => (
        <circle
          key={i}
          cx={ctx.toSvgX(pt.time)}
          cy={ctx.toSvgY(pt.velocity)}
          r={3}
          fill={PHYSICS_COLORS.referencePoint}
        />
      ))}
    </g>
  )
}

/** 平行四边形差值面积插件层（使用 ChartContext 坐标） */
function AreaDifferenceOverlay({
  t_prev, t_curr, t_next, v_prev, v_curr, v_next,
}: {
  t_prev: number; t_curr: number; t_next: number
  v_prev: number; v_curr: number; v_next: number
}) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY, font } = ctx

  // 梯形 1
  const trap1D = `M ${toSvgX(t_prev)},${toSvgY(0)} L ${toSvgX(t_prev)},${toSvgY(v_prev)} L ${toSvgX(t_curr)},${toSvgY(v_curr)} L ${toSvgX(t_curr)},${toSvgY(0)} Z`
  // 梯形 2
  const trap2D = `M ${toSvgX(t_curr)},${toSvgY(0)} L ${toSvgX(t_curr)},${toSvgY(v_curr)} L ${toSvgX(t_next)},${toSvgY(v_next)} L ${toSvgX(t_next)},${toSvgY(0)} Z`
  // 差值平行四边形
  const diffD = `M ${toSvgX(t_curr)},${toSvgY(v_prev)} L ${toSvgX(t_curr)},${toSvgY(v_curr)} L ${toSvgX(t_next)},${toSvgY(v_next)} L ${toSvgX(t_next)},${toSvgY(v_curr)} Z`

  return (
    <g>
      <path d={trap1D} fill={VT_CHART_COLORS.areaShade} opacity={0.12} stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} strokeDasharray="2 2" />
      <path d={trap2D} fill={VT_CHART_COLORS.areaShade} opacity={0.12} stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} strokeDasharray="2 2" />
      <path d={diffD} fill={CHART_COLORS.areaFillWarm} opacity={0.45} stroke={PHYSICS_COLORS.acceleration} strokeWidth={1.5} />
      <text
        x={toSvgX((t_curr + t_next) / 2)}
        y={(toSvgY(v_curr) + toSvgY(v_prev)) / 2 + 3}
        fontSize={font(8)}
        fill={PHYSICS_COLORS.acceleration}
        textAnchor="middle"
        fontWeight="bold"
      >
        面积差 ΔS = aT²
      </text>
    </g>
  )
}

// ═══════════════════════════════════════════════════════════════
// 子组件：公式推导面板
// ═══════════════════════════════════════════════════════════════
function DerivationPanel({
  v0, a, time, T,
}: {
  v0: number; a: number; time: number
  T: number
}) {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 80 })
  const { font } = canvasSize
  const { v, s } = calculateAcceleratedMotion(v0, a, time)
  const deltaX = a * T * T

  return (
    <div ref={containerRef} className="flex flex-row gap-4 text-xs font-semibold">
      <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 shadow-sm">
        <p style={{ fontSize: font(9) }} className="text-neutral-400 mb-0.5">相邻位移差 (逐差法)</p>
        <p className="font-mono text-neutral-700">
          Δx = aT² = {a}×{T}² = <span className="font-bold text-primary-600">{deltaX.toFixed(3)} m</span>
        </p>
      </div>
      <div className="flex-1 bg-primary-50/50 border border-primary-100 rounded-lg p-1.5 shadow-sm">
        <p style={{ fontSize: font(9) }} className="text-primary-400 mb-0.5">末速度公式</p>
        <p className="font-mono text-neutral-700">
          v_t = v₀+at = {v0}+{a}×{time.toFixed(1)} = <span className="font-bold text-primary-600">{v.toFixed(2)} m/s</span>
        </p>
      </div>
      <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg p-1.5 shadow-sm">
        <p style={{ fontSize: font(9) }} className="text-neutral-400 mb-0.5">位移公式</p>
        <p className="font-mono text-neutral-700">
          x = v₀t+½at² = <span className="font-bold text-neutral-800">{s.toFixed(2)} m</span>
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 子组件：频闪数据表 (支持鼠标悬停三屏联动)
// ═══════════════════════════════════════════════════════════════
function FlashDataTable({
  flashPoints, a, T, hoveredFlashIdx, setHoveredFlashIdx,
}: {
  flashPoints: { time: number; velocity: number; displacement: number }[]
  a: number; T: number
  hoveredFlashIdx: number | null
  setHoveredFlashIdx: (idx: number | null) => void
}) {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 300 })
  const { font } = canvasSize
  const rows = flashPoints.slice(-8)
  const lastIndex = flashPoints.length - 1

  const deltaValues = useMemo(() => {
    const deltas: number[] = []
    for (let i = 1; i < flashPoints.length; i++) {
      deltas.push(flashPoints[i].displacement - flashPoints[i - 1].displacement)
    }
    return deltas
  }, [flashPoints])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col p-3 overflow-auto">
      <p className="text-xs font-bold text-neutral-700 mb-2">频闪数据记录表</p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-1 px-0.5 text-left font-semibold text-neutral-600">t(s)</th>
            <th className="py-1 px-0.5 text-right font-semibold text-neutral-600">v(m/s)</th>
            <th className="py-1 px-0.5 text-right font-semibold text-neutral-600">x(m)</th>
            <th className="py-1 px-0.5 text-right font-semibold text-neutral-600">Δx_k(m)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const globalIndex = flashPoints.length - rows.length + i
            const isCurrent = globalIndex === lastIndex
            const isHovered = hoveredFlashIdx === globalIndex
            const dx = deltaValues[globalIndex]
            return (
              <tr
                key={i}
                onMouseEnter={() => globalIndex > 0 && setHoveredFlashIdx(globalIndex)}
                onMouseLeave={() => setHoveredFlashIdx(null)}
                className={`border-b border-neutral-100 transition-all cursor-pointer ${
                  isHovered ? 'bg-amber-50' : (isCurrent ? 'bg-blue-50' : 'hover:bg-slate-50')
                }`}
              >
                <td className={`py-1 px-0.5 font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.time.toFixed(1)}</td>
                <td className={`py-1 px-0.5 text-right font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.velocity.toFixed(2)}</td>
                <td className={`py-1 px-0.5 text-right font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.displacement.toFixed(2)}</td>
                <td className={`py-1 px-0.5 text-right font-mono font-bold ${isHovered ? 'text-amber-600' : 'text-neutral-500'}`}>
                  {dx !== undefined ? dx.toFixed(2) : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* 逐差法验证 */}
      {deltaValues.length >= 2 && (
        <div className="mt-auto pt-2 border-t border-neutral-100 font-semibold">
          <p style={{ fontSize: font(9) }} className="text-neutral-400 mb-0.5">理论计算验证</p>
          <p className="text-xs font-mono text-neutral-700">
            相邻位移差 aT² = <span className="font-bold text-red-600">{(a * T * T).toFixed(3)}</span> m
          </p>
        </div>
      )}
    </div>
  )
}
