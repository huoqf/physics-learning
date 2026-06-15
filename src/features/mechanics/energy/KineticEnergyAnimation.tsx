import { useCanvasSize } from '@/utils'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH, CHART_COLORS, CANVAS_STYLE, VECTOR_DISPLAY } from '@/theme/physics'
import { colors } from '@/theme/colors'
import {
  precomputeConstantKETrajectory,
  precomputeCurvedTrackTrajectory,
  getKEStateAtTime,
} from '@/physics/kineticEnergy'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { Block } from '@/components/Physics/Block'
import { createSceneScale } from '@/scene/SceneScale'
import type { SceneConfig } from '@/scene/SceneConfig'

/** 动能定理动画布局常量（语义化比例，禁止裸数字） */
const KE_LAYOUT = {
  /** 左侧留白占画布宽度比例 */
  leftPaddingRatio: 0.06,
  /** 右侧留白占画布宽度比例 */
  rightPaddingRatio: 0.048,
  /** 地面线 Y 位置占画布高度比例 */
  groundYRatio: 0.85,
  /** 图表区顶部比例 */
  chartTopRatio: 0.06,
  /** 图表区底部比例 */
  chartBottomRatio: 0.52,
  /** 图表与动画区分隔线比例 */
  dividerRatio: 0.55,
  /** 进阶模式球半径占轨道半径比例 */
  ballToTrackRatio: 0.10,
  /** 进阶模式球半径占画布宽度上限比例 */
  ballMaxWidthRatio: 0.025,
} as const

/**
 * 动能定理交互动画（重构美化规范版）
 *
 * 双轨模式：
 * - 基础模式（mode=0）：普通模式，恒力拉物块加速，在位移 s 处撤力匀速。光滑轨道。
 * - 进阶模式（mode=1）：进阶模式，滑块沿圆弧粗糙轨道下滑，受重力正功与变摩擦力负功，触底匀速。
 *
 * 布局倒置：图表在上，动画在下，高度自适应动态分配
 *
 * 坐标系约定：
 * - 进阶模式圆弧轨道圆心在 (padding + R*scale, groundY - R*scale)
 * - 小球位置由 state.x/state.y 推导，不依赖 state.theta（线性插值破坏几何关系）
 * - 切向方向由内法线（指向圆心）旋转 90° 推导
 */
