import { useMemo } from 'react'
import {
  SPEED_OF_LIGHT,
  calcConstantForceAccelState,
  calcLightClockState,
  calcNewtonianLimitMetrics,
  calcRelativisticEnergy,
  calcSimultaneityState,
  sampleConstantForceCurves,
  sampleKineticEnergyCurves,
  sampleLorentzCurve,
  type ChartCurvePoint,
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
  /** 动钟观察者视角: 0-地面看飞船, 1-飞船看地面 */
  observerFrame?: number
  /** 牛顿局限曲线视图: 0-v-t 加速曲线, 1-γ-β 因子曲线 */
  newtonChartType?: number
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
  observerFrame: 0 | 1
  newtonChartType: 0 | 1
  accelCurves: { classical: ChartCurvePoint[]; relativistic: ChartCurvePoint[]; yMax: number }
  lorentzCurve: ChartCurvePoint[]
  energyCurves: { classical: ChartCurvePoint[]; relativistic: ChartCurvePoint[]; yMax: number }
}

export function useRelativityPhysics({
  beta,
  m0,
  time,
  mode,
  showGeometry,
  observerFrame = 0,
  newtonChartType = 0,
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

    const accelCurves = sampleConstantForceCurves(clampedBeta)
    const lorentzCurve = sampleLorentzCurve()
    const energyCurves = sampleKineticEnergyCurves(safeM0)

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
      observerFrame: observerFrame === 1 ? 1 : 0,
      newtonChartType: newtonChartType === 1 ? 1 : 0,
      accelCurves,
      lorentzCurve,
      energyCurves,
    }
  }, [beta, m0, time, mode, showGeometry, observerFrame, newtonChartType])
}
