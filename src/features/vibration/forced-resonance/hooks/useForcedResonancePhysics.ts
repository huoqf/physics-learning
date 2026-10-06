import { useMemo } from 'react'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
  generateResonanceCurvePoints,
  type SteadyStateResonanceResult,
} from '@/physics/vibration/forcedResonance'

export interface UseForcedResonancePhysicsOptions {
  m: number
  k: number
  gamma: number
  F0: number
  f: number
  mode: number
  time: number
  showForces?: number
}

export interface ForcedResonancePhysicsResult {
  steady: SteadyStateResonanceResult
  /** 振子物理坐标 (米, 真实物理空间) */
  ballPhys: { x: number; y: number }
  /** 驱动滑块物理坐标 (米) */
  driverPhys: { x: number; y: number }
  /** 偏心轮中心物理坐标 (米) */
  wheelCenterPhys: { x: number; y: number }
  /** 曲柄销物理坐标 (米) */
  crankPinPhys: { x: number; y: number }
  /** 平衡位置物理坐标 (米) */
  equilibriumPhys: { x: number; y: number }
  /** 阻尼槽物理边界 (米) */
  damperTankPhys: { x: number; y: number; width: number; height: number }
  /** 阻尼叶片物理高度 (米) */
  damperBladeY: number
  /** 偏心轮旋转角 (rad) */
  rotAngle: number
  /** 偏心轮半径 (米) */
  wheelRadius: number
  /** 连杆长 (米) */
  rodLength: number
  /** 实时物理状态 */
  state: {
    x: number
    v: number
    a: number
    fDriver: number
    elasticForce: number
    dampingForce: number
    totalForce: number
    kineticEnergy: number
    potentialEnergy: number
    powerAbsorbed: number
  }
  /** 主共振曲线点集 (A-f) */
  curvePoints: { x: number; y: number }[]
  /** 弱阻尼对比曲线 */
  weakDampingPoints: { x: number; y: number }[]
  /** 强阻尼对比曲线 */
  strongDampingPoints: { x: number; y: number }[]
}

export function useForcedResonancePhysics({
  m,
  k,
  gamma,
  F0,
  f,
  mode,
  time,
}: UseForcedResonancePhysicsOptions): ForcedResonancePhysicsResult {
  return useMemo(() => {
    const config = { m, k, gamma, F0, f }
    const steady = calculateSteadyStateResonance(config)
    const state = calculateForcedVibrationState(config, time, mode)

    // 物理世界尺度定义 (物理舞台: 宽 4.2m, 高 6.5m, 1m = 100 design units)
    const centerX = 2.1 // 中心竖直轴线上
    const eqY = 3.2 // 振子平衡位置 (米)
    const wheelCenterY = 5.45 // 偏心轮旋转轴心 (米)
    const wheelDiskRadius = 0.28 // 电机转盘视觉半径 (米)
    const rodLength = 0.58 // 曲柄连杆长度 (米)

    // 严密物理对应：曲柄销的偏心距必须严格等于物理基底驱动振幅 e = F0 / k！
    // 使得低频极限下，小球位移振幅与滑块位移振幅 100% 相同 (A -> F0/k = e_crank)！
    const crankEccentricity = Math.min(0.20, Math.max(0.04, F0 / Math.max(1, k)))

    // 偏心轮旋转角度 theta = 2*pi*f*t
    const rotAngle = 2 * Math.PI * f * time

    // 曲柄销物理坐标 (在转盘上以偏心距 e 旋转)
    const pinX = centerX + crankEccentricity * Math.cos(rotAngle)
    const pinY = wheelCenterY + crankEccentricity * Math.sin(rotAngle)

    // 严密刚体曲柄滑块几何约束: 滑块严格在 centerX 垂直线上
    // 滑块纵坐标 y_driver = pinY - sqrt(rodLength^2 - (pinX - centerX)^2)
    const dx = pinX - centerX
    const dyOffset = Math.sqrt(Math.max(0.01, rodLength * rodLength - dx * dx))
    const driverY = pinY - dyOffset

    // 振子小球位置 (物理平衡位置 + 真实受迫位移 x)
    const ballY = eqY + state.x

    // 阻尼介质槽 (固定在基座底盘上，高度 0.5m ~ 2.2m，深度充足)
    const damperTankPhys = {
      x: centerX,
      y: 0.5, // 槽底高度 (米)
      width: 1.1,
      height: 1.7, // 槽口与液面高度在 2.2m (米)
    }

    // 严密物理约束：阻尼叶片必须全程 100% 稳定浸没在介质内部，绝不露头跳水、绝不触底
    // 平衡位置在 3.2 - 1.85 = 1.35m，正处于槽体正中心深度 (上下各留 0.4m 裕度覆盖最大共振振幅)
    const damperBladeY = ballY - 1.85

    // 采样共振曲线
    const curvePoints = generateResonanceCurvePoints(m, k, gamma, F0, 2.5, 70)
    const weakDampingPoints = generateResonanceCurvePoints(m, k, 0.2, F0, 2.5, 70)
    const strongDampingPoints = generateResonanceCurvePoints(m, k, 1.2, F0, 2.5, 70)

    return {
      steady,
      ballPhys: { x: centerX, y: ballY },
      driverPhys: { x: centerX, y: driverY },
      wheelCenterPhys: { x: centerX, y: wheelCenterY },
      crankPinPhys: { x: pinX, y: pinY },
      equilibriumPhys: { x: centerX, y: eqY },
      damperTankPhys,
      damperBladeY,
      rotAngle,
      wheelRadius: wheelDiskRadius,
      rodLength,
      state,
      curvePoints,
      weakDampingPoints,
      strongDampingPoints,
    }
  }, [m, k, gamma, F0, f, mode, time])
}
