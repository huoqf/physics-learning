import { useMemo } from 'react'

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

export interface UseNuclearDecayPhysicsParams {
  mode: number
  nuclide: number
  nucleonDistance: number
  fieldType: number
  bField: number
  eField: number
  initVelocity: number
  showObstacles: number
  decayType?: number
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

  // 模式2：磁场中静止核衰变轨迹 (内切/外切圆)
  decayData?: MagneticDecayModeData
}

/**
 * 两种典型衰变的粒子电荷量绝对值（单位 e）—— 静止母核磁场衰变模型的唯一真源。
 *
 * 动量守恒使两种产物动量大小相同（p₁ = p₂），故由 R = p/(|q|B) 得
 * R ∝ 1/|q|，半径比恰为电荷量之反比。中屏 R—|q| 关系图与右屏半径比文案
 * 均由此常量派生，避免两处数值各自漂移。
 */
export const DECAY_CHARGES = {
  /** α 衰变：⁴₂He 与 ²³⁴₉₀Th */
  alpha: { particle: 2, daughter: 90 },
  /** β 衰变：⁰₋₁e 与 ¹⁴₇N */
  beta: { particle: 1, daughter: 7 },
} as const

/** 生成右屏半径比文案：R_微粒 : R_新核 = |q_新核| : |q_微粒| = k : 1 */
function formatRadiusRatio(c: { particle: number; daughter: number }): string {
  return `${c.daughter} : ${c.particle} = ${c.daughter / c.particle} : 1`
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
    decayType = 0,
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

    const yStart = -2.5
    const yFieldStart = -1.5
    const yFieldEnd = 2.5
    const v = initVelocity

    const kAlpha = 0.4
    const kBeta = -2.4
    const kGamma = 0

    // 计算单个粒子在时间 t 处的坐标，增加横坐标命中检测
    const getParticlePos = (t: number, qm: number, hitY: number, hitXRange: [number, number]) => {
      const tFieldStart = (yFieldStart - yStart) / v
      if (t <= tFieldStart) {
        const y = yStart + v * t
        const hit = showObstacles === 1 && y >= hitY && 0 >= hitXRange[0] && 0 <= hitXRange[1]
        if (hit) return { x: 0, y: hitY, hit: true }
        return { x: 0, y, hit: false }
      }

      const xStartField = 0
      const yStartField = yFieldStart
      const tInField = t - tFieldStart

      let x = 0
      let y = 0

      if (fieldType === 0) {
        const omega = qm * bField
        if (Math.abs(omega) > 1e-5) {
          x = xStartField + (v / omega) * (Math.cos(omega * tInField) - 1)
          y = yStartField + (v / omega) * Math.sin(omega * tInField)
        } else {
          x = 0
          y = yStartField + v * tInField
        }
      } else if (fieldType === 1) {
        const ax = qm * eField
        x = xStartField + 0.5 * ax * tInField * tInField
        y = yStartField + v * tInField
      } else {
        x = 0
        y = yStartField + v * tInField
      }

      // 检查在场中是否被挡板截断 (仅当横坐标在挡板范围内)
      if (showObstacles === 1 && y >= hitY) {
        let hitX = x
        if (fieldType === 0) {
          const omega = qm * bField
          if (Math.abs(omega) > 1e-5) {
            const tHit = Math.asin((hitY - yStartField) * omega / v) / omega
            hitX = xStartField + (v / omega) * (Math.cos(omega * tHit) - 1)
          }
        } else if (fieldType === 1) {
          const tHit = (hitY - yStartField) / v
          hitX = xStartField + 0.5 * (qm * eField) * tHit * tHit
        }
        if (hitX >= hitXRange[0] && hitX <= hitXRange[1]) {
          return { x: hitX, y: hitY, hit: true }
        }
      }

      // 3. 出场后：沿切线做匀速直线运动 (y > yFieldEnd)
      let tFieldEnd = tFieldStart
      if (fieldType === 0) {
        const omega = qm * bField
        if (Math.abs(omega) > 1e-5) {
          const val = (yFieldEnd - yStartField) * omega / v
          if (val >= -1 && val <= 1) {
            const tInFieldEnd = Math.asin(val) / omega
            tFieldEnd = tFieldStart + tInFieldEnd
          } else {
            tFieldEnd = tFieldStart + Math.PI / Math.abs(omega)
          }
        } else {
          tFieldEnd = tFieldStart + (yFieldEnd - yStartField) / v
        }
      } else {
        tFieldEnd = tFieldStart + (yFieldEnd - yStartField) / v
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
            xEnd = xStartField + (v / omega) * (Math.cos(omega * tInFieldEnd) - 1)
            yEnd = yStartField + (v / omega) * Math.sin(omega * tInFieldEnd)
            vxEnd = -v * Math.sin(omega * tInFieldEnd)
            vyEnd = v * Math.cos(omega * tInFieldEnd)
          }
        } else if (fieldType === 1) {
          const ax = qm * eField
          xEnd = xStartField + 0.5 * ax * tInFieldEnd * tInFieldEnd
          vxEnd = ax * tInFieldEnd
        }

        const tOut = t - tFieldEnd
        const currX = xEnd + vxEnd * tOut
        const currY = yEnd + vyEnd * tOut

        if (showObstacles === 1 && currY >= hitY) {
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

    const paperY = 0.0
    const alumY = 1.0
    const leadY = 2.0

    // 挡板横坐标真实范围
    const paperRange: [number, number] = [-4.0, -0.8]
    const alumRange: [number, number] = [0.8, 4.0]
    const leadRange: [number, number] = [-0.8, 0.8]

    const alphaState = getParticlePos(time, kAlpha, paperY, paperRange)
    const betaState = getParticlePos(time, kBeta, alumY, alumRange)
    const gammaState = getParticlePos(time, kGamma, leadY, leadRange)

    const generatePath = (qm: number, hitY: number, range: [number, number]) => {
      const pathPoints: ParticlePoint[] = []
      const steps = 60
      const limitT = time
      for (let i = 0; i <= steps; i++) {
        const t = (limitT * i) / steps
        const pt = getParticlePos(t, qm, hitY, range)
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

  // 3. 模式2: 静止核在匀强磁场中衰变径迹 (内切圆 / 外切圆模型)
  const decayData = useMemo<MagneticDecayModeData | undefined>(() => {
    if (mode !== 2) return undefined

    const isAlpha = decayType === 0
    const decayStartDelay = 0.5 // 0.5s 发生瞬间衰变
    const hasDecayed = time >= decayStartDelay
    const tActive = Math.max(0, time - decayStartDelay)

    const parentPos = { x: 0, y: 0 }

    if (isAlpha) {
      // 经典 α 衰变: ²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He
      // 动量守恒: p_Th = p_alpha = p
      // 电荷: q_alpha = +2, q_Th = +90
      // 磁场偏转半径: R = p/(qB) => R_alpha : R_Th = 90 : 2 = 45 : 1
      // 为视觉清晰易辨，设定具有鲜明对比度又不致过小的视觉半径
      const particleRadius = Math.min(2.5, 3.2 / Math.max(0.5, bField))
      const daughterRadius = particleRadius * 0.35 // 视觉缩小比例以看清新核小圆

      const particleCenter = { x: 0, y: particleRadius } // 上方圆心
      const daughterCenter = { x: 0, y: -daughterRadius } // 下方圆心

      // 角速度与周期: omega = v/R = p/(m*R) = qB/m
      const omegaParticle = 1.8 * bField
      const omegaDaughter = 0.6 * bField

      const thetaParticle = (omegaParticle * tActive) % (2 * Math.PI)
      const thetaDaughter = (omegaDaughter * tActive) % (2 * Math.PI)

      // α 粒子向右射出，向上逆时针偏转
      const particlePos = hasDecayed
        ? {
            x: particleCenter.x + particleRadius * Math.sin(thetaParticle),
            y: particleCenter.y - particleRadius * Math.cos(thetaParticle),
          }
        : parentPos

      // 新核向左射出，向下逆时针偏转
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
    } else {
      // 经典 β 衰变: ¹⁴₆C → ¹⁴₇N + ⁰₋₁e
      // 动量守恒: p_N = p_beta = p
      // 电荷: q_beta = -1, q_N = +7
      // 磁场半径: R_beta : R_N = 7 : 1
      const particleRadius = Math.min(2.5, 3.2 / Math.max(0.5, bField))
      const daughterRadius = particleRadius * 0.4

      // 两圆都在下方，内切于原点 (0, 0)
      const particleCenter = { x: 0, y: -particleRadius }
      const daughterCenter = { x: 0, y: -daughterRadius }

      const omegaParticle = 2.4 * bField
      const omegaDaughter = 0.8 * bField

      const thetaParticle = (omegaParticle * tActive) % (2 * Math.PI)
      const thetaDaughter = (omegaDaughter * tActive) % (2 * Math.PI)

      // β 粒子向右射出，带负电，受洛伦兹力向下，顺时针运动
      const particlePos = hasDecayed
        ? {
            x: particleCenter.x + particleRadius * Math.sin(thetaParticle),
            y: particleCenter.y + particleRadius * Math.cos(thetaParticle),
          }
        : parentPos

      // 新核向左射出，带正电，受洛伦兹力向下，逆时针运动
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
    }
  }, [mode, decayType, bField, time])

  return {
    nucleons: dynamicNucleons,
    ...mode1Physics,
    decayData,
  }
}
