import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { calculateAcceleratedMotion, calculateVariableAccelerationMotion, determineMotionState } from '@/physics'
import { PHYSICS_COLORS, CHART_COLORS, VT_CHART_COLORS, STROKE, DASH, FONT } from '@/theme/physics'
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
 * 上部左：v-t 坐标系 + 动态图线 + 状态点 + 切线（4 元素 / 3 标注）
 * 上部右：一维数轴运动演示 + v 矢量 + a 矢量（3 元素 / 2 标注）
 * 下部：动画控制栏
 * 合计 7 元素 / 5 标注
 */
export default function AccelerationCenterExtra() {
  const { params, time, isPlaying, speed, setIsPlaying, setTime, setSpeed } = useAnimationStore()

  const v0 = params.v0 ?? 0
  const a = params.a ?? 2
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
  const currentS = useMemo(() => {
    if (motionMode === 0) {
      const result = calculateAcceleratedMotion(v0, a, time)
      return result.s
    } else {
      const k = Math.abs(a) / 10
      const result = calculateVariableAccelerationMotion(v0, a, k, time)
      return result.s
    }
  }, [v0, a, motionMode, time])
  const normalizedS = currentS !== 0 ? Math.sign(currentS) * Math.min(Math.abs(currentS) / maxDisplacement, 1) : 0
  const dotX = axisCenter + normalizedS * axisRange

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* ── 信息条 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-md px-4 py-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded shrink-0" style={{ backgroundColor: PHYSICS_COLORS.velocity }} />
          <span className="text-neutral-600">v = {currentV.toFixed(2)} m/s</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded shrink-0" style={{ backgroundColor: PHYSICS_COLORS.acceleration }} />
          <span className="text-neutral-600">a = {currentA.toFixed(2)} m/s²</span>
        </div>
        <span className="text-neutral-500">{direction}→{motion}</span>
        <div className="ml-auto text-neutral-400 shrink-0">
          {motionMode === 0 ? '匀变速' : '变加速'}
        </div>
      </div>

      {/* ── 上部：v-t 图 + 数轴 ── */}
      <div className="w-full flex-[3] flex flex-row gap-3">
        {/* 左：v-t 坐标系 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2">
          <svg width="100%" height="100%" viewBox="0 0 500 300" preserveAspectRatio="xMidYMid meet">
            {(() => {
              const chartLeft = LAYOUT.AXIS_MARGIN
              const chartTop = 25
              const chartW = 500 - LAYOUT.AXIS_MARGIN - 30
              const chartH = 300 - 55

              const toX = (t: number) => chartLeft + (t / LAYOUT.VT_X_MAX) * chartW
              const toY = (v: number) => chartTop + chartH - ((v - vtYMin) / (vtYMax - vtYMin)) * chartH

              // 渐进式绘制
              const activeData = vtChartData.filter(p => p.x <= time)
              const vtPathD = activeData.length >= 2
                ? 'M ' + activeData.map(p => `${toX(p.x)},${toY(p.y)}`).join(' L ')
                : ''

              // 面积路径
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
                  <text x={chartLeft + chartW / 2} y={16} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                    v-t 图象
                  </text>

                  {/* 坐标轴 */}
                  <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartTop + chartH} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
                  <line x1={chartLeft} y1={toY(0)} x2={chartLeft + chartW} y2={toY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

                  {/* X 刻度 */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(t => (
                    <g key={`xt-${t}`}>
                      <line x1={toX(t)} y1={toY(0) - 4} x2={toX(t)} y2={toY(0) + 4} stroke={CHART_COLORS.tickMark} />
                      <text x={toX(t)} y={toY(0) + 16} fontSize={9} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
                    </g>
                  ))}

                  {/* Y 刻度 */}
                  {yticks.map(v => (
                    <g key={`yt-${v}`}>
                      <line x1={chartLeft - 4} y1={toY(v)} x2={chartLeft} y2={toY(v)} stroke={CHART_COLORS.tickMark} />
                      <text x={chartLeft - 8} y={toY(v) + 3} fontSize={9} textAnchor="end" fill={CHART_COLORS.tickLabel}>{v}</text>
                    </g>
                  ))}

                  {/* 轴标签 */}
                  <text x={chartLeft + chartW / 2} y={chartTop + chartH + 28} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText}>t/s</text>
                  <text x={chartLeft - 30} y={chartTop + chartH / 2} fontSize={10} textAnchor="middle" fill={CHART_COLORS.labelText} transform={`rotate(-90, ${chartLeft - 30}, ${chartTop + chartH / 2})`}>v/(m·s⁻¹)</text>

                  {/* 面积填充 */}
                  {vtAreaPathD && (
                    <path d={vtAreaPathD} fill={VT_CHART_COLORS.areaShade} opacity={0.2} />
                  )}

                  {/* v-t 曲线 */}
                  {vtPathD && (
                    <path d={vtPathD} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />
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

                  {/* 标注：斜率 k */}
                  {time > 0 && (
                    <text x={pX + tangentDx + 4} y={pY - tangentDy - 4} fontSize={FONT.small} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">
                      k={currentA.toFixed(1)}
                    </text>
                  )}

                  {/* 标注：t, v */}
                  <text x={chartLeft + chartW + 4} y={toY(0) + 4} fontSize={FONT.small} fill={CHART_COLORS.labelText}>t</text>
                  <text x={chartLeft - 4} y={chartTop - 6} fontSize={FONT.small} fill={CHART_COLORS.labelText}>v</text>
                </>
              )
            })()}
          </svg>
        </div>

        {/* 右：一维数轴运动演示 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden p-2">
          <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
            {(() => {
              const axisY = 160
              const axisLeft = 40
              const axisRight = 360
              const axisLen = axisRight - axisLeft
              const dotPixelX = axisLeft + (dotX * axisLen)

              // 速度矢量
              const vArrowLen = currentV * LAYOUT.VECTOR_V_SCALE
              const clampedVLen = Math.sign(vArrowLen) * Math.min(Math.abs(vArrowLen), axisLen * 0.4)

              // 加速度矢量
              const aArrowLen = currentA * LAYOUT.VECTOR_A_SCALE
              const clampedALen = Math.sign(aArrowLen) * Math.min(Math.abs(aArrowLen), axisLen * 0.3)

              return (
                <>
                  <text x={200} y={20} fontSize={FONT.axis} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
                    一维数轴运动
                  </text>

                  {/* 数轴 */}
                  <line x1={axisLeft} y1={axisY} x2={axisRight} y2={axisY} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
                  {/* 原点标记 */}
                  <line x1={axisLeft + axisLen * axisCenter} y1={axisY - 8} x2={axisLeft + axisLen * axisCenter} y2={axisY + 8} stroke={CHART_COLORS.axisLine} strokeWidth={2} />
                  <text x={axisLeft + axisLen * axisCenter} y={axisY + 22} fontSize={FONT.small} fill={CHART_COLORS.labelText} textAnchor="middle">0</text>

                  {/* 正方向标记（固定：向右为正） */}
                  <text x={axisRight + 8} y={axisY + 4} fontSize={FONT.small} fill={CHART_COLORS.labelText}>
                    →正
                  </text>

                  {/* 位移刻度 */}
                  {[-40, -20, 20, 40].map(s => {
                    const nx = axisCenter + (s / maxDisplacement) * axisRange
                    if (nx < 0 || nx > 1) return null
                    const px = axisLeft + nx * axisLen
                    return (
                      <g key={`tick-${s}`}>
                        <line x1={px} y1={axisY - 4} x2={px} y2={axisY + 4} stroke={CHART_COLORS.tickMark} />
                        <text x={px} y={axisY + 18} fontSize={8} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{s}m</text>
                      </g>
                    )
                  })}

                  {/* 质点 */}
                  <circle
                    cx={dotPixelX}
                    cy={axisY}
                    r={LAYOUT.DOT_RADIUS}
                    fill={PHYSICS_COLORS.objectFill}
                    stroke={PHYSICS_COLORS.objectStroke}
                    strokeWidth={STROKE.objectLine}
                  />

                  {/* 速度矢量 v */}
                  {Math.abs(currentV) > 0.1 && (
                    <g>
                      <line
                        x1={dotPixelX}
                        y1={axisY - 24}
                        x2={dotPixelX + clampedVLen}
                        y2={axisY - 24}
                        stroke={PHYSICS_COLORS.velocity}
                        strokeWidth={STROKE.vectorMain}
                        markerEnd="url(#arrowhead-adv-v)"
                      />
                      {/* 标注：v⃗ */}
                      <text
                        x={dotPixelX + clampedVLen + (currentV > 0 ? 8 : -16)}
                        y={axisY - 20}
                        fontSize={FONT.bodySize}
                        fill={PHYSICS_COLORS.velocity}
                        fontWeight="bold"
                      >
                        v⃗
                      </text>
                    </g>
                  )}

                  {/* 加速度矢量 a */}
                  {Math.abs(currentA) > 0.1 && (
                    <g>
                      <line
                        x1={dotPixelX}
                        y1={axisY + 24}
                        x2={dotPixelX + clampedALen}
                        y2={axisY + 24}
                        stroke={PHYSICS_COLORS.acceleration}
                        strokeWidth={STROKE.vectorMain * 1.5}
                        markerEnd="url(#arrowhead-adv-a)"
                      />
                      {/* 标注：a⃗ */}
                      <text
                        x={dotPixelX + clampedALen + (currentA > 0 ? 8 : -16)}
                        y={axisY + 28}
                        fontSize={FONT.bodySize}
                        fill={PHYSICS_COLORS.acceleration}
                        fontWeight="bold"
                      >
                        a⃗
                      </text>
                    </g>
                  )}

                  {/* 运动状态标注 */}
                  <text x={200} y={280} fontSize={FONT.bodySize} fill={motion === '加速' ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration} textAnchor="middle" fontWeight="bold">
                    {direction} → {motion}
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
