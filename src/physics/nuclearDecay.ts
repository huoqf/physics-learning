import { alignCriticalTime, finalizeCriticalPoints, type RawCriticalPoint } from '@/utils/criticalTime'
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

// ─── 天然放射线电磁偏转纯计算（anim-nuclear-decay mode === 1 SSOT） ─────────

export const RADIATION_DEFLECTION_CONSTANTS = {
  yStart: -2.5,
  yFieldStart: -1.5,
  yFieldEnd: 2.5,
  kAlpha: 0.4,
  kBeta: -2.4,
  kGamma: 0,
  paperY: 0.0,
  alumY: 1.0,
  leadY: 2.0,
  paperRange: [-4.0, -0.8] as [number, number],
  alumRange: [0.8, 4.0] as [number, number],
  leadRange: [-0.8, 0.8] as [number, number],
} as const

export interface RadiationFieldParams {
  fieldType: number
  bField: number
  eField: number
  initVelocity: number
  showObstacles: number
}

/** 计算单个放射线粒子在时间 t 处的坐标及是否被挡板阻挡 */
export function computeRadiationParticleState(
  t: number,
  qm: number,
  p: RadiationFieldParams,
  hitY: number,
  hitXRange: readonly [number, number],
): { x: number; y: number; hit: boolean } {
  const { yStart, yFieldStart, yFieldEnd } = RADIATION_DEFLECTION_CONSTANTS
  const { fieldType, bField, eField, initVelocity: v, showObstacles } = p
  if (v <= 1e-6) return { x: 0, y: yStart, hit: false }

  const tFieldStart = (yFieldStart - yStart) / v
  if (t <= tFieldStart) {
    const y = yStart + v * t
    const hit = showObstacles === 1 && y >= hitY && 0 >= hitXRange[0] && 0 <= hitXRange[1]
    if (hit) return { x: 0, y: hitY, hit: true }
    return { x: 0, y, hit: false }
  }

  const tInField = t - tFieldStart
  let x = 0
  let y = 0

  if (fieldType === 0) {
    const omega = qm * bField
    if (Math.abs(omega) > 1e-5) {
      x = (v / omega) * (Math.cos(omega * tInField) - 1)
      y = yFieldStart + (v / omega) * Math.sin(omega * tInField)
    } else {
      x = 0
      y = yFieldStart + v * tInField
    }
  } else if (fieldType === 1) {
    const ax = qm * eField
    x = 0.5 * ax * tInField * tInField
    y = yFieldStart + v * tInField
  } else {
    x = 0
    y = yFieldStart + v * tInField
  }

  if (showObstacles === 1 && y >= hitY) {
    let hitX = x
    if (fieldType === 0) {
      const omega = qm * bField
      if (Math.abs(omega) > 1e-5) {
        const sinArg = Math.max(-1, Math.min(1, ((hitY - yFieldStart) * omega) / v))
        const tHit = Math.asin(sinArg) / omega
        hitX = (v / omega) * (Math.cos(omega * tHit) - 1)
      }
    } else if (fieldType === 1) {
      const tHit = (hitY - yFieldStart) / v
      hitX = 0.5 * (qm * eField) * tHit * tHit
    }
    if (hitX >= hitXRange[0] && hitX <= hitXRange[1]) {
      return { x: hitX, y: hitY, hit: true }
    }
  }

  let tFieldEnd = tFieldStart
  if (fieldType === 0) {
    const omega = qm * bField
    if (Math.abs(omega) > 1e-5) {
      const val = ((yFieldEnd - yFieldStart) * omega) / v
      tFieldEnd = val >= -1 && val <= 1
        ? tFieldStart + Math.asin(val) / omega
        : tFieldStart + Math.PI / Math.abs(omega)
    } else {
      tFieldEnd = tFieldStart + (yFieldEnd - yFieldStart) / v
    }
  } else {
    tFieldEnd = tFieldStart + (yFieldEnd - yFieldStart) / v
  }

  if (t > tFieldEnd) {
    const tInFieldEnd = tFieldEnd - tFieldStart
    let xEnd = 0
    let yEnd = yFieldEnd
    let vxEnd = 0
    let vyEnd = v

    if (fieldType === 0) {
      const omega = qm * bField
      if (Math.abs(omega) > 1e-5) {
        xEnd = (v / omega) * (Math.cos(omega * tInFieldEnd) - 1)
        yEnd = yFieldStart + (v / omega) * Math.sin(omega * tInFieldEnd)
        vxEnd = -v * Math.sin(omega * tInFieldEnd)
        vyEnd = v * Math.cos(omega * tInFieldEnd)
      }
    } else if (fieldType === 1) {
      const ax = qm * eField
      xEnd = 0.5 * ax * tInFieldEnd * tInFieldEnd
      vxEnd = ax * tInFieldEnd
    }

    const tOut = t - tFieldEnd
    const currX = xEnd + vxEnd * tOut
    const currY = yEnd + vyEnd * tOut

    if (showObstacles === 1 && currY >= hitY && Math.abs(vyEnd) > 1e-6) {
      const ratio = (hitY - yEnd) / vyEnd
      const hitX = xEnd + vxEnd * ratio
      if (hitX >= hitXRange[0] && hitX <= hitXRange[1]) {
        return { x: hitX, y: hitY, hit: true }
      }
    }

    return { x: currX, y: currY, hit: false }
  }

  return { x, y, hit: false }
}

