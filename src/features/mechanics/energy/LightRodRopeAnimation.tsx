import { useMemo, useEffect } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { Ball, Pulley, VectorArrow } from '@/components/Physics'
import { RelationChart } from '@/components/Chart'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import { precomputeLightRodRopeTrajectory, getLRRStateAtTime } from '@/physics/lightRodRope'
import type { LRRModelState } from '@/physics/lightRodRope'
import { GRAVITY } from '@/physics/constants'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'

// 设计尺寸 (Viewport 架构)
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 420

/**
 * 实时能量分配动态柱状图 (双绳模式专用)
 */
const EnergyBars = ({ state, initialEtot }: { state: LRRModelState; initialEtot: number }) => {
  const { EpA, EkA, EpB, EkB, Etot } = state
  const maxVal = initialEtot > 0 ? initialEtot : 1.0

  const getPercent = (val: number) => {
    return Math.min(100, Math.max(0, (val / maxVal) * 100))
  }

  return (
    <div className="flex flex-col p-1 bg-transparent select-none">
      <div className="text-[10px] font-bold text-neutral-600 mb-1 flex justify-between items-center">
        <span>系统机械能实时分配 (J)</span>
        <span className="text-[9px] text-neutral-400 font-normal">初始: {initialEtot.toFixed(2)} J</span>
      </div>

      <div className="relative h-10 flex items-end justify-between pt-2.5 px-1 border-b border-neutral-200">
        {/* 紫色虚线代表系统总能量 */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-purple-500 opacity-60 z-0 pointer-events-none transition-all duration-100"
          style={{ bottom: `${getPercent(Etot)}%` }}
        />

        {/* EpA */}
        <div className="flex flex-col items-center flex-1 z-10">
          <div className="relative w-4 bg-neutral-100 rounded-t-sm h-8 flex items-end">
            <div
              className="w-full bg-purple-600/70 rounded-t-sm transition-all duration-100"
              style={{ height: `${getPercent(EpA)}%` }}
            />
            <span className="absolute -top-3 text-[8px] font-bold text-purple-700 w-full text-center">
              {EpA.toFixed(2)}
            </span>
          </div>
          <span className="text-[8px] mt-0.5 font-bold text-neutral-500">Ep_A</span>
        </div>

        {/* EkA */}
        <div className="flex flex-col items-center flex-1 z-10">
          <div className="relative w-4 bg-neutral-100 rounded-t-sm h-8 flex items-end">
            <div
              className="w-full bg-blue-500 rounded-t-sm transition-all duration-100"
              style={{ height: `${getPercent(EkA)}%` }}
            />
            <span className="absolute -top-3 text-[8px] font-bold text-blue-600 w-full text-center">
              {EkA.toFixed(2)}
            </span>
          </div>
          <span className="text-[8px] mt-0.5 font-bold text-neutral-500">Ek_A</span>
        </div>

        {/* EpB */}
        <div className="flex flex-col items-center flex-1 z-10">
          <div className="relative w-4 bg-neutral-100 rounded-t-sm h-8 flex items-end">
            <div
              className="w-full bg-purple-600 rounded-t-sm transition-all duration-100"
              style={{ height: `${getPercent(EpB)}%` }}
            />
            <span className="absolute -top-3 text-[8px] font-bold text-purple-800 w-full text-center">
              {EpB.toFixed(2)}
            </span>
          </div>
          <span className="text-[8px] mt-0.5 font-bold text-neutral-500">Ep_B</span>
        </div>

        {/* EkB */}
        <div className="flex flex-col items-center flex-1 z-10">
          <div className="relative w-4 bg-neutral-100 rounded-t-sm h-8 flex items-end">
            <div
              className="w-full bg-blue-600 rounded-t-sm transition-all duration-100"
              style={{ height: `${getPercent(EkB)}%` }}
            />
            <span className="absolute -top-3 text-[8px] font-bold text-blue-700 w-full text-center">
              {EkB.toFixed(2)}
            </span>
          </div>
          <span className="text-[8px] mt-0.5 font-bold text-neutral-500">Ek_B</span>
        </div>

        {/* E总柱 */}
        <div className="flex flex-col items-center flex-1 z-10">
          <div className="relative w-4 bg-purple-50 rounded-t-sm h-8 flex items-end border border-purple-100">
            <div
              className="w-full bg-purple-600 rounded-t-sm transition-all duration-100"
              style={{ height: `${getPercent(Etot)}%` }}
            />
            <span className="absolute -top-3 text-[8px] font-bold text-purple-900 w-full text-center">
              {Etot.toFixed(2)}
            </span>
          </div>
          <span className="text-[8px] mt-0.5 font-bold text-purple-700">E总</span>
        </div>
      </div>
    </div>
  )
}

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
  const constraint = params.constraint ?? 0 // 0=杆, 1=绳
  const L = constraint === 0 ? (params.L ?? 1.2) : 1.2 // 杆总长 (m)，双绳分系固定为1.2m
  const g = GRAVITY
  const showParticles = params.showParticles !== 0 // 1=开, 0=关
  const theta0 = params.theta0 ?? 30 // 初始释放角 (度)
  const v0 = params.v0 ?? 0.0 // 初始速度 (m/s)
  const showGravity = params.showGravity !== 0
  const showTension = params.showTension !== 0
  const showResolution = params.showResolution !== 0

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
  const pivotY = 130 // 轴心 Y (下移以避开上方能量条)
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

  const vHSeriesA = useMemo(() => {
    if (trajectory.length === 0) return []
    return trajectory.map((pt) => ({
      x: Math.max(0, pt.y_B_rel - yB0),
      y: pt.vA,
    }))
  }, [trajectory, yB0])

  const vHSeriesB = useMemo(() => {
    if (trajectory.length === 0) return []
    return trajectory.map((pt) => ({
      x: Math.max(0, pt.y_B_rel - yB0),
      y: pt.vB,
    }))
  }, [trajectory, yB0])

  const tThetaSeries = useMemo(() => {
    return trajectory.map((pt) => ({
      x: Math.abs(90 - (pt.thetaB * 180) / Math.PI),
      y: pt.T_B,
    }))
  }, [trajectory])

  // 刚性轻杆模式下：能量与功率的时间曲线序列
  const et1Series = useMemo(() => {
    return trajectory.map((pt) => ({ x: pt.t, y: pt.EA }))
  }, [trajectory])

  const et2Series = useMemo(() => {
    return trajectory.map((pt) => ({ x: pt.t, y: pt.EB }))
  }, [trajectory])

  const etotSeries = useMemo(() => {
    return trajectory.map((pt) => ({ x: pt.t, y: pt.Etot }))
  }, [trajectory])

  const pt1Series = useMemo(() => {
    return trajectory.map((pt) => ({ x: pt.t, y: pt.powerA }))
  }, [trajectory])

  const pt2Series = useMemo(() => {
    return trajectory.map((pt) => ({ x: pt.t, y: pt.powerB }))
  }, [trajectory])

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
            {constraint === 1 && (
              <foreignObject x={20} y={15} width={320} height={85}>
                <EnergyBars state={state} initialEtot={trajectory[0]?.Etot ?? 1.0} />
              </foreignObject>
            )}

            {/* 依据约束模式，动态渲染固定点或定滑轮 */}
            {constraint === 0 ? (
              <>
                {/* 刚性轻杆：普通的旋转轴 */}
                <rect x={pivotX - 40} y={128} width={80} height={10} fill={SCENE_COLORS.surface.wallFill} rx={1} />
                <line x1={pivotX - 50} y1={138} x2={pivotX + 50} y2={138} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />
                <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />
              </>
            ) : (
              <Pulley cx={pivotX} cy={pivotY} r={12} hangerTopY={95} />
            )}

            {/* 杆/绳渲染 */}
            {constraint === 0 ? (
              <line
                x1={pivotX}
                y1={pivotY}
                x2={x_B}
                y2={y_B}
                stroke={SCENE_COLORS.pendulum.rodFill}
                strokeWidth={3}
                strokeLinecap="round"
              />
            ) : (
              <g>
                {/* 绕在滑轮顶部的绳子弧线 */}
                <path
                  d={`M ${x_start_A} ${y_start_A} A ${R_p} ${R_p} 0 0 1 ${x_start_B} ${y_start_B}`}
                  fill="none"
                  stroke={SCENE_COLORS.pendulum.rodFill}
                  strokeWidth={1.5}
                />

                {/* 绳 A */}
                {state.isSlackA ? (
                  (() => {
                    const dx = x_A - x_start_A
                    const dy = y_A - y_start_A
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    const R_pix = L_pix / 2
                    const sag = Math.max(5, (R_pix - dist) * 0.8)
                    const cx = (x_start_A + x_A) / 2
                    const cy = (y_start_A + y_A) / 2 + sag
                    return (
                      <path
                        d={`M ${x_start_A} ${y_start_A} Q ${cx} ${cy} ${x_A} ${y_A}`}
                        fill="none"
                        stroke={SCENE_COLORS.pendulum.rodFill}
                        strokeWidth={1.5}
                        strokeDasharray="3,3"
                      />
                    )
                  })()
                ) : (
                  <line
                    x1={x_start_A}
                    y1={y_start_A}
                    x2={x_A}
                    y2={y_A}
                    stroke={SCENE_COLORS.pendulum.rodFill}
                    strokeWidth={1.5}
                  />
                )}

                {/* 绳 B */}
                {state.isSlackB ? (
                  (() => {
                    const dx = x_B - x_start_B
                    const dy = y_B - y_start_B
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    const R_pix = L_pix
                    const sag = Math.max(5, (R_pix - dist) * 0.8)
                    const cx = (x_start_B + x_B) / 2
                    const cy = (y_start_B + y_B) / 2 + sag
                    return (
                      <path
                        d={`M ${x_start_B} ${y_start_B} Q ${cx} ${cy} ${x_B} ${y_B}`}
                        fill="none"
                        stroke={SCENE_COLORS.pendulum.rodFill}
                        strokeWidth={1.5}
                        strokeDasharray="3,3"
                      />
                    )
                  })()
                ) : (
                  <line
                    x1={x_start_B}
                    y1={y_start_B}
                    x2={x_B}
                    y2={y_B}
                    stroke={SCENE_COLORS.pendulum.rodFill}
                    strokeWidth={1.5}
                  />
                )}
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

            {/* 受力矢量箭头 */}
            <g>
              {/* 1. 重力控制显示 */}
              {showGravity && (
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
              ) : (
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
              )}
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
        <foreignObject
          x={vp.tx + 370 * vp.scale}
          y={vp.ty + 10 * vp.scale}
          width={310 * vp.scale}
          height={400 * vp.scale}
        >
          <div className="w-full h-full flex flex-col" style={{ gap: `${20 * vp.scale}px` }}>
            {constraint === 0 ? (
              // 刚性轻杆模式下：原有双曲线图
              <>
                <div className="flex-1 min-h-0">
                  <RelationChart
                    points={et1Series}
                    mainLabel="A球机械能 EA"
                    color={PHYSICS_COLORS.velocity}
                    additionalSeries={[
                      {
                        points: et2Series,
                        label: 'B球机械能 EB',
                        color: PHYSICS_COLORS.power,
                      },
                      {
                        points: etotSeries,
                        label: '系统总能 E总',
                        color: PHYSICS_COLORS.mechanicalEnergy,
                        strokeWidth: 2,
                      },
                    ]}
                    xDomain={[0, tMax]}
                    yDomain={[0, E_max]}
                    xLabel="时间 t (s)"
                    yLabel="能量 E (J)"
                    title="能量-时间 (E-t) 曲线"
                    cursorX={time}
                  />
                </div>

                <div className="flex-1 min-h-0">
                  <RelationChart
                    points={pt1Series}
                    mainLabel="杆对 A 功率 PA"
                    color={PHYSICS_COLORS.velocity}
                    additionalSeries={[
                      {
                        points: pt2Series,
                        label: "杆对 B 功率 PB",
                        color: PHYSICS_COLORS.power,
                      },
                    ]}
                    xDomain={[0, tMax]}
                    yDomain={[-P_max, P_max]}
                    xLabel="时间 t (s)"
                    yLabel="功率 P (W)"
                    title="瞬时功率-时间 (P-t) 曲线"
                    cursorX={time}
                    showZeroLine={true}
                  />
                </div>
              </>
            ) : (
              // 双绳分系高考模式下：两个关联曲线图并列纵向展示（不切换）
              <>
                <div className="flex-1 min-h-0">
                  <RelationChart
                    key="vh-chart"
                    points={vHSeriesA}
                    mainLabel="A球速度 vA"
                    color={PHYSICS_COLORS.velocity}
                    additionalSeries={[
                      {
                        points: vHSeriesB,
                        label: 'B球速度 vB',
                        color: PHYSICS_COLORS.power,
                      },
                    ]}
                    xLabel="B球下落高度 h_B (m)"
                    yLabel="速度 v (m/s)"
                    title="速度-高度 (v-h_B) 曲线"
                    cursorX={curHB}
                  />
                </div>

                <div className="flex-1 min-h-0">
                  <RelationChart
                    key="Ttheta-chart"
                    points={tThetaSeries}
                    mainLabel="绳子张力 T"
                    color={PHYSICS_COLORS.velocity}
                    xLabel="B绳与竖直方向偏角 θ (°)"
                    yLabel="张力 T (N)"
                    title="张力-偏角 (T-θ) 曲线"
                    cursorX={curThetaB}
                  />
                </div>
              </>
            )}
          </div>
        </foreignObject>
      </svg>
    </div>
  )
}
