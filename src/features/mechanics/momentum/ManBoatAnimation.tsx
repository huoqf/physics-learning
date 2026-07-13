import { VectorArrow, PhysicsGround, SVGSingleBar } from '@/components/Physics'
import { useEffect, useRef, useMemo, useId } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useAnimationViewport, useSceneScale } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { useSimulationFrame } from '@/utils/animation'
import { getPointsUpToTime } from '@/utils'

import { SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

import { VelocityTimeChart } from '@/components/Chart'
import { calculateManBoatState, getManBoatAutoMotion, calculateManBoatDisplacements } from '@/physics/momentumApplication/manBoat'

const MAN_BOAT_LAYOUT = {
  groundYRatio: 0.722,
  originXRatio: 0.5,
  pxPerMeter: 42,
} as const

const BOAT_WALK_DURATION = 2.5
const BOAT_AUTO_STEPS = 100
const CM_STAR = { coreRadius: 5, glowRadius: 13, labelOffset: 20 }
const KEYBOARD_SPEED = 3

export default function ManBoatAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const { containerRef, canvasSize, vp, preset } = useAnimationViewport({ preset: CANVAS_PRESETS.splitV })

  const groundY = Math.round(preset.height * MAN_BOAT_LAYOUT.groundYRatio)
  const originX = Math.round(preset.width * MAN_BOAT_LAYOUT.originXRatio)
  const pxPerMeter = MAN_BOAT_LAYOUT.pxPerMeter

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

  const sceneScale = useSceneScale({
    vp, preset,
    anchor: 'custom',
    customScaleX: pxPerMeter,
    customScaleY: pxPerMeter,
    customOriginX: originX,
    customOriginY: groundY,
    maxVectorLength: 75,
    refMagnitudes: { velocity: 3.0, velocityX: 3.5, velocityY: 3.5 },
  })

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
      <div className="flex-1 min-h-[160px] grid grid-cols-3 gap-2">
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
            <div className="text-ui-base font-bold text-neutral-800 border-b pb-1 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                动量监测
              </span>
              <span className="text-ui-sm text-neutral-400 font-mono">p (kg·m/s)</span>
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
            <span className="text-emerald-600 font-bold text-ui-base">系统总动量 Σp</span>
            <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-mono">
              {Math.abs(p_total) < 1e-4 ? '0.000' : p_total.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* 下方物理仿真动画区 */}
      <div className="flex-1 min-h-[220px] bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between">
        <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
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
              x={0}
              y={groundY}
              width={preset.width}
              isSmooth={true}
              appearance={{ showHatch: false, color: SCENE_COLORS.surface.waterFill }}
              ruler={{ domain: [-6.667, 6.667], pixelPerUnit: pxPerMeter, tickInterval: 1, unit: 'm', position: 'bottom', showAxisLine: true }}
            />
            {/* 水面淡波纹 */}
            <g opacity="0.3" stroke={SCENE_COLORS.surface.waterRipple} strokeWidth="1.2" fill="none">
              <path d={`M 60,${groundY - 1} Q 78,${groundY - 3} 96,${groundY - 1} T 132,${groundY - 1} T 168,${groundY - 1}`} strokeDasharray="3 3" />
              <path d={`M 300,${groundY} Q 318,${groundY - 2} 336,${groundY} T 372,${groundY} T 408,${groundY}`} strokeDasharray="3 3" />
              <path d={`M 540,${groundY - 1} Q 558,${groundY - 3} 576,${groundY - 1} T 612,${groundY - 1} T 648,${groundY - 1}`} strokeDasharray="3 3" />
              <path d={`M 720,${groundY} Q 738,${groundY - 2} 756,${groundY} T 792,${groundY} T 828,${groundY}`} strokeDasharray="3 3" />
            </g>

            {/* 质心十字星标记 */}
            <g transform={`translate(${originX}, ${groundY - 80})`}>
              <circle r={`${CM_STAR.glowRadius}`} fill={`url(#${gradIdGlowGold})`} />
              <circle r={`${CM_STAR.coreRadius}`} fill={CANVAS_COLORS.referencePoint} />
              <line x1={`-${CM_STAR.glowRadius}`} y1="0" x2={`${CM_STAR.glowRadius}`} y2="0" stroke={CANVAS_COLORS.referencePoint} strokeWidth="1.2" />
              <line x1="0" y1={`-${CM_STAR.glowRadius}`} x2="0" y2={`${CM_STAR.glowRadius}`} stroke={CANVAS_COLORS.referencePoint} strokeWidth="1.2" />
              <text x="0" y={`${CM_STAR.labelOffset}`} fill={CANVAS_COLORS.referencePoint} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">系统质心 (常锁定 0)</text>
            </g>

            {/* 船绘制 */}
            {(() => {
              const xb_px = originX + boatState.x_boat * pxPerMeter
              const wb_px = L_boat * pxPerMeter
              return (
                <g>
                  <path d={`M ${xb_px} ${groundY - 10} L ${xb_px - 12} ${groundY - 24} L ${xb_px + wb_px + 12} ${groundY - 24} L ${xb_px + wb_px} ${groundY - 10} Z`} fill={`url(#${gradIdBoat})`} stroke={SCENE_COLORS.materials.labWoodGrad[3]} strokeWidth="1.5" />
                  <text x={xb_px + wb_px / 2} y={groundY - 4} fill={SCENE_COLORS.materials.labWoodGrad[0]} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">船 {M_boat}kg</text>
                </g>
              )
            })()}

            {/* 小人1绘制 */}
            {(() => {
              const xp_px = originX + boatState.x_person1 * pxPerMeter
              const headY = groundY - 24 - 24
              const angle = boatState.v1_rel !== 0 ? Math.sin(time * 15) * 6 : 0
              return (
                <g>
                  <circle cx={xp_px} cy={headY} r="5" fill={colors.primary[500]} stroke={colors.primary[700]} strokeWidth="1" />
                  <line x1={xp_px} y1={headY + 5} x2={xp_px} y2={groundY - 24 - 10} stroke={colors.primary[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={headY + 7} x2={xp_px - 7 - angle * 0.1} y2={groundY - 24 - 14} stroke={colors.primary[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={headY + 7} x2={xp_px + 7 + angle * 0.1} y2={groundY - 24 - 14} stroke={colors.primary[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={groundY - 24 - 10} x2={xp_px - 6 - angle * 0.3} y2={groundY - 24} stroke={colors.primary[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={groundY - 24 - 10} x2={xp_px + 6 + angle * 0.3} y2={groundY - 24} stroke={colors.primary[600]} strokeWidth="1.5" />
                  <text x={xp_px} y={headY - 6} fill={colors.primary[700]} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">人1 {m_person}kg</text>
                  <VectorArrow originPixel={{ x: boatState.x_person1, y: 0.85 }} vector={{ x: boatState.v_person1, y: 0 }} type="velocityX" sceneScale={sceneScale} />
                </g>
              )
            })()}

            {/* 小人2绘制 */}
            {isDouble && (() => {
              const xp_px = originX + boatState.x_person2 * pxPerMeter
              const headY = groundY - 24 - 24
              const angle = boatState.v2_rel !== 0 ? Math.sin(time * 15) * 6 : 0
              return (
                <g>
                  <circle cx={xp_px} cy={headY} r="5" fill={colors.danger[500]} stroke={colors.danger[700]} strokeWidth="1" />
                  <line x1={xp_px} y1={headY + 5} x2={xp_px} y2={groundY - 24 - 10} stroke={colors.danger[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={headY + 7} x2={xp_px - 7 - angle * 0.1} y2={groundY - 24 - 14} stroke={colors.danger[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={headY + 7} x2={xp_px + 7 + angle * 0.1} y2={groundY - 24 - 14} stroke={colors.danger[600]} strokeWidth="1.2" />
                  <line x1={xp_px} y1={groundY - 24 - 10} x2={xp_px - 6 - angle * 0.3} y2={groundY - 24} stroke={colors.danger[600]} strokeWidth="1.5" />
                  <line x1={xp_px} y1={groundY - 24 - 10} x2={xp_px + 6 + angle * 0.3} y2={groundY - 24} stroke={colors.danger[600]} strokeWidth="1.5" />
                  <text x={xp_px} y={headY - 6} fill={colors.danger[700]} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">人2 {m_person2}kg</text>
                  <VectorArrow originPixel={{ x: boatState.x_person2, y: 0.85 }} vector={{ x: boatState.v_person2, y: 0 }} type="velocityY" sceneScale={sceneScale} />
                </g>
              )
            })()}

            {/* 船速度箭头 */}
            <VectorArrow originPixel={{ x: boatState.x_boat + L_boat * 0.5, y: 0.4 }} vector={{ x: boatState.v_boat, y: 0 }} type="velocity" sceneScale={sceneScale} />

            {/* 自动模式下位移双向箭头 */}
            {(() => {
              const isAutoEnd = manBoatControl === 0 && time >= BOAT_WALK_DURATION
              if (!isAutoEnd) return null

              const { x0, xEnd, disp } = calculateManBoatDisplacements(m_person, m2, M_boat, L_boat, boatState)

              const xb0_px = originX + x0.boat * pxPerMeter
              const xbend_px = originX + xEnd.boat * pxPerMeter
              const xp1_0_px = originX + x0.person1 * pxPerMeter
              const xp1_end_px = originX + xEnd.person1 * pxPerMeter
              const xp2_0_px = originX + x0.person2 * pxPerMeter
              const xp2_end_px = originX + xEnd.person2 * pxPerMeter

              const arrowSize = 4
              const p1LineY = groundY - 50
              const p2LineY = groundY - 70
              const boatLineY = groundY + 18

              return (
                <g>
                  {/* 人1位移 */}
                  <line x1={xp1_0_px} y1={p1LineY} x2={xp1_end_px} y2={p1LineY} stroke={colors.primary[400]} strokeWidth="1.2" strokeDasharray="2 2" />
                  <polygon points={`${xp1_end_px},${p1LineY} ${xp1_end_px + (disp.person1 < 0 ? arrowSize : -arrowSize)},${p1LineY - 3} ${xp1_end_px + (disp.person1 < 0 ? arrowSize : -arrowSize)},${p1LineY + 3}`} fill={colors.primary[500]} />
                  <text x={(xp1_0_px + xp1_end_px) / 2} y={p1LineY - 5} fill={colors.primary[600]} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">人1位移 s1 = {disp.person1.toFixed(3)}m</text>

                  {/* 人2位移 */}
                  {isDouble && (
                    <g>
                      <line x1={xp2_0_px} y1={p2LineY} x2={xp2_end_px} y2={p2LineY} stroke={colors.danger[400]} strokeWidth="1.2" strokeDasharray="2 2" />
                      <polygon points={`${xp2_end_px},${p2LineY} ${xp2_end_px + (disp.person2 < 0 ? arrowSize : -arrowSize)},${p2LineY - 3} ${xp2_end_px + (disp.person2 < 0 ? arrowSize : -arrowSize)},${p2LineY + 3}`} fill={colors.danger[500]} />
                      <text x={(xp2_0_px + xp2_end_px) / 2} y={p2LineY - 5} fill={colors.danger[600]} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">人2位移 s2 = {disp.person2.toFixed(3)}m</text>
                    </g>
                  )}

                  {/* 船位移 */}
                  <line x1={xb0_px} y1={boatLineY} x2={xbend_px} y2={boatLineY} stroke={colors.warning[600]} strokeWidth="1.2" strokeDasharray="2 2" />
                  <polygon points={`${xbend_px},${boatLineY} ${xbend_px + (disp.boat < 0 ? arrowSize : -arrowSize)},${boatLineY - 3} ${xbend_px + (disp.boat < 0 ? arrowSize : -arrowSize)},${boatLineY + 3}`} fill={colors.warning[700]} />
                  <text x={(xb0_px + xbend_px) / 2} y={boatLineY + 10} fill={colors.warning[700]} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">船位移 s_船 = {disp.boat.toFixed(3)}m</text>
                </g>
              )
            })()}
        </AnimationSvgCanvas>
      </div>
    </div>
  )
}

