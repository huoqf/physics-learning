import { useCanvasSize } from '@/utils'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { KatexFormula } from '@/components/UI'
import {
  precomputeConstantPowerTrajectory,
  precomputeConstantAccelTrajectory,
  getPowerStateAtTime,
  calculateConstantPowerParams,
  calculateConstantAccelParams,
} from '@/physics/power'

/**
 * 汽车起动与图像拐点 — 功率动画（重构与美化规范版）
 *
 * 双轨模式：
 * - 基础模式（mode=0）：普通模式，仅展示 v-t / P-t，精简滑块，隐藏干扰
 * - 进阶模式（mode=1）：进阶模式，支持 Tab 切换 F-v / a-t，展示随动公式与临界 tc 暂停
 *
 * 布局倒置：图表在上，动画在下，高度自适应动态分配
 */
export default function PowerAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
  const [chartTab, setChartTab] = useState<'vt-pt' | 'fv-at'>('vt-pt')
  const [showCriticalTip, setShowCriticalTip] = useState(false)
  const hasPausedRef = useRef(false)

  const mode = params.mode ?? 0
  const P_rated = params.P ?? 60000     // W（额定功率）
  const m = params.m ?? 2000            // kg
  const f = params.f ?? 2000            // N（阻力）
  const a_target = params.a ?? 1.5      // m/s²（进阶模式目标加速度）
  const carType = params.carType ?? 0   // 车辆类型：0=普通轿车，1=超跑，2=重卡
  const tMax = 30                        // 最大模拟时间

  // ── 预计算轨迹 ──
  const trajectory = useMemo(() => {
    if (mode === 0) {
      return precomputeConstantPowerTrajectory(P_rated, m, f, tMax)
    } else {
      return precomputeConstantAccelTrajectory(P_rated, m, f, a_target, tMax).points
    }
  }, [mode, P_rated, m, f, a_target])

  const criticalInfo = useMemo(() => {
    if (mode === 0) return null
    return calculateConstantAccelParams(P_rated, m, f, a_target)
  }, [mode, P_rated, m, f, a_target])

  // ── 当前状态 ──
  const state = useMemo(
    () => getPowerStateAtTime(trajectory, time),
    [trajectory, time]
  )

  // ── 临界点 tc/vc 自动微暂停控制 ──
  useEffect(() => {
    if (time < 0.05) {
      hasPausedRef.current = false
      setShowCriticalTip(false)
    }
  }, [time])

  useEffect(() => {
    if (mode === 1 && criticalInfo && isPlaying) {
      const tc = criticalInfo.t_c
      if (time >= tc && !hasPausedRef.current) {
        hasPausedRef.current = true
        setIsPlaying(false)
        setShowCriticalTip(true)
        const timer = setTimeout(() => {
          setIsPlaying(true)
          setShowCriticalTip(false)
        }, 800)
        return () => clearTimeout(timer)
      }
    }
  }, [time, mode, criticalInfo, isPlaying, setIsPlaying])

  // ── 布局高度动态比例分配 ──
  const padding = canvasSize.width * 0.06
  const fontSize = Math.max(10, canvasSize.width * 0.016)
  const smallFont = Math.max(9, fontSize * 0.8)

  // 布局划分：上部 52% 为图表，下部 48% 为动画
  const chartTop = canvasSize.height * 0.06
  const chartBottom = canvasSize.height * 0.52
  const chartMidY = (chartTop + chartBottom) / 2
  const chartLeft = padding * 1.5
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft

  // 地平线高度移至 Canvas 下部 85% 位置
  const groundY = canvasSize.height * 0.85
  const objW = canvasSize.width * 0.08
  const objH = objW * 0.6

  // ── 小车位置与运动比例（精密自适应） ──
  const maxV = mode === 0
    ? calculateConstantPowerParams(P_rated, m, f).v_max
    : calculateConstantAccelParams(P_rated, m, f, a_target).v_max

  // 获取轨迹终点的最大物理位移 sMax
  const sMax = useMemo(() => {
    if (trajectory.length === 0) return 1
    return trajectory[trajectory.length - 1].s
  }, [trajectory])

  // 将物理最大位移 sMax 完美映射到 Canvas 的可移动宽度范围内
  const scale = useMemo(() => {
    const trackWidth = canvasSize.width - 2 * padding - objW
    return sMax > 0 ? trackWidth / sMax : 1
  }, [canvasSize.width, padding, objW, sMax])

  const carX = Math.min(padding + state.s * scale, canvasSize.width - padding - objW)

  // ── 视觉特效预计算 ──
  // 1. 发动机能量喷气（同心黄色半圆弧）
  const powerRatio = state.P / P_rated
  const wavePhase = (time * 5) % 1
  const powerWaves = [0, 1, 2].map(i => {
    const phase = (wavePhase + i / 3) % 1
    const radius = 5 + phase * 22 * (0.4 + 0.6 * powerRatio)
    const opacity = (1 - phase) * 0.85 * powerRatio
    return { radius, opacity }
  })

  // 2. 地面摩擦产热（黄红双色波纹）
  const frictionRatio = f / 5000
  const fPhase = (time * 8) % 1
  const fWaves = [0, 1].map(i => {
    const phase = (fPhase + i * 0.5) % 1
    const len = phase * 18 * (0.3 + 0.7 * (state.v / maxV))
    const opacity = (1 - phase) * 0.75 * frictionRatio
    return { len, opacity }
  })

  // 3. 动能蓄能条（动能青）
  const Ek = 0.5 * m * state.v * state.v
  const EkMax = 0.5 * m * maxV * maxV
  const ekRatio = EkMax > 0 ? Math.min(Ek / EkMax, 1) : 0

  // ── 图表曲线区域高度分配 ──
  // v-t / F-v 区域（上部）
  const vtTop = chartTop + 14
  const vtBottom = chartMidY - 10
  const vtHeight = vtBottom - vtTop

  // P-t / a-t 区域（下部）
  const ptTop = chartMidY + 14
  const ptBottom = chartBottom - 8
  const ptHeight = ptBottom - ptTop

  const vMaxLimit = maxV * 1.15
  const pMaxLimit = P_rated * 1.2

  // ── 坐标映射纯函数 ──
  const toChartX = (t: number) => chartLeft + (t / tMax) * chartWidth
  const toVtY = (v: number) => vtBottom - (v / vMaxLimit) * vtHeight
  const toPtY = (p: number) => ptBottom - (p / pMaxLimit) * ptHeight

  // 进阶 Tab X-Y 映射
  const toFvChartX = (v: number) => chartLeft + (v / vMaxLimit) * chartWidth
  const F_max_limit = Math.max(3 * f, m * a_target + f) * 1.2
  const toFvY = (F: number) => vtBottom - (F / F_max_limit) * vtHeight
  const a_max_limit = Math.max(a_target, 2.5) * 1.2
  const toAtY = (a: number) => ptBottom - (a / a_max_limit) * ptHeight

  // ── 可见轨迹 ──
  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= time + 0.02),
    [trajectory, time]
  )

  // ── 随动 KaTeX 公式 ──
  const getLiveFormula = () => {
    if (state.v < 0.05) return 'v=0'
    if (mode === 0) {
      return `F = \\frac{P}{v} = ${state.F.toFixed(0)}\\text{N}`
    }
    if (state.phase === 0) {
      return `F = ma + f = ${state.F.toFixed(0)}\\text{N}`
    } else if (state.phase === 1) {
      return `P = P_{\\text{额}} = ${(state.P / 1000).toFixed(0)}\\text{kW}`
    } else {
      return `F = f = ${f.toFixed(0)}\\text{N} \\quad (a=0)`
    }
  }

  // ── 拐点扩散波纹 ──
  const renderRipple = (centerX: number, centerY: number) => {
    if (!criticalInfo) return null
    const diff = time - criticalInfo.t_c
    if (diff >= 0 && diff < 0.8) {
      const r = 3 + diff * 35
      const opacity = 1 - diff / 0.8
      return (
        <circle
          cx={centerX}
          cy={centerY}
          r={r}
          fill="none"
          stroke={colors.accent[500]}
          strokeWidth={1.5}
          strokeOpacity={opacity}
          pointerEvents="none"
        />
      )
    }
    return null
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 进阶模式下的 Tab 切换 */}
      {mode === 1 && (
        <div className="absolute top-3 right-4 flex gap-1 z-10">
          <button
            onClick={() => setChartTab('vt-pt')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-all duration-200 ${
              chartTab === 'vt-pt'
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
            }`}
          >
            v-t / P-t 图像
          </button>
          <button
            onClick={() => setChartTab('fv-at')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-all duration-200 ${
              chartTab === 'fv-at'
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
            }`}
          >
            F-v / a-t 图像
          </button>
        </div>
      )}

      {/* 临界点微暂停提示卡片 */}
      {showCriticalTip && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300">
          <div className="bg-accent-50 border-l-4 border-accent-500 text-accent-800 p-2.5 rounded-r shadow-md flex flex-col gap-0.5 max-w-[280px]">
            <span className="font-bold text-xs">🚀 匀加速阶段结束</span>
            <span className="text-[9px] text-accent-700 leading-snug">
              功率已达额定最大值！汽车开始进入恒功率变加速阶段，牵引力 F 随速度增大而变小。
            </span>
          </div>
        </div>
      )}

      {/* 随车顶移动的实时物理公式 */}
      {state.v > 0.05 && (
        <div
          className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
          style={{
            left: `${carX + objW * 0.5}px`,
            bottom: `${canvasSize.height - groundY + objH + 12}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <KatexFormula
            formula={getLiveFormula()}
            mode="inline"
            className="text-[10px] text-primary-700 font-semibold"
          />
        </div>
      )}

      {/* 主 SVG 画面 */}
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-transparent">
        <defs>
          {/* 小车材质渐变 */}
          <linearGradient id="car-body-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.southLight} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.southMid} />
          </linearGradient>
          <linearGradient id="car-wheel-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </linearGradient>

          {/* 超跑跑车红渐变 — 引用 magnet.north 极的红色系 */}
          <linearGradient id="supercar-body-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.magnet.northLight} />
            <stop offset="100%" stopColor={SCENE_COLORS.magnet.northMid} />
          </linearGradient>
          {/* 重卡车头银金属渐变 — 引用 sliderMetal */}
          <linearGradient id="truck-head-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[1]} />
          </linearGradient>
          {/* 重卡集装箱货厢渐变 — 引用中性灰色阶 */}
          <linearGradient id="truck-cargo-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.neutral[100]} />
            <stop offset="100%" stopColor={colors.neutral[300]} />
          </linearGradient>

          {/* 规范的物理矢量箭头定义 */}
          <marker id="arrow-appliedForce" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.appliedForce} />
          </marker>
          <marker id="arrow-friction" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6 Z" fill={PHYSICS_COLORS.friction} />
          </marker>
          <marker id="arrow-velocity" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>

        {/* ══════════════════════════════════════════════ */}
        {/* 上半部分：图表区（规范坐标与曲线） */}
        {/* ══════════════════════════════════════════════ */}

        {chartTab === 'vt-pt' || mode === 0 ? (
          // ─── 视图A：v-t & P-t 图像 ───
          <g>
            {/* v-t 图表 */}
            <text x={chartLeft} y={vtTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.velocity} fontWeight="bold">v-t (速度-时间)</text>
            <line x1={chartLeft} y1={vtTop} x2={chartLeft} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={vtBottom} x2={chartRight} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            
            {/* v-t 轴刻度 */}
            {[0, 0.5, 1].map((frac, i) => {
              const vVal = maxV * frac
              const y = toVtY(vVal)
              return (
                <g key={`vt-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">{vVal.toFixed(0)}</text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const tVal = tMax * frac
              const x = toChartX(tVal)
              return (
                <g key={`vt-x-${i}`}>
                  <line x1={x} y1={vtBottom} x2={x} y2={vtBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={x} y={vtBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">{tVal.toFixed(0)}s</text>
                </g>
              )
            })}

            {/* v-t 曲线 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toVtY(p.v)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.velocity}
                strokeWidth={STROKE.chartMain}
              />
            )}
            
            {/* v-t 当前滑动点 */}
            <circle cx={toChartX(state.t)} cy={toVtY(state.v)} r={3} fill={PHYSICS_COLORS.velocity} stroke={colors.neutral[0]} strokeWidth={1} />

            {/* 临界 vc 引导虚线与波纹 */}
            {mode === 1 && criticalInfo && criticalInfo.t_c < tMax && (
              <g>
                <line
                  x1={toChartX(criticalInfo.t_c)} y1={vtTop}
                  x2={toChartX(criticalInfo.t_c)} y2={vtBottom}
                  stroke={colors.accent[600]}
                  strokeWidth={0.8}
                  strokeDasharray={DASH.guide.join(',')}
                  opacity={0.6}
                />
                <line
                  x1={chartLeft} y1={toVtY(criticalInfo.v_c)}
                  x2={toChartX(criticalInfo.t_c)} y2={toVtY(criticalInfo.v_c)}
                  stroke={colors.accent[600]}
                  strokeWidth={0.8}
                  strokeDasharray={DASH.guide.join(',')}
                  opacity={0.6}
                />
                <circle cx={toChartX(criticalInfo.t_c)} cy={toVtY(criticalInfo.v_c)} r={2} fill={colors.accent[600]} />
                <text x={toChartX(criticalInfo.t_c) + 3} y={vtTop + 9} fontSize={7} fill={colors.accent[600]} fontWeight="bold">tc 拐点</text>
                {renderRipple(toChartX(criticalInfo.t_c), toVtY(criticalInfo.v_c))}
              </g>
            )}

            {/* P-t 图表 */}
            <text x={chartLeft} y={ptTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.power} fontWeight="bold">P-t (功率-时间)</text>
            <line x1={chartLeft} y1={ptTop} x2={chartLeft} y2={ptBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={ptBottom} x2={chartRight} y2={ptBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            
            {/* P_rated 参考虚线 */}
            <line
              x1={chartLeft} y1={toPtY(P_rated)}
              x2={chartRight} y2={toPtY(P_rated)}
              stroke={PHYSICS_COLORS.power}
              strokeWidth={0.8}
              strokeDasharray={DASH.guide.join(',')}
              opacity={0.5}
            />
            <text x={chartRight + 2} y={toPtY(P_rated) + 3} fontSize={7} fill={PHYSICS_COLORS.power}>P额</text>

            {/* P-t 轴刻度 */}
            {[0, 0.5, 1].map((frac, i) => {
              const pVal = P_rated * frac
              const y = toPtY(pVal)
              return (
                <g key={`pt-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">{(pVal / 1000).toFixed(0)}kW</text>
                </g>
              )
            })}

            {/* P-t 曲线 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toPtY(p.P)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.power}
                strokeWidth={STROKE.chartMain}
              />
            )}
            <circle cx={toChartX(state.t)} cy={toPtY(state.P)} r={3} fill={PHYSICS_COLORS.power} stroke={colors.neutral[0]} strokeWidth={1} />

            {/* P-t 临界 tc 引导线 */}
            {mode === 1 && criticalInfo && criticalInfo.t_c < tMax && (
              <line
                x1={toChartX(criticalInfo.t_c)} y1={ptTop}
                x2={toChartX(criticalInfo.t_c)} y2={ptBottom}
                stroke={colors.accent[600]}
                strokeWidth={0.8}
                strokeDasharray={DASH.guide.join(',')}
                opacity={0.6}
              />
            )}
          </g>
        ) : (
          // ─── 视图B：F-v & a-t 图像（高考重点）───
          <g>
            {/* F-v 图表 */}
            <text x={chartLeft} y={vtTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold">F-v (牵引力-速度)</text>
            <line x1={chartLeft} y1={vtTop} x2={chartLeft} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={vtBottom} x2={chartRight} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* F-v 轴刻度 */}
            {[0, 0.5, 1].map((frac, i) => {
              const fVal = F_max_limit * frac
              const y = toFvY(fVal)
              return (
                <g key={`fv-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">{fVal.toFixed(0)}N</text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const vVal = vMaxLimit * frac
              const x = toFvChartX(vVal)
              return (
                <g key={`fv-x-${i}`}>
                  <line x1={x} y1={vtBottom} x2={x} y2={vtBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={x} y={vtBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">{vVal.toFixed(0)}m/s</text>
                </g>
              )
            })}

            {/* 阻力参考水平虚线 */}
            <line
              x1={chartLeft} y1={toFvY(f)}
              x2={chartRight} y2={toFvY(f)}
              stroke={PHYSICS_COLORS.friction}
              strokeWidth={0.8}
              strokeDasharray={DASH.guide.join(',')}
              opacity={0.5}
            />
            <text x={chartRight + 2} y={toFvY(f) + 3} fontSize={7} fill={PHYSICS_COLORS.friction}>阻力 f</text>

            {/* 理论完整的 F-v 背景引导双曲线与直线 */}
            <polyline
              points={trajectory.map(p => `${toFvChartX(p.v)},${toFvY(p.F)}`).join(' ')}
              fill="none"
              stroke={colors.neutral[300]}
              strokeWidth={1}
              strokeDasharray={DASH.reference.join(',')}
              opacity={0.7}
            />

            {/* 当前走过的 F-v 曲线 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toFvChartX(p.v)},${toFvY(p.F)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.appliedForce}
                strokeWidth={STROKE.chartMain}
              />
            )}
            <circle cx={toFvChartX(state.v)} cy={toFvY(state.F)} r={3} fill={PHYSICS_COLORS.appliedForce} stroke={colors.neutral[0]} strokeWidth={1} />

            {/* F-v 临界点 vc/F_const 的波纹与线 */}
            {criticalInfo && (
              <g>
                <line
                  x1={toFvChartX(criticalInfo.v_c)} y1={vtTop}
                  x2={toFvChartX(criticalInfo.v_c)} y2={vtBottom}
                  stroke={colors.accent[600]}
                  strokeWidth={0.8}
                  strokeDasharray={DASH.guide.join(',')}
                  opacity={0.6}
                />
                <circle cx={toFvChartX(criticalInfo.v_c)} cy={toFvY(criticalInfo.F_const)} r={2} fill={colors.accent[600]} />
                <text x={toFvChartX(criticalInfo.v_c) + 3} y={vtTop + 9} fontSize={7} fill={colors.accent[600]} fontWeight="bold">vc 临界速</text>
                {renderRipple(toFvChartX(criticalInfo.v_c), toFvY(criticalInfo.F_const))}
              </g>
            )}

            {/* a-t 图表 */}
            <text x={chartLeft} y={ptTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.acceleration} fontWeight="bold">a-t (加速度-时间)</text>
            <line x1={chartLeft} y1={ptTop} x2={chartLeft} y2={ptBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={ptBottom} x2={chartRight} y2={ptBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* a-t 轴刻度 */}
            {[0, 0.5, 1].map((frac, i) => {
              const aVal = a_max_limit * frac
              const y = toAtY(aVal)
              return (
                <g key={`at-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">{aVal.toFixed(1)}</text>
                </g>
              )
            })}

            {/* a-t 曲线 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toAtY(p.a)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.acceleration}
                strokeWidth={STROKE.chartMain}
              />
            )}
            <circle cx={toChartX(state.t)} cy={toAtY(state.a)} r={3} fill={PHYSICS_COLORS.acceleration} stroke={colors.neutral[0]} strokeWidth={1} />

            {/* a-t 临界 tc 引导线 */}
            {criticalInfo && (
              <line
                x1={toChartX(criticalInfo.t_c)} y1={ptTop}
                x2={toChartX(criticalInfo.t_c)} y2={ptBottom}
                stroke={colors.accent[600]}
                strokeWidth={0.8}
                strokeDasharray={DASH.guide.join(',')}
                opacity={0.6}
              />
            )}
          </g>
        )}

        {/* 隔离图表与动画区的水平分隔线 */}
        <line x1={padding * 0.5} y1={canvasSize.height * 0.55} x2={canvasSize.width - padding * 0.5} y2={canvasSize.height * 0.55} stroke={colors.neutral[200]} strokeWidth={1} />

        {/* ══════════════════════════════════════════════ */}
        {/* 下半部分：小车动画场景 */}
        {/* ══════════════════════════════════════════════ */}

        {/* 地面 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        
        {/* 场景网格辅助线（克制，只在底部地面附近装饰，不覆盖全屏） */}
        <line x1={padding * 0.5} y1={groundY + 3} x2={canvasSize.width - padding * 0.5} y2={groundY + 3} stroke={colors.neutral[200]} strokeWidth={0.5} />

        {/* 场景主标题 */}
        <text x={padding} y={canvasSize.height * 0.60} fontSize={fontSize} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {mode === 0 ? '恒定功率起动模拟' : '恒定加速度起动模拟'}
        </text>

        {/* ── 克服摩擦产热特效波纹（车轮接地点往左喷射，使用 friction 与 heatLoss） ── */}
        {state.v > 0.1 && fWaves.map((fw, idx) => {
          const w1X = carX + objW * 0.22
          const w2X = carX + objW * 0.78
          return (
            <g key={`f-wave-${idx}`} strokeOpacity={fw.opacity}>
              {/* 后轮摩擦发热线 */}
              <line
                x1={w1X}
                y1={groundY}
                x2={w1X - fw.len}
                y2={groundY - fw.len * 0.15}
                stroke={PHYSICS_COLORS.friction}
                strokeWidth={1.2}
              />
              <line
                x1={w1X}
                y1={groundY}
                x2={w1X - fw.len * 0.9}
                y2={groundY + 1.5}
                stroke={PHYSICS_COLORS.heatLoss}
                strokeWidth={0.8}
              />
              {/* 前轮摩擦发热线 */}
              <line
                x1={w2X}
                y1={groundY}
                x2={w2X - fw.len}
                y2={groundY - fw.len * 0.15}
                stroke={PHYSICS_COLORS.friction}
                strokeWidth={1.2}
              />
              <line
                x1={w2X}
                y1={groundY}
                x2={w2X - fw.len * 0.9}
                y2={groundY + 1.5}
                stroke={PHYSICS_COLORS.heatLoss}
                strokeWidth={0.8}
              />
            </g>
          )
        })}

        {/* ── 发动机做功能量波纹特效（车尾向左扩张的同心黄色圆弧） ── */}
        {state.P > 1000 && powerWaves.map((wave, idx) => (
          <path
            key={`p-wave-${idx}`}
            d={`M ${carX} ${groundY - objH * 0.8 + wave.radius * 0.4} A ${wave.radius} ${wave.radius * 0.6} 0 0 0 ${carX} ${groundY - objH * 0.2 - wave.radius * 0.4}`}
            fill="none"
            stroke={PHYSICS_COLORS.power}
            strokeWidth={1.5 + powerRatio}
            strokeOpacity={wave.opacity}
          />
        ))}

        {/* ── 小车模型 ── */}
        <g transform={`translate(${carX}, ${groundY - objH})`}>
          {carType === 1 ? (
            // 🏎️ 1. 流线型超跑跑车外观（红色系）
            <g>
              {/* 超跑流线车身 */}
              <path
                d={`M 0 ${objH - 3} L 0 ${objH * 0.48} Q ${objW * 0.15} ${objH * 0.22} ${objW * 0.35} ${objH * 0.22} L ${objW * 0.58} ${objH * 0.22} L ${objW * 0.95} ${objH * 0.65} L ${objW} ${objH - 3} Z`}
                fill="url(#supercar-body-grad)"
                stroke={SCENE_COLORS.magnet.northMid}
                strokeWidth={1.5}
              />
              {/* 超跑车窗 */}
              <path
                d={`M ${objW * 0.38} ${objH * 0.26} L ${objW * 0.56} ${objH * 0.26} L ${objW * 0.68} ${objH * 0.52} L ${objW * 0.34} ${objH * 0.52} Z`}
                fill={PHYSICS_COLORS.objectFill}
                opacity={0.8}
              />
              {/* 超跑动能蓄能电池（底盘上方） */}
              <g transform={`translate(${objW * 0.15}, ${objH * 0.70})`}>
                <rect width={objW * 0.7} height={4} rx={1} fill="none" stroke={colors.neutral[300]} strokeWidth={0.5} />
                <rect width={objW * 0.7 * ekRatio} height={4} rx={1} fill={PHYSICS_COLORS.kineticEnergy} />
                <text x={objW * 0.35} y={3.5} fontSize={5} textAnchor="middle" fill={colors.neutral[0]} fontWeight="bold" opacity={0.9}>
                  Ek
                </text>
              </g>
              {/* 跑车轮子（二轴） */}
              <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
                <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
                <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
              </g>
              <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
                <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
                <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
              </g>
            </g>
          ) : carType === 2 ? (
            // 🚛 2. 重型货架/集装箱卡车外观（三轴轮，粗犷结构）
            <g>
              {/* 重卡大梁底盘 */}
              <rect x={0} y={objH * 0.83} width={objW} height={3} fill={colors.neutral[600]} />
              
              {/* 后部货箱集装箱 */}
              <rect x={0} y={objH * 0.08} width={objW * 0.65} height={objH * 0.75} rx={1} fill="url(#truck-cargo-grad)" stroke={colors.neutral[400]} strokeWidth={1} />
              {/* 货箱加强筋/瓦楞分割线 */}
              <line x1={objW * 0.16} y1={objH * 0.08} x2={objW * 0.16} y2={objH * 0.83} stroke={colors.neutral[400]} strokeWidth={0.5} />
              <line x1={objW * 0.32} y1={objH * 0.08} x2={objW * 0.32} y2={objH * 0.83} stroke={colors.neutral[400]} strokeWidth={0.5} />
              <line x1={objW * 0.48} y1={objH * 0.08} x2={objW * 0.48} y2={objH * 0.83} stroke={colors.neutral[400]} strokeWidth={0.5} />

              {/* 前部大车头 */}
              <path
                d={`M ${objW * 0.67} ${objH * 0.83} L ${objW * 0.67} ${objH * 0.22} L ${objW * 0.82} ${objH * 0.22} L ${objW * 0.95} ${objH * 0.42} L ${objW * 0.95} ${objH * 0.83} Z`}
                fill="url(#truck-head-grad)"
                stroke={colors.neutral[500]}
                strokeWidth={1}
              />
              {/* 卡车车窗 */}
              <path
                d={`M ${objW * 0.74} ${objH * 0.26} L ${objW * 0.81} ${objH * 0.26} L ${objW * 0.90} ${objH * 0.40} L ${objW * 0.74} ${objH * 0.40} Z`}
                fill={PHYSICS_COLORS.objectFill}
                opacity={0.8}
              />

              {/* 货箱中部的动能蓄能条 */}
              <g transform={`translate(${objW * 0.08}, ${objH * 0.42})`}>
                <rect width={objW * 0.48} height={4} rx={1} fill="none" stroke={colors.neutral[400]} strokeWidth={0.5} />
                <rect width={objW * 0.48 * ekRatio} height={4} rx={1} fill={PHYSICS_COLORS.kineticEnergy} />
                <text x={objW * 0.24} y={3.5} fontSize={5} textAnchor="middle" fill={colors.neutral[800]} fontWeight="bold" opacity={0.8}>
                  Ek
                </text>
              </g>

              {/* 卡车三个轮子（三轴重型） */}
              <g transform={`translate(${objW * 0.16}, ${objH - 2.5})`}>
                <circle r={objH * 0.16} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.07} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
              </g>
              <g transform={`translate(${objW * 0.46}, ${objH - 2.5})`}>
                <circle r={objH * 0.16} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.07} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
              </g>
              <g transform={`translate(${objW * 0.82}, ${objH - 2.5})`}>
                <circle r={objH * 0.16} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.07} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
              </g>
            </g>
          ) : (
            // 🚗 3. 默认轿车外观（蓝色系）
            <g>
              {/* 默认车身 */}
              <rect width={objW} height={objH - 4} rx={3} fill="url(#car-body-grad)" stroke={SCENE_COLORS.magnet.southMid} strokeWidth={1.5} />
              {/* 科技感车窗 */}
              <rect x={objW * 0.1} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
              <rect x={objW * 0.4} y={objH * 0.15} width={objW * 0.25} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
              <rect x={objW * 0.7} y={objH * 0.15} width={objW * 0.2} height={objH * 0.3} rx={1} fill={PHYSICS_COLORS.objectFill} opacity={0.85} />
              {/* 装饰条 */}
              <line x1={objW * 0.05} y1={objH * 0.55} x2={objW * 0.95} y2={objH * 0.55} stroke={PHYSICS_COLORS.velocityY} strokeWidth={1} opacity={0.4} />
              {/* 蓄能储能电池 */}
              <g transform={`translate(${objW * 0.15}, ${objH * 0.65})`}>
                <rect width={objW * 0.7} height={4} rx={1} fill="none" stroke={colors.neutral[300]} strokeWidth={0.5} />
                <rect width={objW * 0.7 * ekRatio} height={4} rx={1} fill={PHYSICS_COLORS.kineticEnergy} />
                <text x={objW * 0.35} y={3.5} fontSize={5} textAnchor="middle" fill={colors.neutral[0]} fontWeight="bold" opacity={0.9}>
                  Ek
                </text>
              </g>
              {/* 默认车轮（二轴） */}
              <g transform={`translate(${objW * 0.22}, ${objH - 3})`}>
                <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
                <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
              </g>
              <g transform={`translate(${objW * 0.78}, ${objH - 3})`}>
                <circle r={objH * 0.18} fill="url(#car-wheel-grad)" />
                <circle r={objH * 0.08} fill={SCENE_COLORS.circuit.bulbGlassStroke} stroke={SCENE_COLORS.materials.steelSphereGrad[2]} strokeWidth={0.5} />
                <circle r={objH * 0.03} fill={SCENE_COLORS.materials.sliderMetalGrad[0]} />
              </g>
            </g>
          )}
        </g>

        {/* ── 牵引力 F 矢量（动力深蓝） ── */}
        {showVectors && state.F > 0 && (
          <line
            x1={carX + objW + 2}
            y1={groundY - objH * 0.5}
            x2={carX + objW + 2 + Math.min(state.F * 0.008, 60)}
            y2={groundY - objH * 0.5}
            stroke={PHYSICS_COLORS.appliedForce}
            strokeWidth={STROKE.vectorMain}
            markerEnd="url(#arrow-appliedForce)"
          />
        )}

        {/* ── 阻力 f 矢量（耗散黄置） ── */}
        {showVectors && f > 0 && (
          <line
            x1={carX - 2}
            y1={groundY - objH * 0.4}
            x2={carX - 2 - Math.min(f * 0.008, 30)}
            y2={groundY - objH * 0.4}
            stroke={PHYSICS_COLORS.friction}
            strokeWidth={STROKE.vectorSub}
            markerEnd="url(#arrow-friction)"
          />
        )}

        {/* ── 速度 v 矢量（经典蓝，从车底向右绘制） ── */}
        {showVectors && state.v > 0.05 && (
          <line
            x1={carX + objW * 0.5}
            y1={groundY + 3.5}
            x2={carX + objW * 0.5 + Math.min(state.v * 3.5, 70)}
            y2={groundY + 3.5}
            stroke={PHYSICS_COLORS.velocity}
            strokeWidth={STROKE.vectorMain}
            markerEnd="url(#arrow-velocity)"
          />
        )}

        {/* ── 右下角实时物理读数看板 ── */}
        <g transform={`translate(${canvasSize.width - padding - 130}, ${canvasSize.height * 0.60})`}>
          <rect width={135} height={60} rx={4} fill={colors.neutral[50]} stroke={colors.neutral[200]} strokeWidth={0.5} />
          
          <text x={8} y={15} fontSize={smallFont} fill={PHYSICS_COLORS.velocity} fontWeight="semibold">
            速度 v = {state.v.toFixed(1)} m/s
          </text>
          <text x={8} y={32} fontSize={smallFont} fill={PHYSICS_COLORS.power} fontWeight="semibold">
            功率 P = {(state.P / 1000).toFixed(1)} kW
          </text>
          <text x={8} y={49} fontSize={smallFont} fill={PHYSICS_COLORS.acceleration}>
            加速度 a = {state.a.toFixed(2)} m/s²
          </text>
        </g>

        {/* ── 进阶模式阶段指示 ── */}
        {mode === 1 && state.v > 0.01 && (
          <g transform={`translate(${padding}, ${canvasSize.height * 0.66})`}>
            <rect width={80} height={18} rx={3} fill={
              state.phase === 0 ? colors.primary[100] :
              state.phase === 1 ? colors.accent[100] : colors.success[100]
            } stroke={
              state.phase === 0 ? colors.primary[600] :
              state.phase === 1 ? colors.accent[600] : colors.success[600]
            } strokeWidth={0.8} />
            <text x={40} y={12} fontSize={smallFont} fontWeight="bold" textAnchor="middle" fill={
              state.phase === 0 ? colors.primary[700] :
              state.phase === 1 ? colors.accent[700] : colors.success[700]
            }>
              {state.phase === 0 ? '匀加速阶段' : state.phase === 1 ? '变加速阶段' : '已达最大速'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
