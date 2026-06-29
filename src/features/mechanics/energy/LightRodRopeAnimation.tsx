import { useMemo, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Ball, Pulley, VectorArrow, EnergyBars } from '@/components/Physics'
import { LightRodRopeCharts } from './lightRodRope/LightRodRopeCharts'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import { precomputeLightRodRopeTrajectory, getLRRStateAtTime } from '@/physics/lightRodRope'
import { GRAVITY } from '@/physics/constants'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'

// 设计尺寸 (Viewport 架构)
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 420

import { ENERGY_COLORS } from '@/theme/physics'

export default function LightRodRopeAnimation() {
  const { params, time, setTime, setIsPlaying } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
      setTime: s.setTime,
      setIsPlaying: s.setIsPlaying,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)
  const font = canvasSize.font

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  })

  // 1. 参数提取
  const m1 = params.m1 ?? 1.0 // A球质量 (kg)
  const m2 = params.m2 ?? 1.0 // B球质量 (kg)
  const constraint = params.constraint ?? 0 // 0=杆, 1=定滑轮绳, 2=轻绳三阶段
  const L = constraint === 0 ? (params.L ?? 1.2) : 1.2 // 杆总长 (m)
  const g = GRAVITY
  const showParticles = params.showParticles !== 0 // 1=开, 0=关
  const theta0 = params.theta0 ?? 30 // 初始释放角 (度)
  const v0 = params.v0 ?? 0.0 // 初始速度 (m/s)
  const showGravity = params.showGravity !== 0
  const showTension = params.showTension !== 0
  const showResolution = params.showResolution !== 0
  const showVelocityDecomp = constraint === 2 && params.showVelocityDecomp !== 0

  const theta0Rad = useMemo(() => ((90 - theta0) * Math.PI) / 180, [theta0])

  const tMax = 6

  // 2. 预计算物理轨迹
  const trajectory = useMemo(() => {
    return precomputeLightRodRopeTrajectory(m1, m2, L, g, constraint, tMax, 0.02, theta0Rad, v0)
  }, [m1, m2, L, g, constraint, theta0Rad, v0])

  // 当前时刻插值状态
  const state = useMemo(() => {
    return getLRRStateAtTime(trajectory, time)
  }, [trajectory, time])

  // 动画阶段截断拦截
  const tEnd = useMemo(() => {
    if (trajectory.length === 0) return 0
    return trajectory[trajectory.length - 1].t
  }, [trajectory])

  useEffect(() => {
    if (time >= tEnd && tEnd > 0) {
      setTime(tEnd)
      setIsPlaying(false)
    }
  }, [time, tEnd, setTime, setIsPlaying])

  // 3. 布局像素计算
  const pivotX = 180 // 轴心 X
  const pivotY = 166 // 轴心 Y (下移以避开上方能量条)
  const L_pix = L * 180 // 摆长对应的像素长度

  // 滑轮半径 (12px)
  const R_p = 12

  // 使用物理解析得出的真实相对直角坐标（米）换算成屏幕像素，支持脱轨做抛体运动
  // 双绳模式下 A球 只在滑轮正下方偏左（滑轮切点下方）运动，B球在摆动
  const x_A = constraint === 1 ? pivotX - R_p : pivotX + state.x_A_rel * 180
  const y_A = pivotY + state.y_A_rel * 180

  const x_B = pivotX + state.x_B_rel * 180
  const y_B = pivotY + state.y_B_rel * 180

  // 计算定滑轮边缘切点坐标作为绳子起点
  const thetaB_val = state.thetaB

  const x_start_A = constraint === 1 ? pivotX - R_p : pivotX
  const y_start_A = pivotY

  const x_start_B = constraint === 1 ? pivotX + R_p * Math.sin(thetaB_val) : pivotX
  const y_start_B = constraint === 1 ? pivotY - R_p * Math.cos(thetaB_val) : pivotY

  // B球初始 y 坐标
  const yB0 = useMemo(() => trajectory[0]?.y_B_rel ?? 0, [trajectory])
  const curHB = Math.max(0, state.y_B_rel - yB0)
  const curThetaB = Math.abs(90 - (state.thetaB * 180) / Math.PI)

  // 合并全部图表数据序列的计算，单次遍历轨迹以极大提高性能并消减冗余代码
  const chartsData = useMemo(() => {
    const et1: {x: number; y: number}[] = []
    const et2: {x: number; y: number}[] = []
    const etot: {x: number; y: number}[] = []
    const pt1: {x: number; y: number}[] = []
    const pt2: {x: number; y: number}[] = []
    const vHA: {x: number; y: number}[] = []
    const vHB: {x: number; y: number}[] = []
    const tTheta: {x: number; y: number}[] = []
    const vAt: {x: number; y: number}[] = []
    const vBt: {x: number; y: number}[] = []
    const tOA: {x: number; y: number}[] = []
    const tAB: {x: number; y: number}[] = []

    trajectory.forEach((pt) => {
      et1.push({ x: pt.t, y: pt.EA })
      et2.push({ x: pt.t, y: pt.EB })
      etot.push({ x: pt.t, y: pt.Etot })
      pt1.push({ x: pt.t, y: pt.powerA })
      pt2.push({ x: pt.t, y: pt.powerB })
      vHA.push({ x: Math.max(0, pt.y_B_rel - yB0), y: pt.vA })
      vHB.push({ x: Math.max(0, pt.y_B_rel - yB0), y: pt.vB })
      tTheta.push({ x: Math.abs(90 - (pt.thetaB * 180) / Math.PI), y: pt.T_B })
      vAt.push({ x: pt.t, y: pt.vA })
      vBt.push({ x: pt.t, y: pt.vB })
      tOA.push({ x: pt.t, y: pt.T_A })
      tAB.push({ x: pt.t, y: pt.T_B })
    })

    return { et1, et2, etot, pt1, pt2, vHA, vHB, tTheta, vAt, vBt, tOA, tAB }
  }, [trajectory, yB0])

  // 动态计算功率轴的最大值（对称）
  const P_max = useMemo(() => {
    let maxVal = 0.1
    trajectory.forEach((pt) => {
      const absP = Math.abs(pt.powerB)
      if (absP > maxVal) {
        maxVal = absP
      }
    })
    return maxVal * 1.35
  }, [trajectory])

  // 能量范围计算
  const E_max = (trajectory[0]?.Etot ?? 1.0) * 1.35

  // 模式 2 碰撞闪烁判定
  const hasCollisionRecent = useMemo(() => {
    if (constraint !== 2) return false
    const idx = trajectory.findIndex(pt => pt.t <= time && pt.t > time - 0.15)
    if (idx !== -1 && trajectory[idx].eventB === 'tension') {
      return true
    }
    return false
  }, [trajectory, time, constraint])

  // 模式 2 图表 markers 突变点标记
  const chartMarkers = useMemo(() => {
    if (constraint !== 2) return []
    const list: { axis: 'point' | 'vertical' | 'horizontal'; x: number; label: string; color: string }[] = []
    trajectory.forEach((pt) => {
      if (pt.eventB === 'tension') {
        list.push({
          axis: 'vertical',
          x: pt.t,
          label: '绳拉直',
          color: '#EF4444'
        })
      } else if (pt.eventB === 'slack') {
        list.push({
          axis: 'vertical',
          x: pt.t,
          label: '绳松弛',
          color: '#6B7280'
        })
      }
    })
    return list
  }, [trajectory, constraint])

  // 刚性轻杆能量传输粒子定位
  const particles = useMemo(() => {
    if (constraint !== 0 || !showParticles || Math.abs(state.powerB) <= 0.05) return []
    const list = []
    const dx = x_B - x_A
    const dy = y_B - y_A
    const isForward = state.powerB > 0 // A -> B 为正向
    for (let i = 0; i < 5; i++) {
      const progress = ((time * 2.5 + i * 0.2) % 1.0)
      const offsetRatio = isForward ? progress : (1.0 - progress)
      list.push({
        x: x_A + dx * offsetRatio,
        y: y_A + dy * offsetRatio,
      })
    }
    return list
  }, [constraint, showParticles, time, x_A, y_A, x_B, y_B, state.powerB])

  // 受力分解坐标计算 (只在刚性轻杆模式下使用)
  const FORCE_DRAW_SCALE = 2.5

  const F_A_radial = state.F_A_radial ?? { x: 0, y: 0 }
  const F_A_tangential = state.F_A_tangential ?? { x: 0, y: 0 }

  const mag_F_A = Math.sqrt(state.F_A.x * state.F_A.x + state.F_A.y * state.F_A.y)
  const mag_F_A_rad = Math.sqrt(F_A_radial.x * F_A_radial.x + F_A_radial.y * F_A_radial.y)
  const mag_F_A_tan = Math.sqrt(F_A_tangential.x * F_A_tangential.x + F_A_tangential.y * F_A_tangential.y)

  const x_A_total = x_A + state.F_A.x * FORCE_DRAW_SCALE
  const y_A_total = y_A - state.F_A.y * FORCE_DRAW_SCALE
  const x_A_rad = x_A + F_A_radial.x * FORCE_DRAW_SCALE
  const y_A_rad = y_A - F_A_radial.y * FORCE_DRAW_SCALE
  const x_A_tan = x_A + F_A_tangential.x * FORCE_DRAW_SCALE
  const y_A_tan = y_A - F_A_tangential.y * FORCE_DRAW_SCALE

  const F_B_radial = state.F_B_radial ?? { x: 0, y: 0 }
  const F_B_tangential = state.F_B_tangential ?? { x: 0, y: 0 }

  const mag_F_B = Math.sqrt(state.F_B.x * state.F_B.x + state.F_B.y * state.F_B.y)
  const mag_F_B_rad = Math.sqrt(F_B_radial.x * F_B_radial.x + F_B_radial.y * F_B_radial.y)
  const mag_F_B_tan = Math.sqrt(F_B_tangential.x * F_B_tangential.x + F_B_tangential.y * F_B_tangential.y)

  const x_B_total = x_B + state.F_B.x * FORCE_DRAW_SCALE
  const y_B_total = y_B - state.F_B.y * FORCE_DRAW_SCALE
  const x_B_rad = x_B + F_B_radial.x * FORCE_DRAW_SCALE
  const y_B_rad = y_B - F_B_radial.y * FORCE_DRAW_SCALE
  const x_B_tan = x_B + F_B_tangential.x * FORCE_DRAW_SCALE
  const y_B_tan = y_B - F_B_tangential.y * FORCE_DRAW_SCALE

  // 统一绘制可能松弛的轻绳的辅助函数
  const renderRope = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    isSlack: boolean,
    nominalLength: number
  ) => {
    if (isSlack) {
      const dx = x2 - x1
      const dy = y2 - y1
      const dist = Math.sqrt(dx * dx + dy * dy)
      // 松弛程度的物理拟合，保留至少 6px 的视觉下弯弧度
      const sag = Math.max(6, (nominalLength - dist) * 0.8)
      const cx = (x1 + x2) / 2
      const cy = (y1 + y2) / 2 + sag
      return (
        <path
          d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
          fill="none"
          stroke={SCENE_COLORS.surface.ropeColor}
          strokeWidth={1.5}
          strokeDasharray="4,4"
          strokeLinecap="round"
        />
      )
    } else {
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={SCENE_COLORS.surface.ropeActive}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )
    }
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-xl shadow-inner overflow-hidden select-none">
      <svg
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-full"
      >
        <g transform={vp.transform}>
          {/* ── 左半部分：动画区 ── */}
          <g>
            {/* 能量条实时分配（左侧上方） */}
            {(constraint === 1 || constraint === 2) && (() => {
              const energyItems = [
                { key: 'EpA', label: 'Ep_A', value: state.EpA, color: ENERGY_COLORS.potentialGravity },
                { key: 'EkA', label: 'Ek_A', value: state.EkA, color: ENERGY_COLORS.kineticEnergy },
                { key: 'EpB', label: 'Ep_B', value: state.EpB, color: ENERGY_COLORS.potentialElastic },
                { key: 'EkB', label: 'Ek_B', value: state.EkB, color: ENERGY_COLORS.kineticEnergy },
                { key: 'Etot', label: 'E总', value: state.Etot, color: ENERGY_COLORS.mechanicalEnergy },
              ]
              const minItemWidth = 58
              const foWidth = Math.min(320, canvasSize.width * 0.45)
              const needsCompact = foWidth < energyItems.length * minItemWidth || energyItems.length > 3
              const foHeight = needsCompact ? 75 : 85
              return (
                <foreignObject x={20} y={15} width={foWidth} height={foHeight}>
                  <EnergyBars
                    items={energyItems}
                    initialEtot={trajectory[0]?.Etot ?? 1.0}
                    font={font}
                    hasCollision={hasCollisionRecent}
                    collisionKey="Etot"
                    compact={needsCompact}
                  />
                </foreignObject>
              )
            })()}

            {/* 依据约束模式，动态渲染固定点或定滑轮 */}
            {constraint === 0 ? (
              <>
                {/* 刚性轻杆：微调上移并加装垂直悬挂轴销，满足力学装配常识 */}
                <rect x={pivotX - 40} y={pivotY - 14} width={80} height={8} fill={SCENE_COLORS.surface.wallFill} rx={1} />
                <line x1={pivotX - 50} y1={pivotY - 6} x2={pivotX + 50} y2={pivotY - 6} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />
                <line x1={pivotX} y1={pivotY - 6} x2={pivotX} y2={pivotY} stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={1.5} />
                <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />
              </>
            ) : constraint === 1 ? (
              <Pulley cx={pivotX} cy={pivotY} r={12} hangerTopY={pivotY - 35} />
            ) : (
              <>
                {/* 轻绳三阶段：微调上移并加装垂直悬挂轴销，满足力学装配常识 */}
                <rect x={pivotX - 30} y={pivotY - 14} width={60} height={8} fill={SCENE_COLORS.surface.wallFill} rx={1} />
                <line x1={pivotX - 40} y1={pivotY - 6} x2={pivotX + 40} y2={pivotY - 6} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />
                <line x1={pivotX} y1={pivotY - 6} x2={pivotX} y2={pivotY} stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={1.5} />
                <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />
              </>
            )}

            {/* 杆/绳渲染 */}
            {constraint === 0 ? (
              <g>
                {/* 杆的主体实心金属杆身（无阴影/无重影叠层） */}
                <line
                  x1={pivotX}
                  y1={pivotY}
                  x2={x_B}
                  y2={y_B}
                  stroke={SCENE_COLORS.pendulum.rodFill}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                {/* 悬挂支点 O、中间 A 球和末端 B 球节点处的微型金属转轴卡套 */}
                <circle cx={pivotX} cy={pivotY} r={5} fill="none" stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={1} />
                <circle cx={x_A} cy={y_A} r={4} fill="none" stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={1} />
                <circle cx={x_B} cy={y_B} r={5} fill="none" stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={1.2} />
              </g>
            ) : constraint === 1 ? (
              <g>
                {/* 绕在滑轮顶部的绳子弧线 */}
                <path
                  d={`M ${x_start_A} ${y_start_A} A ${R_p} ${R_p} 0 0 1 ${x_start_B} ${y_start_B}`}
                  fill="none"
                  stroke={SCENE_COLORS.surface.ropeActive}
                  strokeWidth={1.5}
                />
                {/* 绳 A */}
                {renderRope(x_start_A, y_start_A, x_A, y_A, state.isSlackA, L_pix / 2)}
                {/* 绳 B */}
                {renderRope(x_start_B, y_start_B, x_B, y_B, state.isSlackB, L_pix)}
              </g>
            ) : (
              <g>
                {/* 绳 OA */}
                {renderRope(pivotX, pivotY, x_A, y_A, state.isSlackA, L_pix / 2)}
                {/* 绳 AB */}
                {renderRope(x_A, y_A, x_B, y_B, state.isSlackB, L_pix / 2)}
              </g>
            )}

            {/* 能量转移粒子 */}
            {constraint === 0 && showParticles && particles.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={2.2}
                fill="white"
                stroke={PHYSICS_COLORS.kineticEnergy}
                strokeWidth={0.5}
                opacity={0.8}
              />
            ))}

            {/* 小球 A (m1) */}
            <Ball
              cx={x_A}
              cy={y_A}
              r={10}
              type="planetCool"
              stroke={SCENE_COLORS.sphere.planetCool.stroke}
              strokeWidth={1.5}
            />

            {/* 小球 B (m2) */}
            <Ball
              cx={x_B}
              cy={y_B}
              r={13}
              type="pendulumBob"
              stroke={SCENE_COLORS.sphere.pendulumBob.stroke}
              strokeWidth={1.5}
            />

            {/* 受力与速度矢量箭头 */}
            <g>
              {/* 1. 重力控制显示（开启速度分解时隐藏重力以防过载） */}
              {showGravity && (!showVelocityDecomp || constraint !== 2) && (
                <>
                  <VectorArrow
                    origin={{ x: x_A, y: -y_A }}
                    vector={{ x: 0, y: -m1 * g * 5 }}
                    type="gravity"
                    sceneScale={IDENTITY_SCENE_SCALE}
                    label="G_A"
                  />
                  <VectorArrow
                    origin={{ x: x_B, y: -y_B }}
                    vector={{ x: 0, y: -m2 * g * 5 }}
                    type="gravity"
                    sceneScale={IDENTITY_SCENE_SCALE}
                    label="G_B"
                  />
                </>
              )}

              {/* 2. 杆/绳作用力及其分解 */}
              {constraint === 0 ? (
                <>
                  {/* A球拉力及分解 */}
                  {showTension && (
                    <VectorArrow
                      origin={{ x: x_A, y: -y_A }}
                      vector={state.F_A}
                      pixelLength={mag_F_A * FORCE_DRAW_SCALE}
                      type="tension"
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="F_杆A"
                    />
                  )}
                  {showResolution && (
                    <>
                      <VectorArrow
                        origin={{ x: x_A, y: -y_A }}
                        vector={F_A_radial}
                        pixelLength={mag_F_A_rad * FORCE_DRAW_SCALE}
                        type="forceComponent"
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="F_A径"
                        dashed={true}
                      />
                      <VectorArrow
                        origin={{ x: x_A, y: -y_A }}
                        vector={F_A_tangential}
                        pixelLength={mag_F_A_tan * FORCE_DRAW_SCALE}
                        type="forceComponent"
                        color={PHYSICS_COLORS.velocity}
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="F_A切"
                      />
                      <line
                        x1={x_A_rad} y1={y_A_rad}
                        x2={x_A_total} y2={y_A_total}
                        stroke={PHYSICS_COLORS.axis}
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />
                      <line
                        x1={x_A_tan} y1={y_A_tan}
                        x2={x_A_total} y2={y_A_total}
                        stroke={PHYSICS_COLORS.axis}
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />
                    </>
                  )}

                  {/* B球拉力及分解 */}
                  {showTension && (
                    <VectorArrow
                      origin={{ x: x_B, y: -y_B }}
                      vector={state.F_B}
                      pixelLength={mag_F_B * FORCE_DRAW_SCALE}
                      type="tension"
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="F_杆B"
                    />
                  )}
                  {showResolution && (
                    <>
                      <VectorArrow
                        origin={{ x: x_B, y: -y_B }}
                        vector={F_B_radial}
                        pixelLength={mag_F_B_rad * FORCE_DRAW_SCALE}
                        type="forceComponent"
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="F_B径"
                        dashed={true}
                      />
                      <VectorArrow
                        origin={{ x: x_B, y: -y_B }}
                        vector={F_B_tangential}
                        pixelLength={mag_F_B_tan * FORCE_DRAW_SCALE}
                        type="forceComponent"
                        color={PHYSICS_COLORS.power}
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="F_B切"
                      />
                      <line
                        x1={x_B_rad} y1={y_B_rad}
                        x2={x_B_total} y2={y_B_total}
                        stroke={PHYSICS_COLORS.axis}
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />
                      <line
                        x1={x_B_tan} y1={y_B_tan}
                        x2={x_B_total} y2={y_B_total}
                        stroke={PHYSICS_COLORS.axis}
                        strokeWidth={1}
                        strokeDasharray="2,2"
                      />
                    </>
                  )}
                </>
              ) : constraint === 1 ? (
                <>
                  {showTension && (
                    <>
                      <VectorArrow
                        origin={{ x: x_A, y: -y_A }}
                        vector={{ x: state.F_A.x * 2.5, y: state.F_A.y * 2.5 }}
                        type="force"
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="F_绳A"
                      />
                      <VectorArrow
                        origin={{ x: x_B, y: -y_B }}
                        vector={{ x: state.F_B.x * 2.5, y: state.F_B.y * 2.5 }}
                        type="force"
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="F_绳B"
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* constraint === 2: 轻绳三阶段绳子张力矢量 (开启速度分解时自动隐藏) */}
                  {showTension && !showVelocityDecomp && (
                    <>
                      {/* OA 绳拉力指向悬挂点 O */}
                      <VectorArrow
                        origin={{ x: x_A, y: -y_A }}
                        vector={state.F_A}
                        pixelLength={state.T_A * 2.5}
                        type="tension"
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="T_OA"
                      />

                      {/* AB 绳对 A 球拉力指向 B 球 */}
                      {(() => {
                        const dx_AB = x_B - x_A
                        const dy_AB = y_B - y_A
                        const len_AB = Math.sqrt(dx_AB * dx_AB + dy_AB * dy_AB)
                        const nx_AB = len_AB > 1e-6 ? dx_AB / len_AB : 0
                        const ny_AB = len_AB > 1e-6 ? dy_AB / len_AB : 1
                        const F_A_AB_phys = {
                          x: state.T_B * nx_AB,
                          y: -state.T_B * ny_AB
                        }
                        return (
                          <VectorArrow
                            origin={{ x: x_A, y: -y_A }}
                            vector={F_A_AB_phys}
                            pixelLength={state.T_B * 2.5}
                            type="tension"
                            sceneScale={IDENTITY_SCENE_SCALE}
                            label="T_AB"
                          />
                        )
                      })()}

                      {/* AB 绳对 B 球拉力指向 A 球 */}
                      <VectorArrow
                        origin={{ x: x_B, y: -y_B }}
                        vector={state.F_B}
                        pixelLength={state.T_B * 2.5}
                        type="tension"
                        sceneScale={IDENTITY_SCENE_SCALE}
                        label="T_AB"
                      />
                    </>
                  )}
                </>
              )}

              {/* 3. 模式 2 速度矢量与直角分解三角形 (开启时隐藏拉力与重力以保 Canvas 清洁) */}
              {constraint === 2 && showVelocityDecomp && (() => {
                const dx_AB = x_B - x_A
                const dy_AB = y_B - y_A
                const len_AB = Math.sqrt(dx_AB * dx_AB + dy_AB * dy_AB)
                const nx_AB = len_AB > 1e-6 ? dx_AB / len_AB : 0
                const ny_AB = len_AB > 1e-6 ? dy_AB / len_AB : 1

                const vScale = 22 // 速度渲染比例尺，防越界

                // A 球速度投影与矢量
                const vA_para = state.vAx * nx_AB + state.vAy * (-ny_AB)
                const vAx_para = vA_para * nx_AB
                const vAy_para = vA_para * (-ny_AB)
                const vAx_perp = state.vAx - vAx_para
                const vAy_perp = state.vAy - vAy_para

                const x_A_v = x_A + state.vAx * vScale
                const y_A_v = y_A - state.vAy * vScale
                const x_A_v_para = x_A + vAx_para * vScale
                const y_A_v_para = y_A - vAy_para * vScale

                // B 球速度投影与矢量
                const vB_para = state.vBx * nx_AB + state.vBy * (-ny_AB)
                const vBx_para = vB_para * nx_AB
                const vBy_para = vB_para * (-ny_AB)
                const vBx_perp = state.vBx - vBx_para
                const vBy_perp = state.vBy - vBy_para

                const x_B_v = x_B + state.vBx * vScale
                const y_B_v = y_B - state.vBy * vScale
                const x_B_v_para = x_B + vBx_para * vScale
                const y_B_v_para = y_B - vBy_para * vScale

                return (
                  <>
                    {/* A球速度矢量 */}
                    <VectorArrow
                      origin={{ x: x_A, y: -y_A }}
                      vector={{ x: state.vAx, y: state.vAy }}
                      pixelLength={state.vA * vScale}
                      type="velocity"
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="v_A"
                    />
                    <VectorArrow
                      origin={{ x: x_A, y: -y_A }}
                      vector={{ x: vAx_para, y: vAy_para }}
                      pixelLength={Math.abs(vA_para) * vScale}
                      type="velocity"
                      color={PHYSICS_COLORS.velocityX}
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="v_A∥"
                    />
                    <VectorArrow
                      origin={{ x: x_A, y: -y_A }}
                      vector={{ x: vAx_perp, y: vAy_perp }}
                      pixelLength={Math.sqrt(vAx_perp * vAx_perp + vAy_perp * vAy_perp) * vScale}
                      type="velocity"
                      color={PHYSICS_COLORS.velocityY}
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="v_A⊥"
                    />
                    <line
                      x1={x_A_v_para} y1={y_A_v_para}
                      x2={x_A_v} y2={y_A_v}
                      stroke={PHYSICS_COLORS.axis}
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />

                    {/* B球速度矢量 */}
                    <VectorArrow
                      origin={{ x: x_B, y: -y_B }}
                      vector={{ x: state.vBx, y: state.vBy }}
                      pixelLength={state.vB * vScale}
                      type="velocity"
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="v_B"
                    />
                    <VectorArrow
                      origin={{ x: x_B, y: -y_B }}
                      vector={{ x: vBx_para, y: vBy_para }}
                      pixelLength={Math.abs(vB_para) * vScale}
                      type="velocity"
                      color={PHYSICS_COLORS.velocityX}
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="v_B∥"
                    />
                    <VectorArrow
                      origin={{ x: x_B, y: -y_B }}
                      vector={{ x: vBx_perp, y: vBy_perp }}
                      pixelLength={Math.sqrt(vBx_perp * vBx_perp + vBy_perp * vBy_perp) * vScale}
                      type="velocity"
                      color={PHYSICS_COLORS.velocityY}
                      sceneScale={IDENTITY_SCENE_SCALE}
                      label="v_B⊥"
                    />
                    <line
                      x1={x_B_v_para} y1={y_B_v_para}
                      x2={x_B_v} y2={y_B_v}
                      stroke={PHYSICS_COLORS.axis}
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />

                    {/* 绷紧时的相等文字指示 */}
                    {!state.isSlackB && (
                      <text
                        x={(x_A + x_B) / 2}
                        y={(y_A + y_B) / 2 - 12}
                        textAnchor="middle"
                        fill={PHYSICS_COLORS.velocityX}
                        fontSize={font ? font(9) : 9}
                        fontWeight="bold"
                      >
                        v_A∥ = v_B∥
                      </text>
                    )}
                  </>
                )
              })()}
            </g>

            {/* 终点 UI 扁平状态警示 Alert 提示框 (仅在双绳模式下生效，无毛玻璃滤镜) */}
            {constraint === 1 && time >= tEnd - 0.001 && state.stopReason && (
              <g transform={`translate(20, 18)`}>
                <rect
                  width={310}
                  height={28}
                  rx={4}
                  fill={state.stopReason === 'slack' ? colors.danger[50] : colors.success[50]}
                  stroke={state.stopReason === 'slack' ? colors.danger[200] : colors.success[200]}
                  strokeWidth={1}
                />
                <text
                  x={155}
                  y={18}
                  textAnchor="middle"
                  fill={state.stopReason === 'slack' ? colors.danger[700] : colors.success[700]}
                  fontSize={font ? font(11) : 11}
                  fontWeight="bold"
                >
                  {state.stopReason === 'slack'
                    ? '⚠️ 绳子张力降为 0 开始松弛，第一阶段结束'
                    : '✅ 小球到达最低点，第一运动阶段结束'}
                </text>
              </g>
            )}
          </g>

        </g>

        {/* ── 右半部分：并存展示的能量与功率双图表矩阵 / 高考柱状图与切换图（置于 vp.transform 外侧以避免二次缩放） ── */}
        <LightRodRopeCharts
          constraint={constraint}
          vp={vp}
          chartsData={chartsData}
          tMax={tMax}
          eMax={E_max}
          pMax={P_max}
          time={time}
          curHB={curHB}
          curThetaB={curThetaB}
          chartMarkers={chartMarkers}
        />
      </svg>
    </div>
  )
}