export interface NuclearDecayCriticalParams {
  mode?: number
  fieldType?: number
  bField?: number
  eField?: number
  initVelocity?: number
  showObstacles?: number
}

/**
 * 计算原子核组成与天然放射线偏转关键时刻（SSOT）
 */
export function getNuclearDecayCriticalTimes(
  params: NuclearDecayCriticalParams = {},
  maxTime = 30,
): CriticalTimePoint[] {
  if ((params.mode ?? 0) !== 1) return []

  const p: RadiationFieldParams = {
    fieldType: params.fieldType ?? 0,
    bField: params.bField ?? 1.5,
    eField: params.eField ?? 5.0,
    initVelocity: params.initVelocity ?? 4.0,
    showObstacles: params.showObstacles ?? 0,
  }
  if (p.initVelocity <= 1e-6) return []

  const {
    yStart,
    yFieldStart,
    yFieldEnd,
    kAlpha,
    kBeta,
    kGamma,
    paperY,
    alumY,
    leadY,
    paperRange,
    alumRange,
    leadRange,
  } = RADIATION_DEFLECTION_CONSTANTS

  const raw: RawCriticalPoint[] = []
  const tEnter = (yFieldStart - yStart) / p.initVelocity
  raw.push({
    rawTime: tEnter,
    align: 'after',
    label: p.fieldType === 2 ? '进入观测区' : '射线进入外加场区',
    variant: 'info',
  })

  if (p.showObstacles === 1) {
    const findHitTime = (qm: number, hitY: number, range: readonly [number, number]): number | null => {
      for (let t = 0.01; t <= Math.min(maxTime, 10); t += 0.01) {
        if (computeRadiationParticleState(t, qm, p, hitY, range).hit) return t
      }
      return null
    }
    const tAlphaHit = findHitTime(kAlpha, paperY, paperRange)
    const tBetaHit = findHitTime(kBeta, alumY, alumRange)
    const tGammaHit = findHitTime(kGamma, leadY, leadRange)
    if (tAlphaHit !== null) {
      raw.push({ rawTime: tAlphaHit, align: 'before', label: 'α 射线被纸片阻挡', variant: 'warning' })
    }
    if (tBetaHit !== null) {
      raw.push({ rawTime: tBetaHit, align: 'before', label: 'β 射线被铝板阻挡', variant: 'warning' })
    }
    if (tGammaHit !== null) {
      raw.push({ rawTime: tGammaHit, align: 'before', label: 'γ 射线到达铅板阻挡', variant: 'critical', autoPause: true })
    }
  } else {
    const tExitGamma = (yFieldEnd - yStart) / p.initVelocity
    raw.push({
      rawTime: tExitGamma,
      align: 'before',
      label: '射线完全穿出外场区',
      variant: 'warning',
      autoPause: true,
    })
  }

  return finalizeCriticalPoints(raw, maxTime, 0.05)
}
