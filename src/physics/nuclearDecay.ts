import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/**
 * src/physics/nuclearDecay.ts
 * 核衰变磁场径迹与半衰期规律纯物理计算模块（SSOT）
 *
 * 无副作用，无 React/DOM/window 依赖。
 */

/** 静止母核衰变启动延迟 (s) */
export const DECAY_START_DELAY = 0.5

/** 两种典型衰变产物电荷量绝对值（单位 e） */
export const DECAY_CHARGES = {
  /** α 衰变：⁴₂He 与 ²³⁴₉₀Th */
  alpha: { particle: 2, daughter: 90 },
  /** β 衰变：⁰₋₁e 与 ¹⁴₇N */
  beta: { particle: 1, daughter: 7 },
} as const

/** 衰变产物回旋可视化角速度比例系数（rad/(s·T)） */
export const DECAY_OMEGA_FACTORS = {
  alpha: { particle: 1.8, daughter: 0.6 },
  beta: { particle: 2.4, daughter: 0.8 },
} as const

/** 半衰期实验曲线时间轴默认上限 (s) */
export const NUCLEAR_HALF_LIFE_TMAX = 15.0

export interface DecayMagneticOrbitCriticalParams {
  decayType?: number
  bField?: number
}

/**
 * 计算静止核衰变磁场径迹关键时刻（SSOT）
 */
export function getDecayMagneticOrbitCriticalTimes(
  params: DecayMagneticOrbitCriticalParams = {},
  maxTime = 30,
): CriticalTimePoint[] {
  const isAlpha = (params.decayType ?? 0) === 0
  const bField = Math.max(0.1, params.bField ?? 1.5)
  const rates = isAlpha ? DECAY_OMEGA_FACTORS.alpha : DECAY_OMEGA_FACTORS.beta
  const omegaParticle = rates.particle * bField
  const omegaDaughter = rates.daughter * bField

  const events: CriticalTimePoint[] = []
  const tDecay = alignCriticalTime(DECAY_START_DELAY, 'after')
  if (tDecay > 0 && tDecay <= maxTime) {
    events.push({
      time: tDecay,
      label: isAlpha ? 'α 衰变爆发 (动量反冲)' : 'β 衰变爆发 (动量反冲)',
      variant: 'critical',
      autoPause: true,
    })
  }

  const tParticleCycle = alignCriticalTime(DECAY_START_DELAY + (2 * Math.PI) / omegaParticle, 'nearest')
  if (tParticleCycle > tDecay + 0.05 && tParticleCycle <= maxTime) {
    events.push({
      time: tParticleCycle,
      label: isAlpha ? 'α 粒子完成第1圈 (T_α)' : 'β 粒子完成第1圈 (T_β)',
      variant: 'info',
      autoPause: false,
    })
  }

  const tDaughterCycle = alignCriticalTime(DECAY_START_DELAY + (2 * Math.PI) / omegaDaughter, 'nearest')
  if (tDaughterCycle > tParticleCycle + 0.05 && tDaughterCycle <= maxTime) {
    events.push({
      time: tDaughterCycle,
      label: '反冲新核完成第1圈',
      variant: 'warning',
      autoPause: false,
    })
  }

  return events.sort((a, b) => a.time - b.time)
}

export interface NuclearHalfLifeCriticalParams {
  halfLife?: number
}

/**
 * 计算原子核衰变与半衰期关键时刻（SSOT）
 */
export function getNuclearHalfLifeCriticalTimes(
  params: NuclearHalfLifeCriticalParams = {},
  maxTime = NUCLEAR_HALF_LIFE_TMAX,
): CriticalTimePoint[] {
  const halfLife = params.halfLife ?? 4.0
  if (halfLife <= 0) return []

  const events: CriticalTimePoint[] = []
  const labels = [
    { n: 1, label: '1个半衰期 T (剩 N₀/2)', variant: 'warning' as const },
    { n: 2, label: '2个半衰期 2T (剩 N₀/4)', variant: 'info' as const },
    { n: 3, label: '3个半衰期 3T (剩 N₀/8)', variant: 'info' as const },
  ]

  for (const item of labels) {
    const t = alignCriticalTime(item.n * halfLife, 'nearest')
    if (t > 0 && t <= maxTime) {
      events.push({
        time: t,
        label: item.label,
        variant: item.variant,
        autoPause: false,
      })
    }
  }

  return events.sort((a, b) => a.time - b.time)
}
