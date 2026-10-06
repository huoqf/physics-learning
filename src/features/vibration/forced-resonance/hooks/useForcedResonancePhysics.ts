import { useMemo } from 'react'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
  calculateCrankEccentricity,
  calculateDamperGeometry,
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

    // 曲柄偏心距：物理真值 e = F0/k，经物理层唯一入口派生（含几何限幅与限幅标记）。
    // ⚠️ 严禁在消费点自行夹取 —— 那会造成「改k 时小球振幅与曲柄行程不同步」的破绽。
    const crank = calculateCrankEccentricity(F0, k)
    const crankEccentricity = crank.e

    // 阻尼槽几何：按**小球自身**的稳态振幅峰值反推，保证叶片全程浸没。
    // ⚠️ 不得并入 mode 2 的对比阻尼曲线（γ=0.2 / 1.2）：那两条只是图表曲线，
    // 小球从不按它们运动。并入会让默认工况的槽体被撑高 3.3 倍（3.48 m vs 1.05 m），
    // 并让 18% 的参数组合弹出与小球实际运动不符的告警。
    const damper = calculateDamperGeometry(steady.maxAmplitude)

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

    // 阻尼介质槽（固定在基座底盘上，尺寸由最大振幅反推，见 calculateDamperGeometry）
    const damperTankPhys = {
      x: centerX,
      y: damper.tankBottom,
      width: 1.1,
      height: damper.tankHeight,
    }

    // 阻尼叶片中心：随振子同步运动，垂距固定（浸没性由槽体尺寸保证）
    const damperBladeY = ballY - damper.bladeDrop

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
    }
  }, [m, k, gamma, F0, f, mode, time])
}
