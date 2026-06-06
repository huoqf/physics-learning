import { useCanvasSize } from '@/utils'
import { useEffect, useMemo } from 'react'
import { useAnimationStore } from '@/stores'
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

/**
 * 匀变速直线运动 · 进阶模式 CenterExtra
 *
 * 布局参考公式推导页面（Discovery）：
 * - 上半部分：左侧频闪数据表 + 右侧 v-t 图（含公式推导在 v-t 图下方）
 * - 下半部分：频闪虚影动画
 * - 最底部：AnimationControls
 */
export default function UniformAccelerationCenterExtra() {
  const { params, time, isPlaying, speed, showVectors, setIsPlaying, setTime, setSpeed } = useAnimationStore()

  const { v0 = 0, a = 1.5, flashPeriod = 1 } = params
  const physics = useUniformAccelerationPhysics(v0, a, time, flashPeriod)

  const T = flashPeriod
  const deltaX = a * T * T
  const vAtHalfT = (v0 + physics.v) / 2

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* ── 信息条 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-md px-4 py-2 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded shrink-0" style={{ backgroundColor: PHYSICS_COLORS.displacement }} />
          <span className="text-neutral-600">Δx = aT² = {deltaX.toFixed(3)} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded shrink-0" style={{ backgroundColor: PHYSICS_COLORS.averageVelocity }} />
          <span className="text-neutral-600">v(t/2) = {vAtHalfT.toFixed(2)} m/s</span>
        </div>
        <span className="text-neutral-500">T = {T.toFixed(1)}s</span>
      </div>

      {/* ── 上半部分：表格 + v-t图(含推导) 并列 ── */}
      <div className="w-full flex-[3] flex flex-row gap-2">
        {/* 左侧：频闪数据表 */}
        <div className="w-[35%] bg-white rounded-xl shadow-md overflow-hidden">
          <FlashDataTable flashPoints={physics.flashPoints} a={a} T={T} />
        </div>
        {/* 右侧：v-t 图 + 公式推导 */}
        <div className="flex-1 bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
          <div className="flex-[3]">
            <VtChartWithArea v0={v0} a={a} time={time} physics={physics} />
          </div>
          <div className="flex-1 border-t border-neutral-100 px-4 py-2">
            <DerivationPanel v0={v0} a={a} time={time} physics={physics} T={T} />
          </div>
        </div>
      </div>

      {/* ── 下半部分：频闪虚影动画 ── */}
      <div className="w-full flex-[2] bg-white rounded-xl shadow-md overflow-hidden">
        <StroboscopicAnimation v0={v0} a={a} physics={physics} showVectors={showVectors} flashPeriod={flashPeriod} />
      </div>

      {/* ── 动画控制栏 ── */}
      <div className="w-full shrink-0 bg-white rounded-xl shadow-md p-2">
        <AnimationControls
          isPlaying={isPlaying}
          speed={speed}
          time={time}
          maxTime={30}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onReset={() => setTime(0)}
          onSpeedChange={setSpeed}
          onTimeChange={setTime}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 子组件：频闪虚影动画
// ═══════════════════════════════════════════════════════════════
function StroboscopicAnimation({
  v0, a, physics, showVectors, flashPeriod,
}: {
  v0: number; a: number
  physics: ReturnType<typeof useUniformAccelerationPhysics>
  showVectors: boolean
  flashPeriod: number
}) {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 200 })

  const padding = canvasSize.width * 0.08
  const groundY = canvasSize.height * 0.72
  const objW = canvasSize.width * 0.06
  const objH = objW * 0.7
  const fontSize = Math.max(10, canvasSize.width * 0.02)

  const maxS = useMemo(() => {
    const endS = Math.abs(calculateAcceleratedMotion(v0, a, 8).s)
    return Math.max(endS, 10) * 1.2
  }, [v0, a])
  const scale = (canvasSize.width - 2 * padding) / (2 * maxS)
  const originX = canvasSize.width * 0.3

  const currentX = originX + physics.s * scale

  // 小车跑出画布后自动暂停
  const { setIsPlaying } = useAnimationStore()
  const isOffscreen = currentX > canvasSize.width - padding + objW || currentX < padding - objW
  useEffect(() => {
    if (isOffscreen && physics.s !== 0) {
      setIsPlaying(false)
    }
  }, [isOffscreen, physics.s, setIsPlaying])

  const flashGhosts = useMemo(() => {
    return physics.flashPoints.map((pt, i) => {
      const px = originX + pt.displacement * scale
      const opacity = 0.15 + 0.4 * (i / Math.max(physics.flashPoints.length - 1, 1))
      return { px, opacity, index: i }
    })
  }, [physics.flashPoints, originX, scale])

  const deltaAnnotations = useMemo(() => {
    const annotations: { x1: number; x2: number; deltaX: number; label: string }[] = []
    const pts = physics.flashPoints
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].displacement - pts[i - 1].displacement
      annotations.push({
        x1: originX + pts[i - 1].displacement * scale,
        x2: originX + pts[i].displacement * scale,
        deltaX: dx,
        label: `Δx${i}`,
      })
    }
    return annotations.slice(-6)
  }, [physics.flashPoints, originX, scale])

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-white rounded-lg">
        {/* 地面线 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />

        {/* 频闪说明 */}
        <text x={padding} y={fontSize + 2} fontSize={fontSize * 0.8} fill={PHYSICS_COLORS.labelTextLight}>
          频闪虚影：每隔 T={flashPeriod.toFixed(1)}s 记录一次位置
        </text>

        {/* 原点标记 */}
        <line x1={originX} y1={groundY - objH * 2} x2={originX} y2={groundY + 4} stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axisBold} strokeDasharray={DASH.boundary.join(',')} />
        <text x={originX} y={groundY + fontSize + 4} fontSize={fontSize * 0.8} fill={PHYSICS_COLORS.axis} textAnchor="middle">0</text>

        {/* 频闪虚影 */}
        {flashGhosts.map((ghost) => (
          <g key={`ghost-${ghost.index}`} opacity={ghost.opacity}>
            <rect
              x={ghost.px}
              y={groundY - objH}
              width={objW}
              height={objH}
              rx={4}
              fill={PHYSICS_COLORS.objectFill}
              opacity={0.3}
              stroke={PHYSICS_COLORS.objectStroke}
              strokeWidth={1}
            />
          </g>
        ))}

        {/* 逐差法测量尺 */}
        {deltaAnnotations.map((ann, i) => {
          const y = groundY + 12 + (i % 3) * 12
          return (
            <g key={`delta-${i}`}>
              <line x1={ann.x1} y1={y} x2={ann.x2} y2={y} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
              <line x1={ann.x1} y1={y - 3} x2={ann.x1} y2={y + 3} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
              <line x1={ann.x2} y1={y - 3} x2={ann.x2} y2={y + 3} stroke={PHYSICS_COLORS.displacement} strokeWidth={STROKE.vectorThin} />
              <text x={(ann.x1 + ann.x2) / 2} y={y - 3} fontSize={7} fill={PHYSICS_COLORS.displacement} textAnchor="middle">
                {ann.label}={ann.deltaX.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* 当前物体 */}
        <g transform={`translate(${currentX}, ${groundY - objH})`}>
          <rect width={objW} height={objH} rx={4} fill={PHYSICS_COLORS.objectFill} stroke={PHYSICS_COLORS.objectStroke} strokeWidth={STROKE.objectLine} />
          <rect x={objW * 0.6} y={objH * 0.1} width={objW * 0.35} height={objH * 0.4} rx={2} fill={PHYSICS_COLORS.grid} />
          <circle cx={objW * 0.2} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
          <circle cx={objW * 0.8} cy={objH - 2} r={objH * 0.12} fill={PHYSICS_COLORS.labelText} />
        </g>

        {/* 速度矢量 */}
        {showVectors && Math.abs(physics.v) > 0.1 && (
          <g>
            <line
              x1={currentX + (physics.v > 0 ? objW + 4 : -4)}
              y1={groundY - objH * 0.5}
              x2={currentX + (physics.v > 0 ? objW + 4 : -4) + physics.v * scale * 0.15}
              y2={groundY - objH * 0.5}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrowhead-adv-v)"
            />
            <text x={currentX + (physics.v > 0 ? objW + 8 : -8) + physics.v * scale * 0.15} y={groundY - objH * 0.5 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v</text>
          </g>
        )}

        {/* 加速度矢量 */}
        {showVectors && Math.abs(a) > 0.05 && (
          <g>
            <line
              x1={currentX + objW * 0.5}
              y1={groundY - objH - 6}
              x2={currentX + objW * 0.5 + a * scale * 0.12}
              y2={groundY - objH - 6}
              stroke={PHYSICS_COLORS.acceleration}
              strokeWidth={STROKE.vectorSub}
              markerEnd="url(#arrowhead-adv-a)"
            />
            <text x={currentX + objW * 0.5 + a * scale * 0.12 + 6} y={groundY - objH - 6 + fontSize * 0.35} fontSize={fontSize} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">a</text>
          </g>
        )}

        <defs>
          <marker id="arrowhead-adv-v" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={PHYSICS_COLORS.velocity} />
          </marker>
          <marker id="arrowhead-adv-a" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={PHYSICS_COLORS.acceleration} />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 子组件：v-t 图 + 面积
// ═══════════════════════════════════════════════════════════════
function VtChartWithArea({
  v0, a, time, physics,
}: {
  v0: number; a: number; time: number
  physics: ReturnType<typeof useUniformAccelerationPhysics>
}) {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 250 })

  const padding = canvasSize.width * 0.12
  const chartLeft = padding
  const chartRight = canvasSize.width - padding * 0.5
  const chartTop = 24
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

  const flashDots = useMemo(() => {
    return physics.flashPoints.map(pt => ({
      x: toX(pt.time),
      y: toY(pt.velocity),
    }))
  }, [physics.flashPoints, toX, toY])

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
        <text x={canvasSize.width / 2} y={14} fontSize={11} fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">v-t 图</text>

        {/* 坐标轴 */}
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
        <line x1={chartLeft} y1={toY(0)} x2={chartRight} y2={toY(0)} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

        {/* 刻度 */}
        {xticks.map(t => (
          <g key={`xt-${t}`}>
            <line x1={toX(t)} y1={toY(0) - 3} x2={toX(t)} y2={toY(0) + 3} stroke={CHART_COLORS.tickMark} />
            <text x={toX(t)} y={toY(0) + 12} fontSize={8} textAnchor="middle" fill={CHART_COLORS.tickLabel}>{t}</text>
          </g>
        ))}
        {yticks.map(vel => (
          <g key={`yt-${vel}`}>
            <line x1={chartLeft - 3} y1={toY(vel)} x2={chartLeft} y2={toY(vel)} stroke={CHART_COLORS.tickMark} />
            <text x={chartLeft - 6} y={toY(vel) + 3} fontSize={8} textAnchor="end" fill={CHART_COLORS.tickLabel}>{vel}</text>
          </g>
        ))}

        {/* 面积填充 */}
        {areaPath && <path d={areaPath} fill={VT_CHART_COLORS.areaShade} opacity={0.25} />}

        {/* v-t 曲线 */}
        {vtPath && <path d={vtPath} fill="none" stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.chartMain} />}

        {/* 频闪时刻点 */}
        {flashDots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r={3} fill={PHYSICS_COLORS.referencePoint} />
        ))}

        {/* v(t/2) 标注：中间时刻速度 = 平均速度 */}
        {time > 0 && time <= VT_X_MAX && (() => {
          const halfT = time / 2
          const { v: vHalf } = calculateAcceleratedMotion(v0, a, halfT)
          const avgV = (v0 + calculateAcceleratedMotion(v0, a, time).v) / 2
          const hx = toX(halfT)
          const hy = toY(vHalf)
          return (
            <g>
              {/* 中间时刻竖线 */}
              <line x1={hx} y1={chartTop} x2={hx} y2={chartBottom} stroke={PHYSICS_COLORS.averageVelocity} strokeWidth={1} strokeDasharray={DASH.guide.join(',')} opacity={0.6} />
              {/* v(t/2) 点 */}
              <circle cx={hx} cy={hy} r={4} fill={PHYSICS_COLORS.averageVelocity} />
              {/* v₀ 和 v 的中点水平虚线 */}
              <line x1={toX(0)} y1={toY(avgV)} x2={toX(time)} y2={toY(avgV)} stroke={PHYSICS_COLORS.averageVelocity} strokeWidth={1} strokeDasharray={DASH.guide.join(',')} opacity={0.4} />
              {/* 标注文字 */}
              <text x={hx + 6} y={hy - 6} fontSize={9} fill={PHYSICS_COLORS.averageVelocity} fontWeight="bold">
                v(t/2)={vHalf.toFixed(1)}
              </text>
              <text x={hx + 6} y={hy + 10} fontSize={8} fill={PHYSICS_COLORS.averageVelocity} opacity={0.8}>
                = v̄={avgV.toFixed(1)}
              </text>
            </g>
          )
        })()}

        {/* 当前时刻竖线 */}
        {time > 0 && time <= VT_X_MAX && (
          <line x1={toX(time)} y1={chartTop} x2={toX(time)} y2={chartBottom} stroke={PHYSICS_COLORS.velocity} strokeWidth={STROKE.reference} strokeDasharray={DASH.guide.join(',')} opacity={0.5} />
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
  physics: ReturnType<typeof useUniformAccelerationPhysics>
  T: number
}) {
  const { v, s } = calculateAcceleratedMotion(v0, a, time)
  const deltaX = a * T * T

  return (
    <div className="flex flex-row gap-4 text-xs">
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-neutral-500 mb-1">逐差法</p>
        <p className="font-mono text-neutral-700">
          Δx = aT² = {a}×{T}² = <span className="font-bold" style={{ color: PHYSICS_COLORS.displacement }}>{deltaX.toFixed(3)} m</span>
        </p>
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-neutral-500 mb-1">速度公式</p>
        <p className="font-mono text-neutral-700">
          v = v₀+at = {v0}+{a}×{time.toFixed(1)} = <span className="font-bold" style={{ color: PHYSICS_COLORS.velocity }}>{v.toFixed(2)} m/s</span>
        </p>
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-neutral-500 mb-1">位移公式</p>
        <p className="font-mono text-neutral-700">
          x = v₀t+½at² = <span className="font-bold" style={{ color: PHYSICS_COLORS.displacement }}>{s.toFixed(2)} m</span>
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 子组件：频闪数据表
// ═══════════════════════════════════════════════════════════════
function FlashDataTable({
  flashPoints, a, T,
}: {
  flashPoints: { time: number; velocity: number; displacement: number }[]
  a: number; T: number
}) {
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
    <div className="w-full h-full flex flex-col p-3 overflow-auto">
      <p className="text-xs font-semibold text-neutral-700 mb-2">频闪数据记录表</p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-300">
            <th className="py-1 px-1 text-left font-semibold text-neutral-700">t(s)</th>
            <th className="py-1 px-1 text-right font-semibold text-neutral-700">v(m/s)</th>
            <th className="py-1 px-1 text-right font-semibold text-neutral-700">x(m)</th>
            <th className="py-1 px-1 text-right font-semibold text-neutral-700">Δx(m)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const globalIndex = flashPoints.length - rows.length + i
            const isCurrent = globalIndex === lastIndex
            const dx = deltaValues[globalIndex]
            return (
              <tr key={i} className={`border-b border-neutral-100 ${isCurrent ? 'bg-blue-50' : ''}`}>
                <td className={`py-1 px-1 font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.time.toFixed(1)}</td>
                <td className={`py-1 px-1 text-right font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.velocity.toFixed(2)}</td>
                <td className={`py-1 px-1 text-right font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.displacement.toFixed(2)}</td>
                <td className="py-1 px-1 text-right font-mono text-neutral-500">{dx !== undefined ? dx.toFixed(3) : '-'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* 逐差法验证 */}
      {deltaValues.length >= 2 && (
        <div className="mt-auto pt-2 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-500 mb-1">逐差法验证</p>
          <p className="text-xs font-mono">
            理论 Δx = <span className="font-bold" style={{ color: PHYSICS_COLORS.displacement }}>{(a * T * T).toFixed(3)}</span> m
            {Math.abs(deltaValues.reduce((s, d) => s + d, 0) / deltaValues.length - a * T * T) < 0.001
              ? <span className="text-green-600 ml-2">✓</span>
              : <span className="text-neutral-400 ml-2">计算中...</span>}
          </p>
        </div>
      )}
    </div>
  )
}
