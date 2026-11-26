import { useMemo } from 'react'
import {
  SPEED_OF_LIGHT,
  calcConstantForceAccelState,
  calcLightClockState,
  calcNewtonianLimitMetrics,
  calcRelativisticEnergy,
  calcSimultaneityState,
  type ConstantForceAccelState,
  type LightClockState,
  type NewtonianLimitMetrics,
  type SimultaneityState,
} from '@/physics/relativity'

export interface UseRelativityPhysicsOptions {
  /** 速度与光速比 v/c，范围 0 ~ 0.95 */
  beta: number
  /** 静止质量 m0 (kg) */
  m0: number
  /** 当前动画进度时间 (秒，地面参考系 t) */
  time: number
  /** 模式: 0-动钟变慢, 1-动尺收缩, 2-牛顿局限, 3-质能拓展 */
  mode: number
  /** 是否显示几何辅助线与勾股定理推导 */
  showGeometry: boolean
}

export interface RelativityPhysicsState {
  beta: number
  m0: number
  gamma: number
  lengthRatio: number
  clockState: LightClockState
  simultaneity: SimultaneityState
  accelState: ConstantForceAccelState
  groundClockAngle: number
  shipClockAngle: number
  energyData: ReturnType<typeof calcRelativisticEnergy>
  classicalKineticEnergy: number
  newtonMetrics: NewtonianLimitMetrics
  mode: number
  showGeometry: boolean
}

export function useRelativityPhysics({
  beta,
  m0,
  time,
  mode,
  showGeometry,
}: UseRelativityPhysicsOptions): RelativityPhysicsState {
  return useMemo(() => {
    const clockState = calcLightClockState(beta, time)
    const simultaneity = calcSimultaneityState(beta, time)
    const safeM0 = Number.isFinite(m0) && m0 > 0 ? m0 : 1.0
    const accelState = calcConstantForceAccelState(beta, safeM0, time)

    const { beta: clampedBeta, gamma, groundTime, properTime } = clockState
    const lengthRatio = 1 / gamma

    // 地面时钟与飞船时钟共享同一对同步时间 (t, τ = t / γ)，表盘指针与光脉冲相位严格一致
    const groundClockAngle = (groundTime * 60) % 360
    const shipClockAngle = (properTime * 60) % 360

    const energyData = calcRelativisticEnergy(safeM0, clampedBeta)
    const v = clampedBeta * SPEED_OF_LIGHT
    const classicalKineticEnergy = 0.5 * safeM0 * v * v
    const newtonMetrics = calcNewtonianLimitMetrics(clampedBeta)

    return {
      beta: clampedBeta,
      m0: safeM0,
      gamma,
      lengthRatio,
      clockState,
      simultaneity,
      accelState,
      groundClockAngle,
      shipClockAngle,
      energyData,
      classicalKineticEnergy,
      newtonMetrics,
      mode,
      showGeometry,
    }
  }, [beta, m0, time, mode, showGeometry])
}
