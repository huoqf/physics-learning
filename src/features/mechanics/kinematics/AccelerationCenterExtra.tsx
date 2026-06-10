import { useMemo, useState, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { calculatePoliceChase } from '@/physics'
import { PHYSICS_COLORS, CHART_COLORS, STROKE, DASH, FONT, OPACITY } from '@/theme/physics'
import { SVG_MARKER, SVG_FILTER } from '@/theme/physics/canvasStyle'
import { AnimationControls } from '@/components/UI'

/** 布局常量（语义化命名，比例驱动） */
const LAYOUT = {
  CHART_HEIGHT_RATIO: 0.5,
  ANIMATION_HEIGHT_RATIO: 0.5,
  CHART_PADDING_RATIO: 0.06,
  ROAD_Y_RATIO: 0.72,
  VEHICLE_WIDTH_RATIO: 0.07,
  VEHICLE_HEIGHT_RATIO: 0.04,
  ARROW_SCALE_V: 2.5,
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
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()
  const [showMaxGapWarning, setShowMaxGapWarning] = useState(false)
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

  // ── 检测共速时刻（最大间距）单次触发 ──
  const prevTimeRef = useRef(0)
  const hasShownMaxGapRef = useRef(false)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // 重置时清除标记
    if (time === 0) {
      hasShownMaxGapRef.current = false
      prevTimeRef.current = 0
      return
    }
    if (!isPlaying) {
      prevTimeRef.current = time
      return
    }
    const { tEqual } = state
    if (
      !hasShownMaxGapRef.current &&
      tEqual > 0 &&
      tEqual <= LAYOUT.MAX_TIME &&
      prevTimeRef.current < tEqual &&
      time >= tEqual
    ) {
      hasShownMaxGapRef.current = true
      setIsPlaying(false)
      setShowMaxGapWarning(true)
      setTime(tEqual)
      // 用 ref 持有 timer，不受 effect cleanup 影响
      warningTimerRef.current = setTimeout(() => {
        setShowMaxGapWarning(false)
      }, 1500)
    }
    prevTimeRef.current = time
  }, [time, isPlaying, state, setIsPlaying, setTime])

  // 组件卸载时清理 timer
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [])

  // ── 布局计算 ──
  const padding = containerSize.width * LAYOUT.CHART_PADDING_RATIO
  const chartHeight = containerSize.height * LAYOUT.CHART_HEIGHT_RATIO
  const animHeight = containerSize.height * LAYOUT.ANIMATION_HEIGHT_RATIO
  const chartWidth = (containerSize.width - padding * 3) / 2
  const vehicleW = containerSize.width * LAYOUT.VEHICLE_WIDTH_RATIO
  const vehicleH = containerSize.width * LAYOUT.VEHICLE_HEIGHT_RATIO

  // ── x-t 图坐标转换 ──
  const xtYMax = Math.max(deltaX0 + vA * LAYOUT.XT_X_MAX, deltaX0 + 50)
  const xtYMin = -10
  const toXtX = (t: number) => padding + (t / LAYOUT.XT_X_MAX) * chartWidth
  const toXtY = (x: number) => chartHeight * 0.85 - ((x - xtYMin) / (xtYMax - xtYMin)) * chartHeight * 0.7

  // ── v-t 图坐标转换 ──
  const vtYMax = Math.max(vA, vMax) * 1.2
  const vtYMin = -2
  const toVtX = (t: number) => padding * 2 + chartWidth + (t / LAYOUT.VT_X_MAX) * chartWidth
  const toVtY = (v: number) => chartHeight * 0.85 - ((v - vtYMin) / (vtYMax - vtYMin)) * chartHeight * 0.7

  // ── x-t 图数据 ──
  const xtCarData = useMemo(() => {
    const pts: { t: number; x: number }[] = []
    for (let t = 0; t <= LAYOUT.XT_X_MAX; t += 0.1) {
      pts.push({ t, x: deltaX0 + vA * t })
    }
    return pts
  }, [vA, deltaX0])

  const xtPoliceData = useMemo(() => {
    const pts: { t: number; x: number }[] = []
    const t1 = t0 + vMax / aB
    for (let t = 0; t <= LAYOUT.XT_X_MAX; t += 0.1) {
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
  }, [vA, deltaX0, t0, aB, vMax])

  // ── v-t 图数据 ──
  const vtCarData = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    for (let t = 0; t <= LAYOUT.VT_X_MAX; t += 0.1) {
      pts.push({ t, v: vA })
    }
    return pts
  }, [vA])

  const vtPoliceData = useMemo(() => {
    const pts: { t: number; v: number }[] = []
    const t1 = t0 + vMax / aB
    for (let t = 0; t <= LAYOUT.VT_X_MAX; t += 0.1) {
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
  }, [t0, aB, vMax])

  // ── 公路动画布局 ──
  const roadY = animHeight * LAYOUT.ROAD_Y_RATIO
  const roadPadding = padding * 0.5
  const roadLeft = roadPadding
  const roadRight = containerSize.width - roadPadding
  const roadWidth = roadRight - roadLeft

  // 位移缩放：以 20s 内轿车的最大位移为参考
  const maxDist = deltaX0 + vA * LAYOUT.MAX_TIME
  const scale = (roadWidth * 0.85) / maxDist
  const startX = roadLeft + roadWidth * 0.05

  const carX = startX + state.xA * scale
  const policeX = startX + state.xB * scale

  // ── 阶段状态徽章颜色 ──
  const phaseBadge = (() => {
    switch (state.phase) {
      case 'reaction':
        return 'bg-primary-50 text-primary-700 border-primary-300'
      case 'accelerating':
        return 'bg-accent-50 text-accent-700 border-accent-300'
      case 'cruising':
        return 'bg-secondary-50 text-secondary-700 border-secondary-300'
    }
  })()

  const phaseText = (() => {
    switch (state.phase) {
      case 'reaction':
        return '反应期'
      case 'accelerating':
        return '加速中'
      case 'cruising':
        return '巡航中'
    }
  })()

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* ══════════ 上层：并列双图表 ══════════ */}
      <div className="flex-1 flex flex-row relative">
        <svg width={containerSize.width} height={chartHeight} className="absolute inset-0">
          {/* 网格纸底纹 */}
          <defs>
            <pattern id="chase-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.grid} opacity={OPACITY.grid} />
            </pattern>
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
            <marker id="arrow-chase-v" markerWidth={SVG_MARKER.main.markerWidth} markerHeight={SVG_MARKER.main.markerHeight} refX={SVG_MARKER.main.refX} refY={SVG_MARKER.main.refY} orient="auto">
              <polygon points={SVG_MARKER.main.content} fill={PHYSICS_COLORS.velocity} />
            </marker>
          </defs>

          {/* 背景 */}
          <rect width={containerSize.width} height={chartHeight} fill="url(#chase-grid)" />

          {/* ── 左：x-t 图象 ── */}
          {(() => {
            const chartLeft = padding
            const chartTop = chartHeight * 0.12
            const chartBottom = chartHeight * 0.85
            const chartH = chartBottom - chartTop

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
                {[0, 5, 10, 15, 20].map(t => (
                  <g key={`xt-xt-${t}`}>
                    <line x1={toXtX(t)} y1={toXtY(0) - 3} x2={toXtX(t)} y2={toXtY(0) + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                    <text x={toXtX(t)} y={toXtY(0) + 14} fontSize={FONT.small} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
                  </g>
                ))}

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
                    <circle cx={toXtX(state.tMeet)} cy={toXtY(state.xA + deltaX0)} r={8} fill="none" stroke="#3B82F6" strokeWidth={2} filter="url(#glow-blue)">
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
                const yBot = toVtY(Math.min(vCar, vPol))
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
                {[0, 5, 10, 15, 20].map(t => (
                  <g key={`vt-xt-${t}`}>
                    <line x1={toVtX(t)} y1={toVtY(0) - 3} x2={toVtX(t)} y2={toVtY(0) + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                    <text x={toVtX(t)} y={toVtY(0) + 14} fontSize={FONT.small} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
                  </g>
                ))}

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
                    <circle cx={toVtX(state.tEqual)} cy={toVtY(vA)} r={8} fill="none" stroke="#EF4444" strokeWidth={2} filter="url(#glow-red)">
                      <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    {/* 向下引垂直虚线 */}
                    <line
                      x1={toVtX(state.tEqual)}
                      y1={toVtY(vA)}
                      x2={toVtX(state.tEqual)}
                      y2={toVtY(0)}
                      stroke="#EF4444"
                      strokeWidth={STROKE.reference}
                      strokeDasharray={DASH.reference.join(' ')}
                      opacity={0.6}
                    />
                    <text x={toVtX(state.tEqual)} y={toVtY(0) + 18} fontSize={FONT.small} fill="#EF4444" textAnchor="middle" fontWeight="bold">
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
          {/* 背景 */}
          <rect width={containerSize.width} height={animHeight} fill="url(#chase-grid)" />

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
                x1={policeX + vehicleW}
                y1={roadY - vehicleH * 0.5}
                x2={carX}
                y2={roadY - vehicleH * 0.5}
                stroke={state.deltaX > deltaX0 ? PHYSICS_COLORS.acceleration : PHYSICS_COLORS.velocity}
                strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')}
              />
              <text
                x={(policeX + vehicleW + carX) / 2}
                y={roadY - vehicleH * 0.5 - 6}
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
          <g transform={`translate(${carX}, ${roadY - vehicleH})`}>
            {/* 轿车车身 */}
            <path
              d={`M 2,${vehicleH - 4} Q 4,2 12,2 L ${vehicleW * 0.6},2 Q ${vehicleW * 0.75},2 ${vehicleW * 0.85},6 L ${vehicleW - 2},${vehicleH - 4} Z`}
              fill={PHYSICS_COLORS.objectFillNeutral}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={STROKE.objectLine}
            />
            {/* 车窗 */}
            <rect x={vehicleW * 0.35} y={4} width={vehicleW * 0.25} height={vehicleH * 0.3} rx={1} fill={PHYSICS_COLORS.grid} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
            {/* 车轮 */}
            <g transform={`translate(${vehicleW * 0.25}, ${vehicleH - 3})`}>
              <circle cx="0" cy="0" r={vehicleH * 0.15} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
            </g>
            <g transform={`translate(${vehicleW * 0.75}, ${vehicleH - 3})`}>
              <circle cx="0" cy="0" r={vehicleH * 0.15} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
            </g>
            {/* 标注 */}
            <text x={vehicleW / 2} y={-6} fontSize={FONT.small} fill={PHYSICS_COLORS.displacement} textAnchor="middle" fontWeight="bold">轿车</text>
          </g>

          {/* 警车 B */}
          <g transform={`translate(${policeX}, ${roadY - vehicleH})`}>
            {/* 反应期光晕 */}
            {state.phase === 'reaction' && (
              <circle cx={vehicleW / 2} cy={vehicleH / 2} r={vehicleW * 0.8} fill="none" stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1} opacity={0.4}>
                <animate attributeName="r" values={`${vehicleW * 0.6};${vehicleW * 0.9};${vehicleW * 0.6}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            {/* 警车身 */}
            <path
              d={`M 2,${vehicleH - 4} Q 4,2 12,2 L ${vehicleW * 0.6},2 Q ${vehicleW * 0.75},2 ${vehicleW * 0.85},6 L ${vehicleW - 2},${vehicleH - 4} Z`}
              fill={PHYSICS_COLORS.objectFill}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={STROKE.objectLine}
            />
            {/* 警灯 */}
            <rect x={vehicleW * 0.3} y={-3} width={vehicleW * 0.15} height={4} rx={1} fill="#EF4444" />
            <rect x={vehicleW * 0.5} y={-3} width={vehicleW * 0.15} height={4} rx={1} fill="#3B82F6" />
            {/* 车轮 */}
            <g transform={`translate(${vehicleW * 0.25}, ${vehicleH - 3})`}>
              <circle cx="0" cy="0" r={vehicleH * 0.15} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
            </g>
            <g transform={`translate(${vehicleW * 0.75}, ${vehicleH - 3})`}>
              <circle cx="0" cy="0" r={vehicleH * 0.15} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1.5} />
            </g>
            {/* 标注 */}
            <text x={vehicleW / 2} y={-6} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">警车</text>
          </g>

          {/* 速度矢量 */}
          {time > 0 && (
            <g>
              {/* 轿车速度矢量 */}
              <line
                x1={carX + vehicleW + 4}
                y1={roadY - vehicleH * 0.5}
                x2={carX + vehicleW + 4 + vA * LAYOUT.ARROW_SCALE_V}
                y2={roadY - vehicleH * 0.5}
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={STROKE.vectorMain}
                markerEnd="url(#arrow-chase-v)"
              />
              <text x={carX + vehicleW + 8 + vA * LAYOUT.ARROW_SCALE_V} y={roadY - vehicleH * 0.5 + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v_A</text>

              {/* 警车速度矢量 */}
              {state.vB > 0.1 && (
                <g>
                  <line
                    x1={policeX + vehicleW + 4}
                    y1={roadY - vehicleH * 0.5}
                    x2={policeX + vehicleW + 4 + state.vB * LAYOUT.ARROW_SCALE_V}
                    y2={roadY - vehicleH * 0.5}
                    stroke={PHYSICS_COLORS.velocity}
                    strokeWidth={STROKE.vectorMain}
                    markerEnd="url(#arrow-chase-v)"
                  />
                  <text x={policeX + vehicleW + 8 + state.vB * LAYOUT.ARROW_SCALE_V} y={roadY - vehicleH * 0.5 + 4} fontSize={FONT.small} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v_B</text>
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

          {/* 状态徽章 */}
          <g transform={`translate(${policeX + vehicleW / 2 - 30}, ${roadY - vehicleH - 22})`}>
            <rect x="0" y="0" width="60" height="16" rx="8" fill="white" stroke={state.phase === 'reaction' ? '#CBD5E1' : state.phase === 'accelerating' ? '#FDBA74' : '#86EFAC'} strokeWidth={1} />
            <text x="30" y="12" fontSize={9} fill={state.phase === 'reaction' ? '#475569' : state.phase === 'accelerating' ? '#C2410C' : '#15803D'} textAnchor="middle" fontWeight="bold">
              {phaseText}
            </text>
          </g>
        </svg>

        {/* 最大间距警告气泡 */}
        {showMaxGapWarning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-lg border border-amber-600 animate-bounce">
            ⚠️ 共速时刻：此时两车距离最大！Δx = {state.deltaX.toFixed(1)} m
          </div>
        )}
      </div>

      {/* ── 动画控制栏 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-sm p-2">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={LAYOUT.MAX_TIME}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => { setTime(0); setIsPlaying(false) }}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </div>
    </div>
  )
}
