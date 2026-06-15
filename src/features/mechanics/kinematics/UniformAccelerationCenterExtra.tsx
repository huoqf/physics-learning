import { useCanvasSize } from '@/utils'
import { useEffect, useMemo, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { calculateAcceleratedMotion } from '@/physics'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  SCENE_COLORS,
  VT_CHART_COLORS,
  STROKE,
  DASH,
} from '@/theme/physics'
import { useUniformAccelerationPhysics } from './useUniformAccelerationPhysics'
import { AnimationControls } from '@/components/UI'
import { SportsCar } from '@/components/Physics/SportsCar'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

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
  const deltaX = a * T * T
  const vAtHalfT = (v0 + physics.v) / 2

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* ── 信息条 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-sm border border-neutral-100 px-4 py-2.5 flex items-center gap-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PHYSICS_COLORS.displacement }} />
          <span className="text-neutral-700">相邻位移差 Δx = aT² = <span className="font-mono font-bold text-red-600">{deltaX.toFixed(3)}</span> m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PHYSICS_COLORS.averageVelocity }} />
          <span className="text-neutral-700">中间时刻速度 v(t/2) = <span className="font-mono font-bold">{vAtHalfT.toFixed(2)}</span> m/s</span>
        </div>
        <span className="text-neutral-500 font-medium ml-auto">频闪周期 T = {T.toFixed(1)}s</span>
      </div>

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
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 230 })
  const { font } = canvasSize

  const padding = canvasSize.width * 0.12
  const chartLeft = padding
  const chartRight = canvasSize.width - padding * 0.5
  const chartTop = 26
  const chartBottom = canvasSize.height - 10
  const chartWidth = chartRight - chartLeft
  const chartHeight = chartBottom - chartTop

  const VT_X_MAX = 8
  const { vtYMin, vtYMax } = useMemo(() => {
    const vEnd = v0 + a * VT_X_MAX
    const vMax = Math.max(v0, vEnd, 0) + 2
    const vMin = Math.min(v0, vEnd, 0) - 2
    return { vtYMin: Math.floor(vMin), vtYMax: Math.ceil(vMax) }
  }, [v0, a])

  const toX = (t: number) => chartLeft + (t / VT_X_MAX) * chartWidth
  const toY = (vel: number) => chartBottom - ((vel - vtYMin) / (vtYMax - vtYMin)) * chartHeight

  const vtPath = useMemo(() => {
    const dt = 0.05
    const pts: string[] = []
    for (let t = 0; t <= Math.min(time, VT_X_MAX) + dt; t += dt) {
      const { v: vel } = calculateAcceleratedMotion(v0, a, t)
      pts.push(`${t === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)},${toY(vel).toFixed(1)}`)
    }
    return pts.join(' ')
  }, [v0, a, time, toX, toY])

  // 默认整体位移面积
  const areaPath = useMemo(() => {
    if (time <= 0) return ''
    const dt = 0.05
    const pts: string[] = []
    for (let t = 0; t <= time + dt; t += dt) {
      const tt = Math.min(t, time)
      const { v: vel } = calculateAcceleratedMotion(v0, a, tt)
      pts.push(`L ${toX(tt).toFixed(1)},${toY(vel).toFixed(1)}`)
    }
    return `M ${toX(0).toFixed(1)},${toY(0).toFixed(1)} ${pts.join(' ')} L ${toX(time).toFixed(1)},${toY(0).toFixed(1)} Z`
  }, [v0, a, time, toX, toY])

  // 频闪时刻投影点
  const flashDots = useMemo(() => {
    return physics.flashPoints.map(pt => ({
      x: toX(pt.time),
      y: toY(pt.velocity),
    }))
  }, [physics.flashPoints, toX, toY])

  // ── 逐差法梯形面积差在 v-t 图上的平行四边形几何证明 ──
  const areaDifferenceGeometry = useMemo(() => {
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

    // 梯形 1 (前区间 [(idx-1)T, idxT]) 顶点
    const trap1Points = [
      `${toX(t_prev)},${toY(0)}`,
      `${toX(t_prev)},${toY(v_prev)}`,
      `${toX(t_curr)},${toY(v_curr)}`,
      `${toX(t_curr)},${toY(0)}`
    ].join(' L ')

    // 梯形 2 (后区间 [idxT, (idx+1)T]) 顶点
    const trap2Points = [
      `${toX(t_curr)},${toY(0)}`,
      `${toX(t_curr)},${toY(v_curr)}`,
      `${toX(t_next)},${toY(v_next)}`,
      `${toX(t_next)},${toY(0)}`
    ].join(' L ')

    // 两面积之差 (平行四边形):
    // 顶点1: (idxT, v_prev)
    // 顶点2: (idxT, v_curr)
    // 顶点3: ((idx+1)T, v_next)
    // 顶点4: ((idx+1)T, v_curr)
    const diffPolyPoints = [
      `${toX(t_curr)},${toY(v_prev)}`,
      `${toX(t_curr)},${toY(v_curr)}`,
      `${toX(t_next)},${toY(v_next)}`,
      `${toX(t_next)},${toY(v_curr)}`
    ].join(' L ')

    return {
      trap1D: `M ${trap1Points} Z`,
      trap2D: `M ${trap2Points} Z`,
      diffD: `M ${diffPolyPoints} Z`,
      midT: t_curr,
      nextT: t_next,
      v_curr,
      v_prev
    }
  }, [hoveredFlashIdx, T, v0, a, toX, toY])

  const xticks = [0, 2, 4, 6, 8]
  const yticks = useMemo(() => {
    const step = (vtYMax - vtYMin) > 20 ? 10 : (vtYMax - vtYMin) > 10 ? 5 : 2
    const ticks: number[] = []
    for (let val = Math.ceil(vtYMin / step) * step; val <= vtYMax; val += step) {
      ticks.push(val)
    }
    return ticks
  }, [vtYMin, vtYMax])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg">
        <text x={canvasSize.width / 2} y={15} fontSize={font(11)} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">匀变速直线运动 v-t 图象</text>

        {/* 坐标轴 */}
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
        <line x1={chartLeft} y1={toY(0)} x2={chartRight} y2={toY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

        {/* 刻度 */}
        {xticks.map(t => (
          <g key={`xt-${t}`}>
            <line x1={toX(t)} y1={toY(0) - 3} x2={toX(t)} y2={toY(0) + 3} stroke={CHART_COLORS.tickMark} />
            <text x={toX(t)} y={toY(0) + 12} fontSize={font(8)} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
          </g>
        ))}
        {yticks.map(vel => (
          <g key={`yt-${vel}`}>
            <line x1={chartLeft - 3} y1={toY(vel)} x2={chartLeft} y2={toY(vel)} stroke={CHART_COLORS.tickMark} />
            <text x={chartLeft - 6} y={toY(vel) + 3} fontSize={font(8)} textAnchor="end" fill={CHART_COLORS.tickLabel} fontWeight="600">{vel}</text>
          </g>
        ))}

        {/* 面积高亮（有交互则优先绘制交互差值面积，无交互画普通位移面积） */}
        {areaDifferenceGeometry ? (
          <g>
            {/* 梯形 1 面积 (弱填充) */}
            <path d={areaDifferenceGeometry.trap1D} fill={VT_CHART_COLORS.areaShade} opacity={0.12} stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} strokeDasharray="2 2" />
            {/* 梯形 2 面积 (弱填充) */}
            <path d={areaDifferenceGeometry.trap2D} fill={VT_CHART_COLORS.areaShade} opacity={0.12} stroke={PHYSICS_COLORS.velocity} strokeWidth={0.5} strokeDasharray="2 2" />
            {/* 平行四边形差值面积 (红色高亮代表位移差) */}
            <path d={areaDifferenceGeometry.diffD} fill={CHART_COLORS.areaFillWarm} opacity={0.45} stroke={PHYSICS_COLORS.acceleration} strokeWidth={1.5} />
            
            {/* 差值平行四边形标注 */}
            <text
              x={toX((areaDifferenceGeometry.midT + areaDifferenceGeometry.nextT) / 2)}
              y={(toY(areaDifferenceGeometry.v_curr) + toY(areaDifferenceGeometry.v_prev)) / 2 + 3}
              fontSize={font(8)}
              fill={PHYSICS_COLORS.acceleration}
              textAnchor="middle"
              fontWeight="bold"
            >
              面积差 ΔS = aT²
            </text>
          </g>
        ) : (
          areaPath && <path d={areaPath} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />
        )}

        {/* v-t 图主图线 */}
        {vtPath && <path d={vtPath} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />}

        {/* 频闪时刻点 */}
        {flashDots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r={3} fill={PHYSICS_COLORS.referencePoint} />
        ))}

        {/* 动态十字投影对齐虚线和读数气泡 */}
        {time > 0 && time <= VT_X_MAX && (
          <g>
            {/* 十字线 */}
            <line x1={chartLeft} y1={toY(physics.v)} x2={toX(time)} y2={toY(physics.v)} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray={DASH.projection.join(' ')} />
            <line x1={toX(time)} y1={toY(0)} x2={toX(time)} y2={toY(physics.v)} stroke={PHYSICS_COLORS.grid} strokeWidth={0.8} strokeDasharray={DASH.projection.join(' ')} />
            
            {/* 状态指示点 */}
            <circle cx={toX(time)} cy={toY(physics.v)} r={4} fill={PHYSICS_COLORS.velocity} stroke="white" strokeWidth={1} />

            {/* X 轴气泡 */}
            <rect x={toX(time) - 15} y={toY(0) + 14} width="30" height="11" rx="2.5" fill={SCENE_COLORS.materials.sliderMetalGrad[0]} stroke={PHYSICS_COLORS.axis} strokeWidth={0.5} />
            <text x={toX(time)} y={toY(0) + 22} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
              {time.toFixed(1)}s
            </text>

            {/* Y 轴气泡 */}
            <rect x={chartLeft - 32} y={toY(physics.v) - 5} width="28" height="11" rx="2.5" fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={0.5} />
            <text x={chartLeft - 18} y={toY(physics.v) + 3} fontSize={font(8)} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
              {physics.v.toFixed(1)}
            </text>
          </g>
        )}
      </svg>
    </div>
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
