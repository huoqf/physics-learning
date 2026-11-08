import { useMemo } from 'react'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
  calculateCrankEccentricity,
  calculateDamperGeometry,
  FORCED_RESONANCE_VISUAL_AMP_MAX,
  type SteadyStateResonanceResult,
} from '@/physics/vibration/forcedResonance'

/**
 * 舞台竖直位移视觉映射系数：
 * 将 [0, 1.20 m]（即右半区图表 [0, 120 cm] 标准量程）线性映射到舞台 [0, 0.72 m] 无碰撞净空内，
 * 保证在弱阻尼 (γ=0.3, A≈106cm)、中阻尼 (γ=0.6, A≈53cm)、强阻尼 (γ=1.2, A≈27cm) 全量程下
 * 左半区小球振幅、±A 包络线张开宽度与右半区图表高度严格 1:1 线性对应，不发生提前截断卡死。
 */
const STAGE_DISP_SCALE = 0.6

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
  /** 阻尼系数 γ（用于左半区阻尼液浓度视觉映射） */
  gamma: number
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
  /** 稳态振幅上界物理坐标 (米) */
  steadyTopPhys: { x: number; y: number }
  /** 稳态振幅下界物理坐标 (米) */
  steadyBottomPhys: { x: number; y: number }
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
  /**
   * 各矢量的固定物理参考量程（与 state 同单位）：
   * 采用固定参考基准而非随当前振幅动态缩放，使改变 f、γ、F0 时箭头长度真实反映物理量大小变化。
   */
  vectorPeaks: {
    velocity: number
    tension: number
    friction: number
    force: number
  }
  /** 实时物理状态 */
  state: {
    x: number
    v: number
    a: number
    xSteady: number
    xTransient: number
    transientEnvelope: number
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
    const crank = calculateCrankEccentricity(F0, k)
    const crankEccentricity = crank.e

    // 阻尼槽固定采用舞台最大净空几何，确保调参过程中槽体高度稳定、叶片永不穿底或脱出液面
    const damper = calculateDamperGeometry(FORCED_RESONANCE_VISUAL_AMP_MAX)

    // 偏心轮旋转角度 theta = 2*pi*f*t
    const rotAngle = 2 * Math.PI * f * time

    // 固定物理量程峰值基准：使共振 vs 偏频、弱阻尼 vs 强阻尼、大/小驱动力下的矢量箭头长度差异一目了然
    const vectorPeaks = {
      velocity: 3.5, // m/s (对应标准共振 v_max ≈ 3.3 m/s)
      tension: 25.0, // N   (对应标准共振 k·A ≈ 21 N)
      friction: 2.5, // N   (对应标准共振 γ·v_max ≈ 2.0 N)
      force: 3.0,    // N   (对应驱动力 F0 典型量程)
    }

    // 曲柄销物理坐标 (竖直分量取 sin(rotAngle)，与驱动力 F0·sin(ωt) 严格同相同周期)
    const pinX = centerX + crankEccentricity * Math.cos(rotAngle)
    const pinY = wheelCenterY + crankEccentricity * Math.sin(rotAngle)

    // 严密刚体曲柄滑块几何约束: 滑块严格在 centerX 垂直线上
    const dx = pinX - centerX
    const dyOffset = Math.sqrt(Math.max(0.01, rodLength * rodLength - dx * dx))
    const driverY = pinY - dyOffset

    // 振子小球位置：线性映射 [0, 1.2m] -> [0, 0.72m]，保证全参数区间内与右侧图表振幅成正比且不穿模
    const clampStage = (val: number) =>
      Math.max(-FORCED_RESONANCE_VISUAL_AMP_MAX, Math.min(FORCED_RESONANCE_VISUAL_AMP_MAX, val))
    const visualX = clampStage(state.x * STAGE_DISP_SCALE)
    const ballY = eqY + visualX

    const visualSteadyAmp = clampStage(steady.amplitude * STAGE_DISP_SCALE)
    const steadyTopPhys = { x: centerX, y: eqY + visualSteadyAmp }
    const steadyBottomPhys = { x: centerX, y: eqY - visualSteadyAmp }

    // 阻尼介质槽（固定在基座底盘上）
    const damperTankPhys = {
      x: centerX,
      y: damper.tankBottom,
      width: 1.1,
      height: damper.tankHeight,
    }

    // 阻尼叶片中心：随振子同步运动，垂距固定
    const damperBladeY = ballY - damper.bladeDrop

    return {
      steady,
      gamma,
      ballPhys: { x: centerX, y: ballY },
      driverPhys: { x: centerX, y: driverY },
      wheelCenterPhys: { x: centerX, y: wheelCenterY },
      crankPinPhys: { x: pinX, y: pinY },
      equilibriumPhys: { x: centerX, y: eqY },
      steadyTopPhys,
      steadyBottomPhys,
      damperTankPhys,
      damperBladeY,
      rotAngle,
      wheelRadius: wheelDiskRadius,
      rodLength,
      vectorPeaks,
      state,
    }
  }, [m, k, gamma, F0, f, mode, time])
}
