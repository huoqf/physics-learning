import { useCanvasSize } from '@/utils'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { KatexFormula } from '@/components/UI'
import {
  precomputeConstantKETrajectory,
  precomputeCurvedTrackTrajectory,
  getKEStateAtTime,
} from '@/physics/kineticEnergy'

/**
 * 动能定理交互动画（重构美化规范版）
 *
 * 双轨模式：
 * - 基础模式（mode=0）：普通模式，恒力拉物块加速，在位移 s 处撤力匀速。光滑轨道。
 * - 进阶模式（mode=1）：进阶模式，滑块沿圆弧粗糙轨道下滑，受重力正功与变摩擦力负功，触底匀速。
 *
 * 布局倒置：图表在上，动画在下，高度自适应动态分配
 */
export default function KineticEnergyAnimation() {
  const { params, time, isPlaying, setIsPlaying, showVectors } = useAnimationStore()
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
  const [chartTab, setChartTab] = useState<'ek-ep' | 'fx-at'>('ek-ep')
  const [showCriticalTip, setShowCriticalTip] = useState(false)
  const hasPausedRef = useRef(false)

  const mode = params.mode ?? 0
  const m = params.m ?? 2                // kg
  const v0 = params.v0 ?? 0              // m/s
  const F_pull = params.F ?? 15          // N
  const s_target = params.s ?? 6          // m
  const R = params.R ?? 5                // m
  const mu = params.mu ?? 0.15           // 摩擦因数
  const tMax = 15                         // 最大模拟时间 15s

  // ── 预计算物理轨迹 ──
  const { points: trajectory, t_c, v_c, x_max, scale } = useMemo(() => {
    const paddingVal = canvasSize.width * 0.06
    const wallXVal = canvasSize.width - paddingVal * 0.8
    const max_pixel_dist = (wallXVal - 90 - 15) - paddingVal
    const max_pixel_height = (canvasSize.height * 0.85) - (canvasSize.height * 0.55 + 24)

    if (mode === 0) {
      // 普通模式：总路程 x_end 设为拉力位移 s_target * 1.6
      const x_end = s_target * 1.6
      const scaleVal = max_pixel_dist / x_end
      const res = precomputeConstantKETrajectory(m, v0, F_pull, s_target, x_end)
      return { points: res.points, t_c: res.t_c, v_c: res.v_c, x_max: x_end, scale: scaleVal }
    } else {
      // 进阶模式：缩放比例由纵向高度限额锁定以保证画面纵横比和防畸变
      const scaleVal = max_pixel_height / R
      // 刚好行驶到右端（面板左侧）对应的最大物理滑行位移：
      const x_end = max_pixel_dist / scaleVal
      const res = precomputeCurvedTrackTrajectory(m, v0, R, mu, x_end)
      return { points: res.points, t_c: res.t_c, v_c: res.v_c, x_max: x_end, scale: scaleVal }
    }
  }, [mode, m, v0, F_pull, s_target, R, mu, canvasSize])

  // ── 当前插值物理状态 ──
  const state = useMemo(
    () => getKEStateAtTime(trajectory, time),
    [trajectory, time]
  )

  // ── 临界拐点 tc/vc 自动微暂停控制 ──
  useEffect(() => {
    if (time < 0.05) {
      hasPausedRef.current = false
      setShowCriticalTip(false)
    }
  }, [time])

  useEffect(() => {
    if (isPlaying && t_c > 0.1) {
      if (time >= t_c && !hasPausedRef.current) {
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
  }, [time, t_c, isPlaying, setIsPlaying])

  // ── 布局参数 ──
  const padding = canvasSize.width * 0.06
  const fontSize = Math.max(10, canvasSize.width * 0.016)
  const smallFont = Math.max(9, fontSize * 0.8)

  // 上部 52% 为图表，下部 48% 为动画
  const chartTop = canvasSize.height * 0.06
  const chartBottom = canvasSize.height * 0.52
  const chartMidY = (chartTop + chartBottom) / 2
  const chartLeft = padding * 1.5
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft

  // 地平线沉底至 85% 位置
  const groundY = canvasSize.height * 0.85
  const objW = canvasSize.width * 0.08
  const objH = objW

  // ── 动画区物理尺度与自适应映射 ──
  const wallX = canvasSize.width - padding * 0.8
  const xMaxPhysic = x_max

  // 物理坐标映射到 Canvas 像素坐标
  const carX = padding + state.x * scale
  const carY = mode === 0 ? groundY : groundY - (R - state.y) * scale

  // ── 能量对比柱数值 ──
  const initialEk = 0.5 * m * v0 * v0
  const deltaEk = state.Ek - initialEk

  // 功与能的并排对比柱坐标（右侧墙壁左旁）
  const maxBarH = 55
  const maxEnergyVal = Math.max(
    mode === 0 ? (F_pull * s_target) : (m * 9.8 * R),
    10
  )
  const barW_H = maxEnergyVal > 0 ? (Math.abs(state.W) / maxEnergyVal) * maxBarH : 0
  const barEk_H = maxEnergyVal > 0 ? (Math.abs(deltaEk) / maxEnergyVal) * maxBarH : 0

  // ── 做功能量流粒子（普通模式） ──
  const pPhase = (time * 10) % 1
  const particles = [0, 1, 2, 3].map(i => {
    const phase = (pPhase + i * 0.25) % 1
    const x = carX + objW + 10 + (1 - phase) * 35
    const opacity = phase < 0.2 ? phase / 0.2 : phase > 0.8 ? (1 - phase) / 0.2 : 1
    return { x, opacity }
  })

  // ── 图表曲线区域高度分配 ──
  // Ek-ep / F-x 区域（上部）
  const vtTop = chartTop + 14
  const vtBottom = chartMidY - 10
  const vtHeight = vtBottom - vtTop

  // a-t / Ep-x 区域（下部）
  const ptTop = chartMidY + 14
  const ptBottom = chartBottom - 8
  const ptHeight = ptBottom - ptTop

  // ── 曲线坐标映射 ──
  const toChartX = (t: number) => chartLeft + (t / tMax) * chartWidth
  
  // 能量-位移曲线 X 映射
  const toFvChartX = (x: number) => chartLeft + (x / xMaxPhysic) * chartWidth
  const E_max_limit = Math.max(
    mode === 0
      ? (initialEk + F_pull * s_target)
      : Math.max(initialEk, m * 9.8 * R),
    10
  ) * 1.15
  const toEnergyY = (E: number) => vtBottom - (E / E_max_limit) * vtHeight

  // F-x 力-位移 Y 映射
  const F_max_limit = (mode === 0 ? Math.max(F_pull, 20) : Math.max(m * 9.8, 20)) * 1.15
  const toFvY = (F: number) => vtBottom - (F / F_max_limit) * vtHeight
  const a_max_limit = (mode === 0 ? Math.max(F_pull / m, 5) : Math.max(9.8, 5)) * 1.2
  const toAtY = (a: number) => ptBottom - (a / a_max_limit) * ptHeight

  const visiblePoints = useMemo(
    () => trajectory.filter(p => p.t <= time + 0.02),
    [trajectory, time]
  )

  // ── 随动公式 ──
  const getLiveFormula = () => {
    if (mode === 0) {
      if (state.phase === 0) {
        return `W_{\\text{拉}} = F \\cdot x = ${state.W.toFixed(1)}\\text{J}`;
      } else {
        return `W_{\\text{拉}} = \\Delta E_k = ${state.W.toFixed(1)}\\text{J}`;
      }
    } else {
      if (state.phase === 0) {
        return `W_{\\text{总}} = W_{\\text{重}} + W_{\\text{摩}} = ${state.W.toFixed(1)}\\text{J}`;
      } else {
        return `W_{\\text{总}} = \\Delta E_k = ${state.W.toFixed(1)}\\text{J}`;
      }
    }
  }

  // ── 临界点 tc 扩散波纹 ──
  const renderRipple = (centerX: number, centerY: number) => {
    const diff = time - t_c
    if (diff >= 0 && diff < 0.8 && t_c > 0.1) {
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
            onClick={() => setChartTab('ek-ep')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-all duration-200 ${
              chartTab === 'ek-ep'
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
            }`}
          >
            能量-位移 图像
          </button>
          <button
            onClick={() => setChartTab('fx-at')}
            className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-all duration-200 ${
              chartTab === 'fx-at'
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
            }`}
          >
            力-位移 / a-t 图像
          </button>
        </div>
      )}

      {/* 临界点微暂停提示卡片 */}
      {showCriticalTip && (
        <div
          className="absolute bg-accent-50 border border-accent-200 rounded px-3 py-2 shadow-sm pointer-events-none z-10"
          style={{
            left: '50%',
            top: '20%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '320px',
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-accent-800">
              {mode === 0 ? '🚀 恒力加速作用结束' : '🎢 物块已滑至水平面'}
            </span>
            <span className="text-[9px] text-accent-700 leading-snug">
              {mode === 0
                ? '拉力已撤去！累计做的拉力功刚好完全等于物块增加的动能（W = ΔEk）。此后物块做匀速运动。'
                : '物块已到达圆弧底端！重力做的正功与摩擦力做的负功之和（合力总功）刚好完全等于物块动能的变化量（W总 = ΔEk）。此后做匀速运动。'}
            </span>
          </div>
        </div>
      )}

      {/* 随物块移动的实时物理公式 */}
      {state.v > 0.05 && (
        <div
          className="absolute bg-white/95 px-2 py-0.5 rounded shadow-sm border border-neutral-200 pointer-events-none z-10 transition-all duration-100 ease-out"
          style={{
            left: `${carX + objW * 0.5}px`,
            bottom: `${canvasSize.height - carY + objH + 12}px`,
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
          {/* 物块材质渐变 */}
          <linearGradient id="block-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.woodSphereGrad[0]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.woodSphereGrad[1]} />
          </linearGradient>

          {/* 规范的物理矢量箭头定义 */}
          <marker id="arrow-appliedForce" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.forceNet} />
          </marker>
          <marker id="arrow-velocity" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill={PHYSICS_COLORS.velocity} />
          </marker>
        </defs>

        {/* ══════════════════════════════════════════════ */}
        {/* 上半部分：图表区 */}
        {/* ══════════════════════════════════════════════ */}

        {mode === 0 || chartTab === 'ek-ep' ? (
          // ─── 视图A：普通模式 / 进阶模式能量图 ───
          <g>
            {/* 上半部：Ek-x (动能-位移) */}
            <text x={chartLeft} y={vtTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold">
              {mode === 0 ? 'Ek-x (动能-位移)' : 'Ek-x (动能-形变)'}
            </text>
            <line x1={chartLeft} y1={vtTop} x2={chartLeft} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={vtBottom} x2={chartRight} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* 刻度 */}
            {[0, 0.5, 1].map((frac, i) => {
              const eVal = E_max_limit * frac
              const y = toEnergyY(eVal)
              return (
                <g key={`ek-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">{eVal.toFixed(0)}J</text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const xVal = xMaxPhysic * frac
              const xPos = toFvChartX(xVal)
              return (
                <g key={`ek-x-${i}`}>
                  <line x1={xPos} y1={vtBottom} x2={xPos} y2={vtBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={vtBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">{xVal.toFixed(1)}m</text>
                </g>
              )
            })}

            {/* 完整曲线背景（灰色虚线） */}
            <polyline
              points={trajectory.map(p => `${toFvChartX(p.x)},${toEnergyY(p.Ek)}`).join(' ')}
              fill="none"
              stroke={colors.neutral[300]}
              strokeWidth={1}
              strokeDasharray={DASH.reference.join(',')}
              opacity={0.6}
            />

            {/* 当前可见曲线 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toFvChartX(p.x)},${toEnergyY(p.Ek)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.kineticEnergy}
                strokeWidth={STROKE.chartMain}
              />
            )}
            <circle cx={toFvChartX(state.x)} cy={toEnergyY(state.Ek)} r={3} fill={PHYSICS_COLORS.kineticEnergy} stroke={colors.neutral[0]} strokeWidth={1} />

            {/* 临界拐点 (恒力撤力点或撞击停滞点) 虚线引导与波纹 */}
            <g>
              <line
                x1={toFvChartX(x_max)} y1={vtTop}
                x2={toFvChartX(x_max)} y2={vtBottom}
                stroke={colors.accent[600]}
                strokeWidth={0.8}
                strokeDasharray={DASH.guide.join(',')}
                opacity={0.5}
              />
              <circle cx={toFvChartX(x_max)} cy={toEnergyY(mode === 0 ? v_c * v_c * 0.5 * m : 0)} r={2} fill={colors.accent[600]} />
              {renderRipple(toFvChartX(x_max), toEnergyY(mode === 0 ? v_c * v_c * 0.5 * m : 0))}
            </g>


            {/* 下半部：W-x (功-位移) */}
            <text x={chartLeft} y={ptTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.work} fontWeight="bold">
              {mode === 0 ? 'W-x (拉力做功-位移)' : 'W-x (做功-位移)'}
            </text>
            <line x1={chartLeft} y1={ptTop} x2={chartLeft} y2={ptBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={ptBottom} x2={chartRight} y2={ptBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* 进阶模式下的 y 轴零线 (水平中线) */}
            {mode === 1 && (
              <line
                x1={chartLeft}
                y1={(ptTop + ptBottom) / 2}
                x2={chartRight}
                y2={(ptTop + ptBottom) / 2}
                stroke={colors.neutral[300]}
                strokeWidth={0.5}
                strokeDasharray={DASH.reference.join(',')}
              />
            )}

            {/* 刻度 */}
            {(mode === 0 ? [0, 0.5, 1] : [-1, 0, 1]).map((frac, i) => {
              const eVal = E_max_limit * frac
              const y = mode === 0 
                ? ptBottom - (frac) * ptHeight 
                : (ptTop + ptBottom) / 2 - (frac) * (ptHeight / 2)
              return (
                <g key={`ep-y-${i}`}>
                  <line x1={chartLeft - 3} y1={y} x2={chartLeft} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={chartLeft - 5} y={y + 3} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="end">{eVal.toFixed(0)}J</text>
                </g>
              )
            })}

            {/* 进阶模式图例说明 */}
            {mode === 1 && (
              <g transform={`translate(${chartRight - 150}, ${ptTop - 10})`}>
                <line x1={0} y1={3} x2={8} y2={3} stroke={colors.success[600]} strokeWidth={1.5} />
                <text x={12} y={5} fontSize={7} fill={CHART_COLORS.tickLabel}>W重 (重力功)</text>

                <line x1={52} y1={3} x2={60} y2={3} stroke={colors.danger[600]} strokeWidth={1.5} />
                <text x={64} y={5} fontSize={7} fill={CHART_COLORS.tickLabel}>W摩 (摩擦功)</text>

                <line x1={104} y1={3} x2={112} y2={3} stroke={colors.primary[600]} strokeWidth={1.5} strokeDasharray="2,2" />
                <text x={116} y={5} fontSize={7} fill={CHART_COLORS.tickLabel}>W总 (合力功)</text>
              </g>
            )}

            {mode === 0 ? (
              // ── 普通模式：仅绘制拉力功 ──
              <g>
                <polyline
                  points={trajectory.map(p => `${toFvChartX(p.x)},${ptBottom - (p.W / E_max_limit) * ptHeight}`).join(' ')}
                  fill="none"
                  stroke={colors.neutral[300]}
                  strokeWidth={1}
                  strokeDasharray={DASH.reference.join(',')}
                  opacity={0.6}
                />
                {visiblePoints.length >= 2 && (
                  <polyline
                    points={visiblePoints.map(p => `${toFvChartX(p.x)},${ptBottom - (p.W / E_max_limit) * ptHeight}`).join(' ')}
                    fill="none"
                    stroke={PHYSICS_COLORS.work}
                    strokeWidth={STROKE.chartMain}
                  />
                )}
                <circle cx={toFvChartX(state.x)} cy={ptBottom - (state.W / E_max_limit) * ptHeight} r={3} fill={PHYSICS_COLORS.work} stroke={colors.neutral[0]} strokeWidth={1} />
              </g>
            ) : (
              // ── 进阶模式：同时绘制重力正功、摩擦力负功和合外力总功三条线 ──
              <g>
                {/* 1. 重力做功 W_G (正值) */}
                <polyline
                  points={trajectory.map(p => `${toFvChartX(p.x)},${(ptTop + ptBottom) / 2 - (p.Ep / E_max_limit) * (ptHeight / 2)}`).join(' ')}
                  fill="none"
                  stroke={colors.success[100]}
                  strokeWidth={1}
                  strokeDasharray={DASH.reference.join(',')}
                />
                {visiblePoints.length >= 2 && (
                  <polyline
                    points={visiblePoints.map(p => `${toFvChartX(p.x)},${(ptTop + ptBottom) / 2 - (p.Ep / E_max_limit) * (ptHeight / 2)}`).join(' ')}
                    fill="none"
                    stroke={colors.success[600]}
                    strokeWidth={STROKE.chartMain}
                  />
                )}
                <circle cx={toFvChartX(state.x)} cy={(ptTop + ptBottom) / 2 - (state.Ep / E_max_limit) * (ptHeight / 2)} r={2.5} fill={colors.success[600]} stroke={colors.neutral[0]} strokeWidth={0.8} />

                {/* 2. 摩擦力做功 W_f (负值，W_f = W - Ep) */}
                <polyline
                  points={trajectory.map(p => `${toFvChartX(p.x)},${(ptTop + ptBottom) / 2 - ((p.W - p.Ep) / E_max_limit) * (ptHeight / 2)}`).join(' ')}
                  fill="none"
                  stroke={colors.danger[100]}
                  strokeWidth={1}
                  strokeDasharray={DASH.reference.join(',')}
                />
                {visiblePoints.length >= 2 && (
                  <polyline
                    points={visiblePoints.map(p => `${toFvChartX(p.x)},${(ptTop + ptBottom) / 2 - ((p.W - p.Ep) / E_max_limit) * (ptHeight / 2)}`).join(' ')}
                    fill="none"
                    stroke={colors.danger[600]}
                    strokeWidth={STROKE.chartMain}
                  />
                )}
                <circle cx={toFvChartX(state.x)} cy={(ptTop + ptBottom) / 2 - ((state.W - state.Ep) / E_max_limit) * (ptHeight / 2)} r={2.5} fill={colors.danger[600]} stroke={colors.neutral[0]} strokeWidth={0.8} />

                {/* 3. 合外力总功 W_net = W_G + W_f */}
                <polyline
                  points={trajectory.map(p => `${toFvChartX(p.x)},${(ptTop + ptBottom) / 2 - (p.W / E_max_limit) * (ptHeight / 2)}`).join(' ')}
                  fill="none"
                  stroke={colors.primary[100]}
                  strokeWidth={1.2}
                  strokeDasharray={DASH.reference.join(',')}
                />
                {visiblePoints.length >= 2 && (
                  <polyline
                    points={visiblePoints.map(p => `${toFvChartX(p.x)},${(ptTop + ptBottom) / 2 - (p.W / E_max_limit) * (ptHeight / 2)}`).join(' ')}
                    fill="none"
                    stroke={colors.primary[600]}
                    strokeWidth={STROKE.chartMain}
                    strokeDasharray="4,2"
                  />
                )}
                <circle cx={toFvChartX(state.x)} cy={(ptTop + ptBottom) / 2 - (state.W / E_max_limit) * (ptHeight / 2)} r={3} fill={colors.primary[600]} stroke={colors.neutral[0]} strokeWidth={1} />
              </g>
            )}

            {/* 临界地点/触底 x=R 引导线 */}
            <line
              x1={toFvChartX(mode === 0 ? x_max : R)} y1={ptTop}
              x2={toFvChartX(mode === 0 ? x_max : R)} y2={ptBottom}
              stroke={colors.accent[600]}
              strokeWidth={0.8}
              strokeDasharray={DASH.guide.join(',')}
              opacity={0.5}
            />
          </g>
        ) : (
          // ─── 视图B：进阶模式 F_合-x (合力-位移功面积) & a-t (加速度-时间) ───
          <g>
            {/* 上半部：F_合-x 积功面积 */}
            <text x={chartLeft} y={vtTop - 2} fontSize={smallFont} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F_合-x (切向合力-位移 图像及做功面积)</text>
            <line x1={chartLeft} y1={vtTop} x2={chartLeft} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />
            <line x1={chartLeft} y1={vtBottom} x2={chartRight} y2={vtBottom} stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

            {/* 刻度 */}
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
              const xVal = xMaxPhysic * frac
              const xPos = toFvChartX(xVal)
              return (
                <g key={`fv-x-${i}`}>
                  <line x1={xPos} y1={vtBottom} x2={xPos} y2={vtBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={vtBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">{xVal.toFixed(1)}m</text>
                </g>
              )
            })}

            {/* 理论完整的 F_合-x 轨迹背景灰线 */}
            <polyline
              points={trajectory.map(p => `${toFvChartX(p.x)},${toFvY(p.F)}`).join(' ')}
              fill="none"
              stroke={colors.neutral[300]}
              strokeWidth={1}
              strokeDasharray={DASH.reference.join(',')}
              opacity={0.6}
            />

            {/* 动态绘制切向合外力做功的半透明做功绿阴影面积（代表总合外力功积分） */}
            {visiblePoints.length >= 2 && (
              <polygon
                points={`${toFvChartX(0)},${toFvY(0)} ${visiblePoints.map(p => `${toFvChartX(p.x)},${toFvY(p.F)}`).join(' ')} ${toFvChartX(state.x)},${toFvY(0)}`}
                fill={PHYSICS_COLORS.work}
                fillOpacity={0.18}
              />
            )}

            {/* 动态可见合外力曲线段 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toFvChartX(p.x)},${toFvY(p.F)}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.forceNet}
                strokeWidth={STROKE.chartMain}
              />
            )}
            <circle cx={toFvChartX(state.x)} cy={toFvY(state.F)} r={3} fill={PHYSICS_COLORS.forceNet} stroke={colors.neutral[0]} strokeWidth={1} />
            <text x={toFvChartX(state.x) + 5} y={toFvY(state.F) - 4} fontSize={7} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F_合={state.F.toFixed(1)}N</text>

            {/* 临界触底 x=R 引导虚线与波纹 */}
            <g>
              <line
                x1={toFvChartX(R)} y1={vtTop}
                x2={toFvChartX(R)} y2={vtBottom}
                stroke={colors.accent[600]}
                strokeWidth={0.8}
                strokeDasharray={DASH.guide.join(',')}
                opacity={0.5}
              />
              <circle cx={toFvChartX(R)} cy={toFvY(0)} r={2} fill={colors.accent[600]} />
              {renderRipple(toFvChartX(R), toFvY(0))}
            </g>

            {/* 下半部：a-t 图表 */}
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
            {[0, 0.5, 1].map((frac, i) => {
              const tVal = tMax * frac
              const xPos = toChartX(tVal)
              return (
                <g key={`at-x-${i}`}>
                  <line x1={xPos} y1={ptBottom} x2={xPos} y2={ptBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={ptBottom + 9} fontSize={7} fill={CHART_COLORS.tickLabel} textAnchor="middle">{tVal.toFixed(0)}s</text>
                </g>
              )
            })}

            {/* a-t 曲线 */}
            {visiblePoints.length >= 2 && (
              <polyline
                points={visiblePoints.map(p => `${toChartX(p.t)},${toAtY(Math.abs(p.a))}`).join(' ')}
                fill="none"
                stroke={PHYSICS_COLORS.acceleration}
                strokeWidth={STROKE.chartMain}
              />
            )}
            <circle cx={toChartX(state.t)} cy={toAtY(Math.abs(state.a))} r={3} fill={PHYSICS_COLORS.acceleration} stroke={colors.neutral[0]} strokeWidth={1} />

            {/* a-t 临界 tc 引导线 */}
            <line
              x1={toChartX(t_c)} y1={ptTop}
              x2={toChartX(t_c)} y2={ptBottom}
              stroke={colors.accent[600]}
              strokeWidth={0.8}
              strokeDasharray={DASH.guide.join(',')}
              opacity={0.5}
            />
          </g>
        )}

        {/* 隔离图表与动画区水平分隔线 */}
        <line x1={padding * 0.5} y1={canvasSize.height * 0.55} x2={canvasSize.width - padding * 0.5} y2={canvasSize.height * 0.55} stroke={colors.neutral[200]} strokeWidth={1} />

        {/* ══════════════════════════════════════════════ */}
        {/* 下半部分：物块物理仿真场景 */}
        {/* ══════════════════════════════════════════════ */}

        {/* 轨道底盘直线段 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        <line x1={padding * 0.5} y1={groundY + 3} x2={canvasSize.width - padding * 0.5} y2={groundY + 3} stroke={colors.neutral[200]} strokeWidth={0.5} />

        {/* ── 进阶模式下的 1/4 圆弧曲面轨道 ── */}
        {mode === 1 && (
          <g>
            <path
              d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 0 ${padding + R * scale} ${groundY}`}
              fill="none"
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={STROKE.groundLine}
            />
            <path
              d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 0 ${padding + R * scale} ${groundY}`}
              fill="none"
              stroke={colors.neutral[100]}
              strokeWidth={0.5}
              opacity={0.7}
            />
            {/* 轨道顶部起点处的支撑边架 */}
            <line
              x1={padding}
              y1={groundY - R * scale}
              x2={padding - 6}
              y2={groundY - R * scale + 12}
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={1.5}
            />
          </g>
        )}

        {/* ── 普通模式下的做功绿色粒子能量流（加速段时流动） ── */}
        {mode === 0 && state.phase === 0 && state.v > 0.05 && (
          <g stroke={PHYSICS_COLORS.work} strokeWidth={1.5}>
            {particles.map((p, idx) => (
              <circle
                key={`p-stream-${idx}`}
                cx={p.x}
                cy={groundY - objH * 0.5}
                r={1.8}
                opacity={p.opacity}
                fill={PHYSICS_COLORS.work}
              />
            ))}
          </g>
        )}

        {/* ── 进阶模式下的曲面切向摩擦做负功阻碍虚线效果 ── */}
        {mode === 1 && state.phase === 0 && mu > 0.01 && state.v > 0.05 && (
          <g stroke={colors.danger[500]} strokeWidth={1.5} fill="none">
            <line
              x1={carX - (objW * 0.4) * Math.cos(state.theta)}
              y1={carY - (objW * 0.4) * Math.sin(state.theta)}
              x2={carX - (objW * 0.9) * Math.cos(state.theta)}
              y2={carY - (objW * 0.9) * Math.sin(state.theta)}
              stroke={colors.danger[500]}
              strokeDasharray="2,2"
              opacity={0.8 * (state.v / v_c)}
            />
          </g>
        )}

        {/* ── 定理等价验证面板卡片 ── */}
        <g transform={`translate(${wallX - 90}, ${canvasSize.height * 0.58})`}>
          {/* 半透明白底毛玻璃卡片背景 */}
          <rect width={90} height={85} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={colors.neutral[200]} strokeWidth={0.8} />
          
          <g transform="translate(0, 65)">
            {/* 基准零线 */}
            <line x1={8} y1={0} x2={82} y2={0} stroke={colors.neutral[400]} strokeWidth={0.8} />

            {/* 柱 1：累计功 W (做功绿) */}
            <rect
              x={14}
              y={-barW_H}
              width={16}
              height={barW_H}
              fill={PHYSICS_COLORS.work}
              opacity={0.85}
              rx={0.5}
            />
            <text x={22} y={-barW_H - 4} fontSize={8.5} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="bold">
              {state.W >= 0 ? '+' : ''}{state.W.toFixed(1)}J
            </text>
            <text x={22} y={12} fontSize={8.5} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="semibold">
              功 W
            </text>

            {/* 柱 2：动能变化量 ΔEk (动能青) */}
            <rect
              x={60}
              y={-barEk_H}
              width={16}
              height={barEk_H}
              fill={PHYSICS_COLORS.kineticEnergy}
              opacity={0.85}
              rx={0.5}
            />
            <text x={68} y={-barEk_H - 4} fontSize={8.5} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="bold">
              {deltaEk >= 0 ? '+' : ''}{deltaEk.toFixed(1)}J
            </text>
            <text x={68} y={12} fontSize={8.5} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="semibold">
              ΔEk
            </text>
            
            {/* 定理等价符号 '=' */}
            <text x={45} y={-18} fontSize={12} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
              =
            </text>
          </g>
        </g>

        {/* ── 木块模型（带旋转与高度自适应定位） ── */}
        <g transform={mode === 0 
          ? `translate(${carX}, ${groundY - objH})` 
          : `translate(${carX}, ${carY}) rotate(${90 - (state.theta * 180) / Math.PI}) translate(${-objW / 2}, ${-objH})`
        }>
          {/* 木物块身 */}
          <rect width={objW} height={objH - 1} rx={2} fill="url(#block-grad)" stroke={SCENE_COLORS.materials.woodSphereGrad[1]} strokeWidth={1.5} />
          {/* 质地木纹装饰线 */}
          <line x1={objW * 0.15} y1={2} x2={objW * 0.15} y2={objH - 3} stroke={colors.neutral[700]} strokeWidth={0.5} opacity={0.25} />
          <line x1={objW * 0.5} y1={2} x2={objW * 0.5} y2={objH - 3} stroke={colors.neutral[700]} strokeWidth={0.5} opacity={0.25} />
          <line x1={objW * 0.8} y1={2} x2={objW * 0.8} y2={objH - 3} stroke={colors.neutral[700]} strokeWidth={0.5} opacity={0.25} />

          {/* 木块质量标志 */}
          <text x={objW * 0.5} y={objH * 0.55} fontSize={smallFont} fill={colors.neutral[800]} fontWeight="bold" textAnchor="middle">
            {m.toFixed(1)}kg
          </text>

          {/* 底盘小滑轮 */}
          <circle cx={objW * 0.22} cy={objH - 0.5} r={2.5} fill={colors.neutral[800]} />
          <circle cx={objW * 0.78} cy={objH - 0.5} r={2.5} fill={colors.neutral[800]} />

          {/* ── 作用外力/合外力 F 矢量（在小车局部坐标系内绘制，自动跟随旋转） ── */}
          {showVectors && (
            mode === 0 ? (
              // 普通模式：拉力 F 作用在木块左侧，向右
              state.F > 0.1 && (
                <line
                  x1={-Math.min(state.F * 1.5, 45)}
                  y1={objH * 0.5}
                  x2={-2}
                  y2={objH * 0.5}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={STROKE.vectorMain}
                  markerEnd="url(#arrow-appliedForce)"
                />
              )
            ) : (
              // 进阶模式：切向合力（重力分力减去摩擦力）向下滑动，在滑块右侧顺着切向指下
              state.F > 0.1 && (
                <line
                  x1={objW + 2}
                  y1={objH * 0.5}
                  x2={objW + 2 + Math.min(state.F * 1.5, 45)}
                  y2={objH * 0.5}
                  stroke={PHYSICS_COLORS.forceNet}
                  strokeWidth={STROKE.vectorMain}
                  markerEnd="url(#arrow-appliedForce)"
                />
              )
            )
          )}

          {/* ── 速度 v 矢量（在小车局部坐标系内绘制，自动跟随旋转） ── */}
          {showVectors && state.v > 0.05 && (
            <line
              x1={objW * 0.5}
              y1={objH + 3.5}
              x2={objW * 0.5 + Math.min(state.v * 4.5, 60)}
              y2={objH + 3.5}
              stroke={PHYSICS_COLORS.velocity}
              strokeWidth={STROKE.vectorMain}
              markerEnd="url(#arrow-velocity)"
            />
          )}
        </g>

        {/* ── 进阶模式阶段指示 ── */}
        {mode === 1 && (
          <g transform={`translate(${padding}, ${canvasSize.height * 0.75})`}>
            <rect width={80} height={18} rx={3} fill={
              state.phase === 0 ? colors.primary[100] : colors.success[100]
            } stroke={
              state.phase === 0 ? colors.primary[600] : colors.success[600]
            } strokeWidth={0.8} />
            <text x={40} y={12} fontSize={smallFont} fontWeight="bold" textAnchor="middle" fill={
              state.phase === 0 ? colors.primary[700] : colors.success[700]
            }>
              {state.phase === 0 ? '曲面下滑中' : '水平滑行中'}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
