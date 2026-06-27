import { useMemo, useId } from 'react'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VelocityTimeChart } from '@/components/Chart'
import { Ball } from '@/components/Physics/Ball'
import { getPointsUpToTime } from '@/utils'
import { precomputeCurvedSlot, interpolateCurvedSlot } from '@/physics/momentumApplication'

const GROUND_X = 0
const GROUND_Y = 130
const GROUND_WIDTH = 700
const SLOT_PX_PER_M = 40
const SLOT_ORIGIN_X = 350
const SLOT_EXTRA_WIDTH = 35
const BALL_RADIUS_PX = 10
const SLOT_SIM = { duration: 6, dt: 0.016 }
const BALANCE = { beamLength: 60, pxPerUnit: 8, minBarWidth: 3, barY: -12, barHeight: 8, textY: -16 }

interface SlotProps {
  time: number
  m_block: number
  M_slot: number
  R_slot: number
  canvasSize: { width: number; height: number; font: (size: number) => number }
  sceneScale: Record<string, unknown>
}

function useSlotData({ m_block, M_slot, R_slot, time }: { m_block: number; M_slot: number; R_slot: number; time: number }) {
  const curvedSlotStates = useMemo(() => {
    return precomputeCurvedSlot(m_block, M_slot, R_slot, 9.8, SLOT_SIM.duration, SLOT_SIM.dt)
  }, [m_block, M_slot, R_slot])

  const slotState = useMemo(() => interpolateCurvedSlot(curvedSlotStates, time), [curvedSlotStates, time])

  const slotVtDomain_m_vx = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: pt.v_x })), [curvedSlotStates])
  const slotVtDomain_m_vy = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: pt.v_y })), [curvedSlotStates])
  const slotVtDomain_M_vx = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: pt.v_X })), [curvedSlotStates])
  const slotVtPoints_m_vx = useMemo(() => getPointsUpToTime(slotVtDomain_m_vx, time), [slotVtDomain_m_vx, time])
  const slotVtPoints_m_vy = useMemo(() => getPointsUpToTime(slotVtDomain_m_vy, time), [slotVtDomain_m_vy, time])
  const slotVtPoints_M_vx = useMemo(() => getPointsUpToTime(slotVtDomain_M_vx, time), [slotVtDomain_M_vx, time])

  const slotPtDomain_m = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: m_block * pt.v_x })), [curvedSlotStates, m_block])
  const slotPtDomain_M = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: M_slot * pt.v_X })), [curvedSlotStates, M_slot])
  const slotPtDomain_Total = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: m_block * pt.v_x + M_slot * pt.v_X })), [curvedSlotStates, m_block, M_slot])
  const slotPtPoints_m = useMemo(() => getPointsUpToTime(slotPtDomain_m, time), [slotPtDomain_m, time])
  const slotPtPoints_M = useMemo(() => getPointsUpToTime(slotPtDomain_M, time), [slotPtDomain_M, time])
  const slotPtPoints_Total = useMemo(() => getPointsUpToTime(slotPtDomain_Total, time), [slotPtDomain_Total, time])

  return { slotState, slotVtDomain_m_vx, slotVtDomain_m_vy, slotVtDomain_M_vx, slotVtPoints_m_vx, slotVtPoints_m_vy, slotVtPoints_M_vx, slotPtDomain_m, slotPtDomain_M, slotPtDomain_Total, slotPtPoints_m, slotPtPoints_M, slotPtPoints_Total }
}

export function CurvedSlotCharts(props: SlotProps) {
  const { slotVtDomain_m_vx, slotVtDomain_m_vy, slotVtDomain_M_vx, slotVtPoints_m_vx, slotVtPoints_m_vy, slotVtPoints_M_vx, slotPtDomain_m, slotPtDomain_M, slotPtDomain_Total, slotPtPoints_m, slotPtPoints_M, slotPtPoints_Total } = useSlotData(props)

  return (
    <>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-grow min-h-0 relative">
          <VelocityTimeChart mode="animated" points={slotVtPoints_m_vx} domainPoints={slotVtDomain_m_vx} currentTime={props.time} tMax={6} title="速度-时间图像 (V-T)" xLabel="时间 t (s)" yLabel="速度 v (m/s)" additionalSeries={[{ points: slotVtPoints_m_vy, domainPoints: slotVtDomain_m_vy, label: '滑块 v_y', series: 'secondary' }, { points: slotVtPoints_M_vx, domainPoints: slotVtDomain_M_vx, label: '弧形槽 V_x', series: 'success' }]} showArea={false} />
        </div>
      </div>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-grow min-h-0 relative">
          <VelocityTimeChart mode="animated" points={slotPtPoints_m} domainPoints={slotPtDomain_m} currentTime={props.time} tMax={6} title="动量-时间图像 (P-T)" xLabel="时间 t (s)" yLabel="动量 p (kg·m/s)" additionalSeries={[{ points: slotPtPoints_M, domainPoints: slotPtDomain_M, label: '弧形槽 P_x', series: 'secondary' }, { points: slotPtPoints_Total, domainPoints: slotPtDomain_Total, label: '总动量', series: 'success' }]} showArea={false} />
        </div>
      </div>
    </>
  )
}

