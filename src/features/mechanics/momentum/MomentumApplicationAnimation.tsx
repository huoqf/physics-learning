import { useEffect, useRef, useMemo, useId } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { useCanvasSize, useViewport, getPointsUpToTime } from '@/utils'
import { useSimulationFrame } from '@/utils/animation'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { VelocityTimeChart } from '@/components/Chart'
import { Ball } from '@/components/Physics/Ball'
import { Block } from '@/components/Physics/Block'
import { Spring } from '@/components/UI'

// 导入物理纯计算模块
import {
  precomputeCurvedSlot,
  interpolateCurvedSlot,
  precomputeSpringBlocks,
  interpolateSpringBlocks,
  calculateManBoatState,
  getManBoatAutoMotion
} from '@/physics/momentumApplication'

export default function MomentumApplicationAnimation() {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  // 生成唯一渐变 ID，防止跨文件 SVG ID 冲突
  const gradIdSteel = useId()
  const gradIdVacuum = useId()
  const gradIdCurvedSlot = useId()
  const gradIdBoat = useId()
  const gradIdGlowGold = useId()

  // 1. 画布尺寸与视口适配（遵循 useCanvasSize + Viewport 架构铁律）
  const [containerRef, canvasSize] = useCanvasSize(CANVAS_DESIGN)
  const vp = useViewport(canvasSize, CANVAS_DESIGN)

  const {
    modelType = 0, // 0: 弧形槽-滑块, 1: 弹簧双滑块, 2: 人船模型
    m_block = 2,
    M_slot = 5,
    R_slot = 1.5,
    mA_spring = 2,
    mB_spring = 3,
    v0_spring = 5,
    k_spring = 20,
    m_person = 50,
    M_boat = 150,
    L_boat = 4,
    manBoatControl = 0, // 0: 自动, 1: 键盘
    manRelS = 0,
    manVRel = 0,
  } = params

  // ============================================================================
  // 数据计算与处理
  // ============================================================================

  // ── 模型一：弧形槽-滑块 ──
  const curvedSlotStates = useMemo(() => {
    if (modelType !== 0) return []
    return precomputeCurvedSlot(m_block, M_slot, R_slot, GRAVITY, SLOT_SIM.duration, SLOT_SIM.dt)
  }, [modelType, m_block, M_slot, R_slot])

  const slotState = useMemo(() => {
    if (modelType !== 0) return null
    return interpolateCurvedSlot(curvedSlotStates, time)
  }, [modelType, curvedSlotStates, time])

  // 图表一数据源：速度 V-T
  const slotVtDomain_m_vx = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: pt.v_x })), [curvedSlotStates])
  const slotVtDomain_m_vy = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: pt.v_y })), [curvedSlotStates])
  const slotVtDomain_M_vx = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: pt.v_X })), [curvedSlotStates])

  // 图表一当前点
  const slotVtPoints_m_vx = useMemo(() => getPointsUpToTime(slotVtDomain_m_vx, time), [slotVtDomain_m_vx, time])
  const slotVtPoints_m_vy = useMemo(() => getPointsUpToTime(slotVtDomain_m_vy, time), [slotVtDomain_m_vy, time])
  const slotVtPoints_M_vx = useMemo(() => getPointsUpToTime(slotVtDomain_M_vx, time), [slotVtDomain_M_vx, time])

  // 图表二数据源：动量 P-T
  const slotPtDomain_m = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: m_block * pt.v_x })), [curvedSlotStates, m_block])
  const slotPtDomain_M = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: M_slot * pt.v_X })), [curvedSlotStates, M_slot])
  const slotPtDomain_Total = useMemo(() => curvedSlotStates.map(pt => ({ t: pt.t, v: m_block * pt.v_x + M_slot * pt.v_X })), [curvedSlotStates, m_block, M_slot])

  // 图表二当前点
  const slotPtPoints_m = useMemo(() => getPointsUpToTime(slotPtDomain_m, time), [slotPtDomain_m, time])
  const slotPtPoints_M = useMemo(() => getPointsUpToTime(slotPtDomain_M, time), [slotPtDomain_M, time])
  const slotPtPoints_Total = useMemo(() => getPointsUpToTime(slotPtDomain_Total, time), [slotPtDomain_Total, time])

  // ── 模型二：弹簧双滑块 ──
  const springBlocksStates = useMemo(() => {
    if (modelType !== 1) return []
    return precomputeSpringBlocks(mA_spring, mB_spring, v0_spring, k_spring, 1.5, 3.5, SPRING_SIM.duration, SPRING_SIM.dt)
  }, [modelType, mA_spring, mB_spring, v0_spring, k_spring])

  const springState = useMemo(() => {
    if (modelType !== 1) return null
    return interpolateSpringBlocks(springBlocksStates, time)
  }, [modelType, springBlocksStates, time])

  // 图表一数据源：速度 V-T
  const springVtDomain_A = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.vA })), [springBlocksStates])
  const springVtDomain_B = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.vB })), [springBlocksStates])

  // 图表一当前点
  const springVtPoints_A = useMemo(() => getPointsUpToTime(springVtDomain_A, time), [springVtDomain_A, time])
  const springVtPoints_B = useMemo(() => getPointsUpToTime(springVtDomain_B, time), [springVtDomain_B, time])

  // 图表二数据源：能量 E-T
  const springEtDomain_Ek = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.EkA + pt.EkB })), [springBlocksStates])
  const springEtDomain_Ep = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.Ep })), [springBlocksStates])
  const springEtDomain_Total = useMemo(() => springBlocksStates.map(pt => ({ t: pt.t, v: pt.Etotal })), [springBlocksStates])

  // 图表二当前点
  const springEtPoints_Ek = useMemo(() => getPointsUpToTime(springEtDomain_Ek, time), [springEtDomain_Ek, time])
  const springEtPoints_Ep = useMemo(() => getPointsUpToTime(springEtDomain_Ep, time), [springEtDomain_Ep, time])
  const springEtPoints_Total = useMemo(() => getPointsUpToTime(springEtDomain_Total, time), [springEtDomain_Total, time])

  // ── 模型三：人船模型 ──
  const keysPressed = useRef({ left: false, right: false })

  // 重置手动移动 (同步到 store 中，遵循动画状态统一 useAnimationStore 铁律)
  useEffect(() => {
    const { updateParam } = useAnimationStore.getState()
    updateParam('manRelS', 0)
    updateParam('manVRel', 0)
    keysPressed.current = { left: false, right: false }
  }, [modelType, manBoatControl, m_person, M_boat, L_boat])

  // 键盘监听逻辑
  useEffect(() => {
    if (modelType !== 2 || manBoatControl !== 1) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        keysPressed.current.left = true
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        keysPressed.current.right = true
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        keysPressed.current.left = false
      } else if (e.key === 'ArrowRight') {
        keysPressed.current.right = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [modelType, manBoatControl])

  // 键盘模式仿真运行 (同步推进 manRelS 和 manVRel 到 store)
  useSimulationFrame((deltaTimeMs) => {
    if (modelType !== 2 || manBoatControl !== 1) return

    const dt = deltaTimeMs / 1000 // s
    let speed = 0
    if (keysPressed.current.left) speed = -KEYBOARD_SPEED
    if (keysPressed.current.right) speed = KEYBOARD_SPEED

    const { updateParam } = useAnimationStore.getState()
    
    if (speed !== manVRel) {
      updateParam('manVRel', speed)
    }
    
    if (speed !== 0) {
      const nextS = manRelS + speed * dt
      const clampedS = Math.max(0, Math.min(L_boat, nextS))
      if (clampedS !== manRelS) {
        updateParam('manRelS', clampedS)
      }
    }
  }, { active: modelType === 2 && manBoatControl === 1 })

  // 获取人船模型自动轨迹数据源 (仅用于自动模式图表，展示 0 到 BOAT_WALK_DURATION 的过程)
  const boatAutoStates = useMemo(() => {
    if (modelType !== 2 || manBoatControl !== 0) return []
    const list = []
    for (let i = 0; i <= BOAT_AUTO_STEPS; i++) {
      const t = (i / BOAT_AUTO_STEPS) * BOAT_WALK_DURATION
      const motion = getManBoatAutoMotion(t, L_boat, BOAT_WALK_DURATION)
      const st = calculateManBoatState(motion.s, motion.v_rel, m_person, M_boat, L_boat)
      list.push({ t, ...st })
    }
    return list
  }, [modelType, manBoatControl, m_person, M_boat, L_boat])

  const boatState = useMemo(() => {
    if (modelType !== 2) return null
    if (manBoatControl === 0) {
      const motion = getManBoatAutoMotion(time, L_boat, BOAT_WALK_DURATION)
      return calculateManBoatState(motion.s, motion.v_rel, m_person, M_boat, L_boat)
    } else {
      return calculateManBoatState(manRelS, manVRel, m_person, M_boat, L_boat)
    }
  }, [modelType, manBoatControl, time, manRelS, manVRel, m_person, M_boat, L_boat])

  // 人船图表一：速度 V-T
  const boatVtDomain_person = useMemo(() => boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_person })), [boatAutoStates])
  const boatVtDomain_boat = useMemo(() => boatAutoStates.map(pt => ({ t: pt.t, v: pt.v_boat })), [boatAutoStates])

  // 人船图表一当前点
  const boatVtPoints_person = useMemo(() => getPointsUpToTime(boatVtDomain_person, time), [boatVtDomain_person, time])
  const boatVtPoints_boat = useMemo(() => getPointsUpToTime(boatVtDomain_boat, time), [boatVtDomain_boat, time])

  // 人船图表二：位移 S-T (相对于初始坐标的绝对位移)
  const boatStDomain_person = useMemo(() => {
    const x0 = boatAutoStates.length > 0 ? boatAutoStates[0].x_person : 0
    return boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_person - x0 }))
  }, [boatAutoStates])
  
  const boatStDomain_boat = useMemo(() => {
    const x0 = boatAutoStates.length > 0 ? boatAutoStates[0].x_boat : 0
    return boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_boat - x0 }))
  }, [boatAutoStates])
  
  const boatStDomain_cm = useMemo(() => boatAutoStates.map(pt => ({ t: pt.t, v: pt.x_cm })), [boatAutoStates])

  // 人船图表二当前点
  const boatStPoints_person = useMemo(() => getPointsUpToTime(boatStDomain_person, time), [boatStDomain_person, time])
  const boatStPoints_boat = useMemo(() => getPointsUpToTime(boatStDomain_boat, time), [boatStDomain_boat, time])
  const boatStPoints_cm = useMemo(() => getPointsUpToTime(boatStDomain_cm, time), [boatStDomain_cm, time])

  // ============================================================================
  // 渲染配置
  // ============================================================================

  // 矢量箭头的 SceneScale 归一化定义 (高度 180px, 地面 130px)
  const sceneScaleSlot = useMemo(() => ({
    scaleX: SLOT_PX_PER_M,
    scaleY: SLOT_PX_PER_M,
    scale: SLOT_PX_PER_M,
    originX: SLOT_ORIGIN_X,
    originY: GROUND_Y,
    maxVectorLength: 45,
    refMagnitudes: {
      force: 25,
      normalForce: 25,
      appliedForce: 25,
      forceComponent: 25,
      velocity: 5,
    }
  }), [])

  const sceneScaleSpring = useMemo(() => ({
    scaleX: SPRING_PX_PER_M,
    scaleY: SPRING_PX_PER_M,
    scale: SPRING_PX_PER_M,
    originX: SPRING_ORIGIN_X,
    originY: GROUND_Y,
    maxVectorLength: 40,
    refMagnitudes: {
      velocity: 6,
    }
  }), [])

  const sceneScaleBoat = useMemo(() => ({
    scaleX: BOAT_PX_PER_M,
    scaleY: BOAT_PX_PER_M,
    scale: BOAT_PX_PER_M,
    originX: BOAT_ORIGIN_X,
    originY: GROUND_Y,
    maxVectorLength: 40,
    refMagnitudes: {
      velocity: 2.0,
    }
  }), [])

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 box-border bg-neutral-50 overflow-hidden">
      {/* ==================================================================== */}
      {/* 上方并列图表/教学板区域 (高度 220px，和以前页面完全一致) */}
      {/* ==================================================================== */}
      <div className="flex gap-4 h-[220px] shrink-0">
        {/* 模型 0（弧形槽）：左右各一个图表 */}
        {modelType === 0 && (
          <>
            <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex-grow min-h-0 relative">
                <VelocityTimeChart
                  mode="animated"
                  points={slotVtPoints_m_vx}
                  domainPoints={slotVtDomain_m_vx}
                  currentTime={time}
                  tMax={6}
                  title="速度-时间图像 (V-T)"
                  xLabel="时间 t (s)"
                  yLabel="速度 v (m/s)"
                  additionalSeries={[
                    {
                      points: slotVtPoints_m_vy,
                      domainPoints: slotVtDomain_m_vy,
                      label: '滑块 v_y',
                      series: 'secondary'
                    },
                    {
                      points: slotVtPoints_M_vx,
                      domainPoints: slotVtDomain_M_vx,
                      label: '弧形槽 V_x',
                      series: 'success'
                    }
                  ]}
                  showArea={false}
                />
              </div>
            </div>
            <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex-grow min-h-0 relative">
                <VelocityTimeChart
                  mode="animated"
                  points={slotPtPoints_m}
                  domainPoints={slotPtDomain_m}
                  currentTime={time}
                  tMax={6}
                  title="动量-时间图像 (P-T)"
                  xLabel="时间 t (s)"
                  yLabel="动量 p (kg·m/s)"
                  additionalSeries={[
                    {
                      points: slotPtPoints_M,
                      domainPoints: slotPtDomain_M,
                      label: '弧形槽 P_x',
                      series: 'secondary'
                    },
                    {
                      points: slotPtPoints_Total,
                      domainPoints: slotPtDomain_Total,
                      label: '总动量',
                      series: 'success'
                    }
                  ]}
                  showArea={false}
                />
              </div>
            </div>
          </>
        )}

        {/* 模型 1（弹簧双滑块）：速度 V-T 和能量 E-T 图表 */}
        {modelType === 1 && (
          <>
            <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex-grow min-h-0 relative">
                <VelocityTimeChart
                  mode="animated"
                  points={springVtPoints_A}
                  domainPoints={springVtDomain_A}
                  currentTime={time}
                  tMax={6}
                  title="速度-时间图像 (V-T)"
                  xLabel="时间 t (s)"
                  yLabel="速度 v (m/s)"
                  additionalSeries={[
                    {
                      points: springVtPoints_B,
                      domainPoints: springVtDomain_B,
                      label: '滑块 B',
                      series: 'secondary'
                    }
                  ]}
                  showArea={false}
                />
              </div>
            </div>
            <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
              <div className="flex-grow min-h-0 relative">
                <VelocityTimeChart
                  mode="animated"
                  points={springEtPoints_Ek}
                  domainPoints={springEtDomain_Ek}
                  currentTime={time}
                  tMax={6}
                  title="能量-时间图像 (E-T)"
                  xLabel="时间 t (s)"
                  yLabel="能量 E (J)"
                  additionalSeries={[
                    {
                      points: springEtPoints_Ep,
                      domainPoints: springEtDomain_Ep,
                      label: '弹性势能 Ep',
                      series: 'secondary'
                    },
                    {
                      points: springEtPoints_Total,
                      domainPoints: springEtDomain_Total,
                      label: '总机械能',
                      series: 'success'
                    }
                  ]}
                  showArea={false}
                />
              </div>
            </div>
          </>
        )}

        {/* 模型 2（人船模型）：按控制模式分别处理 */}
        {modelType === 2 && (
          <>
            {manBoatControl === 0 ? (
              // 自动模式：展示速度与位移图表
              <>
                <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
                  <div className="flex-grow min-h-0 relative">
                    <VelocityTimeChart
                      mode="animated"
                      points={boatVtPoints_person}
                      domainPoints={boatVtDomain_person}
                      currentTime={time}
                      tMax={4}
                      title="速度-时间图像 (V-T)"
                      xLabel="时间 t (s)"
                      yLabel="速度 v (m/s)"
                      additionalSeries={[
                        {
                          points: boatVtPoints_boat,
                          domainPoints: boatVtDomain_boat,
                          label: '船速度',
                          series: 'secondary'
                        }
                      ]}
                      showArea={false}
                    />
                  </div>
                </div>
                <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl p-3 shadow-sm relative overflow-hidden flex flex-col">
                  <div className="flex-grow min-h-0 relative">
                    <VelocityTimeChart
                      mode="animated"
                      points={boatStPoints_person}
                      domainPoints={boatStDomain_person}
                      currentTime={time}
                      tMax={4}
                      title="位移-时间图像 (S-T)"
                      xLabel="时间 t (s)"
                      yLabel="位移 x (m)"
                      additionalSeries={[
                        {
                          points: boatStPoints_boat,
                          domainPoints: boatStDomain_boat,
                          label: '船位移',
                          series: 'secondary'
                        },
                        {
                          points: boatStPoints_cm,
                          domainPoints: boatStDomain_cm,
                          label: '质心位移',
                          series: 'success'
                        }
                      ]}
                      showArea={false}
                    />
                  </div>
                </div>
              </>
            ) : (
              // 键盘互动模式：展示实时交互教学面板
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
            )}
          </>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 下方物理仿真动画区 (高度占用 180px, bg-white 卡片，符合以前风格) */}
      {/* ==================================================================== */}
      <div
        ref={containerRef}
        className="flex-grow bg-white border border-neutral-200/80 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between"
      >
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full"
        >
          {/* 预定义渐变效果 (使用 SCENE_COLORS 器材材质色) */}
          <defs>
            <radialGradient id={gradIdSteel} cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.steelSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.steelSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.steelSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.steelSphereGrad[3]} />
            </radialGradient>
            <radialGradient id={gradIdVacuum} cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[0]} />
              <stop offset="40%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[1]} />
              <stop offset="80%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.vacuumSphereGrad[3]} />
            </radialGradient>
            <linearGradient id={gradIdCurvedSlot} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[2]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.sliderMetalGrad[3]} />
            </linearGradient>
            <linearGradient id={gradIdBoat} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={SCENE_COLORS.materials.labWoodGrad[1]} />
              <stop offset="100%" stopColor={SCENE_COLORS.materials.labWoodGrad[3]} />
            </linearGradient>
            <radialGradient id={gradIdGlowGold} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={SCENE_COLORS.bulb.bright} stopOpacity="0.8" />
              <stop offset="100%" stopColor={SCENE_COLORS.bulb.bright} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 将所有画面核心内容包裹在 viewport transform 中，自适应缩放 */}
          <g transform={vp.transform}>
            {/* ========================================== */}
            {/* 模型 0：弧形槽-滑块模型 */}
            {/* ========================================== */}
            {modelType === 0 && slotState && (
              <g>
                {/* 地面 */}
                <PhysicsGround
                  x={GROUND_X} y={GROUND_Y}
                  width={GROUND_WIDTH}
                  appearance={{ color: PHYSICS_COLORS.labelText, showHatch: true }}
                />

                {/* 弧形槽 M */}
                {(() => {
                  const X_px = SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M
                  const R_px = R_slot * SLOT_PX_PER_M
                  const pathData = `
                    M ${X_px} ${GROUND_Y}
                    L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${GROUND_Y}
                    L ${X_px + R_px + SLOT_EXTRA_WIDTH} ${GROUND_Y - R_px}
                    L ${X_px + R_px} ${GROUND_Y - R_px}
                    A ${R_px} ${R_px} 0 0 1 ${X_px} ${GROUND_Y}
                    Z
                  `
                  return (
                    <path
                      d={pathData}
                      fill={`url(#${gradIdCurvedSlot})`}
                      stroke={SCENE_COLORS.materials.sliderMetalGrad[3]}
                      strokeWidth={CANVAS_STYLE.stroke.objectLine}
                    />
                  )
                })()}

                {/* 槽的质量标注 */}
                <text
                  x={SLOT_ORIGIN_X + slotState.X * SLOT_PX_PER_M + R_slot * 15 + 10}
                  y={GROUND_Y - 10}
                  fill={CANVAS_COLORS.labelText}
                  fontSize={canvasSize.font(10)}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  M = {M_slot} kg
                </text>

                {/* 小滑块 m */}
                {(() => {
                  // 根据接触点与圆心几何关系：小球圆心相对于接触点，沿法线方向 (sin theta, cos theta) 朝着轨道内侧偏移一个球半径
                  const x_px = SLOT_ORIGIN_X + slotState.x * SLOT_PX_PER_M - BALL_RADIUS_PX * Math.sin(slotState.theta)
                  const y_px = GROUND_Y - slotState.y * SLOT_PX_PER_M - BALL_RADIUS_PX * Math.cos(slotState.theta)
                  return (
                    <g>
                      <Ball
                        cx={x_px}
                        cy={y_px}
                        r={BALL_RADIUS_PX}
                        type="steel"
                        stroke={CANVAS_COLORS.labelText}
                        strokeWidth={CANVAS_STYLE.stroke.objectLine}
                      />
                      <text
                        x={x_px}
                        y={y_px - BALL_RADIUS_PX - 4}
                        fill={CANVAS_COLORS.labelText}
                        fontSize={canvasSize.font(10)}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        m = {m_block} kg
                      </text>
                    </g>
                  )
                })()}

                {/* 力矢量箭头与投影 (使用 VectorArrow 遵循铁律) */}
                {(() => {
                  const theta = slotState.theta
                  const N = slotState.N

                  const r_phy = BALL_RADIUS_PX / sceneScaleSlot.scale
                  // 小球中心点的物理坐标
                  const ballCenterPhy = {
                    x: slotState.x - r_phy * Math.sin(theta),
                    y: slotState.y + r_phy * Math.cos(theta),
                  }
                  // 接触点的物理坐标 (作用在槽上的力以此为起点)
                  const contactPhy = { x: slotState.x, y: slotState.y }

                  const forceVector = { x: -N * Math.sin(theta), y: N * Math.cos(theta) }
                  const forceVectorX = { x: -N * Math.sin(theta), y: 0 }
                  const forceVectorY = { x: 0, y: N * Math.cos(theta) }

                  const reactionVector = { x: N * Math.sin(theta), y: -N * Math.cos(theta) }
                  const reactionVectorX = { x: N * Math.sin(theta), y: 0 }

                  return (
                    <g>
                      {/* 滑块上的法向弹力 N，作用在滑块质心 (球心) 上 */}
                      <VectorArrow
                        origin={ballCenterPhy}
                        vector={forceVector}
                        type="normalForce"
                        sceneScale={sceneScaleSlot}
                        label="N"
                      />
                      {/* 分力 N_x, N_y (灰色虚线)，从球心出发 */}
                      <VectorArrow
                        origin={ballCenterPhy}
                        vector={forceVectorX}
                        type="forceComponent"
                        sceneScale={sceneScaleSlot}
                        label="Nx"
                        dashed
                      />
                      <VectorArrow
                        origin={ballCenterPhy}
                        vector={forceVectorY}
                        type="forceComponent"
                        sceneScale={sceneScaleSlot}
                        label="Ny"
                        dashed
                      />

                      {/* 槽受到的弹力反作用力 N'，作用在接触面 (轨道面) 上 */}
                      <VectorArrow
                        origin={contactPhy}
                        vector={reactionVector}
                        type="appliedForce"
                        sceneScale={sceneScaleSlot}
                        label="N'"
                        color={PHYSICS_COLORS.appliedForce}
                      />
                      {/* 水平分力 (把槽推向右侧) */}
                      <VectorArrow
                        origin={contactPhy}
                        vector={reactionVectorX}
                        type="forceComponent"
                        sceneScale={sceneScaleSlot}
                        label="N'x (推力)"
                        color={PHYSICS_COLORS.forceNet}
                        dashed
                      />
                    </g>
                  )
                })()}

                {/* 水平动量天平 */}
                <g transform={`translate(${SLOT_ORIGIN_X}, ${GROUND_Y + 30})`}>
                  {/* 天平横梁 */}
                  <line x1={`-${BALANCE.beamLength}`} y1="0" x2={`${BALANCE.beamLength}`} y2="0" stroke={SCENE_COLORS.charts.axisLine} strokeWidth="2.5" />
                  {/* 天平支点 */}
                  <polygon points="0,0 -6,10 6,10" fill={SCENE_COLORS.pendulum.rodFill} />

                  {/* 滑块水平动量 (左，洋红) */}
                  {(() => {
                    const p_m = m_block * slotState.v_x
                    const barWidth = Math.abs(p_m) * BALANCE.pxPerUnit
                    if (barWidth > BALANCE.minBarWidth) {
                      return (
                        <g>
                          <rect
                            x={-barWidth}
                            y={`${BALANCE.barY}`}
                            width={barWidth}
                            height={`${BALANCE.barHeight}`}
                            fill={PHYSICS_COLORS.momentum}
                            rx="1"
                          />
                          <text x={-barWidth - 6} y={`${BALANCE.textY}`} fill={PHYSICS_COLORS.momentum} fontSize={canvasSize.font(9)} textAnchor="end" fontWeight="bold">
                            p_m = {p_m.toFixed(1)}
                          </text>
                        </g>
                      )
                    }
                    return null
                  })()}

                  {/* 槽水平动量 (右，天蓝) */}
                  {(() => {
                    const p_M_real = M_slot * slotState.v_X
                    const barWidth = Math.abs(p_M_real) * BALANCE.pxPerUnit
                    if (barWidth > BALANCE.minBarWidth) {
                      return (
                        <g>
                          <rect
                            x="0"
                            y={`${BALANCE.barY}`}
                            width={barWidth}
                            height={`${BALANCE.barHeight}`}
                            fill={PHYSICS_COLORS.normalForce}
                            rx="1"
                          />
                          <text x={barWidth + 6} y={`${BALANCE.textY}`} fill={PHYSICS_COLORS.normalForce} fontSize={canvasSize.font(9)} textAnchor="start" fontWeight="bold">
                            p_M = +{p_M_real.toFixed(1)}
                          </text>
                        </g>
                      )
                    }
                    return null
                  })()}
                </g>
              </g>
            )}

            {/* ========================================== */}
            {/* 模型 1：弹簧双滑块模型 */}
            {/* ========================================== */}
            {modelType === 1 && springState && (
              <g>
                {/* 地面 */}
                <PhysicsGround
                  x={GROUND_X} y={GROUND_Y}
                  width={GROUND_WIDTH}
                  appearance={{ color: PHYSICS_COLORS.labelText, showHatch: true }}
                />

                {/* 滑块 A */}
                {(() => {
                  const xA_px = SPRING_ORIGIN_X + springState.xA * SPRING_PX_PER_M
                  return (
                    <g>
                      <Block
                        x={xA_px - BLOCK_SIZE.width / 2}
                        y={GROUND_Y - BLOCK_SIZE.height}
                        width={BLOCK_SIZE.width}
                        height={BLOCK_SIZE.height}
                        type="metal"
                        label={`A (${mA_spring}kg)`}
                        strokeWidth={CANVAS_STYLE.stroke.objectLine}
                        font={canvasSize.font}
                      />
                      {/* 速度矢量箭头 */}
                      <VectorArrow
                        origin={{ x: springState.xA, y: 0.24 }}
                        vector={{ x: springState.vA, y: 0 }}
                        type="velocity"
                        sceneScale={sceneScaleSpring}
                        label={`${springState.vA.toFixed(1)}m/s`}
                      />
                    </g>
                  )
                })()}

                {/* 滑块 B */}
                {(() => {
                  const xB_px = SPRING_ORIGIN_X + springState.xB * SPRING_PX_PER_M
                  return (
                    <g>
                      <Block
                        x={xB_px - BLOCK_SIZE.width / 2}
                        y={GROUND_Y - BLOCK_SIZE.height}
                        width={BLOCK_SIZE.width}
                        height={BLOCK_SIZE.height}
                        type="metal"
                        label={`B (${mB_spring}kg)`}
                        strokeWidth={CANVAS_STYLE.stroke.objectLine}
                        font={canvasSize.font}
                      />
                      {/* 速度速度箭头 */}
                      <VectorArrow
                        origin={{ x: springState.xB, y: 0.24 }}
                        vector={{ x: springState.vB, y: 0 }}
                        type="velocity"
                        sceneScale={sceneScaleSpring}
                        label={`${springState.vB.toFixed(1)}m/s`}
                        color={PHYSICS_COLORS.elasticForce}
                      />
                    </g>
                  )
                })()}

                {/* 轻弹簧 */}
                {(() => {
                  const xA_px = SPRING_ORIGIN_X + springState.xA * SPRING_PX_PER_M
                  const xB_px = SPRING_ORIGIN_X + springState.xB * SPRING_PX_PER_M
                  const springRight_px = xB_px - BLOCK_SIZE.width / 2
                  
                  let springLeft_px = springRight_px - SPRING_NATURAL_LENGTH_PX
                  if (xA_px + BLOCK_SIZE.width / 2 > springLeft_px) {
                    springLeft_px = xA_px + BLOCK_SIZE.width / 2
                  }

                  const isSeparated = springState.delta <= 0 && time > 0.5 && springState.vB > springState.vA

                  return (
                    <Spring
                      x1={springLeft_px}
                      y1={GROUND_Y - 12}
                      x2={springRight_px}
                      y2={GROUND_Y - 12}
                      coils={10}
                      radius={7}
                      isLightWeight={isSeparated}
                      color={isSeparated ? SCENE_COLORS.charts.referenceLine : undefined}
                    />
                  )
                })()}

                {/* 能量沙漏玻璃杯动画 */}
                <g transform="translate(0, 0)">
                  {/* 动能杯 */}
                  <g transform="translate(190, 8)">
                    <rect x="0" y="10" width={ENERGY_CUP.width} height={ENERGY_CUP.height} fill="none" stroke={SCENE_COLORS.charts.referenceLine} strokeWidth="1.5" rx="1" />
                    {(() => {
                      const ratio = springState.EkA + springState.EkB
                      const h = Math.max(0, Math.min(ENERGY_CUP.maxHeight, (ratio / springState.Etotal) * ENERGY_CUP.maxHeight))
                      return (
                        <rect
                          x={`${ENERGY_CUP.padding}`}
                          y={33 - h}
                          width={ENERGY_CUP.innerWidth}
                          height={h}
                          fill={PHYSICS_COLORS.kineticEnergy}
                          opacity="0.8"
                        />
                      )
                    })()}
                    <text x="15" y="-1" fill={PHYSICS_COLORS.velocity} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">
                      动能 Ek
                    </text>
                  </g>

                  {/* 势能杯 */}
                  <g transform="translate(480, 8)">
                    <rect x="0" y="10" width={ENERGY_CUP.width} height={ENERGY_CUP.height} fill="none" stroke={SCENE_COLORS.charts.referenceLine} strokeWidth="1.5" rx="1" />
                    {(() => {
                      const ratio = springState.Ep
                      const h = Math.max(0, Math.min(ENERGY_CUP.maxHeight, (ratio / springState.Etotal) * ENERGY_CUP.maxHeight))
                      return (
                        <rect
                          x={`${ENERGY_CUP.padding}`}
                          y={33 - h}
                          width={ENERGY_CUP.innerWidth}
                          height={h}
                          fill={PHYSICS_COLORS.potentialEnergy}
                          opacity="0.8"
                        />
                      )
                    })()}
                    <text x="15" y="-1" fill={PHYSICS_COLORS.potentialEnergy} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">
                      势能 Ep
                    </text>
                  </g>

                  {/* 能量流动箭头 */}
                  {(() => {
                    const prevT = Math.max(0, time - 0.05)
                    const prevState = interpolateSpringBlocks(springBlocksStates, prevT)
                    const isCompressing = springState.delta > prevState.delta && springState.delta > 0.001
                    const isReleasing = springState.delta < prevState.delta && springState.delta > 0.001

                    if (isCompressing) {
                      return (
                        <g transform="translate(325, 20)">
                          <path d="M 0 0 L 50 0 M 42 -4 L 50 0 L 42 4" stroke={PHYSICS_COLORS.electricField} strokeWidth="2.5" strokeLinecap="round" />
                          <text x="25" y="-6" fill={PHYSICS_COLORS.electricField} fontSize={8} textAnchor="middle">动能 &rArr; 弹性能</text>
                        </g>
                      )
                    }
                    if (isReleasing) {
                      return (
                        <g transform="translate(325, 20)">
                          <path d="M 50 0 L 0 0 M 8 -4 L 0 0 L 8 4" stroke={PHYSICS_COLORS.magneticField} strokeWidth="2.5" strokeLinecap="round" />
                          <text x="25" y="-6" fill={PHYSICS_COLORS.magneticField} fontSize={8} textAnchor="middle">弹性能 &rArr; 动能</text>
                        </g>
                      )
                    }
                    return null
                  })()}
                </g>

                {/* 物理临界点提示 */}
                {(() => {
                  const maxDeltaPt = springBlocksStates.reduce(
                    (max, pt) => (pt.delta > max.delta ? pt : max),
                    { delta: 0, t: 0 }
                  )
                  const isCompressShortest = Math.abs(time - maxDeltaPt.t) < 0.08

                  const separatedPt = springBlocksStates.find(pt => pt.delta <= 0.0001 && pt.t > 0.5)
                  const isSeparating = separatedPt && Math.abs(time - separatedPt.t) < 0.08

                  if (isCompressShortest) {
                    return (
                      <g transform={`translate(${SLOT_ORIGIN_X}, 75)`}>
                        <rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.safety.safetyYellow} opacity="0.9" rx="3" />
                        <text x="0" y="3" fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">
                          🔥 压缩最短 (共速点)
                        </text>
                      </g>
                    )
                  }
                  if (isSeparating) {
                    return (
                      <g transform={`translate(${SLOT_ORIGIN_X}, 75)`}>
                        <rect x={CRITICAL_TIP.x} y={CRITICAL_TIP.y} width={CRITICAL_TIP.width} height={CRITICAL_TIP.height} fill={SCENE_COLORS.pendulum.equilibrium} opacity="0.9" rx="3" />
                        <text x="0" y="3" fill={colors.neutral.white} fontSize={canvasSize.font(9)} fontWeight="bold" textAnchor="middle">
                          ⚡️ 恢复原长 (分离点)
                        </text>
                      </g>
                    )
                  }
                  return null
                })()}
              </g>
            )}

            {/* ========================================== */}
            {/* 模型 2：人船模型与质心定点 */}
            {/* ========================================== */}
            {modelType === 2 && boatState && (
              <g>
                {/* 绝对坐标数轴 (使用 PhysicsGround 组件的 ruler 功能进行精密绘制) */}
                <PhysicsGround
                  x={GROUND_X} y={GROUND_Y}
                  width={GROUND_WIDTH}
                  appearance={{ color: PHYSICS_COLORS.labelText }}
                  ruler={{
                    domain: [-6.667, 6.667],
                    pixelPerUnit: BOAT_PX_PER_M,
                    tickInterval: 1,
                    unit: 'm',
                    position: 'bottom',
                    showAxisLine: true
                  }}
                />

                {/* 金色质心十字星 (绝对 0 坐标锁定，闪烁) */}
                <g transform={`translate(${BOAT_ORIGIN_X}, 95)`}>
                  <circle r={`${CM_STAR.glowRadius}`} fill={`url(#${gradIdGlowGold})`} />
                  <circle r={`${CM_STAR.coreRadius}`} fill={PHYSICS_COLORS.electricField} />
                  <line x1={`-${CM_STAR.glowRadius}`} y1="0" x2={`${CM_STAR.glowRadius}`} y2="0" stroke={PHYSICS_COLORS.electricField} strokeWidth="1.2" />
                  <line x1="0" y1={`-${CM_STAR.glowRadius}`} x2="0" y2={`${CM_STAR.glowRadius}`} stroke={PHYSICS_COLORS.electricField} strokeWidth="1.2" />
                  <text x="0" y={`${CM_STAR.labelOffset}`} fill={PHYSICS_COLORS.electricField} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">
                    系统质心 (锁定 0)
                  </text>
                </g>

                {/* 船 M */}
                {(() => {
                  const xb_px = BOAT_ORIGIN_X + boatState.x_boat * BOAT_PX_PER_M
                  const wb_px = L_boat * BOAT_PX_PER_M
                  
                  const boatPath = `
                    M ${xb_px} ${GROUND_Y - 8}
                    L ${xb_px - 10} ${GROUND_Y - 18}
                    L ${xb_px + wb_px + 10} ${GROUND_Y - 18}
                    L ${xb_px + wb_px} ${GROUND_Y - 8}
                    Z
                  `
                  return (
                    <g>
                      <path
                        d={boatPath}
                        fill={`url(#${gradIdBoat})`}
                        stroke={SCENE_COLORS.materials.labWoodGrad[3]}
                        strokeWidth="1.5"
                      />
                      <text
                        x={xb_px + wb_px / 2}
                        y={GROUND_Y - 4}
                        fill={SCENE_COLORS.materials.labWoodGrad[0]}
                        fontSize={canvasSize.font(8)}
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        船 {M_boat}kg
                      </text>
                    </g>
                  )
                })()}

                {/* 人 m */}
                {(() => {
                  const xp_px = BOAT_ORIGIN_X + boatState.x_person * BOAT_PX_PER_M
                  const headY = GROUND_Y - 18 - 20
                  const angle = boatState.v_rel !== 0 ? Math.sin(time * 15) * 6 : 0

                  return (
                    <g>
                      {/* 火柴人 */}
                      <circle cx={xp_px} cy={headY} r="4" fill={CANVAS_COLORS.labelText} stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth="1" />
                      <line x1={xp_px} y1={headY + 4} x2={xp_px} y2={GROUND_Y - 18 - 8} stroke={CANVAS_COLORS.labelText} strokeWidth="1.5" />
                      <line x1={xp_px} y1={headY + 6} x2={xp_px - 6 - angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={CANVAS_COLORS.labelText} strokeWidth="1.2" />
                      <line x1={xp_px} y1={headY + 6} x2={xp_px + 6 + angle * 0.1} y2={GROUND_Y - 18 - 12} stroke={CANVAS_COLORS.labelText} strokeWidth="1.2" />
                      <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px - 5 - angle * 0.3} y2={GROUND_Y - 18} stroke={CANVAS_COLORS.labelText} strokeWidth="1.5" />
                      <line x1={xp_px} y1={GROUND_Y - 18 - 8} x2={xp_px + 5 + angle * 0.3} y2={GROUND_Y - 18} stroke={CANVAS_COLORS.labelText} strokeWidth="1.5" />
                      
                      <text x={xp_px} y={headY - 6} fill={CANVAS_COLORS.labelText} fontSize={canvasSize.font(8)} fontWeight="bold" textAnchor="middle">
                        人 {m_person}kg
                      </text>
                      
                      {/* 速度矢量 */}
                      <VectorArrow
                        origin={{ x: boatState.x_person, y: 0.6 }}
                        vector={{ x: boatState.v_person, y: 0 }}
                        type="velocity"
                        sceneScale={sceneScaleBoat}
                      />
                    </g>
                  )
                })()}

                {/* 船的速度矢量 */}
                <VectorArrow
                  origin={{ x: boatState.x_boat + L_boat * 0.5, y: 0.1 }}
                  vector={{ x: boatState.v_boat, y: 0 }}
                  type="velocity"
                  sceneScale={sceneScaleBoat}
                  color={PHYSICS_COLORS.electricField}
                />

                {/* 自动模式绝对空间位移展示 (行走完毕时) */}
                {(() => {
                  const isAutoEnd = manBoatControl === 0 && time >= BOAT_WALK_DURATION

                  if (isAutoEnd) {
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
                        {/* 人的绝对位移线 */}
                        <line x1={xp0_px} y1={personLineY} x2={xpend_px} y2={personLineY} stroke={PHYSICS_COLORS.magneticField} strokeWidth="1.2" strokeDasharray="2 2" />
                        <polygon points={`${xpend_px},${personLineY} ${xpend_px + (disp_person < 0 ? arrowSize : -arrowSize)},${personLineY - 3} ${xpend_px + (disp_person < 0 ? arrowSize : -arrowSize)},${personLineY + 3}`} fill={PHYSICS_COLORS.magneticField} />
                        <text x={(xp0_px + xpend_px) / 2} y={personLineY - 5} fill={PHYSICS_COLORS.magneticField} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">
                          人绝对位移 x1 = {Math.abs(disp_person).toFixed(2)}m
                        </text>

                        {/* 船的绝对位移线 */}
                        <line x1={xb0_px} y1={boatLineY} x2={xbend_px} y2={boatLineY} stroke={PHYSICS_COLORS.forceNet} strokeWidth="1.2" strokeDasharray="2 2" />
                        <polygon points={`${xbend_px},${boatLineY} ${xbend_px + (disp_boat < 0 ? arrowSize : -arrowSize)},${boatLineY - 3} ${xbend_px + (disp_boat < 0 ? arrowSize : -arrowSize)},${boatLineY + 3}`} fill={PHYSICS_COLORS.forceNet} />
                        <text x={(xb0_px + xbend_px) / 2} y={boatLineY + 10} fill={PHYSICS_COLORS.forceNet} fontSize={canvasSize.font(8)} textAnchor="middle" fontWeight="bold">
                          船绝对位移 x2 = {Math.abs(disp_boat).toFixed(2)}m
                        </text>
                      </g>
                    )
                  }
                  return null
                })()}
              </g>
            )}
          </g>
        </svg>

        {/* 底部信息提示与公式栏 (背景保持亮灰色过渡，符合以前风格) */}
        <div className="p-3 bg-neutral-50 border-t border-neutral-200/80 text-[11px] text-neutral-600 flex items-center justify-between">
          <div>
            {modelType === 0 && (
              <p>💡 <strong>弧形槽-滑块</strong>：在下滑时，相互弹力大小和方向随接触点实时改变，如果用微积分计算会十分痛苦。而联立水平方向动量守恒与机械能守恒，能一枪封喉求得最低点速度。</p>
            )}
            {modelType === 1 && (
              <p>💡 <strong>弹簧双滑块</strong>：胡克定律的变力让物体做正弦/余弦式的变加速运动。但动量守恒锁定了两条速度曲线波动的“黄色平均中轴线”，能量守恒则决定了两条曲线的上下波幅。</p>
            )}
            {modelType === 2 && (
              <p>💡 <strong>人船与质心</strong>：没有外力时，不论人怎么在船上乱跑（手动模式下使用键盘 ←/→ 键行走），金色质心十字星在屏幕的绝对坐标一动不动，强烈展示了空间均匀性（空间平移对称）。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
