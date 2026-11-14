import { useMemo } from 'react'
import {
  RADIATION_DEFLECTION_CONSTANTS,
  computeRadiationParticleState,
} from '@/physics/nuclearDecay'

export interface Nucleon {
  id: number
  x: number
  y: number
  type: 'proton' | 'neutron'
}

export interface ParticlePoint {
  x: number
  y: number
  visible: boolean
}

export interface UseNuclearDecayPhysicsParams {
  mode: number
  nuclide: number
  nucleonDistance: number
  fieldType: number
  bField: number
  eField: number
  initVelocity: number
  showObstacles: number
  time: number
}

export interface NuclearDecayPhysicsResult {
  // 模式0：原子核组成
  nucleons: Nucleon[]

  // 模式1：天然放射偏转
  alphaPath: ParticlePoint[]
  betaPath: ParticlePoint[]
  gammaPath: ParticlePoint[]
  alphaPos: { x: number; y: number }
  betaPos: { x: number; y: number }
  gammaPos: { x: number; y: number }
  alphaHit: boolean // 是否被纸挡住
  betaHit: boolean // 是否被铝挡住
  gammaHit: boolean // 是否被铅挡住
}

// 同位素物理参数
const NUCLIDES_DATA = [
  { Z: 1, N: 0, A: 1 }, // H-1
  { Z: 1, N: 1, A: 2 }, // H-2
  { Z: 1, N: 2, A: 3 }, // H-3
  { Z: 2, N: 2, A: 4 }, // He-4
  { Z: 6, N: 6, A: 12 }, // C-12
  { Z: 6, N: 8, A: 14 }, // C-14
  { Z: 92, N: 146, A: 238 }, // U-238 (这里实际画40个以防卡顿，但在显示上代表238)
]

export function useNuclearDecayPhysics(params: UseNuclearDecayPhysicsParams): NuclearDecayPhysicsResult {
  const {
    mode,
    nuclide,
    nucleonDistance,
    fieldType,
    bField,
    eField,
    initVelocity,
    showObstacles,
    time,
  } = params

  // 1. 模式0: 原子核的组成与同位素
  const nucleons = useMemo(() => {
    if (mode !== 0) return []

    const data = NUCLIDES_DATA[nuclide] ?? NUCLIDES_DATA[3]
    const A = data.A === 238 ? 40 : data.A
    const Z = data.A === 238 ? 16 : data.Z
    const N = A - Z

    const types: ('proton' | 'neutron')[] = []
    let pCount = 0
    let nCount = 0
    for (let i = 0; i < A; i++) {
      if (pCount < Z && (nCount >= N || i % 2 === 0)) {
        types.push('proton')
        pCount++
      } else {
        types.push('neutron')
        nCount++
      }
    }

    const GOLDEN_ANGLE = 137.5 * (Math.PI / 180)
    const c = 0.55

    const list: Nucleon[] = []
    for (let i = 0; i < A; i++) {
      const theta = i * GOLDEN_ANGLE
      const r = c * Math.sqrt(i + 0.5)
      
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)

      list.push({
        id: i,
        x,
        y,
        type: types[i],
      })
    }
    return list
  }, [mode, nuclide])

  // 加入微小呼吸振动效果的核子
  const dynamicNucleons = useMemo(() => {
    if (mode !== 0) return []
    return nucleons.map((n, idx) => {
      const phase = idx * 1.7
      const vx = Math.sin(time * 20 + phase) * 0.04
      const vy = Math.cos(time * 24 + phase) * 0.04

      return {
        ...n,
        x: (n.x * nucleonDistance + vx),
        y: (n.y * nucleonDistance + vy),
      }
    })
  }, [nucleons, mode, nucleonDistance, time])

  // 2. 模式1: 天然放射线在电磁场中偏转
  const mode1Physics = useMemo(() => {
    if (mode !== 1) {
      return {
        alphaPath: [], betaPath: [], gammaPath: [],
        alphaPos: { x: 0, y: -2.5 }, betaPos: { x: 0, y: -2.5 }, gammaPos: { x: 0, y: -2.5 },
        alphaHit: false, betaHit: false, gammaHit: false,
      }
    }

    const {
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

    const fieldParams = { fieldType, bField, eField, initVelocity, showObstacles }
    const alphaState = computeRadiationParticleState(time, kAlpha, fieldParams, paperY, paperRange)
    const betaState = computeRadiationParticleState(time, kBeta, fieldParams, alumY, alumRange)
    const gammaState = computeRadiationParticleState(time, kGamma, fieldParams, leadY, leadRange)

    const generatePath = (qm: number, hitY: number, range: readonly [number, number]) => {
      const pathPoints: ParticlePoint[] = []
      const steps = 60
      const limitT = time
      for (let i = 0; i <= steps; i++) {
        const t = (limitT * i) / steps
        const pt = computeRadiationParticleState(t, qm, fieldParams, hitY, range)
        pathPoints.push({ x: pt.x, y: pt.y, visible: true })
        if (pt.hit) break
      }
      return pathPoints
    }

    const alphaPath = generatePath(kAlpha, paperY, paperRange)
    const betaPath = generatePath(kBeta, alumY, alumRange)
    const gammaPath = generatePath(kGamma, leadY, leadRange)

    return {
      alphaPath,
      betaPath,
      gammaPath,
      alphaPos: { x: alphaState.x, y: alphaState.y },
      betaPos: { x: betaState.x, y: betaState.y },
      gammaPos: { x: gammaState.x, y: gammaState.y },
      alphaHit: alphaState.hit,
      betaHit: betaState.hit,
      gammaHit: gammaState.hit,
    }
  }, [mode, fieldType, bField, eField, initVelocity, showObstacles, time])

  return {
    nucleons: dynamicNucleons,
    ...mode1Physics,
  }
}