export function CurvedSlotSvg(props: SlotProps) {
  const gradId = useId()
  const { slotState } = useSlotData(props)
  const { m_block, M_slot, R_slot, canvasSize, sceneScale } = props

  return (
    <>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
        </linearGradient>
      </defs>

      <PhysicsGround x={GROUND_X} y={GROUND_Y} width={GROUND_WIDTH} appearance={{ color: PHYSICS_COLORS.labelText, showHatch: true }} />

      {(() => {
        const X_px = SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M
        const R_px = R_slot * SLOT_PX_PER_M
        return (
          <path d={`M ${X_px} ${GROUND_Y} L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${GROUND_Y} L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${GROUND_Y - R_px} L ${X_px + R_px} ${GROUND_Y - R_px} A ${R_px} ${R_px} 0 0 1 ${X_px} ${GROUND_Y} Z`} fill={`url(#${gradId})`} stroke={SCENE_COLORS.materials.sliderMetalGrad[3]} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
        )
      })()}

      <text x={SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M + R_slot * 15 + 10} y={GROUND_Y - 10} fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(10)} fontWeight="bold" textAnchor="middle">
        M = {M_slot} kg
      </text>

      {(() => {
        const x_px = SLOT_ORIGIN_X + slotState.x * SLOT_PX_PER_M - BALL_RADIUS_PX * Math.sin(slotState.theta)
        const y_px = GROUND_Y - slotState.y * SLOT_PX_PER_M - BALL_RADIUS_PX * Math.cos(slotState.theta)
        return (
          <g>
            <Ball cx={x_px} cy={y_px} r={BALL_RADIUS_PX} type="steel" stroke={CANVAS_COLORS.labelText} strokeWidth={CANVAS_STYLE.stroke.objectLine} />
            <text x={x_px} y={y_px - BALL_RADIUS_PX - 4} fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(10)} fontWeight="bold" textAnchor="middle">m = {m_block} kg</text>
          </g>
        )
      })()}

      {(() => {
        const theta = slotState.theta
        const N = slotState.N
        const r_phy = BALL_RADIUS_PX / (sceneScale as { scale: number }).scale
        const ballCenterPhy = { x: slotState.x - r_phy * Math.sin(theta), y: slotState.y + r_phy * Math.cos(theta) }
        const contactPhy = { x: slotState.x, y: slotState.y }
        return (
          <g>
            <VectorArrow origin={ballCenterPhy} vector={{ x: -N * Math.sin(theta), y: N * Math.cos(theta) }} type="normalForce" sceneScale={sceneScale as never} label="N" />
            <VectorArrow origin={ballCenterPhy} vector={{ x: -N * Math.sin(theta), y: 0 }} type="forceComponent" sceneScale={sceneScale as never} label="Nx" dashed />
            <VectorArrow origin={ballCenterPhy} vector={{ x: 0, y: N * Math.cos(theta) }} type="forceComponent" sceneScale={sceneScale as never} label="Ny" dashed />
            <VectorArrow origin={contactPhy} vector={{ x: N * Math.sin(theta), y: -N * Math.cos(theta) }} type="appliedForce" sceneScale={sceneScale as never} label="N'" color={PHYSICS_COLORS.appliedForce} />
            <VectorArrow origin={contactPhy} vector={{ x: N * Math.sin(theta), y: 0 }} type="forceComponent" sceneScale={sceneScale as never} label="N'x (推力)" color={PHYSICS_COLORS.forceNet} dashed />
          </g>
        )
      })()}

      <g transform={`translate(${SLOT_ORIGIN_X}, ${GROUND_Y + 30})`}>
        <line x1={`-${BALANCE.beamLength}`} y1="0" x2={`${BALANCE.beamLength}`} y2="0" stroke={SCENE_COLORS.charts.axisLine} strokeWidth="2.5" />
        <polygon points="0,0 -6,10 6,10" fill={SCENE_COLORS.pendulum.rodFill} />
        {(() => {
          const p_m = m_block * slotState.v_x
          const barWidth = Math.abs(p_m) * BALANCE.pxPerUnit
          if (barWidth > BALANCE.minBarWidth) {
            return (
              <g>
                <rect x={-barWidth} y={`${BALANCE.barY}`} width={barWidth} height={`${BALANCE.barHeight}`} fill={PHYSICS_COLORS.momentum} rx="1" />
                <text x={-barWidth - 6} y={`${BALANCE.textY}`} fill={PHYSICS_COLORS.momentum} fontSize={canvasSize.font(9)} textAnchor="end" fontWeight="bold">p_m = {p_m.toFixed(1)}</text>
              </g>
            )
          }
          return null
        })()}
        {(() => {
          const p_M_real = M_slot * slotState.v_X
          const barWidth = Math.abs(p_M_real) * BALANCE.pxPerUnit
          if (barWidth > BALANCE.minBarWidth) {
            return (
              <g>
                <rect x="0" y={`${BALANCE.barY}`} width={barWidth} height={`${BALANCE.barHeight}`} fill={PHYSICS_COLORS.normalForce} rx="1" />
                <text x={barWidth + 6} y={`${BALANCE.textY}`} fill={PHYSICS_COLORS.normalForce} fontSize={canvasSize.font(9)} textAnchor="start" fontWeight="bold">p_M = +{p_M_real.toFixed(1)}</text>
              </g>
            )
          }
          return null
        })()}
      </g>
    </>
  )
}
