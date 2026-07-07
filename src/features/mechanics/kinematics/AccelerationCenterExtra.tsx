import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { calculatePoliceChase, calculateMeeting } from '@/physics'
import { PHYSICS_COLORS, STROKE, DASH } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { SportsCar } from '@/components/Physics/SportsCar'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { RelationChart, VelocityTimeChart } from '@/components/Chart'
import { createSceneScaleFromViewport } from '@/scene'
import { useCanvasSize } from '@/utils'

/** 布局常量（语义化命名，比例驱动） */
const LAYOUT = {
  CHART_HEIGHT_RATIO: 0.5,
  ANIMATION_HEIGHT_RATIO: 0.5,
  CHART_PADDING_RATIO: 0.06,
  ROAD_Y_RATIO: 0.72,
  VEHICLE_WIDTH: 56,
  VEHICLE_HEIGHT: 26,
  MAX_TIME: 20,
} as const

/**
 * 追及相遇模型动画
 *
 * 上层：并列双图表（左 x-t 图 | 右 v-t 图）
 * 下层：真实公路动画
 *
 * 支持两种模式：
 * - 追及模式 (chaseMode=0)：警车追击轿车
 * - 相遇模式 (chaseMode=1)：两车相向而行
 */
export default function AccelerationCenterExtra() {
  const params = useAnimationStore((s) => s.params)
  const time = useAnimationStore((s) => s.time)
  const isPlaying = useAnimationStore((s) => s.isPlaying)
  const setIsPlaying = useAnimationStore((s) => s.setIsPlaying)
  const [showWarning, setShowWarning] = useState(false)
  const [warningText, setWarningText] = useState('')
  const [containerRef, canvasSize] = useCanvasSize({ width: 800, height: 600 })
  const { font } = canvasSize

  const chaseMode = params.chaseMode ?? 0
  const vA = params.vA ?? 30
  const vMax = params.vMax ?? 40

  // ── 追及模式参数 ──
  const deltaX0 = params.deltaX0 ?? 50
  const t0 = params.t0 ?? 1
  const aB_chase = params.aB ?? 3

  // ── 相遇模式参数 ──
  const vL = params.vL ?? 200
  const aB_meet = params.aB_meet ?? 2

  // ── 物理计算 ──
  const chaseState = useMemo(
    () => calculatePoliceChase(vA, deltaX0, t0, aB_chase, vMax, time),
    [vA, deltaX0, t0, aB_chase, vMax, time]
  )

  const meetState = useMemo(
    () => calculateMeeting(vA, vL, aB_meet, time),
    [vA, vL, aB_meet, time]
  )

  const state = chaseMode === 0 ? chaseState : meetState

  // ── 动态计算最大时间 ──
  const effectiveMaxTime = useMemo(() => {
    if (chaseMode === 0) {
      // 追及模式
      if (vMax <= vA) return LAYOUT.MAX_TIME
      const t1 = t0 + vMax / aB_chase
      const xB_t1 = 0.5 * aB_chase * (vMax / aB_chase) ** 2
      const gapAtT1 = deltaX0 + vA * t1 - xB_t1
      if (gapAtT1 <= 0) return t1
      const tCatchUp = t1 + gapAtT1 / (vMax - vA)
      return Math.min(Math.ceil(tCatchUp) + 2, 120)
    } else {
      // 相遇模式
      const tMeet = meetState.tMeet
      if (tMeet !== null) return Math.min(Math.ceil(tMeet) + 2, 60)
      return LAYOUT.MAX_TIME
    }
  }, [chaseMode, vA, vMax, deltaX0, t0, aB_chase, meetState.tMeet])

  const maxTime = Math.max(LAYOUT.MAX_TIME, effectiveMaxTime)

  // ── 自动暂停检测 ──
  const prevTimeRef = useRef(0)
  const hasShownWarningRef = useRef(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearAutoPauseTimer = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = undefined
    }
    setShowWarning(false)
  }, [])

  useEffect(() => {
    if (time === 0) {
      hasShownWarningRef.current = false
      prevTimeRef.current = 0
      return
    }
    if (!isPlaying) {
      prevTimeRef.current = time
      return
    }

    if (chaseMode === 0) {
      // 追及模式：检测共速时刻和相遇时刻
      const { tEqual, tMeet } = chaseState
      if (
        !hasShownWarningRef.current &&
        tEqual > 0 && tEqual <= maxTime &&
        prevTimeRef.current < tEqual && time >= tEqual
      ) {
        hasShownWarningRef.current = true
        setIsPlaying(false)
        setWarningText(`共速时刻：此时两车距离最大！Δx = ${chaseState.deltaX.toFixed(1)} m`)
        setShowWarning(true)
        warningTimerRef.current = setTimeout(() => {
          setShowWarning(false)
          setIsPlaying(true)
        }, 1500)
      }
      if (
        !hasShownWarningRef.current &&
        tMeet !== null && tMeet > 0 && tMeet <= maxTime &&
        prevTimeRef.current < tMeet && time >= tMeet
      ) {
        hasShownWarningRef.current = true
        setIsPlaying(false)
        setWarningText(`警车追上轿车！t = ${tMeet.toFixed(1)} s`)
        setShowWarning(true)
        warningTimerRef.current = setTimeout(() => {
          setShowWarning(false)
          setIsPlaying(true)
        }, 2000)
      }
    } else {
      // 相遇模式：检测相遇时刻
      const { tMeet } = meetState
      if (
        !hasShownWarningRef.current &&
        tMeet !== null && tMeet > 0 && tMeet <= maxTime &&
        prevTimeRef.current < tMeet && time >= tMeet
      ) {
        hasShownWarningRef.current = true
        setIsPlaying(false)
        setWarningText(`两车相遇！t = ${tMeet.toFixed(1)} s`)
        setShowWarning(true)
        warningTimerRef.current = setTimeout(() => {
          setShowWarning(false)
          setIsPlaying(true)
        }, 2000)
      }
    }

    prevTimeRef.current = time
  }, [time, isPlaying, chaseMode, chaseState, meetState, maxTime, setIsPlaying])

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [])

  const prevParamsRef = useRef(params)
  useEffect(() => {
    if (prevParamsRef.current !== params) {
      clearAutoPauseTimer()
      prevParamsRef.current = params
    }
  }, [params, clearAutoPauseTimer])

  // ── 布局计算 ──
  const padding = canvasSize.width * LAYOUT.CHART_PADDING_RATIO
  const animHeight = canvasSize.height * LAYOUT.ANIMATION_HEIGHT_RATIO

  // ── x-t 图数据 ──
  const xtDataA = useMemo(() => {
    const pts: { t: number; x: number }[] = []
    for (let t = 0; t <= maxTime; t += 0.1) {
      pts.push({ t, x: vA * t })
    }
    return pts
  }, [vA, maxTime])

  const xtDataB = useMemo(() => {
    const pts: { t: number; x: number }[] = []
    if (chaseMode === 0) {
      const t1 = t0 + vMax / aB_chase
      for (let t = 0; t <= maxTime; t += 0.1) {
        let x: number
        if (t < t0) { x = deltaX0 }
        else if (t < t1) { x = deltaX0 + 0.5 * aB_chase * (t - t0) * (t - t0) }
        else { x = deltaX0 + 0.5 * aB_chase * (t1 - t0) * (t1 - t0) + vMax * (t - t1) }
        pts.push({ t, x })
      }
    } else {
      for (let t = 0; t <= maxTime; t += 0.1) {
        pts.push({ t, x: vL - 0.5 * aB_meet * t * t })
      }
    }
    return pts
  }, [chaseMode, vL, vMax, t0, aB_chase, aB_meet, deltaX0, maxTime])

  // ── v-t 图数据 ──
  const vtDataA = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= maxTime; t += 0.1) { pts.push({ t, v: vA }) }
    return pts
  }, [vA, maxTime])

  const vtDataB = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    if (chaseMode === 0) {
      const t1 = t0 + vMax / aB_chase
      for (let t = 0; t <= maxTime; t += 0.1) {
        let v: number
        if (t < t0) { v = 0 }
        else if (t < t1) { v = aB_chase * (t - t0) }
        else { v = vMax }
        pts.push({ t, v })
      }
    } else {
      for (let t = 0; t <= maxTime; t += 0.1) {
        pts.push({ t, v: aB_meet * t })
      }
    }
    return pts
  }, [chaseMode, vMax, t0, aB_chase, aB_meet, maxTime])

  // ── 图表数据格式化 ──
  const xtPointsA = useMemo(
    () => xtDataA.filter(p => p.t <= time + 0.01).map(p => ({ x: p.t, y: p.x })),
    [xtDataA, time]
  )
  const xtPointsB = useMemo(
    () => xtDataB.filter(p => p.t <= time + 0.01).map(p => ({ x: p.t, y: p.x })),
    [xtDataB, time]
  )

  const vtPointsA = useMemo(
    () => vtDataA.filter(p => p.t <= time + 0.01).map(p => ({ t: p.t, v: p.v })),
    [vtDataA, time]
  )
  const vtDomainA = useMemo(() => vtDataA.map(p => ({ t: p.t, v: p.v })), [vtDataA])
  const vtPointsB = useMemo(
    () => vtDataB.filter(p => p.t <= time + 0.01).map(p => ({ t: p.t, v: p.v })),
    [vtDataB, time]
  )
  const vtDomainB = useMemo(() => vtDataB.map(p => ({ t: p.t, v: p.v })), [vtDataB])

  // ── 坐标范围 ──
  const xtYMax = chaseMode === 0
    ? Math.max(deltaX0 + vA * maxTime, deltaX0 + 50)
    : Math.max(vL + 10, vA * maxTime + 10)
  const vtYMax = chaseMode === 0
    ? Math.max(vA, vMax) * 1.2
    : Math.max(vA, aB_meet * maxTime) * 1.2

  // ── 公路动画布局 ──
  const roadY = animHeight * LAYOUT.ROAD_Y_RATIO
  const roadPadding = padding * 0.5
  const roadLeft = roadPadding
  const roadRight = canvasSize.width - roadPadding
  const roadWidth = roadRight - roadLeft

  const maxDist = chaseMode === 0
    ? deltaX0 + vA * maxTime
    : vL
  const scale = (roadWidth * 0.85) / maxDist
  const startX = roadLeft + roadWidth * 0.05

  // 车辆位置
  const carAX = startX + (chaseMode === 0 ? state.xA : state.xA) * scale
  const carBX = startX + (chaseMode === 0 ? state.xB : state.xB) * scale

  // ── 矢量场景配置 ──
  const chaseVp = useMemo(() => ({
    visibleX: 0, visibleY: 0, visibleW: canvasSize.width, visibleH: animHeight,
    centerX: 0, centerY: 0,
  }), [canvasSize.width, animHeight])
  const sceneScale = useMemo(() => createSceneScaleFromViewport(chaseVp, 'transform', {
    designWidth: canvasSize.width,
    designHeight: animHeight,
    refMagnitudes: { velocity: Math.max(vA, vMax) * 1.3, acceleration: (chaseMode === 0 ? aB_chase : aB_meet) * 2 },
  }), [chaseVp, canvasSize.width, animHeight, vA, vMax, chaseMode, aB_chase, aB_meet])

  const labelB = chaseMode === 0 ? '警车' : '乙车'

  // 乙车加速度（追及模式用 aB_current，相遇模式用 aB）
  const accelB = chaseMode === 0
    ? (chaseState.phase === 'accelerating' ? chaseState.aB_current : 0)
    : meetState.aB

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* ══════════ 上层：并列双图表 ══════════ */}
      <div className="flex-1 flex flex-row relative">
        <div className="w-1/2 h-full p-1">
          <RelationChart
            points={xtPointsA}
            additionalSeries={[{
              points: xtPointsB,
              label: labelB,
              series: 'secondary',
              color: PHYSICS_COLORS.velocity,
            }]}
            xDomain={[0, maxTime]}
            yDomain={[-10, xtYMax]}
            xLabel="t / s"
            yLabel="x / m"
            title="位移 - 时间图象 (x-t)"
            color={PHYSICS_COLORS.displacement}
            cursorX={time > 0 ? time : undefined}
            cursorLabel={() => null}
            showGrid
          />
        </div>
        <div className="w-1/2 h-full p-1">
          <VelocityTimeChart
            mode="animated"
            points={vtPointsA}
            domainPoints={vtDomainA}
            additionalSeries={[{
              points: vtPointsB,
              domainPoints: vtDomainB,
              label: labelB,
              series: 'secondary',
            }]}
            currentTime={time}
            tMax={maxTime}
            vRange={[-2, vtYMax]}
            title="速度 - 时间图象 (v-t)"
            showCursor={time > 0}
          />
        </div>
      </div>

      {/* ══════════ 下层：公路动画 ══════════ */}
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${canvasSize.width} ${animHeight}`} width={canvasSize.width} height={animHeight} className="absolute inset-0">
          <PhysicsGround
            x={roadLeft} y={roadY} width={roadWidth}
            appearance={{ color: PHYSICS_COLORS.labelText }}
            ruler={{
              domain: [0, maxDist],
              pixelPerUnit: scale,
              tickInterval: chaseMode === 0 ? 100 : Math.ceil(vL / 5),
              unit: 'm',
            }}
          />

          {/* 起始参考线 */}
          <line x1={startX} y1={roadY - 40} x2={startX} y2={roadY + 15}
            stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(' ')} />
          <text x={startX} y={roadY + 28} fontSize={font(13)} fill={PHYSICS_COLORS.axis} textAnchor="middle" fontWeight="bold">0</text>

          {/* 相遇模式：终点参考线 */}
          {chaseMode === 1 && (
            <>
              <line x1={startX + vL * scale} y1={roadY - 40} x2={startX + vL * scale} y2={roadY + 15}
                stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(' ')} />
              <text x={startX + vL * scale} y={roadY + 28} fontSize={font(13)} fill={PHYSICS_COLORS.axis} textAnchor="middle" fontWeight="bold">{vL}m</text>
            </>
          )}

          {/* 动态间距线 */}
          {time > 0 && (
            <g>
              <line
                x1={carAX + LAYOUT.VEHICLE_WIDTH}
                y1={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5}
                x2={carBX}
                y2={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5}
                stroke={state.deltaX > (chaseMode === 0 ? deltaX0 : vL * 0.5) ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
                strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')}
              />
              <text
                x={(carAX + LAYOUT.VEHICLE_WIDTH + carBX) / 2}
                y={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5 - 6}
                fontSize={font(11)}
                fill={state.deltaX > (chaseMode === 0 ? deltaX0 : vL * 0.5) ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
                textAnchor="middle"
                fontWeight="bold"
              >
                Δx = {state.deltaX.toFixed(1)}m
              </text>
            </g>
          )}

          {/* 甲车 A（向右） */}
          <SportsCar
            x={carAX}
            y={roadY - LAYOUT.VEHICLE_HEIGHT}
            velocity={vA}
            time={time}
            width={LAYOUT.VEHICLE_WIDTH}
            height={LAYOUT.VEHICLE_HEIGHT}
          />

          {/* 乙车 B */}
          <SportsCar
            x={carBX}
            y={roadY - LAYOUT.VEHICLE_HEIGHT}
            police={chaseMode === 0}
            velocity={state.vB}
            time={time}
            width={LAYOUT.VEHICLE_WIDTH}
            height={LAYOUT.VEHICLE_HEIGHT}
            fill={chaseMode === 1 ? PHYSICS_COLORS.objectFillNeutral : PHYSICS_COLORS.objectFill}
          />

          {/* 反应期光晕（追及模式） */}
          {chaseMode === 0 && time > 0 && 'phase' in state && state.phase === 'reaction' && (
            <circle
              cx={carBX + LAYOUT.VEHICLE_WIDTH / 2}
              cy={roadY - LAYOUT.VEHICLE_HEIGHT / 2}
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
              <VectorArrow
                origin={{ x: carAX + LAYOUT.VEHICLE_WIDTH + 4, y: -(roadY - LAYOUT.VEHICLE_HEIGHT * 0.5) }}
                vector={{ x: vA, y: 0 }}
                type="velocity"
                sceneScale={sceneScale}
                strokeWidth={STROKE.vectorMain}
              />
              <text x={carAX + LAYOUT.VEHICLE_WIDTH + 8 + sceneScale.maxVectorLength * 0.4}
                y={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5 + 4}
                fontSize={font(11)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v_A</text>

              {state.vB > 0.1 && (
                <g>
                  <VectorArrow
                    origin={{ x: carBX + LAYOUT.VEHICLE_WIDTH + 4, y: -(roadY - LAYOUT.VEHICLE_HEIGHT * 0.5) }}
                    vector={{ x: state.vB, y: 0 }}
                    type="velocity"
                    sceneScale={sceneScale}
                    strokeWidth={STROKE.vectorMain}
                  />
                  <text x={carBX + LAYOUT.VEHICLE_WIDTH + 8 + sceneScale.maxVectorLength * 0.4}
                    y={roadY - LAYOUT.VEHICLE_HEIGHT * 0.5 + 4}
                    fontSize={font(11)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v_B</text>
                </g>
              )}
            </g>
          )}

          {/* 信息标注 */}
          <g>
            <text x={roadLeft + 10} y={30} fontSize={font(13)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
              t = {time.toFixed(1)} s
            </text>
            <text x={roadLeft + 120} y={30} fontSize={font(13)} fill={PHYSICS_COLORS.displacement} fontWeight="bold">
              x_A = {state.xA.toFixed(1)} m
            </text>
            <text x={roadLeft + 260} y={30} fontSize={font(13)} fill={PHYSICS_COLORS.velocity} fontWeight="bold">
              x_B = {state.xB.toFixed(1)} m
            </text>
            <text x={roadLeft + 400} y={30} fontSize={font(13)} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
              Δx = {state.deltaX.toFixed(1)} m
            </text>
          </g>

          {/* 乙车加速度矢量 */}
          {time > 0 && state.vB > 0.1 && accelB > 0.01 && (
            <VectorArrow
              origin={{ x: carBX + LAYOUT.VEHICLE_WIDTH * 0.5, y: -(roadY - LAYOUT.VEHICLE_HEIGHT - 8) }}
              vector={{ x: accelB, y: 0 }}
              type="acceleration"
              sceneScale={sceneScale}
              strokeWidth={STROKE.vectorSub}
            />
          )}
        </svg>

        {/* 警告气泡 */}
        {showWarning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 alert-card-info font-bold text-xs shadow-lg">
            {warningText}
          </div>
        )}
      </div>
    </div>
  )
}