export default function KineticEnergyAnimation() {
    const {params, time, isPlaying, setIsPlaying, showVectors} = useAnimationStore(
    useShallow((s) => ({
    params: s.params,
    time: s.time,
    isPlaying: s.isPlaying,
    setIsPlaying: s.setIsPlaying,
    showVectors: s.showVectors,
    }))
  )
  const [containerRef, canvasSize] = useCanvasSize({ width: 700, height: 420 })
  const { font } = canvasSize
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
    const paddingVal = canvasSize.width * KE_LAYOUT.leftPaddingRatio
    const rightPadding = canvasSize.width * KE_LAYOUT.rightPaddingRatio
    const gY = canvasSize.height * KE_LAYOUT.groundYRatio
    const max_pixel_dist = canvasSize.width - paddingVal - rightPadding
    const max_pixel_height = gY - canvasSize.height * KE_LAYOUT.dividerRatio - 24

    if (mode === 0) {
      // 普通模式：总路程 x_end = s_target * 1.6（物理量固定，不随 canvas 变）
      const x_end = s_target * 1.6
      const scaleVal = max_pixel_dist / x_end
      const res = precomputeConstantKETrajectory(m, v0, F_pull, s_target, x_end)
      return { points: res.points, t_c: res.t_c, v_c: res.v_c, x_max: x_end, scale: scaleVal }
    } else {
      // 进阶模式：纵向高度确定像素→物理缩放；x_end 用物理量 R * 2.0 固定
      const scaleVal = max_pixel_height / R
      const x_end = R * 2.0
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

  // ── 布局参数（全部由 KE_LAYOUT 常量驱动） ──
  const padding = canvasSize.width * KE_LAYOUT.leftPaddingRatio
  const fontSize = Math.max(CANVAS_STYLE.FONT.small, canvasSize.width * 0.016)
  const smallFont = Math.max(CANVAS_STYLE.FONT.small - 1, fontSize * 0.8)

  // 上部 52% 为图表，下部 48% 为动画
  const chartTop = canvasSize.height * KE_LAYOUT.chartTopRatio
  const chartBottom = canvasSize.height * KE_LAYOUT.chartBottomRatio
  const chartMidY = (chartTop + chartBottom) / 2
  const chartLeft = padding * 1.5
  const chartRight = canvasSize.width - padding
  const chartWidth = chartRight - chartLeft

  // 地平线
  const groundY = canvasSize.height * KE_LAYOUT.groundYRatio
  const objW = canvasSize.width * 0.08
  const objH = objW

  // ── 动画区物理尺度与自适应映射 ──
  const wallX = canvasSize.width - padding * 0.8
  const xMaxPhysic = x_max

  // ── 小球半径（规范化：从 CANVAS_STYLE.OBJECT 取值 + 动态比例） ──
  const ballR = mode === 0
    ? CANVAS_STYLE.OBJECT.ball
    : Math.max(
        CANVAS_STYLE.OBJECT.minRadius,
        Math.min(R * scale * KE_LAYOUT.ballToTrackRatio, canvasSize.width * KE_LAYOUT.ballMaxWidthRatio)
      )

  // ── 小球位置（唯一真相源：state.x / state.y，不依赖 state.theta） ──
  let ballCX: number
  let ballCY: number
  // 切向方向单位向量（用于速度/力矢量箭头和摩擦虚线）
  let tangentDirX: number
  let tangentDirY: number
  // 内法线方向单位向量（用于力箭头偏移、力的分解箭头）
  let inwardDirX: number
  let inwardDirY: number

  if (mode === 0) {
    // 普通模式：水平运动
    ballCX = padding + state.x * scale
    ballCY = groundY - objH
    tangentDirX = 1
    tangentDirY = 0
    inwardDirX = 0
    inwardDirY = -1  // 向上（屏幕坐标系 y 向下，-1 = 向上）
  } else if (state.phase === 0) {
    // 进阶模式 · 圆弧阶段
    // 轨道圆心在 (padding + R*scale, groundY - R*scale)
    // 球在轨道上的接触点 = (padding + state.x*scale, groundY - R*scale + state.y*scale)
    const trackCX = padding + state.x * scale
    const trackCY = (groundY - R * scale) + state.y * scale

    // 内法线方向（从接触点指向圆心）
    const centerCX = padding + R * scale
    const centerCY = groundY - R * scale
    const dxToCenter = centerCX - trackCX
    const dyToCenter = centerCY - trackCY
    const distToCenter = Math.sqrt(dxToCenter * dxToCenter + dyToCenter * dyToCenter)
    inwardDirX = distToCenter > 0 ? dxToCenter / distToCenter : 0
    inwardDirY = distToCenter > 0 ? dyToCenter / distToCenter : 0

    // 球心 = 接触点 + ballR * 内法线方向（球在轨道内侧）
    ballCX = trackCX + ballR * inwardDirX
    ballCY = trackCY + ballR * inwardDirY

    // 切向方向 = 内法线逆时针旋转 90°（屏幕坐标系下 = 运动方向）
    tangentDirX = -inwardDirY
    tangentDirY = inwardDirX
  } else {
    // 进阶模式 · 水平阶段
    ballCX = padding + state.x * scale
    ballCY = groundY - ballR
    tangentDirX = 1
    tangentDirY = 0
    inwardDirX = 0
    inwardDirY = -1  // 向上
  }

  // ── 矢量归一化映射（参考 CircularMotionAnimation） ──
  // 物理量最大值（用于归一化）
  const vMax = mode === 0 ? Math.sqrt(v0 * v0 + 2 * (F_pull / m) * s_target) : Math.sqrt(v0 * v0 + 2 * 9.8 * R)
  const fMax = mode === 0 ? F_pull : m * 9.8  // 合力最大值
  const vectorMaxLen = Math.min(canvasSize.width, canvasSize.height) * VECTOR_DISPLAY.force.maxLengthRatio
  // 矢量长度 = ballR + (物理量/最大值) × (maxLen - ballR)，保证最短也有 ballR
  const vArrowLen = ballR + (state.v / Math.max(vMax, 0.1)) * (vectorMaxLen - ballR)
  const fArrowLen = ballR + (Math.abs(state.F) / Math.max(fMax, 0.1)) * (vectorMaxLen - ballR)

  // 物块水平位置（普通模式用）
  const carX = padding + state.x * scale

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

  const sceneConfig = useMemo((): SceneConfig => ({
    vectorBounds: { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height },
    originX: 0,
    originY: 0,
    worldWidth: canvasSize.width,
    worldHeight: canvasSize.height,
  }), [canvasSize.width, canvasSize.height]);
  const sceneScale = useMemo(() => createSceneScale(sceneConfig), [sceneConfig]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg shadow-inner overflow-hidden">
      {/* 进阶模式下的 Tab 切换 */}
      {mode === 1 && (
        <div className="absolute top-3 right-4 flex gap-1 z-10">
          <button
            onClick={() => setChartTab('ek-ep')}
            className={`px-2 py-0.5 font-semibold rounded border transition-all duration-200 ${
              chartTab === 'ek-ep'
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
            }`}
            style={{ fontSize: font(10) }}
          >
            能量-位移 图像
          </button>
          <button
            onClick={() => setChartTab('fx-at')}
            className={`px-2 py-0.5 font-semibold rounded border transition-all duration-200 ${
              chartTab === 'fx-at'
                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50 active:scale-[0.97]'
            }`}
            style={{ fontSize: font(10) }}
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
            <span className="text-accent-700 leading-snug" style={{ fontSize: font(9) }}>
              {mode === 0
                ? '拉力已撤去！累计做的拉力功刚好完全等于物块增加的动能（W = ΔEk）。此后物块做匀速运动。'
                : '物块已到达圆弧底端！重力做的正功与摩擦力做的负功之和（合力总功）刚好完全等于物块动能的变化量（W总 = ΔEk）。此后做匀速运动。'}
            </span>
          </div>
        </div>
      )}

      {/* 主 SVG 画面 */}
      <svg width={canvasSize.width} height={canvasSize.height} className="bg-transparent">
        <defs>


          {/* 不锈钢实体钢珠 3D 材质（进阶模式） */}
          <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
            <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
            <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
            <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
          </radialGradient>
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
                  <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">{eVal.toFixed(0)}J</text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const xVal = xMaxPhysic * frac
              const xPos = toFvChartX(xVal)
              return (
                <g key={`ek-x-${i}`}>
                  <line x1={xPos} y1={vtBottom} x2={xPos} y2={vtBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={vtBottom + 9} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{xVal.toFixed(1)}m</text>
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
            <circle cx={toFvChartX(state.x)} cy={toEnergyY(state.Ek)} r={3} fill={PHYSICS_COLORS.kineticEnergy} stroke={colors.neutral.white} strokeWidth={1} />

            {/* 临界拐点 (恒力撤力点或圆弧触底点) 虚线引导与波纹 */}
            {(() => {
              const criticalX = mode === 0 ? s_target : R
              const criticalEk = mode === 0 ? 0.5 * m * v_c * v_c : 0
              return (
                <g>
                  <line
                    x1={toFvChartX(criticalX)} y1={vtTop}
                    x2={toFvChartX(criticalX)} y2={vtBottom}
                    stroke={colors.accent[600]}
                    strokeWidth={0.8}
                    strokeDasharray={DASH.guide.join(',')}
                    opacity={0.5}
                  />
                  <circle cx={toFvChartX(criticalX)} cy={toEnergyY(criticalEk)} r={2} fill={colors.accent[600]} />
                  {renderRipple(toFvChartX(criticalX), toEnergyY(criticalEk))}
                </g>
              )
            })()}


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
                  <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">{eVal.toFixed(0)}J</text>
                </g>
              )
            })}

            {/* 进阶模式图例说明 */}
            {mode === 1 && (
              <g transform={`translate(${chartRight - 150}, ${ptTop - 10})`}>
                <line x1={0} y1={3} x2={8} y2={3} stroke={colors.success[600]} strokeWidth={1.5} />
                <text x={12} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>W重 (重力功)</text>

                <line x1={52} y1={3} x2={60} y2={3} stroke={colors.danger[600]} strokeWidth={1.5} />
                <text x={64} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>W摩 (摩擦功)</text>

                <line x1={104} y1={3} x2={112} y2={3} stroke={colors.primary[600]} strokeWidth={1.5} strokeDasharray="2,2" />
                <text x={116} y={5} fontSize={font(7)} fill={CHART_COLORS.tickLabel}>W总 (合力功)</text>
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
                <circle cx={toFvChartX(state.x)} cy={ptBottom - (state.W / E_max_limit) * ptHeight} r={3} fill={PHYSICS_COLORS.work} stroke={colors.neutral.white} strokeWidth={1} />
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
                <circle cx={toFvChartX(state.x)} cy={(ptTop + ptBottom) / 2 - (state.Ep / E_max_limit) * (ptHeight / 2)} r={2.5} fill={colors.success[600]} stroke={colors.neutral.white} strokeWidth={0.8} />

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
                <circle cx={toFvChartX(state.x)} cy={(ptTop + ptBottom) / 2 - ((state.W - state.Ep) / E_max_limit) * (ptHeight / 2)} r={2.5} fill={colors.danger[600]} stroke={colors.neutral.white} strokeWidth={0.8} />

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
                <circle cx={toFvChartX(state.x)} cy={(ptTop + ptBottom) / 2 - (state.W / E_max_limit) * (ptHeight / 2)} r={3} fill={colors.primary[600]} stroke={colors.neutral.white} strokeWidth={1} />
              </g>
            )}

            {/* 临界地点/触底 x=R 引导线（与动画区临界点对齐） */}
            <line
              x1={toFvChartX(mode === 0 ? s_target : R)} y1={ptTop}
              x2={toFvChartX(mode === 0 ? s_target : R)} y2={ptBottom}
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
                  <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">{fVal.toFixed(0)}N</text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const xVal = xMaxPhysic * frac
              const xPos = toFvChartX(xVal)
              return (
                <g key={`fv-x-${i}`}>
                  <line x1={xPos} y1={vtBottom} x2={xPos} y2={vtBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={vtBottom + 9} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{xVal.toFixed(1)}m</text>
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
            <circle cx={toFvChartX(state.x)} cy={toFvY(state.F)} r={3} fill={PHYSICS_COLORS.forceNet} stroke={colors.neutral.white} strokeWidth={1} />
            <text x={toFvChartX(state.x) + 5} y={toFvY(state.F) - 4} fontSize={font(7)} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">F_合={state.F.toFixed(1)}N</text>

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
                  <text x={chartLeft - 5} y={y + 3} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="end">{aVal.toFixed(1)}</text>
                </g>
              )
            })}
            {[0, 0.5, 1].map((frac, i) => {
              const tVal = tMax * frac
              const xPos = toChartX(tVal)
              return (
                <g key={`at-x-${i}`}>
                  <line x1={xPos} y1={ptBottom} x2={xPos} y2={ptBottom + 3} stroke={CHART_COLORS.tickMark} strokeWidth={0.5} />
                  <text x={xPos} y={ptBottom + 9} fontSize={font(7)} fill={CHART_COLORS.tickLabel} textAnchor="middle">{tVal.toFixed(0)}s</text>
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
            <circle cx={toChartX(state.t)} cy={toAtY(Math.abs(state.a))} r={3} fill={PHYSICS_COLORS.acceleration} stroke={colors.neutral.white} strokeWidth={1} />

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
        <line x1={padding * 0.5} y1={canvasSize.height * KE_LAYOUT.dividerRatio} x2={canvasSize.width - padding * 0.5} y2={canvasSize.height * KE_LAYOUT.dividerRatio} stroke={colors.neutral[200]} strokeWidth={1} />

        {/* ══════════════════════════════════════════════ */}
        {/* 下半部分：物块物理仿真场景 */}
        {/* ══════════════════════════════════════════════ */}

        {/* 轨道底盘直线段 */}
        <line x1={padding * 0.5} y1={groundY} x2={canvasSize.width - padding * 0.5} y2={groundY} stroke={PHYSICS_COLORS.labelText} strokeWidth={STROKE.groundLine} />
        <line x1={padding * 0.5} y1={groundY + 3} x2={canvasSize.width - padding * 0.5} y2={groundY + 3} stroke={colors.neutral[200]} strokeWidth={0.5} />

        {/* ── 进阶模式下的 1/4 圆弧曲面轨道 ── */}
        {/* 圆弧圆心在 (padding + R*scale, groundY - R*scale)，球沿内侧下滑 */}
        {mode === 1 && (
          <g>
            <path
              d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 1 ${padding + R * scale} ${groundY}`}
              fill="none"
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={STROKE.trackLine}
            />
            <path
              d={`M ${padding} ${groundY - R * scale} A ${R * scale} ${R * scale} 0 0 1 ${padding + R * scale} ${groundY}`}
              fill="none"
              stroke={colors.neutral[100]}
              strokeWidth={STROKE.objectThin}
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

        {/* ── 进阶模式下的切向摩擦阻碍虚线效果（与运动方向相反） ── */}
        {mode === 1 && state.phase === 0 && mu > 0.01 && state.v > 0.05 && (
          <line
            x1={ballCX - tangentDirX * (ballR + 2)}
            y1={ballCY - tangentDirY * (ballR + 2)}
            x2={ballCX - tangentDirX * (ballR + 18)}
            y2={ballCY - tangentDirY * (ballR + 18)}
            stroke={colors.danger[500]}
            strokeWidth={STROKE.vectorThin}
            strokeDasharray={DASH.reference.join(',')}
            opacity={0.8 * (state.v / (v_c > 0 ? v_c : 1))}
          />
        )}

        {/* ── 矢量显示开关（能量柱左侧） ── */}
        <g transform={`translate(${wallX - 90 - 22}, ${canvasSize.height * 0.58 + 4})`} 
           className="cursor-pointer" 
           onClick={() => useAnimationStore.getState().toggleVectors()}>
          <rect width={18} height={18} rx={3} 
            fill={showVectors ? colors.primary[100] : colors.neutral[100]} 
            stroke={showVectors ? colors.primary[600] : colors.neutral[300]} 
            strokeWidth={0.8} />
          {/* 速度箭头图标 */}
          <line x1={4} y1={13} x2={14} y2={5} 
            stroke={showVectors ? PHYSICS_COLORS.velocity : colors.neutral[400]} 
            strokeWidth={1.5} />
          <polygon points="14,5 10,5 14,9" 
            fill={showVectors ? PHYSICS_COLORS.velocity : colors.neutral[400]} />
          <title>{showVectors ? '隐藏速度矢量' : '显示速度矢量'}</title>
        </g>

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
            <text x={22} y={-barW_H - 4} fontSize={font(8.5)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="bold">
              {state.W >= 0 ? '+' : ''}{state.W.toFixed(1)}J
            </text>
            <text x={22} y={12} fontSize={font(8.5)} fill={PHYSICS_COLORS.work} textAnchor="middle" fontWeight="semibold">
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
            <text x={68} y={-barEk_H - 4} fontSize={font(8.5)} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="bold">
              {deltaEk >= 0 ? '+' : ''}{deltaEk.toFixed(1)}J
            </text>
            <text x={68} y={12} fontSize={font(8.5)} fill={PHYSICS_COLORS.kineticEnergy} textAnchor="middle" fontWeight="semibold">
              ΔEk
            </text>
            
            {/* 定理等价符号 '=' */}
            <text x={45} y={-18} fontSize={font(12)} fill={colors.neutral[600]} textAnchor="middle" fontWeight="bold">
              =
            </text>
          </g>
        </g>

        {/* ── 物体模型 ── */}
        {mode === 0 ? (
          // 普通模式：木块（水平运动）
          <g transform={`translate(${carX}, ${groundY - objH})`}>
            <Block
              x={0}
              y={0}
              width={objW}
              height={objH}
              type="woodCart"
              label={`${m.toFixed(1)}kg`}
              strokeWidth={1.5}
            />

            {/* 拉力 F 矢量（合力） */}
            {showVectors && state.F > 0.1 && (
              <VectorArrow
                origin={{ x: -Math.min(state.F * 1.5, 45), y: objH * 0.5 }}
                vector={{ x: -1, y: 0 }}
                type="force"
                sceneScale={sceneScale}
                pixelLength={Math.min(state.F * 1.5, 45) - 2}
              />
            )}

            {/* 速度 v 矢量 */}
            {showVectors && state.v > 0.05 && (
              <VectorArrow
                origin={{ x: objW * 0.5, y: -3.5 }}
                vector={{ x: 1, y: 0 }}
                type="velocity"
                sceneScale={sceneScale}
                pixelLength={Math.min(state.v * 4.5, 60)}
              />
            )}
          </g>
        ) : (
          // 进阶模式：钢珠（沿圆弧内侧下滑，水平阶段贴地运行）
          <g>
            <circle
              cx={ballCX}
              cy={ballCY}
              r={ballR}
              fill="url(#steel-sphere-grad)"
              stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
              strokeWidth={STROKE.objectLine}
            />

            {/* ── 力箭头（始终显示） ── */}
            <g>
              {/* 切向合力 F_合 矢量（从球心出发，沿切向；F<0 时反向） */}
              {Math.abs(state.F) > 0.1 && (
                <VectorArrow
                  origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                  vector={state.F >= 0
                    ? { x: tangentDirX, y: -tangentDirY }
                    : { x: -tangentDirX, y: tangentDirY }}
                  type="force"
                  sceneScale={sceneScale}
                  pixelLength={fArrowLen}
                />
              )}

              {/* 受力分析（仅圆弧阶段，从球心出发） */}
              {state.phase === 0 && (() => {
                const g = 9.8
                const mg = m * g
                const normalForce = mg * Math.cos(state.theta) + m * state.v * state.v / R
                const fFriction = mu * normalForce
                // 重力 mg：竖直向下（屏幕坐标系 y 正方向 = 向下）
                const gravityLen = ballR + (mg / Math.max(fMax, 0.1)) * (vectorMaxLen - ballR)
                const frictionLen = ballR + (fFriction / Math.max(fMax, 0.1)) * (vectorMaxLen - ballR)
                return (
                  <g>
                    {/* 重力 mg（竖直向下） */}
                    {mg > 0.1 && (
                      <VectorArrow
                        origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                        vector={{ x: 0, y: -1 }}
                        type="gravity"
                        sceneScale={sceneScale}
                        pixelLength={gravityLen}
                        strokeWidth={STROKE.vectorSub}
                      />
                    )}
                    {/* 摩擦力（负功，沿切向反方向） */}
                    {fFriction > 0.1 && (
                      <VectorArrow
                        origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                        vector={{ x: tangentDirX, y: -tangentDirY }}
                        type="friction"
                        sceneScale={sceneScale}
                        pixelLength={frictionLen}
                        strokeWidth={STROKE.vectorSub}
                      />
                    )}
                  </g>
                )
              })()}
            </g>

            {/* ── 速度 v 矢量（由 showVectors 开关控制） ── */}
            {showVectors && state.v > 0.05 && (
              <VectorArrow
                origin={{ x: ballCX, y: canvasSize.height - ballCY }}
                vector={{ x: tangentDirX, y: -tangentDirY }}
                type="velocity"
                sceneScale={sceneScale}
                pixelLength={vArrowLen}
              />
            )}
          </g>
        )}

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
