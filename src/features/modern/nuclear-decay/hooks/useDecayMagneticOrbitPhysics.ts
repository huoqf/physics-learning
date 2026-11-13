import { useMemo } from 'react'
import {
  DECAY_START_DELAY,
  DECAY_CHARGES,
  DECAY_OMEGA_FACTORS,
} from '@/physics/nuclearDecay'

export { DECAY_CHARGES }

export interface MagneticDecayModeData {
  decayType: number // 0: α 衰变, 1: β 衰变
  parentPos: { x: number; y: number }
  daughterPos: { x: number; y: number }
  particlePos: { x: number; y: number }
  daughterRadius: number
  particleRadius: number
  daughterCenter: { x: number; y: number }
  particleCenter: { x: number; y: number }
  daughterName: string
  particleName: string
  parentName: string
  reactionLatex: string
  radiusRatio: string
  energyRatio: string
  isTangentialOuter: boolean // true: 外切圆, false: 内切圆
  hasDecayed: boolean
  progress: number
}

function formatRadiusRatio(c: { particle: number; daughter: number }): string {
  return `${c.daughter} : ${c.particle} = ${c.daughter / c.particle} : 1`
}

/**
 * 静止核在匀强磁场中衰变径迹 (外切圆 / 内切圆) 物理计算 Hook
 */
export function useDecayMagneticOrbitPhysics(
  decayType: number,
  bField: number,
  time: number,
): MagneticDecayModeData {
  return useMemo<MagneticDecayModeData>(() => {
    const isAlpha = decayType === 0
    const decayStartDelay = DECAY_START_DELAY
    const hasDecayed = time >= decayStartDelay
    const tActive = Math.max(0, time - decayStartDelay)
    const parentPos = { x: 0, y: 0 }

    if (isAlpha) {
      const particleRadius = Math.min(2.5, 3.2 / Math.max(0.5, bField))
      const daughterRadius = particleRadius * 0.35
      const particleCenter = { x: 0, y: particleRadius }
      const daughterCenter = { x: 0, y: -daughterRadius }

      const omegaParticle = DECAY_OMEGA_FACTORS.alpha.particle * bField
      const omegaDaughter = DECAY_OMEGA_FACTORS.alpha.daughter * bField
      const thetaParticle = (omegaParticle * tActive) % (2 * Math.PI)
      const thetaDaughter = (omegaDaughter * tActive) % (2 * Math.PI)

      const particlePos = hasDecayed
        ? {
            x: particleCenter.x + particleRadius * Math.sin(thetaParticle),
            y: particleCenter.y - particleRadius * Math.cos(thetaParticle),
          }
        : parentPos

      const daughterPos = hasDecayed
        ? {
            x: daughterCenter.x - daughterRadius * Math.sin(thetaDaughter),
            y: daughterCenter.y + daughterRadius * Math.cos(thetaDaughter),
          }
        : parentPos

      return {
        decayType: 0,
        parentPos,
        daughterPos,
        particlePos,
        daughterRadius,
        particleRadius,
        daughterCenter,
        particleCenter,
        daughterName: '钍核 (²³⁴₉₀Th)',
        particleName: 'α 粒子 (⁴₂He)',
        parentName: '铀核 (²³⁸₉₂U)',
        reactionLatex: '{}^{238}_{92}\\text{U} \\rightarrow {}^{234}_{90}\\text{Th} + {}^4_2\\text{He}',
        radiusRatio: `R_α : R_Th = q_Th : q_α = ${formatRadiusRatio(DECAY_CHARGES.alpha)}`,
        energyRatio: 'E_kα : E_kTh = m_Th : m_α = 234 : 4 = 58.5 : 1',
        isTangentialOuter: true,
        hasDecayed,
        progress: Math.min(1, tActive / 4.0),
      }
    }

    const particleRadius = Math.min(2.5, 3.2 / Math.max(0.5, bField))
    const daughterRadius = particleRadius * 0.4
    const particleCenter = { x: 0, y: -particleRadius }
    const daughterCenter = { x: 0, y: -daughterRadius }

    const omegaParticle = DECAY_OMEGA_FACTORS.beta.particle * bField
    const omegaDaughter = DECAY_OMEGA_FACTORS.beta.daughter * bField
    const thetaParticle = (omegaParticle * tActive) % (2 * Math.PI)
    const thetaDaughter = (omegaDaughter * tActive) % (2 * Math.PI)

    const particlePos = hasDecayed
      ? {
          x: particleCenter.x + particleRadius * Math.sin(thetaParticle),
          y: particleCenter.y + particleRadius * Math.cos(thetaParticle),
        }
      : parentPos

    const daughterPos = hasDecayed
      ? {
          x: daughterCenter.x - daughterRadius * Math.sin(thetaDaughter),
          y: daughterCenter.y + daughterRadius * Math.cos(thetaDaughter),
        }
      : parentPos

    return {
      decayType: 1,
      parentPos,
      daughterPos,
      particlePos,
      daughterRadius,
      particleRadius,
      daughterCenter,
      particleCenter,
      daughterName: '氮核 (¹⁴₇N)',
      particleName: 'β 粒子 (⁰₋₁e)',
      parentName: '碳核 (¹⁴₆C)',
      reactionLatex: '{}^{14}_6\\text{C} \\rightarrow {}^{14}_7\\text{N} + {}^0_{-1}\\text{e}',
      radiusRatio: `R_β : R_N = q_N : |q_β| = ${DECAY_CHARGES.beta.daughter / DECAY_CHARGES.beta.particle} : 1`,
      energyRatio: 'E_kβ : E_kN = m_N : m_e \\approx 25000 : 1',
      isTangentialOuter: false,
      hasDecayed,
      progress: Math.min(1, tActive / 4.0),
    }
  }, [decayType, bField, time])
}
