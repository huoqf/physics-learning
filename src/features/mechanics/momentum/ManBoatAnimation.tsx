import { useEffect, useRef, useMemo, useId } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useCanvasSize, useViewport, getPointsUpToTime } from '@/utils'
import { useSimulationFrame } from '@/utils/animation'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VelocityTimeChart } from '@/components/Chart'
import { calculateManBoatState, getManBoatAutoMotion } from '@/physics/momentumApplication/manBoat'
import { SVGSingleBar } from '@/components/Physics/SVGSingleBar'

const GROUND_X = 0
const GROUND_Y = 130
const GROUND_WIDTH = 700
const BOAT_PX_PER_M = 30
const BOAT_ORIGIN_X = 350
const BOAT_WALK_DURATION = 2.5
const BOAT_AUTO_STEPS = 100
const CM_STAR = { coreRadius: 4, glowRadius: 10, labelOffset: 16 }
const KEYBOARD_SPEED = 3
const CANVAS_DESIGN = { width: 700, height: 180 }

export default function ManBoatAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_DESIGN)
  const vp = useViewport(canvasSize, { designWidth: CANVAS_DESIGN.width, designHeight: CANVAS_DESIGN.height })

  // 参数解析
  const m_person = params.m_person ?? 50
  const m_person2 = params.m_person2 ?? 60
  const M_boat = params.M_boat ?? 150
  const L_boat = params.L_boat ?? 4
  const manBoatControl = params.manBoatControl ?? 0
  const manBoatMode = params.manBoatMode ?? 0
  const manRelS = params.manRelS ?? 0
  const manVRel = params.manVRel ?? 0

  const keysPressed = useRef({ left: false, right: false })

  useEffect(() => {
    const { updateParam } = useAnimationStore.getState()
    updateParam('manRelS', 0)
    updateParam('manVRel', 0)
    keysPressed.current = { left: false, right: false }
  }, [manBoatControl, m_person, m_person2, M_boat, L_boat, manBoatMode])

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
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
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

  // 双人模式下如果不是自动播放，质量2设为0，也就是键盘控制一定是单人模式
  const m2 = manBoatControl === 0 && manBoatMode > 0 ? m_person2 : 0

  // 物理模拟数据
  const boatAutoStates = useMemo(() => {
    if (manBoatControl !== 0) return []
    const list = []
    for (let i = 0; i <= BOAT_AUTO_STEPS; i++) {
      const t = (i / BOAT_AUTO_STEPS) * BOAT_WALK_DURATION
      const motion = getManBoatAutoMotion(t, L_boat, BOAT_WALK_DURATION, manBoatMode)
      const st = calculateManBoatState(motion.s1, motion.v1_rel, motion.s2, motion.v2_rel, m_person, m2, M_boat, L_boat)
      list.push({ t, ...st })
    }
    return list
  }, [manBoatControl, m_person, m2, M_boat, L_boat, manBoatMode])

  const boatState = useMemo(() => {
    if (manBoatControl === 0) {
      const motion = getManBoatAutoMotion(time, L_boat, BOAT_WALK_DURATION, manBoatMode)
      return calculateManBoatState(motion.s1, motion.v1_rel, motion.s2, motion.v2_rel, m_person, m2, M_boat, L_boat)
    } else {
      // 键盘互动模式，强制人2静止在船尾，人2质量为0
      return calculateManBoatState(manRelS, manVRel, L_boat, 0, m_person, 0, M_boat, L_boat)
    }
  }, [manBoatControl, time, manRelS, manVRel, m_person, m2, M_boat, L_boat, manBoatMode])

  // 图表数据点
  const {
    boatVtDomain_person1, boatVtDomain_person2, boatVtDomain_boat,
    boatVtPoints_person1, boatVtPoints_person2, boatVtPoints_boat,
    boatStDomain_person1, boatStDomain_person2, boatStDomain_boat, boatStDomain_cm,
    boatStPoints_person1, boatStPoints_person2, boatStPoints_boat, boatStPoints_cm
  } = useMemo(() => {
    const boatVtDomain_person1 = boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_person1 }))
    const boatVtDomain_person2 = boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_person2 }))
    const boatVtDomain_boat = boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_boat }))
    const boatVtPoints_person1 = getPointsUpToTime(boatVtDomain_person1, time)
    const boatVtPoints_person2 = getPointsUpToTime(boatVtDomain_person2, time)
    const boatVtPoints_boat = getPointsUpToTime(boatVtDomain_boat, time)

    const x0_person1 = boatAutoStates.length > 0 ? boatAutoStates[0].x_person1 : 0
    const x0_person2 = boatAutoStates.length > 0 ? boatAutoStates[0].x_person2 : 0
    const x0_boat = boatAutoStates.length > 0 ? boatAutoStates[0].x_boat : 0

    const boatStDomain_person1 = boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_person1 - x0_person1 }))
    const boatStDomain_person2 = boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_person2 - x0_person2 }))
    const boatStDomain_boat = boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_boat - x0_boat }))
    const boatStDomain_cm = boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_cm }))
    const boatStPoints_person1 = getPointsUpToTime(boatStDomain_person1, time)
    const boatStPoints_person2 = getPointsUpToTime(boatStDomain_person2, time)
    const boatStPoints_boat = getPointsUpToTime(boatStDomain_boat, time)
    const boatStPoints_cm = getPointsUpToTime(boatStDomain_cm, time)

    return {
      boatVtDomain_person1, boatVtDomain_person2, boatVtDomain_boat,
      boatVtPoints_person1, boatVtPoints_person2, boatVtPoints_boat,
      boatStDomain_person1, boatStDomain_person2, boatStDomain_boat, boatStDomain_cm,
      boatStPoints_person1, boatStPoints_person2, boatStPoints_boat, boatStPoints_cm
    }
  }, [boatAutoStates, time])

  const sceneScale = useMemo(() => ({
    scaleX: BOAT_PX_PER_M, scaleY: BOAT_PX_PER_M, scale: BOAT_PX_PER_M,
    originX: BOAT_ORIGIN_X, originY: GROUND_Y, maxVectorLength: 40,
    refMagnitudes: { velocity: 2.0 }
  }), [])

  const gradIdBoat = useId()
  const gradIdGlowGold = useId()

  const p1 = m_person * boatState.v_person1
  const p2 = m2 * boatState.v_person2
  const pb = M_boat * boatState.v_boat
  const p_total = p1 + p2 + pb

  const P_MAX = Math.max(120, m_person * 1.5)



  const isDouble = manBoatMode > 0 && manBoatControl === 0

  return (
    <div className="w-full h-full flex flex-col gap-2 p-2 box-border bg-neutral-50 overflow-hidden">
      {/* 上方图表与数据看板 */}
      <div className="flex-[4] min-h-[160px] grid grid-cols-3 gap-2">
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={boatVtPoints_person1}
              domainPoints={boatVtDomain_person1}
              currentTime={time}
              tMax={BOAT_WALK_DURATION}
              title=""
              xLabel="t (s)"
              yLabel=""
              additionalSeries={[
                { points: boatVtPoints_boat, domainPoints: boatVtDomain_boat, label: '船速度', series: 'secondary' },
                ...(isDouble ? [{ points: boatVtPoints_person2, domainPoints: boatVtDomain_person2, label: '人2速度', series: 'warm' as const }] : [])
              ]}
              showArea={false}
            />
          </div>
        </div>
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm relative overflow-hidden flex flex-col">
          <div className="flex-grow min-h-0 relative">
            <VelocityTimeChart
              mode="animated"
              points={boatStPoints_person1}
              domainPoints={boatStDomain_person1}
              currentTime={time}
              tMax={BOAT_WALK_DURATION}
              title=""
              xLabel="t (s)"
              yLabel=""
              additionalSeries={[
                { points: boatStPoints_boat, domainPoints: boatStDomain_boat, label: '船位移', series: 'secondary' },
                { points: boatStPoints_cm, domainPoints: boatStDomain_cm, label: '质心位移', series: 'success' },
                ...(isDouble ? [{ points: boatStPoints_person2, domainPoints: boatStDomain_person2, label: '人2位移', series: 'warm' as const }] : [])
              ]}
              showArea={false}
            />
          </div>
        </div>

        {/* 动量守恒实时检测天平 */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold text-neutral-800 border-b pb-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                动量监测
              </span>
              <span className="text-[9px] text-neutral-400 font-mono">p (kg·m/s)</span>
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center my-1 select-none">
            <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid meet" className="w-full h-full overflow-visible">
              <line x1="5" y1="45" x2="155" y2="45" stroke={CANVAS_COLORS.grid} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <SVGSingleBar x={isDouble ? 22 : 42} baseY={45} height={(p1 / P_MAX) * 35} barWidth={18} color={colors.primary[500]} label="p₁" valueText={p1.toFixed(1)} font={canvasSize.font} trackHeight={35} showTrack={true} />
              {isDouble && <SVGSingleBar x={67} baseY={45} height={(p2 / P_MAX) * 35} barWidth={18} color={colors.danger[500]} label="p₂" valueText={p2.toFixed(1)} font={canvasSize.font} trackHeight={35} showTrack={true} />}
              <SVGSingleBar x={isDouble ? 112 : 92} baseY={45} height={(pb / P_MAX) * 35} barWidth={18} color={colors.warning[600]} label="p_船" valueText={pb.toFixed(1)} font={canvasSize.font} trackHeight={35} showTrack={true} />
            </svg>
          </div>

          <div className="border-t border-neutral-200/60 pt-1.5 flex items-center justify-between">
            <span className="text-emerald-600 font-bold text-[10px]">系统总动量 Σp</span>
            <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-mono">
              {Math.abs(p_total) < 1e-4 ? '0.000' : p_total.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* 下方物理仿真动画区 */}
      <div
        ref={containerRef}
        className="flex-[5] min-h-[220px] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between"
      >
        <svg
          className="w-full h-full block"
        >
          <g transform={vp.transform}>
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

            {/* 带有刻度尺的水面 */}
            <PhysicsGround
              x={GROUND_X}
              y={GROUND_Y}
              width={GROUND_WIDTH}
              isSmooth={true}
              appearance={{ showHatch: false, color: '#0284c7' }}
              ruler={{ domain: [-6.667, 6.667], pixelPerUnit: BOAT_PX_PER_M, tickInterval: 1, unit: 'm', position: 'bottom', showAxisLine: true }}
            />
            {/* 水面淡波纹 */}
            <g opacity="0.3" stroke="#0ea5e9" strokeWidth="1.2" fill="none">
              <path d="M 50,134 Q 65,132 80,134 T 110,134 T 140,134" strokeDasharray="3 3" />
              <path d="M 250,135 Q 265,133 280,135 T 310,135 T 340,135" strokeDasharray="3 3" />
              <path d="M 450,134 Q 465,132 480,134 T 510,134 T 540,134" strokeDasharray="3 3" />
              <path d="M 600,135 Q 615,133 630,135 T 660,135 T 690,135" strokeDasharray="3 3" />
            </g>

            {/* 质心十字星标记 */}
            <g transform={`translate(${BOAT_ORIGIN_X}, 95)`}>
              <circle r={`${CM_STAR.glowRadius}`} fill={`url(#${gradIdGlowGold})`} />
              <circle r={`${CM_STAR.coreRadius}`} fill={CANVAS_COLORS.referencePoint} />
              <line x1={`-${CM_STAR.glowRadius}`} y1="0" x2={`${CM_STAR.glowRadius}`} y2="0" stroke={CANVAS_COLORS.referencePoint} strokeWidth="1.2" />
              <line x1="0" y1={`-${CM_STAR.glowRadius}`} x2="0" y2={`${CM_STAR.glowRadius}`} stroke={CANVAS_COLORS.referencePoint} strokeWidth="1.2" />
              <text x="0" y={`${CM_STAR.labelOffset}`} fill={CANVAS_COLORS.referencePoint} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">系统质心 (常锁定 0)</text>
            </g>

            {/* 船绘制 */}
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

            {/* 小人1绘制 */}
            {(() => {
              const xp_px = BOAT_ORIGIN_X + boatState.x_person1 * BOAT_PX_PER_M
              const headY = GROUND_Y - 18 - 20
              const angle = boatState.v1_rel !== 0 ? Math.sin(time * 15) * 6 : 0
              return (
                <g>
                  <circle cx={xp_px} cy={headY} r="4" fill={colors.primary[500]} stroke={colors.primary[700]} strokeWidth="1" />
                  <line x1={xp_px} y1={headY + 4} x2={xp_px} y2={GROUND_Y - 18 - 8} stroke={colors.primary[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={headY + 6} x2={xp_px - 6 - angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={colors.primary[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={headY + 6} x2={xp_px + 6 + angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={colors.primary[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px - 5 - angle * 0.3} y2={GROUND_Y - 18} stroke={colors.primary[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px + 5 + angle * 0.3} y2={GROUND_Y - 18} stroke={colors.primary[600]} strokeWidth="1.5" />
                  <text x={xp_px} y={headY - 6} fill={colors.primary[700]} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">人1 {m_person}kg</text>
                  <VectorArrow origin={{ x: boatState.x_person1, y: 0.6 }} vector={{ x: boatState.v_person1, y: 0 }} type="velocity" sceneScale={sceneScale as never} color={colors.primary[500]} />
                </g>
              )
            })()}

            {/* 小人2绘制 */}
            {isDouble && (() => {
              const xp_px = BOAT_ORIGIN_X + boatState.x_person2 * BOAT_PX_PER_M
              const headY = GROUND_Y - 18 - 20
              const angle = boatState.v2_rel !== 0 ? Math.sin(time * 15) * 6 : 0
              return (
                <g>
                  <circle cx={xp_px} cy={headY} r="4" fill={colors.danger[500]} stroke={colors.danger[700]} strokeWidth="1" />
                  <line x1={xp_px} y1={headY + 4} x2={xp_px} y2={GROUND_Y - 18 - 8} stroke={colors.danger[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={headY + 6} x2={xp_px - 6 - angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={colors.danger[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={headY + 6} x2={xp_px + 6 + angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={colors.danger[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px - 5 - angle * 0.3} y2={GROUND_Y - 18} stroke={colors.danger[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px + 5 + angle * 0.3} y2={GROUND_Y - 18} stroke={colors.danger[600]} strokeWidth="1.5" />
                  <text x={xp_px} y={headY - 6} fill={colors.danger[700]} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">人2 {m_person2}kg</text>
                  <VectorArrow origin={{ x: boatState.x_person2, y: 0.6 }} vector={{ x: boatState.v_person2, y: 0 }} type="velocity" sceneScale={sceneScale as never} color={colors.danger[500]} />
                </g>
              )
            })()}

            {/* 船速度箭头 */}
            <VectorArrow origin={{ x: boatState.x_boat + L_boat * 0.5, y: 0.1 }} vector={{ x: boatState.v_boat, y: 0 }} type="velocity" sceneScale={sceneScale as never} color={colors.warning[600]} />

            {/* 自动模式下位移双向箭头 */}
            {(() => {
              const isAutoEnd = manBoatControl === 0 && time >= BOAT_WALK_DURATION
              if (!isAutoEnd) return null

              const x0_boat = -(m2 * L_boat + M_boat * L_boat * 0.5) / (m_person + m2 + M_boat)
              const x0_person1 = x0_boat
              const x0_person2 = x0_boat + L_boat

              const xEnd_boat = boatState.x_boat
              const xEnd_person1 = boatState.x_person1
              const xEnd_person2 = boatState.x_person2

              const disp_boat = xEnd_boat - x0_boat
              const disp_person1 = xEnd_person1 - x0_person1
              const disp_person2 = xEnd_person2 - x0_person2

              const xb0_px = BOAT_ORIGIN_X + x0_boat * BOAT_PX_PER_M
              const xbend_px = BOAT_ORIGIN_X + xEnd_boat * BOAT_PX_PER_M

              const xp1_0_px = BOAT_ORIGIN_X + x0_person1 * BOAT_PX_PER_M
              const xp1_end_px = BOAT_ORIGIN_X + xEnd_person1 * BOAT_PX_PER_M

              const xp2_0_px = BOAT_ORIGIN_X + x0_person2 * BOAT_PX_PER_M
              const xp2_end_px = BOAT_ORIGIN_X + xEnd_person2 * BOAT_PX_PER_M

              const arrowSize = 4
              const p1LineY = GROUND_Y - 50
              const p2LineY = GROUND_Y - 70
              const boatLineY = GROUND_Y + 18

              return (
                <g>
                  {/* 人1位移 */}
                  <line x1={xp1_0_px} y1={p1LineY} x2={xp1_end_px} y2={p1LineY} stroke={colors.primary[400]} strokeWidth="1.2" strokeDasharray="2 2" />
                  <polygon points={`${xp1_end_px},${p1LineY} ${xp1_end_px + (disp_person1 < 0 ? arrowSize : -arrowSize)},${p1LineY - 3} ${xp1_end_px + (disp_person1 < 0 ? arrowSize : -arrowSize)},${p1LineY + 3}`} fill={colors.primary[500]} />
                  <text x={(xp1_0_px + xp1_end_px) / 2} y={p1LineY - 5} fill={colors.primary[600]} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">人1位移 s1 = {disp_person1.toFixed(3)}m</text>

                  {/* 人2位移 */}
                  {isDouble && (
                    <g>
                      <line x1={xp2_0_px} y1={p2LineY} x2={xp2_end_px} y2={p2LineY} stroke={colors.danger[400]} strokeWidth="1.2" strokeDasharray="2 2" />
                      <polygon points={`${xp2_end_px},${p2LineY} ${xp2_end_px + (disp_person2 < 0 ? arrowSize : -arrowSize)},${p2LineY - 3} ${xp2_end_px + (disp_person2 < 0 ? arrowSize : -arrowSize)},${p2LineY + 3}`} fill={colors.danger[500]} />
                      <text x={(xp2_0_px + xp2_end_px) / 2} y={p2LineY - 5} fill={colors.danger[600]} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">人2位移 s2 = {disp_person2.toFixed(3)}m</text>
                    </g>
                  )}

                  {/* 船位移 */}
                  <line x1={xb0_px} y1={boatLineY} x2={xbend_px} y2={boatLineY} stroke={colors.warning[600]} strokeWidth="1.2" strokeDasharray="2 2" />
                  <polygon points={`${xbend_px},${boatLineY} ${xbend_px + (disp_boat < 0 ? arrowSize : -arrowSize)},${boatLineY - 3} ${xbend_px + (disp_boat < 0 ? arrowSize : -arrowSize)},${boatLineY + 3}`} fill={colors.warning[700]} />
                  <text x={(xb0_px + xbend_px) / 2} y={boatLineY + 10} fill={colors.warning[700]} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">船位移 s_船 = {disp_boat.toFixed(3)}m</text>
                </g>
              )
            })()}
          </g>
        </svg>

        <div className="p-2.5 bg-neutral-50 border-t border-neutral-200/80 text-[10px] text-neutral-500 leading-tight">
          💡 <strong>无外力与质心锁定</strong>：水平面无摩擦，系统水平方向外力为 0，质心十字星完全锁定不动。不论是变速、中途停顿还是先后走动，只要起止时刻静止，系统的总位移仅由初始和末尾位置决定，完美符合动量守恒。
        </div>
      </div>
    </div>
  )
}

