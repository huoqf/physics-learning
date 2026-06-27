import { useEffect, useRef, useMemo, useId } from 'react'
import { useAnimationStore } from '@/stores'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { getPointsUpToTime } from '@/utils'
import { useSimulationFrame } from '@/utils/animation'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VelocityTimeChart } from '@/components/Chart'
import { calculateManBoatState, getManBoatAutoMotion } from '@/physics/momentumApplication'

const GROUND_X = 0
const GROUND_Y = 130
const GROUND_WIDTH = 700
const BOAT_PX_PER_M = 30
const BOAT_ORIGIN_X = 350
const BOAT_WALK_DURATION = 2.5
const BOAT_AUTO_STEPS = 100
const CM_STAR = { coreRadius: 4, glowRadius: 10, labelOffset: 16 }
const KEYBOARD_SPEED = 3

interface BoatProps {
  time: number
  m_person: number
  M_boat: number
  L_boat: number
  manBoatControl: number
  canvasSize: { width: number; height: number; font: (size: number) => number }
  sceneScale: Record<string, unknown>
}

function useBoatData({ m_person, M_boat, L_boat, manBoatControl, time }: { m_person: number; M_boat: number; L_boat: number; manBoatControl: number; time: number }) {
  const params = useAnimationStore(s => s.params)
  const manRelS = params.manRelS ?? 0
  const manVRel = params.manVRel ?? 0

  const keysPressed = useRef({ left: false, right: false })

  useEffect(() => {
    const { updateParam } = useAnimationStore.getState()
    updateParam('manRelS', 0)
    updateParam('manVRel', 0)
    keysPressed.current = { left: false, right: false }
  }, [manBoatControl, m_person, M_boat, L_boat])

  useEffect(() => {
    if (manBoatControl !== 1) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { keysPressed.current.left = true; e.preventDefault() }
      else if (e.key === 'ArrowRight') { keysPressed.current.right = true; e.preventDefault() }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keysPressed.current.left = false
      else if (e.key === 'ArrowRight') keysPressed.current.right = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [manBoatControl])

  useSimulationFrame((deltaTimeMs) => {
    if (manBoatControl !== 1) return
    const dt = deltaTimeMs / 1000
    let speed = 0
    if (keysPressed.current.left) speed = -KEYBOARD_SPEED
    if (keysPressed.current.right) speed = KEYBOARD_SPEED
    const { updateParam } = useAnimationStore.getState()
    if (speed !== manVRel) updateParam('manVRel', speed)
    if (speed !== 0) {
      const nextS = manRelS + speed * dt
      const clampedS = Math.max(0, Math.min(L_boat, nextS))
      if (clampedS !== manRelS) updateParam('manRelS', clampedS)
    }
  }, { active: manBoatControl === 1 })

  const boatAutoStates = useMemo(() => {
    if (manBoatControl !== 0) return []
    const list = []
    for (let i = 0; i <= BOAT_AUTO_STEPS; i++) {
      const t = (i / BOAT_AUTO_STEPS) * BOAT_WALK_DURATION
      const motion = getManBoatAutoMotion(t, L_boat, BOAT_WALK_DURATION)
      const st = calculateManBoatState(motion.s, motion.v_rel, m_person, M_boat, L_boat)
      list.push({ t, ...st })
    }
    return list
  }, [manBoatControl, m_person, M_boat, L_boat])

  const boatState = useMemo(() => {
    if (manBoatControl === 0) {
      const motion = getManBoatAutoMotion(time, L_boat, BOAT_WALK_DURATION)
      return calculateManBoatState(motion.s, motion.v_rel, m_person, M_boat, L_boat)
    } else {
      return calculateManBoatState(manRelS, manVRel, m_person, M_boat, L_boat)
    }
  }, [manBoatControl, time, manRelS, manVRel, m_person, M_boat, L_boat])

  const boatVtDomain_person = useMemo(() => boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_person })), [boatAutoStates])
  const boatVtDomain_boat = useMemo(() => boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_boat })), [boatAutoStates])
  const boatVtPoints_person = useMemo(() => getPointsUpToTime(boatVtDomain_person, time), [boatVtDomain_person, time])
  const boatVtPoints_boat = useMemo(() => getPointsUpToTime(boatVtDomain_boat, time), [boatVtDomain_boat, time])

  const boatStDomain_person = useMemo(() => {
    const x0 = boatAutoStates.length > 0 ? boatAutoStates[0].x_person : 0
    return boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_person - x0 }))
  }, [boatAutoStates])
  const boatStDomain_boat = useMemo(() => {
    const x0 = boatAutoStates.length > 0 ? boatAutoStates[0].x_boat : 0
    return boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_boat - x0 }))
  }, [boatAutoStates])
  const boatStDomain_cm = useMemo(() => boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_cm })), [boatAutoStates])
  const boatStPoints_person = useMemo(() => getPointsUpToTime(boatStDomain_person, time), [boatStDomain_person, time])
  const boatStPoints_boat = useMemo(() => getPointsUpToTime(boatStDomain_boat, time), [boatStDomain_boat, time])
  const boatStPoints_cm = useMemo(() => getPointsUpToTime(boatStDomain_cm, time), [boatStDomain_cm, time])

  return { boatState, boatVtDomain_person, boatVtDomain_boat, boatVtPoints_person, boatVtPoints_boat, boatStDomain_person, boatStDomain_boat, boatStDomain_cm, boatStPoints_person, boatStPoints_boat, boatStPoints_cm }
}

