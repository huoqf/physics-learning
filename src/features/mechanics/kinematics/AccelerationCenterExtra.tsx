import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAnimationStore } from '@/stores'
import { calculatePoliceChase } from '@/physics'
import { PHYSICS_COLORS, CHART_COLORS, STROKE, DASH, FONT } from '@/theme/physics'
import { SVG_FILTER } from '@/theme/physics/canvasStyle'
import { AnimationControls, Card } from '@/components/UI'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { VectorDefs } from '@/components/Physics/VectorDefs'
import { SportsCar } from '@/components/Physics/SportsCar'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

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
  }, [time, isPlaying, state, setIsPlaying, setTime])

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
  const chartHeight = containerSize.height * LAYOUT.CHART_HEIGHT_RATIO
  const animHeight = containerSize.height * LAYOUT.ANIMATION_HEIGHT_RATIO
  const chartWidth = (containerSize.width - padding * 3) / 2

  // ── x-t 图坐标转换 ──
  const xtYMax = Math.max(deltaX0 + vA * effectiveMaxTime, deltaX0 + 50)
  const xtYMin = -10
  const toXtX = (t: number) => padding + (t / effectiveMaxTime) * chartWidth
  const toXtY = (x: number) => chartHeight * 0.85 - ((x - xtYMin) / (xtYMax - xtYMin)) * chartHeight * 0.7

  // ── v-t 图坐标转换 ──
  const vtYMax = Math.max(vA, vMax) * 1.2
  const vtYMin = -2
  const toVtX = (t: number) => padding * 2 + chartWidth + (t / effectiveMaxTime) * chartWidth
  const toVtY = (v: number) => chartHeight * 0.85 - ((v - vtYMin) / (vtYMax - vtYMin)) * chartHeight * 0.7

  // ── x-t 图数据 ──
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
      if (t < t0) {
        x = 0
      } else if (t < t1) {
        x = 0.5 * aB * (t - t0) * (t - t0)
      } else {
        const xB_t1 = 0.5 * aB * (t1 - t0) * (t1 - t0)
        x = xB_t1 + vMax * (t - t1)
      }
      pts.push({ t, x })
    }
    return pts
  }, [vA, deltaX0, t0, aB, vMax, effectiveMaxTime])

  // ── v-t 图数据 ──
  const vtCarData = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) {
      pts.push({ t, v: vA })
    }
    return pts
  }, [vA, effectiveMaxTime])

  const vtPoliceData = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    const t1 = t0 + vMax / aB
    for (let t = 0; t <= effectiveMaxTime; t += 0.1) {
      let v: number
      if (t < t0) {
        v = 0
      } else if (t < t1) {
        v = aB * (t - t0)
      } else {
        v = vMax
      }
      pts.push({ t, v })
    }
    return pts
  }, [t0, aB, vMax, effectiveMaxTime])

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
        <svg width={containerSize.width} height={chartHeight} className="absolute inset-0">
          <defs>
            {/* 发光滤镜 */}
            <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={SVG_FILTER.glow.stdDeviation} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={SVG_FILTER.glow.stdDeviation} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 箭头标记 */}
            <VectorDefs colors={[PHYSICS_COLORS.velocity]} />
          </defs>

          {/* ── 左：x-t 图象 ── */}
          {(() => {
            const chartLeft = padding
            const chartTop = chartHeight * 0.12
            const chartBottom = chartHeight * 0.85

            return (
              <g>
                {/* 标题 */}
                <text x={chartLeft + chartWidth / 2} y={chartHeight * 0.08} fontSize={FONT.labelBold} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                  位移 - 时间图象 (x-t)
                </text>

                {/* 坐标轴 */}
                <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axis} />
                <line x1={chartLeft} y1={toXtY(0)} x2={chartLeft + chartWidth} y2={toXtY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold} />

                {/* X 轴刻度 */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const t = Math.round((effectiveMaxTime * i) / 4)
                  return (
                    <g key={`xt-xt-${t}`}>
                      <line x1={toXtX(t)} y1={toXtY(0) - 3} x2={toXtX(t)} y2={toXtY(0) + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                      <text x={toXtX(t)} y={toXtY(0) + 14} fontSize={FONT.small} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
                    </g>
                  )
                })}

                {/* Y 轴刻度 */}
                {[0, 100, 200, 300, 400, 500].map(x => {
                  if (x > xtYMax) return null
                  return (
                    <g key={`xt-yt-${x}`}>
                      <line x1={chartLeft - 3} y1={toXtY(x)} x2={chartLeft} y2={toXtY(x)} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                      <text x={chartLeft - 7} y={toXtY(x) + 3} fontSize={FONT.small} textAnchor="end" fill={CHART_COLORS.tickLabel} fontWeight="600">{x}</text>
                    </g>
                  )
                })}

                {/* 轴标签 */}
                <text x={chartLeft + chartWidth - 5} y={toXtY(0) - 8} fontSize={FONT.annotation} fill={CHART_COLORS.labelText} fontWeight="bold">t / s</text>
                <text x={chartLeft - 10} y={chartTop - 5} fontSize={FONT.annotation} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">x / m</text>

                {/* 轿车 x-t 曲线 */}
                <path
                  d={'M ' + xtCarData.filter(p => p.t <= time).map(p => `${toXtX(p.t)},${toXtY(p.x)}`).join(' L ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.displacement}
                  strokeWidth={STROKE.chartMain}
                />

                {/* 警车 x-t 曲线 */}
                <path
                  d={'M ' + xtPoliceData.filter(p => p.t <= time).map(p => `${toXtX(p.t)},${toXtY(p.x)}`).join(' L ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={STROKE.chartMain}
                />

                {/* 时间扫描线 */}
                {time > 0 && (
                  <line
                    x1={toXtX(time)}
                    y1={chartTop}
                    x2={toXtX(time)}
                    y2={chartBottom}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={STROKE.reference}
                    strokeDasharray={DASH.guide.join(' ')}
                    opacity={0.5}
                  />
                )}

                {/* 当前状态点 */}
                {time > 0 && (
                  <g>
                    <circle cx={toXtX(time)} cy={toXtY(state.xA + deltaX0)} r={4} fill={PHYSICS_COLORS.displacement} stroke="white" strokeWidth={2} />
                    <circle cx={toXtX(time)} cy={toXtY(state.xB)} r={4} fill={PHYSICS_COLORS.velocity} stroke="white" strokeWidth={2} />
                  </g>
                )}

                {/* 相遇点蓝色光圈 */}
                {state.tMeet !== null && state.tMeet <= time && (
                  <g>
                    <circle cx={toXtX(state.tMeet)} cy={toXtY(state.xA + deltaX0)} r={8} fill="none" stroke={PHYSICS_COLORS.velocity} strokeWidth={2} filter="url(#glow-blue)">
                      <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}
              </g>
            )
          })()}

          {/* ── 右：v-t 图象 ── */}
          {(() => {
            const chartLeft = padding * 2 + chartWidth
            const chartTop = chartHeight * 0.12
            const chartBottom = chartHeight * 0.85

            // 阴影面积路径
            const shadePath = (() => {
              if (time <= 0) return ''
              const pts: string[] = []
              const dt = 0.1
              for (let t = 0; t <= time + 0.001; t += dt) {
                const tt = Math.min(t, time)
                const vCar = vA
                let vPol: number
                const t1 = t0 + vMax / aB
                if (tt < t0) {
                  vPol = 0
                } else if (tt < t1) {
                  vPol = aB * (tt - t0)
                } else {
                  vPol = vMax
                }
                const yTop = toVtY(Math.max(vCar, vPol))
                if (pts.length === 0) {
                  pts.push(`M ${toVtX(tt)},${yTop}`)
                } else {
                  pts.push(`L ${toVtX(tt)},${yTop}`)
                }
              }
              // 闭合到底部
              for (let t = time; t >= -0.001; t -= 0.1) {
                const tt = Math.max(t, 0)
                const vCar = vA
                let vPol: number
                const t1 = t0 + vMax / aB
                if (tt < t0) {
                  vPol = 0
                } else if (tt < t1) {
                  vPol = aB * (tt - t0)
                } else {
                  vPol = vMax
                }
                const yBot = toVtY(Math.min(vCar, vPol))
                pts.push(`L ${toVtX(tt)},${yBot}`)
              }
              pts.push('Z')
              return pts.join(' ')
            })()

            return (
              <g>
                {/* 标题 */}
                <text x={chartLeft + chartWidth / 2} y={chartHeight * 0.08} fontSize={FONT.labelBold} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                  速度 - 时间图象 (v-t)
                </text>

                {/* 坐标轴 */}
                <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axis} />
                <line x1={chartLeft} y1={toVtY(0)} x2={chartLeft + chartWidth} y2={toVtY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold} />

                {/* X 轴刻度 */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const t = Math.round((effectiveMaxTime * i) / 4)
                  return (
                    <g key={`vt-xt-${t}`}>
                      <line x1={toVtX(t)} y1={toVtY(0) - 3} x2={toVtX(t)} y2={toVtY(0) + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                      <text x={toVtX(t)} y={toVtY(0) + 14} fontSize={FONT.small} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
                    </g>
                  )
                })}

                {/* Y 轴刻度 */}
                {[0, 10, 20, 30, 40, 50, 60].map(v => {
                  if (v > vtYMax) return null
                  return (
                    <g key={`vt-yt-${v}`}>
                      <line x1={chartLeft - 3} y1={toVtY(v)} x2={chartLeft} y2={toVtY(v)} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                      <text x={chartLeft - 7} y={toVtY(v) + 3} fontSize={FONT.small} textAnchor="end" fill={CHART_COLORS.tickLabel} fontWeight="600">{v}</text>
                    </g>
                  )
                })}

                {/* 轴标签 */}
                <text x={chartLeft + chartWidth - 5} y={toVtY(0) - 8} fontSize={FONT.annotation} fill={CHART_COLORS.labelText} fontWeight="bold">t / s</text>
                <text x={chartLeft - 10} y={chartTop - 5} fontSize={FONT.annotation} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">v / (m/s)</text>

                {/* 阴影面积（位移差） */}
                {shadePath && (
                  <path d={shadePath} fill={PHYSICS_COLORS.accelerationY} opacity={0.2} />
                )}

                {/* 轿车 v-t 曲线 */}
                <path
                  d={'M ' + vtCarData.filter(p => p.t <= time).map(p => `${toVtX(p.t)},${toVtY(p.v)}`).join(' L ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.velocity}
                  strokeWidth={STROKE.chartMain}
                />

                {/* 警车 v-t 曲线 */}
                <path
                  d={'M ' + vtPoliceData.filter(p => p.t <= time).map(p => `${toVtX(p.t)},${toVtY(p.v)}`).join(' L ')}
                  fill="none"
                  stroke={PHYSICS_COLORS.acceleration}
                  strokeWidth={STROKE.chartMain}
                />

                {/* 时间扫描线 */}
                {time > 0 && (
                  <line
                    x1={toVtX(time)}
                    y1={chartTop}
                    x2={toVtX(time)}
                    y2={chartBottom}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={STROKE.reference}
                    strokeDasharray={DASH.guide.join(' ')}
                    opacity={0.5}
                  />
                )}

                {/* 共速点红色光圈 */}
                {state.tEqual > 0 && state.tEqual <= time && (
                  <g>
                    <circle cx={toVtX(state.tEqual)} cy={toVtY(vA)} r={8} fill="none" stroke={PHYSICS_COLORS.acceleration} strokeWidth={2} filter="url(#glow-red)">
                      <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    {/* 向下引垂直虚线 */}
                    <line
                      x1={toVtX(state.tEqual)}
                      y1={toVtY(vA)}
                      x2={toVtX(state.tEqual)}
                      y2={toVtY(0)}
                      stroke={PHYSICS_COLORS.acceleration}
                      strokeWidth={STROKE.reference}
                      strokeDasharray={DASH.reference.join(' ')}
                      opacity={0.6}
                    />
                    <text x={toVtX(state.tEqual)} y={toVtY(0) + 18} fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} textAnchor="middle" fontWeight="bold">
                      t={state.tEqual.toFixed(1)}s
                    </text>
                  </g>
                )}
              </g>
            )
          })()}
        </svg>
      </div>

      {/* ══════════ 下层：真实公路追击动画 ══════════ */}
      <div className="flex-1 relative">
        <svg width={containerSize.width} height={animHeight} className="absolute inset-0">
          {/* 公路 */}
          <line x1={roadLeft} y1={roadY} x2={roadRight} y2={roadY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
          {/* 公路刻度 */}
          {Array.from({ length: Math.floor(roadWidth / 30) + 1 }).map((_, idx) => {
            const tickX = roadLeft + idx * 30
            const isMajor = idx % 5 === 0
            const tickHeight = isMajor ? 8 : 4
            return (
              <line
                key={`road-tick-${idx}`}
                x1={tickX}
                y1={roadY}
                x2={tickX}
                y2={roadY + tickHeight}
                stroke={PHYSICS_COLORS.axis}
                strokeWidth={STROKE.tick}
              />
            )
          })}
          {/* 地标 */}
          {[0, 100, 200, 300, 400, 500].map(d => {
            const px = startX + d * scale
            if (px > roadRight) return null
            return (
              <g key={`landmark-${d}`}>
                <line x1={px} y1={roadY} x2={px} y2={roadY + 10} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.tickBold} />
                <text x={px} y={roadY + 22} fontSize={FONT.small} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">{d}m</text>
              </g>
            )
          })}

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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-lg border border-amber-600 animate-pulse">
            ⚠️ 共速时刻：此时两车距离最大！Δx = {state.deltaX.toFixed(1)} m
          </div>
        )}

        {/* 相遇警告气泡 */}
        {showMeetWarning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-lg border border-green-700 animate-pulse">
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
