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
    // 对于 U-238, 我们实际只画 40 个，否则页面会卡死
    const A = data.A === 238 ? 40 : data.A
    const Z = data.A === 238 ? 16 : data.Z // 质子数占 40%
    const N = A - Z

    // 预先设定核子的质子/中子身份列表，进行打散
    const types: ('proton' | 'neutron')[] = []
    let pCount = 0
    let nCount = 0
    for (let i = 0; i < A; i++) {
      // 尽量均匀分布红蓝球
      if (pCount < Z && (nCount >= N || i % 2 === 0)) {
        types.push('proton')
        pCount++
      } else {
        types.push('neutron')
        nCount++
      }
    }

    // 采用 Fermat 螺旋算法在平面上紧密排布圆球，黄金夹角 θ = 137.5°
    const GOLDEN_ANGLE = 137.5 * (Math.PI / 180)
    const c = 0.55 // 紧密排列缩放因子

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
      // 每颗粒子有不同的相位，利用正弦和余弦做圆周/抖动微小振动
      const phase = idx * 1.7
      const vx = Math.sin(time * 20 + phase) * 0.04
      const vy = Math.cos(time * 24 + phase) * 0.04

      // nucleonDistance 代表核子平均间距滑块
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
    const v = initVelocity // 初速度 2.0 ~ 8.0

    // 粒子比荷参数 (视觉比例，而非真实比例以保证在同一个画面可见)
    const kAlpha = 0.4
    const kBeta = -2.4
    const kGamma = 0

    // 计算单个粒子在时间 t 处的坐标
    const getParticlePos = (t: number, qm: number, hitY: number) => {
      const tFieldStart = (yFieldStart - yStart) / v
      if (t <= tFieldStart) {
        const y = yStart + v * t
        if (showObstacles === 1 && y >= hitY) {
          return { x: 0, y: hitY, hit: true }
        }
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

      // 检查在场中是否被挡板截断
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
        return { x: hitX, y: hitY, hit: true }
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
          return { x: hitX, y: hitY, hit: true }
        }

        return { x: currX, y: currY, hit: false }
      }

      return { x, y, hit: false }
    }

    const paperY = 0.0
    const alumY = 1.0
    const leadY = 2.0

    const alphaState = getParticlePos(time, kAlpha, paperY)
    const betaState = getParticlePos(time, kBeta, alumY)
    const gammaState = getParticlePos(time, kGamma, leadY)

    const generatePath = (qm: number, hitY: number) => {
      const pathPoints: ParticlePoint[] = []
      const steps = 60
      const limitT = time
      for (let i = 0; i <= steps; i++) {
        const t = (limitT * i) / steps
        const pt = getParticlePos(t, qm, hitY)
        pathPoints.push({ x: pt.x, y: pt.y, visible: true })
        if (pt.hit) break
      }
      return pathPoints
    }

    const alphaPath = generatePath(kAlpha, paperY)
    const betaPath = generatePath(kBeta, alumY)
    const gammaPath = generatePath(kGamma, leadY)

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
