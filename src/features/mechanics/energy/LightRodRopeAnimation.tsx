import { useMemo } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, SCENE_COLORS } from '@/theme/physics'
import { Ball, Pulley, VectorArrow } from '@/components/Physics'
import { RelationChart } from '@/components/Chart'
import { IDENTITY_SCENE_SCALE } from '@/scene/SceneScale'
import { precomputeLightRodRopeTrajectory, getLRRStateAtTime } from '@/physics/lightRodRope'
import { GRAVITY } from '@/physics/constants'
import { useCanvasSize, useViewport } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'

// 设计尺寸 (Viewport 架构)
const DESIGN_WIDTH = 700
const DESIGN_HEIGHT = 420

export default function LightRodRopeAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.standard)

  const vp = useViewport(canvasSize, {
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  })

  // 1. 参数提取
  const m1 = params.m1 ?? 1.0 // A球质量 (kg)
  const m2 = params.m2 ?? 1.0 // B球质量 (kg)
  const L = params.L ?? 1.2 // 杆总长 (m)
  const g = GRAVITY
  const constraint = params.constraint ?? 0 // 0=杆, 1=绳
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
  }, [m1, m2, L, constraint, theta0Rad, v0])

  // 当前时刻插值状态
  const state = useMemo(() => {
    return getLRRStateAtTime(trajectory, time)
  }, [trajectory, time])

  // 3. 布局像素计算
  const pivotX = 180 // 轴心 X
  const pivotY = 100 // 轴心 Y
  const L_pix = L * 180 // 摆长对应的像素长度

  // 使用物理解析得出的真实相对直角坐标（米）换算成屏幕像素，支持脱轨做抛体运动
  const x_A = pivotX + state.x_A_rel * 180
  const y_A = pivotY + state.y_A_rel * 180

  const x_B = pivotX + state.x_B_rel * 180
  const y_B = pivotY + state.y_B_rel * 180

  // 计算定滑轮边缘切点坐标作为绳子起点 (滑轮半径为 12px)
  const R_p = 12
  const thetaA_val = state.thetaA
  const thetaB_val = state.thetaB

  const x_start_A = constraint === 1 ? pivotX - R_p * Math.sin(thetaA_val) : pivotX
  const y_start_A = constraint === 1 ? pivotY + R_p * Math.cos(thetaA_val) : pivotY

  const x_start_B = constraint === 1 ? pivotX + R_p * Math.sin(thetaB_val) : pivotX
  const y_start_B = constraint === 1 ? pivotY - R_p * Math.cos(thetaB_val) : pivotY

  // 提取绳子松弛和拉紧的关键时间点作为图表 markers 标记
  const energyMarkers = useMemo(() => {
    if (constraint !== 1) return []
    const list: any[] = []
    trajectory.forEach((pt) => {
      if (pt.eventA === 'slack') {
        list.push({
          axis: 'point',
          x: pt.t,
          y: pt.EA,
          label: 'A绳松弛',
          color: PHYSICS_COLORS.velocity,
        })
      } else if (pt.eventA === 'tension') {
        list.push({
          axis: 'point',
          x: pt.t,
          y: pt.EA,
          label: 'A绳拉紧',
          color: PHYSICS_COLORS.velocity,
        })
      }
      if (pt.eventB === 'slack') {
        list.push({
          axis: 'point',
          x: pt.t,
          y: pt.EB,
          label: 'B绳松弛',
          color: PHYSICS_COLORS.power,
        })
      } else if (pt.eventB === 'tension') {
        list.push({
          axis: 'point',
          x: pt.t,
          y: pt.EB,
          label: 'B绳拉紧',
          color: PHYSICS_COLORS.power,
        })
      }
    })
    return list
  }, [trajectory, constraint])

  // 4. 能量与功率的时间曲线序列
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

  // 5. 能量范围计算
  const E_max = (trajectory[0]?.Etot ?? 1.0) * 1.35

  // 6. 能量传输粒子定位
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

  // 7. 受力分解坐标计算 (只在刚性轻杆模式下使用)
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
            {/* 依据约束模式，动态渲染固定点或定滑轮 */}
            {constraint === 0 ? (
              <>
                {/* 刚性轻杆：普通的旋转轴 */}
                <rect x={pivotX - 40} y={98} width={80} height={10} fill={SCENE_COLORS.surface.wallFill} rx={1} />
                <line x1={pivotX - 50} y1={108} x2={pivotX + 50} y2={108} stroke={SCENE_COLORS.pendulum.arcPath} strokeWidth={1.5} />
                <circle cx={pivotX} cy={pivotY} r={4} fill={SCENE_COLORS.pendulum.pivotFill} />
              </>
            ) : (
              <Pulley cx={pivotX} cy={pivotY} r={12} hangerTopY={65} />
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
          </g>

          {/* ── 右半部分：并存展示的能量与功率双图表矩阵 ── */}
          <foreignObject x={370} y={20} width={310} height={380}>
            <div className="w-full h-full flex flex-col gap-4">
              {/* 图表 A：【能量-时间 E-t 曲线】 */}
              <div className="flex-1 min-h-0 p-1 bg-white rounded-lg border border-neutral-100 shadow-sm">
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
                  markers={energyMarkers}
                  initialSize={{ width: 310, height: 175 }}
                />
              </div>

              {/* 图表 B：【瞬时功率-时间 P-t 曲线】 */}
              <div className="flex-1 min-h-0 p-1 bg-white rounded-lg border border-neutral-100 shadow-sm">
                <RelationChart
                  points={pt1Series}
                  mainLabel={constraint === 0 ? "杆对 A 功率 PA" : "绳对 A 功率 PA"}
                  color={PHYSICS_COLORS.velocity}
                  additionalSeries={[
                    {
                      points: pt2Series,
                      label: constraint === 0 ? "杆对 B 功率 PB" : "绳对 B 功率 PB",
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
                  initialSize={{ width: 310, height: 175 }}
                />
              </div>
            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
  )
}
