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
}

export interface ForcedResonancePhysicsResult {
  steady: SteadyStateResonanceResult
  /** 振子物理坐标 (米, y↑ 为正) */
  ballPos: { x: number; y: number }
  /** 驱动端物理坐标 (米) */
  driverPos: { x: number; y: number }
  /** 偏心轮旋转角 (rad) */
  rotAngle: number
  /** 振子实时速度 (m/s) */
  velocity: number
  /** 驱动力大小 (N) */
  fDriver: number
  /** 弹力大小 (N) */
  elasticForce: number
  /** 阻尼力大小 (N) */
  dampingForce: number
  /** 主共振曲线点集 (A-f) */
  curvePoints: { x: number; y: number }[]
  /** 弱阻尼对比曲线 (当 mode === 2 时提供) */
  weakDampingPoints: { x: number; y: number }[]
  /** 强阻尼对比曲线 (当 mode === 2 时提供) */
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

    // 几何布局（物理坐标系：原点处于中间平衡位置 (5.0, 2.0)，y↑ 为正）
    const centerX = 5.0
    const baseY = 2.0
    const ballPos = {
      x: centerX,
      y: baseY + state.x * 12, // 适当放大位移便于肉眼观察振子运动
    }

    const driverBaseY = 3.6
    const driverPos = {
      x: centerX,
      y: driverBaseY + state.driverX * 6,
    }

    const rotAngle = (2 * Math.PI * f * time) % (2 * Math.PI)

    // 生成主曲线与阻尼对比曲线
    const curvePoints = generateResonanceCurvePoints(m, k, gamma, F0, 2.5, 60)
    const weakDampingPoints = generateResonanceCurvePoints(m, k, 0.2, F0, 2.5, 60)
    const strongDampingPoints = generateResonanceCurvePoints(m, k, 1.2, F0, 2.5, 60)

    return {
      steady,
      ballPos,
      driverPos,
      rotAngle,
      velocity: state.v,
      fDriver: state.fDriver,
      elasticForce: state.elasticForce,
      dampingForce: state.dampingForce,
      curvePoints,
      weakDampingPoints,
      strongDampingPoints,
    }
  }, [m, k, gamma, F0, f, mode, time])
}