export function ManBoatCharts(props: BoatProps) {
  const { boatState, boatVtDomain_person, boatVtDomain_boat, boatVtPoints_person, boatVtPoints_boat, boatStDomain_person, boatStDomain_boat, boatStDomain_cm, boatStPoints_person, boatStPoints_boat, boatStPoints_cm } = useBoatData(props)

  if (props.manBoatControl !== 0) {
    return (
      <div className="w-full bg-white border border-neutral-200/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
        <div>
          <h4 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            人船质心定点 — 键盘实时跑动交互中
          </h4>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            左右方向键可以改变小人相对于船的距离，船会由于水平动量守恒朝相反方向做出平移补偿。物理质心（Center of Mass）因不受任何外力影响，在屏幕数轴中钉在原点纹丝不动。
          </p>
        </div>
        {boatState && (
          <div className="grid grid-cols-3 gap-4 bg-neutral-50 rounded-lg p-3 border border-neutral-200/60 text-center">
            <div>
              <div className="text-[10px] text-neutral-400 font-semibold">人绝对位置 (x_1)</div>
              <div className="text-sm font-bold text-indigo-600 font-mono mt-0.5">{boatState.x_person.toFixed(3)} m</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-semibold">船左端位置 (x_boat)</div>
              <div className="text-sm font-bold text-amber-700 font-mono mt-0.5">{boatState.x_boat.toFixed(3)} m</div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-semibold">系统总质心 (x_cm)</div>
              <div className="text-sm font-bold text-emerald-600 font-mono mt-0.5">{(0).toFixed(3)} m (常数)</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-grow min-h-0 relative">
          <VelocityTimeChart mode="animated" points={boatVtPoints_person} domainPoints={boatVtDomain_person} currentTime={props.time} tMax={4} title="速度-时间图像 (V-T)" xLabel="时间 t (s)" yLabel="速度 v (m/s)" additionalSeries={[{ points: boatVtPoints_boat, domainPoints: boatVtDomain_boat, label: '船速度', series: 'secondary' }]} showArea={false} />
        </div>
      </div>
      <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
        <div className="flex-grow min-h-0 relative">
          <VelocityTimeChart mode="animated" points={boatStPoints_person} domainPoints={boatStDomain_person} currentTime={props.time} tMax={4} title="位移-时间图像 (S-T)" xLabel="时间 t (s)" yLabel="位移 x (m)" additionalSeries={[{ points: boatStPoints_boat, domainPoints: boatStDomain_boat, label: '船位移', series: 'secondary' }, { points: boatStPoints_cm, domainPoints: boatStDomain_cm, label: '质心位移', series: 'success' }]} showArea={false} />
        </div>
      </div>
    </>
  )
}

export function ManBoatSvg(props: BoatProps) {
  const gradIdBoat = useId()
  const gradIdGlowGold = useId()
  const { boatState } = useBoatData(props)
  const { m_person, M_boat, L_boat, manBoatControl, canvasSize, sceneScale, time } = props

  return (
    <>
      <defs>
        <linearGradient id={gradIdBoat} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={SCENE_COLORS.materials.labWoodGrad[1]} />
          <stop offset="100%" stopColor={SCENE_COLORS.materials.labWoodGrad[3]} />
        </linearGradient>
        <radialGradient id={gradIdGlowGold} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={SCENE_COLORS.bulb.bright} stopOpacity="0.8" />
          <stop offset="100%" stopColor={SCENE_COLORS.bulb.bright} stopOpacity="0" />
        </radialGradient>
      </defs>

      <PhysicsGround x={GROUND_X} y={GROUND_Y} width={GROUND_WIDTH} appearance={{ color: PHYSICS_COLORS.labelText }} ruler={{ domain: [-6.667, 6.667], pixelPerUnit: BOAT_PX_PER_M, tickInterval: 1, unit: 'm', position: 'bottom', showAxisLine: true }} />

      <g transform={`translate(${BOAT_ORIGIN_X}, 95)`}>
        <circle r={`${CM_STAR.glowRadius}`} fill={`url(#${gradIdGlowGold})`} />
        <circle r={`${CM_STAR.coreRadius}`} fill={CANVAS_COLORS.referencePoint} />
        <line x1={`-${CM_STAR.glowRadius}`} y1="0" x2={`${CM_STAR.glowRadius}`} y2="0" stroke={CANVAS_COLORS.referencePoint} strokeWidth="1.2" />
        <line x1="0" y1={`-${CM_STAR.glowRadius}`} x2="0" y2={`${CM_STAR.glowRadius}`} stroke={CANVAS_COLORS.referencePoint} strokeWidth="1.2" />
        <text x="0" y={`${CM_STAR.labelOffset}`} fill={CANVAS_COLORS.referencePoint} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">系统质心 (锁定 0)</text>
      </g>

      {(() => {
        const xb_px = BOAT_ORIGIN_X + boatState.x_boat * BOAT_PX_PER_M
        const wb_px = L_boat * BOAT_PX_PER_M
        return (
          <g>
            <path d={`M ${xb_px} ${GROUND_Y - 8} L ${xb_px - 10} ${GROUND_Y - 18} L ${xb_px + wb_px + 10} ${GROUND_Y - 18} L ${xb_px + wb_px} ${GROUND_Y - 8} Z`} fill={`url(#${gradIdBoat})`} stroke={SCENE_COLORS.materials.labWoodGrad[3]} strokeWidth="1.5" />
            <text x={xb_px + wb_px / 2} y={GROUND_Y - 4} fill={SCENE_COLORS.materials.labWoodGrad[0]} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">船 {M_boat}kg</text>
          </g>
        )
      })()}

      {(() => {
        const xp_px = BOAT_ORIGIN_X + boatState.x_person * BOAT_PX_PER_M
        const headY = GROUND_Y - 18 - 20
        const angle = boatState.v_rel !== 0 ? Math.sin(time * 15) * 6 : 0
        return (
          <g>
            <circle cx={xp_px} cy={headY} r="4" fill={CANVAS_COLORS.labelText} stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth="1" />
            <line x1={xp_px} y1={headY + 4} x2={xp_px} y2={GROUND_Y - 18 - 8} stroke={CANVAS_COLORS.labelText} strokeWidth="1.5" />
            <line x1={xp_px} y1={headY + 6} x2={xp_px - 6 - angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={CANVAS_COLORS.labelText} strokeWidth="1.2" />
            <line x1={xp_px} y1={headY + 6} x2={xp_px + 6 + angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={CANVAS_COLORS.labelText} strokeWidth="1.2" />
            <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px - 5 - angle * 0.3} y2={GROUND_Y - 18} stroke={CANVAS_COLORS.labelText} strokeWidth="1.5" />
            <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px + 5 + angle * 0.3} y2={GROUND_Y - 18} stroke={CANVAS_COLORS.labelText} strokeWidth="1.5" />
            <text x={xp_px} y={headY - 6} fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">人 {m_person}kg</text>
            <VectorArrow origin={{ x: boatState.x_person, y: 0.6 }} vector={{ x: boatState.v_person, y: 0 }} type="velocity" sceneScale={sceneScale as never} />
          </g>
        )
      })()}

      <VectorArrow origin={{ x: boatState.x_boat + L_boat * 0.5, y: 0.1 }} vector={{ x: boatState.v_boat, y: 0 }} type="velocity" sceneScale={sceneScale as never} color={PHYSICS_COLORS.velocity} />

      {(() => {
        const isAutoEnd = manBoatControl === 0 && time >= BOAT_WALK_DURATION
        if (!isAutoEnd) return null
        const x_boat_0 = -(M_boat * L_boat * 0.5) / (m_person + M_boat)
        const x_person_0 = x_boat_0
        const x_boat_end = -(m_person * L_boat + M_boat * L_boat * 0.5) / (m_person + M_boat)
        const x_person_end = x_boat_end + L_boat
        const disp_boat = x_boat_end - x_boat_0
        const disp_person = x_person_end - x_person_0
        const xb0_px = BOAT_ORIGIN_X + x_boat_0 * BOAT_PX_PER_M
        const xbend_px = BOAT_ORIGIN_X + x_boat_end * BOAT_PX_PER_M
        const xp0_px = BOAT_ORIGIN_X + x_person_0 * BOAT_PX_PER_M
        const xpend_px = BOAT_ORIGIN_X + x_person_end * BOAT_PX_PER_M
        const arrowSize = 4
        const personLineY = GROUND_Y - 50
        const boatLineY = GROUND_Y + 18
        return (
          <g>
            <line x1={xp0_px} y1={personLineY} x2={xpend_px} y2={personLineY} stroke={PHYSICS_COLORS.displacement} strokeWidth="1.2" strokeDasharray="2 2" />
            <polygon points={`${xpend_px},${personLineY} ${xpend_px + (disp_person < 0 ? arrowSize : -arrowSize)},${personLineY - 3} ${xpend_px + (disp_person < 0 ? arrowSize : -arrowSize)},${personLineY + 3}`} fill={PHYSICS_COLORS.displacement} />
            <text x={(xp0_px + xpend_px) / 2} y={personLineY - 5} fill={PHYSICS_COLORS.displacement} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">人绝对位移 x1 = {Math.abs(disp_person).toFixed(2)}m</text>
            <line x1={xb0_px} y1={boatLineY} x2={xbend_px} y2={boatLineY} stroke={PHYSICS_COLORS.displacementX} strokeWidth="1.2" strokeDasharray="2 2" />
            <polygon points={`${xbend_px},${boatLineY} ${xbend_px + (disp_boat < 0 ? arrowSize : -arrowSize)},${boatLineY - 3} ${xbend_px + (disp_boat < 0 ? arrowSize : -arrowSize)},${boatLineY + 3}`} fill={PHYSICS_COLORS.displacementX} />
            <text x={(xb0_px + xbend_px) / 2} y={boatLineY + 10} fill={PHYSICS_COLORS.displacementX} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">船绝对位移 x2 = {Math.abs(disp_boat).toFixed(2)}m</text>
          </g>
        )
      })()}
    </>
  )
}
