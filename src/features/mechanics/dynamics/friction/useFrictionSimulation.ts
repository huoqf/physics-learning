import { useEffect, useRef, useState } from 'react'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { useSimulationFrame } from '@/utils/animation'
import { calculateFrictionPullModel, calculateDoubleFrictionIncline } from '@/physics'
import { GRAVITY, DEFAULT_STATIC_FRICTION_RATIO } from '@/physics/constants'

export interface FrictionSimState {
  x1: number
  v1: number
  xM: number
  vM: number
  x_rel: number
  v_rel: number
}

const INITIAL_SIM: FrictionSimState = { x1: 0, v1: 0, xM: 0, vM: 0, x_rel: 0, v_rel: 0 }

interface FrictionSimulationOptions {
  pullScale: number
  inclineScale: number
  x1Limit: number
  xRelLimit: number
  xMLimit: number
  angleRad: number
  vpVisibleX: number
  vpVisibleW: number
}

export function useFrictionSimulation(options: FrictionSimulationOptions) {
  const { params, time } = useAnimationStore(
    useShallow((s) => ({
      params: s.params,
      time: s.time,
    }))
  )

  const mode = params.mode ?? 0
  const m = params.m ?? 5
  const mu = params.mu ?? 0.3
  const g = params.g ?? GRAVITY
  const F_applied = params.F_applied ?? 15
  const angle = params.angle ?? 15
  const M = params.M ?? 10
  const mu_1 = params.mu_1 ?? 0.3
  const mu_2 = params.mu_2 ?? 0.2

  const [simState, setSimState] = useState<FrictionSimState>(INITIAL_SIM)
  const simStateRef = useRef<FrictionSimState>(INITIAL_SIM)

  // 参数变化时立即复位到起点
  useEffect(() => {
    simStateRef.current = INITIAL_SIM
    setSimState(INITIAL_SIM)
  }, [mode, m, mu, g, F_applied, angle, M, mu_1, mu_2])

  // 全局复位（time → 0）时复位
  const wasTimeZeroRef = useRef(true)
  useEffect(() => {
    const isZero = time === 0
    if (isZero && !wasTimeZeroRef.current) {
      simStateRef.current = INITIAL_SIM
      setSimState(INITIAL_SIM)
    }
    wasTimeZeroRef.current = isZero
  }, [time])

  // 物理计算
  const {
    F_normal: F_normal_m1,
    f_actual: f_actual_m1,
    isSliding: isSliding_m1,
  } = calculateFrictionPullModel(m, mu, F_applied, g)

  const res_m2 = calculateDoubleFrictionIncline({ m, M, theta: angle, mu_1, mu_2, g })

  // 实时仿真积分
  useSimulationFrame((deltaTimeMs) => {
    const dt = Math.min(0.033, deltaTimeMs / 1000)
    if (dt <= 0) return

    const prev = simStateRef.current
    const { x1Limit, xRelLimit, xMLimit } = options
    const angleRad = (angle * Math.PI) / 180

    if (mode === 0) {
      const f_max = DEFAULT_STATIC_FRICTION_RATIO * mu * m * g
      const f_slip = mu * m * g
      let a1 = 0

      if (prev.v1 > 0.001) {
        a1 = (F_applied - f_slip) / m
      } else if (F_applied > f_max) {
        a1 = (F_applied - f_slip) / m
      }

      let newV1 = prev.v1 + a1 * dt
      let newX1 = prev.x1 + newV1 * dt

      if (newV1 <= 0.001) newV1 = 0
      if (newX1 >= x1Limit) {
        newX1 = x1Limit
        newV1 = 0
      }

      const next = { ...prev, x1: newX1, v1: newV1 }
      if (newX1 === prev.x1 && newV1 === prev.v1) return
      simStateRef.current = next
      setSimState(next)
    } else {
      let a_rel_frame = 0
      if (prev.v_rel > 0.001) {
        // Block is moving — kinetic friction applies
        a_rel_frame = g * Math.sin(angleRad) + res_m2.a_M * Math.cos(angleRad) - mu_1 * (g * Math.cos(angleRad) - res_m2.a_M * Math.sin(angleRad))
      } else {
        // Block at rest — only start sliding if driving force overcomes static friction
        const normalInAccelFrame = g * Math.cos(angleRad) - res_m2.a_M * Math.sin(angleRad)
        const driving = g * Math.sin(angleRad) + res_m2.a_M * Math.cos(angleRad)
        const maxStaticFriction = DEFAULT_STATIC_FRICTION_RATIO * mu_1 * normalInAccelFrame
        if (driving > maxStaticFriction && normalInAccelFrame > 0) {
          a_rel_frame = driving - mu_1 * normalInAccelFrame
        }
        // else: static friction holds, a_rel_frame stays 0
      }

      let a_M_frame = 0
      if (prev.vM > 0.001) {
        // Incline is moving — kinetic friction with ground
        a_M_frame = res_m2.a_M
      } else if (res_m2.isInclineSliding && res_m2.F_drive > res_m2.f2_max) {
        // Incline at rest — only restart if driving force overcomes ground max static friction
        a_M_frame = res_m2.a_M
      }

      let newV_rel = prev.v_rel + a_rel_frame * dt
      let newX_rel = prev.x_rel + newV_rel * dt
      if (newV_rel <= 0.001) newV_rel = 0
      if (newX_rel >= xRelLimit) {
        newX_rel = xRelLimit
        newV_rel = 0
      }

      let newVM = prev.vM + a_M_frame * dt
      let newXM = prev.xM + newVM * dt
      if (newVM <= 0.001) newVM = 0
      if (xMLimit > 0 && newXM >= xMLimit) {
        newXM = xMLimit
        newVM = 0
      }

      const next = { ...prev, x_rel: newX_rel, v_rel: newV_rel, xM: newXM, vM: newVM }
      if (newX_rel === prev.x_rel && newV_rel === prev.v_rel && newXM === prev.xM && newVM === prev.vM) return
      simStateRef.current = next
      setSimState(next)
    }
  })

  const weight = m * g
  const weight_M = M * g

  return {
    params,
    mode,
    m,
    mu,
    g,
    F_applied,
    angle,
    M,
    mu_1,
    mu_2,
    weight,
    weight_M,
    simState,
    F_normal_m1,
    f_actual_m1,
    isSliding_m1,
    res_m2,
  }
}
