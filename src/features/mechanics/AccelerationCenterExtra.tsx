import { useMemo, useState, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateAcceleratedMotion, calculateVariableAccelerationMotion, determineMotionState } from '@/physics'
import { PHYSICS_COLORS, CHART_COLORS, VT_CHART_COLORS, STROKE, DASH, FONT, OPACITY } from '@/theme/physics'
import { AnimationControls } from '@/components/UI'

/** 布局常量 */
const LAYOUT = {
  VT_CHART_RATIO: 0.55,
  AXIS_RATIO: 0.45,
  CHART_PADDING: 50,
  AXIS_MARGIN: 60,
  POINT_RADIUS: 5,
  TANGENT_LENGTH: 80,
  VECTOR_V_SCALE: 4,
  VECTOR_A_SCALE: 8,
  DOT_RADIUS: 10,
  VT_X_MAX: 8,
} as const

/**
 * 加速度进阶版 CenterExtra — v-t 图象 + 矢量联动
 *
 * 遵循 project_rules.md 规范：冷白背景、实验室图纸、精密科学仪器制图。
 */
export default function AccelerationCenterExtra() {
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()
  const [showTurnWarning, setShowTurnWarning] = useState(false)

  const v0 = params.v0 ?? 0
  const a = params.a ?? 2
  const deltaT = params.deltaT ?? 1 // 从 store 获取 deltaT
  const motionMode = params.motionMode ?? 0

  // ── 物理计算 ──
  const { v: currentV, a: currentA } = useMemo(() => {
    if (motionMode === 0) {
      const result = calculateAcceleratedMotion(v0, a, time)
      return { v: result.v, a }
    } else {
      const k = Math.abs(a) / 10
      return calculateVariableAccelerationMotion(v0, a, k, time)
    }
  }, [v0, a, motionMode, time])

  const { direction, motion } = determineMotionState(currentV, currentA)

  // ── 检测并实现转向点（v=0, a!=0）挂起 0.8 秒 ──
  const prevTimeRef = useRef(0)
  useEffect(() => {
    if (!isPlaying) {
      prevTimeRef.current = time
      return
    }

    // 寻找 v(t) = 0 的正根
    let tZero = -1
    if (motionMode === 0 && a !== 0) {
      const t = -v0 / a
      if (t > 0 && t <= LAYOUT.VT_X_MAX) {
        tZero = t
      }
    } else if (motionMode === 1) {
      const k = Math.abs(a) / 10
      if (k > 0) {
        // v(t) = v0 + a*t - 0.5*k*t^2 = 0
        const delta = a * a - 4 * (-0.5 * k) * v0
        if (delta >= 0) {
          const r1 = (-a + Math.sqrt(delta)) / (-k)
          const r2 = (-a - Math.sqrt(delta)) / (-k)
          const roots = [r1, r2].filter(r => r > 0 && r <= LAYOUT.VT_X_MAX)
          if (roots.length > 0) {
            tZero = Math.min(...roots)
          }
        }
      } else if (a !== 0) {
        const t = -v0 / a
        if (t > 0 && t <= LAYOUT.VT_X_MAX) {
          tZero = t
        }
      }
    }

    if (tZero > 0) {
      const prevT = prevTimeRef.current
      // 如果上一帧时间小于 tZero 且当前帧时间跨过了 tZero
      if (prevT < tZero && time >= tZero) {
        setIsPlaying(false)
        setShowTurnWarning(true)
        setTime(tZero) // 完美对准转向时刻，使 v 刚好为 0
        const timer = setTimeout(() => {
          setShowTurnWarning(false)
        }, 800)
        return () => clearTimeout(timer)
      }
    }

    prevTimeRef.current = time
  }, [time, isPlaying, v0, a, motionMode, setIsPlaying, setTime])

  // ── v-t 图 Y 轴范围 ──
  const { vtYMin, vtYMax, vtTickStep } = useMemo(() => {
    const maxV = Math.max(Math.abs(v0 + a * LAYOUT.VT_X_MAX), Math.abs(v0), 10)
    const minV = Math.min(v0 + a * LAYOUT.VT_X_MAX, v0, 0)
    const yMin = minV < 0 ? Math.floor(minV / 5) * 5 - 5 : -5
    const yMax = Math.ceil(maxV / 5) * 5 + 5
    return { vtYMin: yMin, vtYMax: yMax, vtTickStep: 5 }
  }, [v0, a])

  // ── v-t 图数据点 ──
  const vtChartData = useMemo(() => {
    const points: { x: number; y: number }[] = []
    for (let t = 0; t <= LAYOUT.VT_X_MAX; t += 0.1) {
      let v: number
      if (motionMode === 0) {
        v = v0 + a * t
      } else {
        const k = Math.abs(a) / 10
        const result = calculateVariableAccelerationMotion(v0, a, k, t)
        v = result.v
      }
      points.push({ x: t, y: v })
    }
    return points
  }, [v0, a, motionMode])

  // ── Y 轴刻度 ──
  const yticks = useMemo(() => {
    const ticks: number[] = []
    for (let v = vtYMin; v <= vtYMax; v += vtTickStep) {
      ticks.push(v)
    }
    return ticks
  }, [vtYMin, vtYMax, vtTickStep])

  // ── 数轴质点位置（基于位移 s）──
  const axisCenter = 0.5
  const axisRange = 0.35
  const maxDisplacement = 50 // 数轴最大位移量 (m)
  const getDisplacement = (t: number) => {
    if (motionMode === 0) {
      return calculateAcceleratedMotion(v0, a, t).s
    } else {
      const k = Math.abs(a) / 10
      return calculateVariableAccelerationMotion(v0, a, k, t).s
    }
  }

  const currentS = useMemo(() => getDisplacement(time), [v0, a, motionMode, time])
  const normalizedS = currentS !== 0 ? Math.sign(currentS) * Math.min(Math.abs(currentS) / maxDisplacement, 1) : 0
  const dotX = axisCenter + normalizedS * axisRange

  // ── 历史运动拖尾（低透明度历史质点投影） ──
  const trailPoints = useMemo(() => {
    if (time <= 0) return []
    const points: { x: number; opacity: number; key: string }[] = []
    const offsets = [0.15, 0.3, 0.45] // 时间回溯偏移
    offsets.forEach((dtOffset, idx) => {
      const tPrev = Math.max(0, time - dtOffset)
      if (tPrev > 0) {
        const sPrev = getDisplacement(tPrev)
        const normS = sPrev !== 0 ? Math.sign(sPrev) * Math.min(Math.abs(sPrev) / maxDisplacement, 1) : 0
        points.push({
          x: axisCenter + normS * axisRange,
          opacity: 0.35 - idx * 0.1,
          key: `trail-${idx}`,
        })
      }
    })
    return points
  }, [time, v0, a, motionMode])

  // 计算斜率三角形前一个点的时间和速度
  const slopeTriangleData = useMemo(() => {
    if (time <= 0) return null
    const tPrev = Math.max(0, time - deltaT)
    let vPrev = v0
    if (motionMode === 0) {
      vPrev = v0 + a * tPrev
    } else {
      const k = Math.abs(a) / 10
      vPrev = calculateVariableAccelerationMotion(v0, a, k, tPrev).v
    }
    return { tPrev, vPrev }
  }, [time, deltaT, v0, a, motionMode])

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* ── 信息条与状态徽章 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-md px-4 py-2.5 flex items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PHYSICS_COLORS.velocity }} />
          <span className="text-neutral-700">瞬时速度 v = <span className="font-bold font-mono">{currentV.toFixed(2)}</span> m/s</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PHYSICS_COLORS.acceleration }} />
          <span className="text-neutral-700">加速度 a = <span className="font-bold font-mono">{currentA.toFixed(2)}</span> m/s²</span>
        </div>
        
        {/* 运动状态科技感 Badge */}
        <div className="flex items-center gap-1.5 ml-2">
          {(() => {
            let badgeColor = 'bg-neutral-100 text-neutral-700 border-neutral-300'
            let statusText = '匀速'
            if (direction === '速度为零') {
              badgeColor = 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse shadow-sm'
              statusText = '瞬时静止'
            } else if (motion === '加速') {
              badgeColor = 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
              statusText = `${direction}加速`
            } else if (motion === '减速') {
              badgeColor = 'bg-red-50 text-red-700 border-red-300 shadow-sm'
              statusText = `${direction}减速`
            } else {
              badgeColor = 'bg-red-50 text-red-700 border-red-300 shadow-sm'
              statusText = `${direction}${motion}` // 兜底
            }
            return (
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badgeColor}`}>
                {statusText}
              </span>
            )
          })()}
        </div>

        <div className="ml-auto text-neutral-400 font-semibold shrink-0">
          {motionMode === 0 ? '匀变速运动模型' : '变加速运动模型'}
        </div>
      </div>

      {/* ── 上部：v-t 图 + 一维滑轨 ── */}
      <div className="w-full flex-[3] flex flex-row gap-3">
        {/* 左：v-t 坐标系 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2 relative">
          <svg width="100%" height="100%" viewBox="0 0 500 300" preserveAspectRatio="xMidYMid meet">
            {/* 实验室网格纸底纹 */}
            <defs>
              <pattern id="vt-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke={PHYSICS_COLORS.grid} strokeWidth={0.5} opacity={OPACITY.grid} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#vt-grid)" />

            {(() => {
              const chartLeft = LAYOUT.AXIS_MARGIN
              const chartTop = 30
              const chartW = 500 - LAYOUT.AXIS_MARGIN - 30
              const chartH = 300 - 65

              const toX = (t: number) => chartLeft + (t / LAYOUT.VT_X_MAX) * chartW
              const toY = (v: number) => chartTop + chartH - ((v - vtYMin) / (vtYMax - vtYMin)) * chartH

              // 渐进式绘制
              const activeData = vtChartData.filter(p => p.x <= time)
              const vtPathD = activeData.length >= 2
                ? 'M ' + activeData.map(p => `${toX(p.x)},${toY(p.y)}`).join(' L ')
                : ''

              // 面积路径（位移几何直观）
              const vtAreaPathD = vtPathD
                ? `${vtPathD} L ${toX(time)},${toY(0)} L ${toX(0)},${toY(0)} Z`
                : ''

              // 状态点 P
              const pX = toX(time)
              const pY = toY(currentV)

              // 切线：斜率 = currentA，过 P 点
              const tangentDx = LAYOUT.TANGENT_LENGTH
              const tangentDy = currentA * (tangentDx / chartW) * LAYOUT.VT_X_MAX * (chartH / (vtYMax - vtYMin))

              return (
                <>
                  <text x={chartLeft + chartW / 2} y={16} fontSize={FONT.labelBold} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                    速度 - 时间图象 (v-t)
                  </text>

                  {/* 坐标轴 */}
                  <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartTop + chartH} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axis} />
                  <line x1={chartLeft} y1={toY(0)} x2={chartLeft + chartW} y2={toY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold} />

                  {/* X 轴刻度 */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(t => (
                    <g key={`xt-${t}`}>
                      <line x1={toX(t)} y1={toY(0) - 3} x2={toX(t)} y2={toY(0) + 3} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                      <text x={toX(t)} y={toY(0) + 14} fontSize={FONT.small} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="600">{t}</text>
                    </g>
                  ))}

                  {/* Y 轴刻度 */}
                  {yticks.map(v => (
                    <g key={`yt-${v}`}>
                      <line x1={chartLeft - 3} y1={toY(v)} x2={chartLeft} y2={toY(v)} stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
                      <text x={chartLeft - 7} y={toY(v) + 3} fontSize={FONT.small} textAnchor="end" fill={CHART_COLORS.tickLabel} fontWeight="600">{v}</text>
                    </g>
                  ))}

                  {/* 轴标签 */}
                  <text x={chartLeft + chartW - 5} y={toY(0) - 8} fontSize={FONT.annotation} fill={CHART_COLORS.labelText} fontWeight="bold">t / s</text>
                  <text x={chartLeft - 10} y={chartTop - 10} fontSize={FONT.annotation} fill={CHART_COLORS.labelText} textAnchor="end" fontWeight="bold">v / (m/s)</text>

                  {/* 位移积分面积填充 */}
                  {vtAreaPathD && (
                    <path d={vtAreaPathD} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />
                  )}

                  {/* v-t 曲线 */}
                  {vtPathD && (
                    <path d={vtPathD} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
                  )}

                  {/* 十字投影对齐虚线与读数坐标气泡 */}
                  {time > 0 && (
                    <g opacity={0.85}>
                      {/* 横向投影线 */}
                      <line x1={chartLeft} y1={pY} x2={pX} y2={pY} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.reference} strokeDasharray={DASH.projection.join(' ')} />
                      {/* 纵向投影线 */}
                      <line x1={pX} y1={toY(0)} x2={pX} y2={pY} stroke={PHYSICS_COLORS.grid} strokeWidth={STROKE.reference} strokeDasharray={DASH.projection.join(' ')} />

                      {/* X 轴读数标签背景与文字 */}
                      <rect x={pX - 16} y={toY(0) + 16} width="32" height="12" rx="3" fill="#F1F5F9" stroke={PHYSICS_COLORS.axis} strokeWidth={0.5} />
                      <text x={pX} y={toY(0) + 25} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
                        {time.toFixed(1)}s
                      </text>

                      {/* Y 轴读数标签背景与文字 */}
                      <rect x={chartLeft - 38} y={pY - 6} width="34" height="12" rx="3" fill="#EFF6FF" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={0.5} />
                      <text x={chartLeft - 21} y={pY + 3} fontSize={8} fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
                        {currentV.toFixed(1)}
                      </text>
                    </g>
                  )}

                  {/* ── 动态直角定义三角形 (a = Δv/Δt) ── */}
                  {slopeTriangleData && (
                    <g>
                      {(() => {
                        const { tPrev, vPrev } = slopeTriangleData
                        const xPrev = toX(tPrev)
                        const yPrev = toY(vPrev)
                        const xCorner = pX
                        const yCorner = yPrev
                        const deltaV = currentV - vPrev
                        const dTSpan = time - tPrev

                        return (
                          <g opacity={0.9}>
                            {/* 水平边 Δt */}
                            <line x1={xPrev} y1={yPrev} x2={xCorner} y2={yCorner} stroke={PHYSICS_COLORS.labelTextLight} strokeWidth={STROKE.chartSub} strokeDasharray={DASH.tangent.join(' ')} />
                            {/* 垂直边 Δv (高亮红色，对应加速度) */}
                            <line x1={xCorner} y1={yCorner} x2={pX} y2={pY} stroke={PHYSICS_COLORS.acceleration} strokeWidth={STROKE.chartMain} />
                            
                            {/* 标注时间差 Δt */}
                            <text x={(xPrev + xCorner) / 2} y={yCorner + (yCorner > pY ? 12 : -6)} fontSize={8} fill={PHYSICS_COLORS.labelTextLight} textAnchor="middle" fontWeight="bold">
                              Δt={dTSpan.toFixed(1)}s
                            </text>
                            {/* 标注速度差 Δv */}
                            <text x={xCorner + 6} y={(yCorner + pY) / 2 + 3} fontSize={8} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
                              Δv={deltaV > 0 ? '+' : ''}{deltaV.toFixed(1)}m/s
                            </text>

                            {/* 斜边弦线 (连接两点) */}
                            <line x1={xPrev} y1={yPrev} x2={pX} y2={pY} stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.chartSub} />
                          </g>
                        )
                      })()}
                    </g>
                  )}

                  {/* 状态点 P */}
                  <circle cx={pX} cy={pY} r={LAYOUT.POINT_RADIUS} fill={PHYSICS_COLORS.velocity} stroke="white" strokeWidth={2} />

                  {/* 切线（斜率指示器） */}
                  {time > 0 && (
                    <line
                      x1={pX - tangentDx}
                      y1={pY + tangentDy}
                      x2={pX + tangentDx}
                      y2={pY - tangentDy}
                      stroke={PHYSICS_COLORS.acceleration}
                      strokeWidth={STROKE.chartRef}
                      strokeDasharray={DASH.reference.join(' ')}
                      opacity={0.7}
                    />
                  )}

                  {/* 标注：当前斜率 (即瞬时加速度) */}
                  {time > 0 && (
                    <text x={pX + 8} y={pY - tangentDy * 0.5 - 6} fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
                      斜率 k = {currentA.toFixed(2)}
                    </text>
                  )}
                </>
              )
            })()}
          </svg>
          {/* 转向点高亮提示气泡 */}
          {showTurnWarning && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-lg border border-amber-600 animate-bounce">
              ⚠️ 转向点：此时速度 v = 0，但加速度 a = {currentA.toFixed(1)} m/s²！
            </div>
          )}
        </div>

        {/* 右：一维数轴运动演示 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2">
          <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
            {/* 实验网格底纹 */}
            <rect width="100%" height="100%" fill="url(#vt-grid)" />

            {(() => {
              const axisY = 150
              const axisLeft = 40
              const axisRight = 360
              const axisLen = axisRight - axisLeft
              const dotPixelX = axisLeft + (dotX * axisLen)

              // 速度矢量长度
              const vArrowLen = currentV * LAYOUT.VECTOR_V_SCALE
              const clampedVLen = Math.sign(vArrowLen) * Math.min(Math.abs(vArrowLen), axisLen * 0.4)

              // 加速度矢量长度
              const aArrowLen = currentA * LAYOUT.VECTOR_A_SCALE
              const clampedALen = Math.sign(aArrowLen) * Math.min(Math.abs(aArrowLen), axisLen * 0.3)

              return (
                <>
                  <text x={200} y={20} fontSize={FONT.labelBold} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                    一维滑轨实验
                  </text>

                  {/* 精密滑轨槽（代替单线数轴，工程制图风格） */}
                  <rect x={axisLeft - 10} y={axisY - 6} width={axisLen + 20} height="12" rx="4" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth={1} />
                  <line x1={axisLeft} y1={axisY} x2={axisRight} y2={axisY} stroke="#94A3B8" strokeWidth={1} strokeDasharray="5 3" />

                  {/* 原点标记 */}
                  <line x1={axisLeft + axisLen * axisCenter} y1={axisY - 12} x2={axisLeft + axisLen * axisCenter} y2={axisY + 12} stroke={CHART_COLORS.axisLine} strokeWidth={2} />
                  <text x={axisLeft + axisLen * axisCenter} y={axisY + 24} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle" fontWeight="bold">0m</text>

                  {/* 正方向标记（固定：向右为正） */}
                  <text x={axisRight + 12} y={axisY + 4} fontSize={FONT.small} fill={CHART_COLORS.labelText} fontWeight="bold">
                    → 正
                  </text>

                  {/* 滑轨测距刻度尺 */}
                  {[-40, -20, 20, 40].map(s => {
                    const nx = axisCenter + (s / maxDisplacement) * axisRange
                    if (nx < 0 || nx > 1) return null
                    const px = axisLeft + nx * axisLen
                    return (
                      <g key={`tick-${s}`}>
                        <line x1={px} y1={axisY - 10} x2={px} y2={axisY + 10} stroke="#64748B" strokeWidth={1.5} />
                        <text x={px} y={axisY + 22} fontSize={8} textAnchor="middle" fill={CHART_COLORS.tickLabel} fontWeight="bold">{s}m</text>
                      </g>
                    )
                  })}

                  {/* 历史轨迹拖尾投影 (科学频闪痕迹) */}
                  {trailPoints.map((tp) => (
                    <g key={tp.key} opacity={tp.opacity}>
                      <circle cx={tp.x * axisLen + axisLeft} cy={axisY} r={LAYOUT.DOT_RADIUS - 2} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
                      <line x1={tp.x * axisLen + axisLeft - 4} y1={axisY} x2={tp.x * axisLen + axisLeft + 4} y2={axisY} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={0.5} />
                      <line x1={tp.x * axisLen + axisLeft} y1={axisY - 4} x2={tp.x * axisLen + axisLeft} y2={axisY + 4} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={0.5} />
                    </g>
                  ))}

                  {/* 十字准星精密刻度盘质点 */}
                  <g transform={`translate(${dotPixelX}, ${axisY})`}>
                    {/* 双层轮毂圆环 */}
                    <circle cx="0" cy="0" r={LAYOUT.DOT_RADIUS} fill={PHYSICS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
                    <circle cx="0" cy="0" r={4} fill="none" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
                    {/* 十字准星 */}
                    <line x1="-10" y1="0" x2="10" y2="0" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
                    <line x1="0" y1="-10" x2="0" y2="10" stroke={PHYSICS_COLORS.objectStroke} strokeWidth={1} />
                  </g>
                  {/* 滑块当前位置数值泡 */}
                  <text x={dotPixelX} y={axisY - 16} fontSize={9} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                    s = {currentS.toFixed(1)}m
                  </text>

                  {/* 速度矢量 v (蓝色，主矢量) */}
                  {Math.abs(currentV) > 0.05 && (
                    <g>
                      <line
                        x1={dotPixelX}
                        y1={axisY - 32}
                        x2={dotPixelX + clampedVLen}
                        y2={axisY - 32}
                        stroke={PHYSICS_COLORS.velocity}
                        strokeWidth={STROKE.vectorMain}
                        markerEnd="url(#arrowhead-adv-v)"
                      />
                      {/* 标注：v⃗ */}
                      <text
                        x={dotPixelX + clampedVLen + (currentV > 0 ? 8 : -14)}
                        y={axisY - 28}
                        fontSize={FONT.bodySize}
                        fill={PHYSICS_COLORS.velocity}
                        fontWeight="bold"
                      >
                        v⃗
                      </text>
                    </g>
                  )}

                  {/* 加速度矢量 a (红色，代表受力/改变量) */}
                  {Math.abs(currentA) > 0.05 && (
                    <g>
                      <line
                        x1={dotPixelX}
                        y1={axisY + 32}
                        x2={dotPixelX + clampedALen}
                        y2={axisY + 32}
                        stroke={PHYSICS_COLORS.acceleration}
                        strokeWidth={STROKE.vectorMain}
                        markerEnd="url(#arrowhead-adv-a)"
                      />
                      {/* 标注：a⃗ */}
                      <text
                        x={dotPixelX + clampedALen + (currentA > 0 ? 8 : -14)}
                        y={axisY + 36}
                        fontSize={FONT.bodySize}
                        fill={PHYSICS_COLORS.acceleration}
                        fontWeight="bold"
                      >
                        a⃗
                      </text>
                    </g>
                  )}

                  {/* 运动状态文字标签 */}
                  <text x={200} y={270} fontSize={FONT.labelBold} fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
                    物理状态：
                    <tspan fill={direction === '速度为零' ? '#D97706' : (motion === '加速' ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration)}>
                      {direction === '速度为零' ? '瞬时静止' : `${direction} — ${motion}`}
                    </tspan>
                  </text>

                  <defs>
                    <marker id="arrowhead-adv-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
                    </marker>
                    <marker id="arrowhead-adv-a" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.acceleration} />
                    </marker>
                  </defs>
                </>
              )
            })()}
          </svg>
        </div>
      </div>

      {/* ── 下部：动画控制栏 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-md p-2">
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
