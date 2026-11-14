/**
 * @file src/physics/laser.ts
 * 激光特性（anim-laser）的几何与强度估算。
 *
 * 单一真源：光斑半径 `r(d) = r₀ + d·tan(θ/2)` 此前在三个地方各写一遍
 *   - 右屏看板 `data/quantities/laser.ts`
 *   - 中屏 hook `hooks/useLaserPhysics.ts`
 *   - 中屏场景 `components/LaserScene.tsx`（还自带一套 mm 单位约定与 r₀=1.0）
 * 三处对"初始半径"和"单位"的理解不一致，是最容易悄悄分叉的一类重复。
 *
 * 单位约定（全项目统一）：长度用 m，长度换 mm 只在展示层乘 1000。
 */

import { finalizeCriticalPoints, type RawCriticalPoint } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 激光/普通光源的初始出射半径 (m)，即 1 mm */
export const LASER_BEAM_INITIAL_RADIUS_M = 0.001

/**
 * 由毫弧度换算半发散角 (rad)。
 *
 * 工程标注的"发散角 1.5 mrad"是**全角**，光斑半径用半角。
 *
 * @param mrad 全发散角 (mrad)
 */
export function halfAngleFromMrad(mrad: number): number {
  return mrad / 1000 / 2
}

/**
 * 由角度换算半发散角 (rad)。
 *
 * @param deg 全发散角 (度)
 */
export function halfAngleFromDeg(deg: number): number {
  return ((deg * Math.PI) / 180) / 2
}

/**
 * 传播 d 米后的光斑半径 (m)：r(d) = r₀ + d·tan(θ/2)。
 *
 * 小发散角下 tanθ ≈ θ；此处保留 tan 以便普通光源的大角度也正确。
 *
 * @param r0 出射半径 (m)
 * @param distance 传播距离 (m)
 * @param halfAngleRad 半发散角 (rad)
 */
export function beamRadius(r0: number, distance: number, halfAngleRad: number): number {
  return r0 + distance * Math.tan(halfAngleRad)
}

/**
 * 末端相对光强（百分数）：I/I₀ = (r₀/r)² × 100。
 *
 * 只做纯计算，不夹取上下限——是否夹取属于各展示层自己的视觉策略。
 *
 * @param r0 出射半径 (m)
 * @param r 末端光斑半径 (m)
 */
export function intensityRatioPercent(r0: number, r: number): number {
  if (r <= 0) return 0
  return Math.pow(r0 / r, 2) * 100
}

// ─── 模式 2：激光高能量靶材升温/熔化/气化模拟（SSOT） ──────────────────────

export interface LaserMaterialConfig {
  name: string
  /** 熔点 (°C)，非熔化直接气化材料为 0 */
  T_m: number
  /** 沸点/汽化点 (°C) */
  T_b: number
  /** 有效热容 (J/K) */
  Cv: number
  /** 熔化所需潜热 (J) */
  E_melt: number
  /** 汽化 1mm 深度所需潜热 (J) */
  E_vap: number
  /** 散热系数 (W/K) */
  kloss: number
}

export const LASER_MATERIAL_CONFIGS: Record<number, LaserMaterialConfig> = {
  0: { name: '纸张', T_m: 0, T_b: 250, Cv: 0.008, E_melt: 0, E_vap: 0.8, kloss: 0.0006 },
  1: { name: '木板', T_m: 0, T_b: 360, Cv: 0.025, E_melt: 0, E_vap: 2.2, kloss: 0.0012 },
  2: { name: '铁板', T_m: 1538, T_b: 2750, Cv: 0.16, E_melt: 3.5, E_vap: 15.0, kloss: 0.006 },
}

export const LASER_HEAT_DEFAULTS = {
  ambientTempC: 20,
  simStepS: 0.01,
  maxSimTimeS: 10.0,
} as const

export interface LaserHeatingResult {
  simT: number
  simDepth: number
  simMelted: boolean
  simBoiled: boolean
  tMeltStart: number | null
  tMelted: number | null
  tBoiled: number | null
}

/**
 * 数值积分计算高能激光聚焦照射到 targetTime 时的温度与相变进程（SSOT）
 */
export function simulateLaserTargetHeating(
  material: number,
  laserPower: number,
  focusDiameter: number,
  targetTime: number,
): LaserHeatingResult {
  const mat = LASER_MATERIAL_CONFIGS[material] ?? LASER_MATERIAL_CONFIGS[0]
  const T0 = LASER_HEAT_DEFAULTS.ambientTempC
  const dt = LASER_HEAT_DEFAULTS.simStepS
  const focusDiameterClamped = Math.max(5, focusDiameter)
  const energyDensityScale = (30 / focusDiameterClamped) ** 1.5

  let simT: number = T0
  let simDepth = 0
  let simMeltAccum = 0
  let simMelted = false
  let simBoiled = false
  let tMeltStart: number | null = null
  let tMelted: number | null = null
  let tBoiled: number | null = null

  const stepsNeeded = Math.max(0, Math.floor(targetTime / dt))
  for (let step = 0; step < stepsNeeded; step++) {
    const tCurr = (step + 1) * dt
    const loss = mat.kloss * (simT - T0)
    const netPower = Math.max(0, laserPower * 0.85 * energyDensityScale - loss)

    if (!simMelted && mat.T_m > 0 && simT >= mat.T_m) {
      if (tMeltStart === null) tMeltStart = tCurr
      simT = mat.T_m
      simMeltAccum += netPower * dt
      if (simMeltAccum >= mat.E_melt) {
        simMelted = true
        if (tMelted === null) tMelted = tCurr
      }
    } else if (simT >= mat.T_b) {
      simT = mat.T_b
      if (!simBoiled) {
        simBoiled = true
        tBoiled = tCurr
      }
      simMelted = true
      simDepth += (netPower * dt) / mat.E_vap
    } else {
      simT += (netPower * dt) / mat.Cv
    }
  }

  return { simT, simDepth, simMelted, simBoiled, tMeltStart, tMelted, tBoiled }
}

export interface LaserCriticalParams {
  mode?: number
  material?: number
  laserPower?: number
  focusDiameter?: number
}

/**
 * 计算激光高能量切割模式关键时刻（SSOT）
 */
export function getLaserCriticalTimes(
  params: LaserCriticalParams = {},
  maxTime: number = LASER_HEAT_DEFAULTS.maxSimTimeS,
): CriticalTimePoint[] {
  if ((params.mode ?? 0) !== 2) return []

  const material = params.material ?? 0
  const laserPower = params.laserPower ?? 50
  const focusDiameter = params.focusDiameter ?? 30
  const res = simulateLaserTargetHeating(material, laserPower, focusDiameter, maxTime)
  const raw: RawCriticalPoint[] = []

  if (res.tMeltStart !== null) {
    raw.push({
      rawTime: res.tMeltStart,
      align: 'after',
      label: '达到熔点·吸热熔化',
      variant: 'warning',
    })
  }
  if (res.tMelted !== null && (!res.tMeltStart || res.tMelted - res.tMeltStart > 0.1)) {
    raw.push({
      rawTime: res.tMelted,
      align: 'after',
      label: '完全熔化·继续升温',
      variant: 'info',
    })
  }
  if (res.tBoiled !== null) {
    raw.push({
      rawTime: res.tBoiled,
      align: 'after',
      label: material === 2 ? '达到沸点·气化切割' : '达到燃/气化点·开始穿孔',
      variant: 'critical',
      autoPause: true,
    })
  }

  return finalizeCriticalPoints(raw, maxTime)
}
