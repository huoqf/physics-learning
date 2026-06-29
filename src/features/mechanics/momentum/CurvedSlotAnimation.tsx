import { useMemo, useId } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasSize, useViewport, getPointsUpToTime } from '@/utils'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VelocityTimeChart } from '@/components/Chart'
import { Ball } from '@/components/Physics/Ball'
import { precomputeCurvedSlot, interpolateCurvedSlot } from '@/physics/momentumApplication/curvedSlot'

const CANVAS_DESIGN = { width: 700, height: 260 }
const GROUND_X = 0
const GROUND_Y = Math.round(CANVAS_DESIGN.height * 0.77)
const GROUND_WIDTH = CANVAS_DESIGN.width
const SLOT_PX_PER_M = 40
const SLOT_ORIGIN_X = Math.round(CANVAS_DESIGN.width * 0.5)
const SLOT_EXTRA_WIDTH = 30
const BALL_RADIUS_PX = 10
const SLOT_SIM = { duration: 6, dt: 0.002 }

export default function CurvedSlotAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_DESIGN)
  const vp = useViewport(canvasSize, { designWidth: CANVAS_DESIGN.width, designHeight: CANVAS_DESIGN.height })

  // 参数解析
  const m_block = params.m_block ?? 2
  const M_slot = params.M_slot ?? 5
  const R_slot = params.R_slot ?? 1.5
  const isFixed = params.isFixed ?? 0      // 0: 自由滑动, 1: 固定在地面
  const slotShape = params.slotShape ?? 0  // 0: 四分之一弧, 1: 对称半圆槽
  const showVectors = params.showVectors ?? 1
  const showDisplacement = params.showDisplacement ?? 0

  const GROUND_GAP = isFixed === 0 ? 3 : 0
  const COMP_GROUND_Y = GROUND_Y - GROUND_GAP

  const sceneScale = useMemo(() => ({
    scaleX: SLOT_PX_PER_M, scaleY: SLOT_PX_PER_M, scale: SLOT_PX_PER_M,
    originX: SLOT_ORIGIN_X, originY: COMP_GROUND_Y, maxVectorLength: 45,
    refMagnitudes: { force: 25, normalForce: 25, appliedForce: 25, forceComponent: 25, velocity: 5 }
  }), [COMP_GROUND_Y])

  // 物理预计算与插值
  const states = useMemo(() => {
    return precomputeCurvedSlot(m_block, M_slot, R_slot, 9.8, SLOT_SIM.duration, SLOT_SIM.dt, isFixed, slotShape)
  }, [m_block, M_slot, R_slot, isFixed, slotShape])

  const slotState = useMemo(() => interpolateCurvedSlot(states, time), [states, time])

  // 各图像坐标集生成
  const {
    vtDomain_m_vx, vtDomain_m_vy, vtDomain_M_vx,
    vtPoints_m_vx, vtPoints_m_vy, vtPoints_M_vx,
    ptDomain_m, ptDomain_M, ptDomain_Total,
    ptPoints_m, ptPoints_M, ptPoints_Total,
    etDomain_Ek_m, etDomain_Ek_M, etDomain_Ep, etDomain_Total,
    etPoints_Ek_m, etPoints_Ek_M, etPoints_Ep, etPoints_Total
  } = useMemo(() => {
    const vtDomain_m_vx = states.map(pt => ({ t: pt.t, v: pt.v_x }))
    const vtDomain_m_vy = states.map(pt => ({ t: pt.t, v: pt.v_y }))
    const vtDomain_M_vx = states.map(pt => ({ t: pt.t, v: pt.v_X }))
    const vtPoints_m_vx = getPointsUpToTime(vtDomain_m_vx, time)
    const vtPoints_m_vy = getPointsUpToTime(vtDomain_m_vy, time)
    const vtPoints_M_vx = getPointsUpToTime(vtDomain_M_vx, time)

    const ptDomain_m = states.map(pt => ({ t: pt.t, v: m_block * pt.v_x }))
    const ptDomain_M = states.map(pt => ({ t: pt.t, v: M_slot * pt.v_X }))
    const ptDomain_Total = states.map(pt => ({ t: pt.t, v: m_block * pt.v_x + M_slot * pt.v_X }))
    const ptPoints_m = getPointsUpToTime(ptDomain_m, time)
    const ptPoints_M = getPointsUpToTime(ptDomain_M, time)
    const ptPoints_Total = getPointsUpToTime(ptDomain_Total, time)

    const etDomain_Ek_m = states.map(pt => ({ t: pt.t, v: pt.Ek_m }))
    const etDomain_Ek_M = states.map(pt => ({ t: pt.t, v: pt.Ek_M }))
    const etDomain_Ep = states.map(pt => ({ t: pt.t, v: pt.Ep }))
    const etDomain_Total = states.map(pt => ({ t: pt.t, v: pt.Ek_m + pt.Ek_M + pt.Ep }))
    const etPoints_Ek_m = getPointsUpToTime(etDomain_Ek_m, time)
    const etPoints_Ek_M = getPointsUpToTime(etDomain_Ek_M, time)
    const etPoints_Ep = getPointsUpToTime(etDomain_Ep, time)
    const etPoints_Total = getPointsUpToTime(etDomain_Total, time)

    return {
      vtDomain_m_vx, vtDomain_m_vy, vtDomain_M_vx,
      vtPoints_m_vx, vtPoints_m_vy, vtPoints_M_vx,
      ptDomain_m, ptDomain_M, ptDomain_Total,
      ptPoints_m, ptPoints_M, ptPoints_Total,
      etDomain_Ek_m, etDomain_Ek_M, etDomain_Ep, etDomain_Total,
      etPoints_Ek_m, etPoints_Ek_M, etPoints_Ep, etPoints_Total
    }
  }, [states, time, m_block, M_slot])

  const gradId = useId()

  // 水平质心绝对位置
  const x_com = useMemo(() => {
    if (isFixed) return 0
    return (m_block * R_slot) / (M_slot + m_block)
  }, [m_block, M_slot, R_slot, isFixed])

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 box-border bg-neutral-50 overflow-hidden">
      {/* 上方三个并列图表区 */}
      <div className="flex-[4] min-h-[160px] grid grid-cols-3 gap-2">
        {/* 速度图表 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="text-[10px] font-bold text-neutral-800 border-b pb-1 mb-1.5 flex items-center justify-between">
            <span>速度随时间变化 (V-T)</span>
            <span className="text-[9px] text-neutral-400 font-mono">v (m/s)</span>
          </div>
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart mode="animated" points={vtPoints_m_vx} domainPoints={vtDomain_m_vx} currentTime={time} tMax={6} title="" xLabel="t (s)" yLabel="" additionalSeries={[{ points: vtPoints_m_vy, domainPoints: vtDomain_m_vy, label: '滑块 vy (竖直)', series: 'secondary' }, { points: vtPoints_M_vx, domainPoints: vtDomain_M_vx, label: '圆弧槽 Vx', series: 'success' }]} showArea={false} />
          </div>
        </div>

        {/* 动量图表 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="text-[10px] font-bold text-neutral-800 border-b pb-1 mb-1.5 flex items-center justify-between">
            <span>水平动量随时间变化 (P-T)</span>
            <span className="text-[9px] text-neutral-400 font-mono">p (kg·m/s)</span>
          </div>
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart mode="animated" points={ptPoints_m} domainPoints={ptDomain_m} currentTime={time} tMax={6} title="" xLabel="t (s)" yLabel="" additionalSeries={[{ points: ptPoints_M, domainPoints: ptDomain_M, label: '圆弧槽 Px', series: 'secondary' }, { points: ptPoints_Total, domainPoints: ptDomain_Total, label: '系统总动量 Px', series: 'success' }]} showArea={false} />
          </div>
        </div>

        {/* 能量图表 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="text-[10px] font-bold text-neutral-800 border-b pb-1 mb-1.5 flex items-center justify-between">
            <span>机械能分配 (E-T)</span>
            <span className="text-[9px] text-neutral-400 font-mono">E (J)</span>
          </div>
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart mode="animated" points={etPoints_Ek_m} domainPoints={etDomain_Ek_m} currentTime={time} tMax={6} title="" xLabel="t (s)" yLabel="" additionalSeries={[{ points: etPoints_Ek_M, domainPoints: etDomain_Ek_M, label: '圆弧槽 Ek', series: 'secondary' }, { points: etPoints_Ep, domainPoints: etDomain_Ep, label: '重力势能 Ep', series: 'warm' }, { points: etPoints_Total, domainPoints: etDomain_Total, label: '总机械能', series: 'success' }]} showArea={false} />
          </div>
        </div>
      </div>

      {/* 下方物理仿真动画区 */}
      <div
        ref={containerRef}
        className="flex-[5] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[220px]"
      >
        <svg
          className="w-full h-full block"
        >
          <g transform={vp.transform}>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[0]} />
                <stop offset="100%" stopColor={SCENE_COLORS.materials.aluminumMetalGrad[2]} />
              </linearGradient>
            </defs>

            {/* 地面 */}
            <PhysicsGround x={GROUND_X} y={GROUND_Y} width={GROUND_WIDTH} appearance={{ color: PHYSICS_COLORS.labelText, showHatch: true }} />

            {/* 槽底部滚动滑轮 (仅在自由滑动时显示) */}
            {!isFixed && (() => {
              const X_px = SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M
              const R_px = R_slot * SLOT_PX_PER_M
              
              let leftWheelX = 0
              let rightWheelX = 0
              if (slotShape === 0) {
                // 四分之一槽：左轮右移至 0.6*R 实体下方，避开小球下滑和出口滑出轨迹
                leftWheelX = X_px + R_px * 0.6
                rightWheelX = X_px + R_px + SLOT_EXTRA_WIDTH - 12
              } else {
                // 半圆对称槽：左右轮均在高台下方，避开轨道摆动轨迹
                leftWheelX = X_px - R_px - SLOT_EXTRA_WIDTH + 12
                rightWheelX = X_px + R_px + SLOT_EXTRA_WIDTH - 12
              }
              
              const wheelY = GROUND_Y - 6
              const wheelAngleRad = -(slotState.X * SLOT_PX_PER_M) / 6
              const wheelAngleDeg = (wheelAngleRad * 180) / Math.PI
              
              const renderWheel = (cx: number) => (
                <g transform={`translate(${cx}, ${wheelY}) rotate(${wheelAngleDeg})`}>
                  <circle cx="0" cy="0" r="6" fill={SCENE_COLORS.materials.aluminumMetalGrad[1]} stroke={SCENE_COLORS.materials.aluminumMetalGrad[3]} strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill={SCENE_COLORS.pendulum.pivotStroke} />
                  <line x1="-6" y1="0" x2="6" y2="0" stroke={SCENE_COLORS.materials.aluminumMetalGrad[3]} strokeWidth="0.8" />
                  <line x1="0" y1="-6" x2="0" y2="6" stroke={SCENE_COLORS.materials.aluminumMetalGrad[3]} strokeWidth="0.8" />
                </g>
              )
              
              return (
                <g>
                  {renderWheel(leftWheelX)}
                  {renderWheel(rightWheelX)}
                </g>
              )
            })()}

            {/* 槽绘制 */}
            {(() => {
              const X_px = SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M
              const R_px = R_slot * SLOT_PX_PER_M
              
              if (slotShape === 0) {
                // 四分之一单向槽
                return (
                  <g>
                    <path d={`M ${X_px} ${COMP_GROUND_Y} L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${COMP_GROUND_Y} L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${COMP_GROUND_Y - R_px} L ${X_px + R_px} ${COMP_GROUND_Y - R_px} A ${R_px} ${R_px} 0 0 1 ${X_px} ${COMP_GROUND_Y} Z`} fill={`url(#${gradId})`} stroke={SCENE_COLORS.materials.aluminumMetalGrad[3]} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
                    <path d={`M ${X_px + R_px} ${COMP_GROUND_Y - R_px} A ${R_px} ${R_px} 0 0 1 ${X_px} ${COMP_GROUND_Y}`} fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                  </g>
                )
              } else {
                // 对称半圆轨道槽
                return (
                  <g>
                    <path d={`M ${X_px - R_px - SLOT_EXTRA_WIDTH} ${COMP_GROUND_Y} L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${COMP_GROUND_Y} L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${COMP_GROUND_Y - R_px} L ${X_px + R_px} ${COMP_GROUND_Y - R_px} A ${R_px} ${R_px} 0 0 1 ${X_px - R_px} ${COMP_GROUND_Y - R_px} L ${X_px - R_px - SLOT_EXTRA_WIDTH} ${COMP_GROUND_Y - R_px} Z`} fill={`url(#${gradId})`} stroke={SCENE_COLORS.materials.aluminumMetalGrad[3]} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
                    <path d={`M ${X_px + R_px} ${COMP_GROUND_Y - R_px} A ${R_px} ${R_px} 0 0 1 ${X_px - R_px} ${COMP_GROUND_Y - R_px}`} fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
                  </g>
                )
              }
            })()}

            {/* 槽质量文本 */}
            <text x={SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M + R_slot * 12 + 15} y={COMP_GROUND_Y - 8} fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">
              M = {M_slot} kg {isFixed ? '(固定)' : ''}
            </text>

            {/* 系统水平质心垂直线 (仅在自由滑动时显示) */}
            {!isFixed && (
              <g>
                <line x1={SLOT_ORIGIN_X + x_com * SLOT_PX_PER_M} y1={COMP_GROUND_Y - R_slot * SLOT_PX_PER_M - 20} x2={SLOT_ORIGIN_X + x_com * SLOT_PX_PER_M} y2={GROUND_Y + 15} stroke={PHYSICS_COLORS.referencePoint} strokeWidth="1.2" strokeDasharray="4 3" />
                <circle cx={SLOT_ORIGIN_X + x_com * SLOT_PX_PER_M} cy={GROUND_Y + 15} r="3" fill={PHYSICS_COLORS.referencePoint} />
                <text x={SLOT_ORIGIN_X + x_com * SLOT_PX_PER_M + 5} y={GROUND_Y + 18} fill={PHYSICS_COLORS.referencePoint} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="start">质心 CoM</text>
              </g>
            )}

            {/* 滑块小球绘制 */}
            {(() => {
              const x_px = SLOT_ORIGIN_X + slotState.x * SLOT_PX_PER_M - BALL_RADIUS_PX * Math.sin(slotState.theta)
              const y_px = COMP_GROUND_Y - slotState.y * SLOT_PX_PER_M - BALL_RADIUS_PX * Math.cos(slotState.theta)
              return (
                <g>
                  <Ball cx={x_px} cy={y_px} r={BALL_RADIUS_PX} type="steel" stroke={CANVAS_COLORS.labelText} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
                  <text x={x_px} y={y_px - BALL_RADIUS_PX - 4} fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">m = {m_block} kg</text>
                </g>
              )
            })()}

            {/* 支持力、重力及反作用力分量 */}
            {showVectors === 1 && (() => {
              const theta = slotState.theta
              const N = slotState.N
              const r_phy = BALL_RADIUS_PX / sceneScale.scale
              const ballCenterPhy = { x: slotState.x - r_phy * Math.sin(theta), y: slotState.y + r_phy * Math.cos(theta) }
              const contactPhy = { x: slotState.x, y: slotState.y }
              const mgVal = m_block * 9.8
              return (
                <g>
                  {/* 滑块受支持力 N 与重力 mg，均作用于几何中心 */}
                  <VectorArrow origin={ballCenterPhy} vector={{ x: -N * Math.sin(theta), y: N * Math.cos(theta) }} type="normalForce" sceneScale={sceneScale as never} label="N" />
                  <VectorArrow origin={ballCenterPhy} vector={{ x: 0, y: -mgVal }} type="force" sceneScale={sceneScale as never} label="mg" color={PHYSICS_COLORS.gravity} />
                  
                  {/* 槽受滑块的压力 N' 及水平推力分力 N'x，作用于接触点 */}
                  {!isFixed && (
                    <>
                      <VectorArrow origin={contactPhy} vector={{ x: N * Math.sin(theta), y: -N * Math.cos(theta) }} type="appliedForce" sceneScale={sceneScale as never} label="N'" color={PHYSICS_COLORS.appliedForce} />
                      <VectorArrow origin={contactPhy} vector={{ x: N * Math.sin(theta), y: 0 }} type="forceComponent" sceneScale={sceneScale as never} label="N'x" color={PHYSICS_COLORS.forceNet} dashed />
                    </>
                  )}
                </g>
              )
            })()}

            {/* 绝对位移双向标注 (四分之一滑出后，或者对称摆动过程中，在底部标出各自绝对位移) */}
            {showDisplacement === 1 && !isFixed && time > 0.1 && (
              <g transform="translate(0, 5)">
                {/* 槽的位移 */}
                {Math.abs(slotState.X) > 0.05 && (
                  <g>
                    <line x1={SLOT_ORIGIN_X} y1={COMP_GROUND_Y - 5} x2={SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M} y2={COMP_GROUND_Y - 5} stroke={PHYSICS_COLORS.normalForce} strokeWidth="1" strokeDasharray="2 2" />
                    <line x1={SLOT_ORIGIN_X} y1={COMP_GROUND_Y - 8} x2={SLOT_ORIGIN_X} y2={COMP_GROUND_Y - 2} stroke={PHYSICS_COLORS.normalForce} strokeWidth="1" />
                    <line x1={SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M} y1={COMP_GROUND_Y - 8} x2={SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M} y2={COMP_GROUND_Y - 2} stroke={PHYSICS_COLORS.normalForce} strokeWidth="1" />
                    <text x={SLOT_ORIGIN_X + (slotState.X * SLOT_PX_PER_M) / 2} y={COMP_GROUND_Y - 9} fill={PHYSICS_COLORS.normalForce} fontSize={canvasSize.font(7)} textAnchor="middle" fontWeight="semibold">
                      s_M={Math.abs(slotState.X).toFixed(2)}m
                    </text>
                  </g>
                )}
                {/* 小球的位移（初始位置在 R_slot） */}
                {Math.abs(slotState.x - R_slot) > 0.05 && (
                  <g>
                    <line x1={SLOT_ORIGIN_X + R_slot * SLOT_PX_PER_M} y1={COMP_GROUND_Y - 5} x2={SLOT_ORIGIN_X + slotState.x * SLOT_PX_PER_M} y2={COMP_GROUND_Y - 5} stroke={PHYSICS_COLORS.momentum} strokeWidth="1" strokeDasharray="2 2" />
                    <line x1={SLOT_ORIGIN_X + R_slot * SLOT_PX_PER_M} y1={COMP_GROUND_Y - 8} x2={SLOT_ORIGIN_X + R_slot * SLOT_PX_PER_M} y2={COMP_GROUND_Y - 2} stroke={PHYSICS_COLORS.momentum} strokeWidth="1" />
                    <line x1={SLOT_ORIGIN_X + slotState.x * SLOT_PX_PER_M} y1={COMP_GROUND_Y - 8} x2={SLOT_ORIGIN_X + slotState.x * SLOT_PX_PER_M} y2={COMP_GROUND_Y - 2} stroke={PHYSICS_COLORS.momentum} strokeWidth="1" />
                    <text x={SLOT_ORIGIN_X + (R_slot * SLOT_PX_PER_M + slotState.x * SLOT_PX_PER_M) / 2} y={COMP_GROUND_Y - 9} fill={PHYSICS_COLORS.momentum} fontSize={canvasSize.font(7)} textAnchor="middle" fontWeight="semibold">
                      s_m={Math.abs(slotState.x - R_slot).toFixed(2)}m
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}

