import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { calculatePoliceChase } from '@/physics'
import { PHYSICS_COLORS, STROKE, DASH, FONT } from '@/theme/physics'
import { AnimationControls, Card } from '@/components/UI'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { SportsCar } from '@/components/Physics/SportsCar'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { RelationChart, VelocityTimeChart } from '@/components/Chart'
import { createSceneScale } from '@/scene'
import type { SceneConfig } from '@/scene'

/** 布局常量（语义化命名，比例驱动） */
const LAYOUT = {
  CHART_HEIGHT_RATIO: 0.5,
  ANIMATION_HEIGHT_RATIO: 0.5,
  CHART_PADDING_RATIO: 0.06,
  ROAD_Y_RATIO: 0.72,
  VEHICLE_WIDTH: 56,
  VEHICLE_HEIGHT: 26,
  MAX_TIME: 20,
  XT_X_MAX: 20,
  VT_X_MAX: 20,
} as const

/**
 * 加速度进阶版 CenterExtra —— 警车追击问题
 *
 * 上层：并列双图表（左 x-t 图 | 右 v-t 图）
 * 下层：真实公路追击动画
 *
 * 遵循 project_rules.md 设计规范：比例驱动布局、主题 token 引用、无硬编码像素。
 */
export default function AccelerationCenterExtra() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const speed = useAnimationStore((s) => s.speed)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const setTime = useAnimationStore((s) => s.setTime)
  const setSpeed = useAnimationStore((s) => s.setSpeed)
  const [showMaxGapWarning, setShowMaxGapWarning] = useState(false)
  const [showMeetWarning, setShowMeetWarning] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })
  const containerRef = useRef<HTMLDivElement>(null)

  const vA = params.vA ?? 30
  const deltaX0 = params.deltaX0 ?? 50
  const t0 = params.t0 ?? 1
  const aB = params.aB ?? 3
  const vMax = params.vMax ?? 40

  // ── 容器尺寸监听 ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerSize({ width, height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ── 物理计算 ──
  const state = useMemo(
    () => calculatePoliceChase(vA, deltaX0, t0, aB, vMax, time),
    [vA, deltaX0, t0, aB, vMax, time]
  )

  // ── 动态计算最大时间（确保追击可完成） ──
  const maxTimeNeeded = useMemo(() => {
    if (vMax <= vA) return LAYOUT.MAX_TIME
    const t1 = t0 + vMax / aB
    const xB_t1 = 0.5 * aB * (vMax / aB) ** 2
    const gapAtT1 = deltaX0 + vA * t1 - xB_t1
    if (gapAtT1 <= 0) return t1
    const tCatchUp = t1 + gapAtT1 / (vMax - vA)
    return Math.min(Math.ceil(tCatchUp) + 2, 120)
  }, [vA, deltaX0, t0, aB, vMax])

  const effectiveMaxTime = Math.max(LAYOUT.MAX_TIME, maxTimeNeeded)

  // ── 检测共速时刻（最大间距）单次触发 ──
  const prevTimeRef = useRef(0)
  const hasShownMaxGapRef = useRef(false)
  const hasShownMeetRef = useRef(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const meetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearAutoPauseTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = undefined
    }
    if (meetTimerRef.current) {
      clearTimeout(meetTimerRef.current)
      meetTimerRef.current = undefined
    }
    setShowMaxGapWarning(false)
    setShowMeetWarning(false)
  }, [])

  const handlePlayPause = useCallback(() => {
    clearAutoPauseTimers()
    setIsPlaying(!isPlaying)
  }, [clearAutoPauseTimers, setIsPlaying, isPlaying])

  useEffect(() => {
    // 重置时清除标记
    if (time === 0) {
      hasShownMaxGapRef.current = false
      hasShownMeetRef.current = false
      prevTimeRef.current = 0
      return
    }
    if (!isPlaying) {
      prevTimeRef.current = time
      return
    }
    const { tEqual, tMeet } = state

    // 共速时刻（最大间距）暂停 1 秒 — 不重置时间线
    if (
      !hasShownMaxGapRef.current &&
      tEqual > 0 &&
      tEqual <= effectiveMaxTime &&
      prevTimeRef.current < tEqual &&
      time >= tEqual
    ) {
      hasShownMaxGapRef.current = true
      setIsPlaying(false)
      setShowMaxGapWarning(true)
      warningTimerRef.current = setTimeout(() => {
        setShowMaxGapWarning(false)
        setIsPlaying(true)
      }, 1000)
    }

    // 相遇时刻（追上前车）暂停 2 秒
    if (
      !hasShownMeetRef.current &&
      tMeet !== null &&
      tMeet > 0 &&
      tMeet <= effectiveMaxTime &&
      prevTimeRef.current < tMeet &&
      time >= tMeet
    ) {
      hasShownMeetRef.current = true
      setIsPlaying(false)
      setShowMeetWarning(true)
      meetTimerRef.current = setTimeout(() => {
        setShowMeetWarning(false)
        setIsPlaying(true)
      }, 2000)
    }

    prevTimeRef.current = time
  }, [time, isPlaying, state, effectiveMaxTime, setIsPlaying, setTime])

  // 组件卸载时清理 timer
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (meetTimerRef.current) clearTimeout(meetTimerRef.current)
    }
  }, [])

  // 参数变更时清除待命 timer（防止预设切换后 timer 意外触发）
  const prevParamsRef = useRef(params)
  useEffect(() => {
    if (prevParamsRef.current !== params) {
      clearAutoPauseTimers()
      prevParamsRef.current = params
    }
  }, [params, clearAutoPauseTimers])

  // ── 布局计算 ──
  const padding = containerSize.width * LAYOUT.CHART_PADDING_RATIO
  const animHeight = containerSize.height * LAYOUT.ANIMATION_HEIGHT_RATIO

  // ── x-t 图数据（原始） ──
  const xtCarData = useMemo(() => {
    const pts: { t: number; x: number }[] = []
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) {
      pts.push({ t, x: deltaX0 + vA * t })
    }
    return pts
  }, [vA, deltaX0, effectiveMaxTime])

  const xtPoliceData = useMemo(() => {
    const pts: { t: number; x: number }[] = []
    const t1 = t0 + vMax / aB
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) {
      let x: number
      if (t < t0) { x = 0 }
      else if (t < t1) { x = 0.5 * aB * (t - t0) * (t - t0) }
      else { x = 0.5 * aB * (t1 - t0) * (t1 - t0) + vMax * (t - t1) }
      pts.push({ t, x })
    }
    return pts
  }, [t0, aB, vMax, effectiveMaxTime])

  // ── v-t 图数据（原始） ──
  const vtCarData = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) { pts.push({ t, v: vA }) }
    return pts
  }, [vA, effectiveMaxTime])

  const vtPoliceData = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    const t1 = t0 + vMax / aB
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) {
      let v: number
      if (t < t0) { v = 0 }
      else if (t < t1) { v = aB * (t - t0) }
      else { v = vMax }
      pts.push({ t, v })
    }
    return pts
  }, [t0, aB, vMax, effectiveMaxTime])

  // ── x-t 图数据（RelationChart 格式: {x, y}） ──
  const xtCarPoints = useMemo(
    () => xtCarData.filter(p => p.t <= time + 0.01).map(p => ({ x: p.t, y: p.x })),
    [xtCarData, time]
  )
  const xtPolicePoints = useMemo(
    () => xtPoliceData.filter(p => p.t <= time + 0.01).map(p => ({ x: p.t, y: p.x })),
    [xtPoliceData, time]
  )

  // ── v-t 图数据（VelocityTimeChart 格式） ──
  const vtCarPoints = useMemo(
    () => vtCarData.filter(p => p.t <= time + 0.01).map(p => ({ t: p.t, v: p.v })),
    [vtCarData, time]
  )
  const vtCarDomain = useMemo(
    () => vtCarData.map(p => ({ t: p.t, v: p.v })),
    [vtCarData]
  )
  const vtPolicePoints = useMemo(
    () => vtPoliceData.filter(p => p.t <= time + 0.01).map(p => ({ t: p.t, v: p.v })),
    [vtPoliceData, time]
  )
  const vtPoliceDomain = useMemo(
    () => vtPoliceData.map(p => ({ t: p.t, v: p.v })),
    [vtPoliceData]
  )

  // ── 坐标范围 ──
  const xtYMax = Math.max(deltaX0 + vA * effectiveMaxTime, deltaX0 + 50)
  const xtYMin = -10
  const vtYMax = Math.max(vA, vMax) * 1.2
  const vtYMin = -2

  // ── 公路动画布局 ──
  const roadY = animHeight * LAYOUT.ROAD_Y_RATIO
  const roadPadding = padding * 0.5
  const roadLeft = roadPadding
  const roadRight = containerSize.width - roadPadding
  const roadWidth = roadRight - roadLeft

  // 位移缩放：以有效时间内轿车的最大位移为参考
  const maxDist = deltaX0 + vA * effectiveMaxTime
  const scale = (roadWidth * 0.85) / maxDist
  const startX = roadLeft + roadWidth * 0.05

  const carX = startX + (deltaX0 + state.xA) * scale
  const policeX = startX + state.xB * scale

  // ── 矢量场景配置 ──
  const chaseScene: SceneConfig = {
    vectorBounds: { x: 0, y: 0, width: containerSize.width, height: animHeight },
    originX: 0,
    originY: 0,
    refMagnitudes: { velocity: Math.max(vA, vMax) * 1.3, acceleration: aB * 2 },
  }
  const sceneScale = createSceneScale(chaseScene)


  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* ══════════ 上层：并列双图表 ══════════ */}
      <div className="flex-1 flex flex-row relative">
        {/* ── 左：x-t 图象（RelationChart） ── */}
        <div className="w-1/2 h-full p-1">
          <RelationChart
            points={xtCarPoints}
            additionalSeries={[
              {
                points: xtPolicePoints,
                label: '警车',
                series: 'secondary',
                color: PHYSICS_COLORS.velocity,
              },
            ]}
            xDomain={[0, effectiveMaxTime]}
            yDomain={[xtYMin, xtYMax]}
            xLabel="t / s"
            yLabel="x / m"
            title="位移 - 时间图象 (x-t)"
            color={PHYSICS_COLORS.displacement}
            cursorX={time > 0 ? time : undefined}
            cursorLabel={() => null}
            showGrid
          />
        </div>

        {/* ── 右：v-t 图象（VelocityTimeChart） ── */}
        <div className="w-1/2 h-full p-1">
          <VelocityTimeChart
            mode="animated"
            points={vtCarPoints}
            domainPoints={vtCarDomain}
            additionalSeries={[
              {
                points: vtPolicePoints,
                domainPoints: vtPoliceDomain,
                label: '警车',
                series: 'secondary',
              },
            ]}
            currentTime={time}
            tMax={effectiveMaxTime}
            vRange={[vtYMin, vtYMax]}
            title="速度 - 时间图象 (v-t)"
            showCursor={time > 0}
          />
        </div>
      </div>
      {/* ══════════ 下层：真实公路追击动画 ══════════ */}
      <div className="flex-1 relative">
        <svg width={containerSize.width} height={animHeight} className="absolute inset-0">
          {/* 公路 */}
          <PhysicsGround
            x={roadLeft} y={roadY} width={roadWidth}
            appearance={{ color: PHYSICS_COLORS.labelText }}
            ruler={{
              domain: [0, maxDist],
              pixelPerUnit: scale,
              tickInterval: 100,
              unit: 'm',
            }}
          />

          {/* 起始参考线 */}
          <line x1={startX} y1={roadY - 40} x2={startX} y2={roadY + 15} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(' ')} />
          <text x={startX} y={roadY + 28} fontSize={FONT.axis} fill={PHYSICS_COLORS.axis} textAnchor="middle" fontWeight="bold">0</text>

          {/* 动态间距线 */}
          {time > 0 && (
            <g>
              <line
                x1={policeX + LAYOUT.VEHICLE_WIDTH}
                y1={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5}
                x2={carX}
                y2={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5}
                stroke={state.deltaX > deltaX0 ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
                strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')}
              />
              <text
                x={(policeX + LAYOUT.VEHICLE_WIDTH + carX) / 2}
                y={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5 - 6}
                fontSize={FONT.small}
                fill={state.deltaX > deltaX0 ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
                textAnchor="middle"
                fontWeight="bold"
              >
                Δx = {state.deltaX.toFixed(1)}m
              </text>
            </g>
          )}

          {/* 轿车 A */}
          <SportsCar
            x={carX}
            y={roadY - LAYOUT.VEHICLE_HEIGHT}
            velocity={vA}
            time={time}
            width={LAYOUT.VEHICLE_WIDTH}
            height={LAYOUT.VEHICLE_HEIGHT}
          />

          {/* 警车 B */}
          <SportsCar
            x={policeX}
            y={roadY - LAYOUT.VEHICLE_HEIGHT}
            police={true}
            velocity={state.vB}
            time={time}
            width={LAYOUT.VEHICLE_WIDTH}
            height={LAYOUT.VEHICLE_HEIGHT}
            fill={PHYSICS_COLORS.objectFill}
          />
          
          {/* 反应期光晕 (特定逻辑) */}
          {time > 0 && state.phase === 'reaction' && (
            <circle 
              cx={policeX + LAYOUT.VEHICLE_WIDTH/2} 
              cy={roadY - LAYOUT.VEHICLE_HEIGHT/2} 
              r={LAYOUT.VEHICLE_WIDTH * 0.8} 
              fill="none" 
              stroke={PHYSICS_COLORS.referencePoint} 
              strokeWidth={1} 
              opacity={0.4}
            >
              <animate attributeName="r" values={`${LAYOUT.VEHICLE_WIDTH * 0.6};${LAYOUT.VEHICLE_WIDTH * 0.9};${LAYOUT.VEHICLE_WIDTH * 0.6}`} dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* 速度矢量 */}
          {time > 0 && (
            <g>
              {/* 轿车速度矢量 */}
              <VectorArrow
                origin={{ x: carX + LAYOUT.VEHICLE_WIDTH + 4, y: -(roadY - LAYOUT.VEHICLE_HEIGHT * 0.5) }}
                vector={{ x: vA, y: 0 }}
                type="velocity"
                sceneScale={sceneScale}
                strokeWidth={STROKE.vectorMain}
              />
              <text x={carX + LAYOUT.VEHICLE_WIDTH + 8 + sceneScale.maxVectorLength * 0.4} y={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5 + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v_A</text>

              {/* 警车速度矢量 */}
              {state.vB > 0.1 && (
                <g>
                  <VectorArrow
                    origin={{ x: policeX + LAYOUT.VEHICLE_WIDTH + 4, y: -(roadY - LAYOUT.VEHICLE_HEIGHT * 0.5) }}
                    vector={{ x: state.vB, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    strokeWidth={STROKE.vectorMain}
                  />
                  <text x={policeX + LAYOUT.VEHICLE_WIDTH + 8 + sceneScale.maxVectorLength * 0.4} y={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5 + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v_B</text>
                </g>
              )}
            </g>
          )}

          {/* 信息标注 */}
          <g>
            <text x={roadLeft + 10} y={30} fontSize={FONT.bodySize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              t = {time.toFixed(1)} s
            </text>
            <text x={roadLeft + 120} y={30} fontSize={FONT.bodySize} fill={PHYSICS_COLORS.displacement} fontWeight="bold">
              x_A = {state.xA.toFixed(1)} m
            </text>
            <text x={roadLeft + 260} y={30} fontSize={FONT.bodySize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              x_B = {state.xB.toFixed(1)} m
            </text>
            <text x={roadLeft + 400} y={30} fontSize={FONT.bodySize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              Δx = {state.deltaX.toFixed(1)} m
            </text>
          </g>

          {/* 警车加速度矢量（加速阶段显示，最高速后同步消失） */}
          {state.phase === 'accelerating' && state.aB_current > 0.01 && (
            <VectorArrow
              origin={{ x: policeX + LAYOUT.VEHICLE_WIDTH * 0.5, y: -(roadY - LAYOUT.VEHICLE_HEIGHT - 8) }}
              vector={{ x: state.aB_current, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
          )}
        </svg>

        {/* 最大间距警告气泡 */}
        {showMaxGapWarning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 alert-card-warning font-bold text-xs shadow-lg">
            ℹ️ 共速时刻：此时两车距离最大！Δx = {state.deltaX.toFixed(1)} m
          </div>
        )}

        {/* 相遇警告气泡 */}
        {showMeetWarning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 alert-card-info font-bold text-xs shadow-lg">
            🚔 警车追上轿车！t = {state.tMeet?.toFixed(1)} s
          </div>
        )}
      </div>

      {/* ── 动画控制栏 ── */}
      <Card className="p-2">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={effectiveMaxTime}
          onPlayPause={handlePlayPause}
          onReset={() => { clearAutoPauseTimers(); setTime(0); setIsPlaying(false) }}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </Card>
    </div>
  )
}
