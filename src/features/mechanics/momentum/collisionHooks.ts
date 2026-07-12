/**
 * collisionHooks.ts
 * 碰撞动画 view model 计算逻辑（纯函数 + useMemo）
 *
 * 职责：碰撞时间、位置、速度、动能、图表数据点的计算
 */
import { useMemo } from 'react'
import { getPointsUpToTime } from '@/utils'
import {
  elasticCollision,
  inelasticCollisionSpeed,
  calculateInitialKineticEnergy,
  calculateFinalKineticEnergy,
  collisionWithEnergyLoss,
  isVelocitySwapCase,
  isHeavyLightCase,
} from '@/physics/collision'

/** 碰撞动画布局常量（基于 CANVAS_PRESETS.splitV 840×325 设计空间） */
export const COL_LAYOUT = {
  canvasPadding: 50,
  ballBaseRadius: 16,
  massRadiusScale: 2,
  velocityScale: 25,
  designWidth: 840,
  designHeight: 180,
  groundY: 130,
} as const

interface BasicModeParams {
  m1: number
  v1: number
  m2: number
  v2: number
  isElastic: number
}

interface BasicModeResult {
  R_A: number
  R_B: number
  posAx: number
  posBx: number
  currentV1: number
  currentV2: number
  hasCollided: boolean
  collisionTime: number
  EkBefore: number
  EkAfter: number
}

/**
 * 计算基础模式（弹性/非弹性碰撞）的 view model 状态
 */
export function computeBasicMode(
  params: BasicModeParams,
  time: number,
): BasicModeResult {
  const { m1, v1, m2, v2, isElastic } = params

  const R_A = COL_LAYOUT.ballBaseRadius + m1 * COL_LAYOUT.massRadiusScale
  const R_B = COL_LAYOUT.ballBaseRadius + m2 * COL_LAYOUT.massRadiusScale

  const initPosAx = COL_LAYOUT.designWidth * 0.25
  const initPosBx = COL_LAYOUT.designWidth * 0.65

  const gap = initPosBx - R_B - (initPosAx + R_A)
  const approachSpeed = (v1 - v2) * COL_LAYOUT.velocityScale
  let collisionTime = Infinity
  let v1After = v1
  let v2After = v2
  let isSticking = false

  if (approachSpeed > 0 && gap > 0) {
    collisionTime = gap / approachSpeed
    if (isElastic === 1) {
      const [va, vb] = elasticCollision(m1, v1, m2, v2)
      v1After = va
      v2After = vb
    } else {
      const vCommon = inelasticCollisionSpeed(m1, v1, m2, v2)
      v1After = vCommon
      v2After = vCommon
      isSticking = true
    }
  }

  const scale = COL_LAYOUT.velocityScale
  let posAx: number, posBx: number, currentV1: number, currentV2: number
  const hasCollided = time >= collisionTime

  if (time < collisionTime) {
    posAx = initPosAx + v1 * time * scale
    posBx = initPosBx + v2 * time * scale
    currentV1 = v1
    currentV2 = v2
  } else {
    const dt = time - collisionTime
    const colPosAx = initPosAx + v1 * collisionTime * scale
    const colPosBx = initPosBx + v2 * collisionTime * scale
    posAx = colPosAx + v1After * dt * scale
    posBx = isSticking
      ? colPosAx + v1After * dt * scale + R_A + R_B
      : colPosBx + v2After * dt * scale
    currentV1 = v1After
    currentV2 = v2After
  }

  const leftBound = COL_LAYOUT.canvasPadding + R_A
  const rightBound = COL_LAYOUT.designWidth - COL_LAYOUT.canvasPadding - R_B
  posAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, posAx))
  posBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, posBx))

  const EkBefore = calculateInitialKineticEnergy(m1, v1, m2, v2)
  const EkAfter = calculateFinalKineticEnergy(m1, v1After, m2, v2After)

  return {
    R_A,
    R_B,
    posAx,
    posBx,
    currentV1,
    currentV2,
    hasCollided,
    collisionTime,
    EkBefore,
    EkAfter,
  }
}

interface AdvancedModeParams {
  mA: number
  vA: number
  mB: number
  kLoss: number
}

interface AdvancedModeResult {
  R_Adv: number
  R_Bdv: number
  posAAdv: number
  posBAdv: number
  curVA: number
  curVB: number
  hasCollidedAdv: boolean
  colTimeAdv: number
  EkBeforeAdv: number
  EkAfterAdv: number
  velocitySwap: boolean
  heavyLight: boolean
  lightHeavy: boolean
  xCmAdv: number
}

/**
 * 计算进阶模式（带能量损失系数）的 view model 状态
 */
export function computeAdvancedMode(
  params: AdvancedModeParams,
  time: number,
): AdvancedModeResult {
  const { mA, vA, mB, kLoss } = params

  const [vAAfter, vBAfter] = collisionWithEnergyLoss(mA, vA, mB, kLoss)
  const EkA_before = 0.5 * mA * vA * vA
  const EkA_after = 0.5 * mA * vAAfter * vAAfter
  const EkB_after = 0.5 * mB * vBAfter * vBAfter
  const EkBeforeAdv = EkA_before
  const EkAfterAdv = EkA_after + EkB_after
  const velocitySwap = isVelocitySwapCase(mA, mB, kLoss)
  const heavyLight = isHeavyLightCase(mA, mB)
  const lightHeavy = mA < mB / 10

  const R_Adv = COL_LAYOUT.ballBaseRadius + mA * COL_LAYOUT.massRadiusScale
  const R_Bdv = COL_LAYOUT.ballBaseRadius + mB * COL_LAYOUT.massRadiusScale
  const initPosAAdv = COL_LAYOUT.designWidth * 0.25
  const initPosBAdv = COL_LAYOUT.designWidth * 0.65
  const gapAdv = initPosBAdv - R_Bdv - (initPosAAdv + R_Adv)
  const approachAdv = vA * COL_LAYOUT.velocityScale
  let colTimeAdv = Infinity
  if (approachAdv > 0 && gapAdv > 0) {
    colTimeAdv = gapAdv / approachAdv
  }

  const scale = COL_LAYOUT.velocityScale
  let posAAdv: number, posBAdv: number, curVA: number, curVB: number
  const hasCollidedAdv = time >= colTimeAdv

  if (time < colTimeAdv) {
    posAAdv = initPosAAdv + vA * time * scale
    posBAdv = initPosBAdv
    curVA = vA
    curVB = 0
  } else {
    const dt = time - colTimeAdv
    const colPosA = initPosAAdv + vA * colTimeAdv * scale
    posAAdv = colPosA + vAAfter * dt * scale
    posBAdv = initPosBAdv + vBAfter * dt * scale
    curVA = vAAfter
    curVB = vBAfter
  }

  const leftBoundAdv = COL_LAYOUT.canvasPadding + R_Adv
  const rightBoundAdv = COL_LAYOUT.designWidth - COL_LAYOUT.canvasPadding - R_Bdv
  posAAdv = Math.max(leftBoundAdv, Math.min(rightBoundAdv + R_Bdv - R_Adv, posAAdv))
  posBAdv = Math.max(leftBoundAdv - R_Adv + R_Bdv, Math.min(rightBoundAdv, posBAdv))

  const xCmAdv = (mA * posAAdv + mB * posBAdv) / (mA + mB)

  return {
    R_Adv,
    R_Bdv,
    posAAdv,
    posBAdv,
    curVA,
    curVB,
    hasCollidedAdv,
    colTimeAdv,
    EkBeforeAdv,
    EkAfterAdv,
    velocitySwap,
    heavyLight,
    lightHeavy,
    xCmAdv,
  }
}

interface ChartDataParams {
  isAdvanced: boolean
  m1: number
  v1: number
  m2: number
  v2: number
  collisionTime: number
  v1After: number
  v2After: number
  EkBefore: number
  EkAfter: number
  mA: number
  vA: number
  mB: number
  colTimeAdv: number
  vAAfter: number
  vBAfter: number
  EkBeforeAdv: number
  EkAfterAdv: number
  currentT: number
}

interface ChartDataResult {
  currentDomainVtPoints1: { t: number; v: number }[]
  currentDomainVtPoints2: { t: number; v: number }[]
  currentDomainEktPoints1: { t: number; v: number }[]
  currentDomainEktPoints2: { t: number; v: number }[]
  currentDomainEktPointsTotal: { t: number; v: number }[]
  currentVtPoints1: { t: number; v: number }[]
  currentVtPoints2: { t: number; v: number }[]
  currentEktPoints1: { t: number; v: number }[]
  currentEktPoints2: { t: number; v: number }[]
  currentEktPointsTotal: { t: number; v: number }[]
}

/**
 * 计算图表数据点（useMemo 包装）
 */
export function useChartData(params: ChartDataParams): ChartDataResult {
  const {
    isAdvanced,
    m1, v1, m2, v2, collisionTime, v1After, v2After, EkBefore, EkAfter,
    mA, vA, mB, colTimeAdv, vAAfter, vBAfter, EkBeforeAdv, EkAfterAdv,
    currentT,
  } = params

  // 基础模式曲线点集
  const baseVtDomain1 = useMemo(() => {
    if (collisionTime === Infinity) return [{ t: 0, v: v1 }, { t: 10, v: v1 }]
    return [
      { t: 0, v: v1 },
      { t: Math.max(0, collisionTime - 0.001), v: v1 },
      { t: Math.min(10, collisionTime + 0.001), v: v1After },
      { t: 10, v: v1After }
    ]
  }, [v1, collisionTime, v1After])

  const baseVtDomain2 = useMemo(() => {
    if (collisionTime === Infinity) return [{ t: 0, v: v2 }, { t: 10, v: v2 }]
    return [
      { t: 0, v: v2 },
      { t: Math.max(0, collisionTime - 0.001), v: v2 },
      { t: Math.min(10, collisionTime + 0.001), v: v2After },
      { t: 10, v: v2After }
    ]
  }, [v2, collisionTime, v2After])

  const baseEktDomain1 = useMemo(() => {
    return baseVtDomain1.map(p => ({ t: p.t, v: 0.5 * m1 * p.v * p.v }))
  }, [baseVtDomain1, m1])

  const baseEktDomain2 = useMemo(() => {
    return baseVtDomain2.map(p => ({ t: p.t, v: 0.5 * m2 * p.v * p.v }))
  }, [baseVtDomain2, m2])

  const baseEktDomainTotal = useMemo(() => {
    if (collisionTime === Infinity) return [{ t: 0, v: EkBefore }, { t: 10, v: EkBefore }]
    return [
      { t: 0, v: EkBefore },
      { t: Math.max(0, collisionTime - 0.001), v: EkBefore },
      { t: Math.min(10, collisionTime + 0.001), v: EkAfter },
      { t: 10, v: EkAfter }
    ]
  }, [collisionTime, EkBefore, EkAfter])

  // 进阶模式曲线点集
  const advVtDomain1 = useMemo(() => {
    if (colTimeAdv === Infinity) return [{ t: 0, v: vA }, { t: 10, v: vA }]
    return [
      { t: 0, v: vA },
      { t: Math.max(0, colTimeAdv - 0.001), v: vA },
      { t: Math.min(10, colTimeAdv + 0.001), v: vAAfter },
      { t: 10, v: vAAfter }
    ]
  }, [vA, colTimeAdv, vAAfter])

  const advVtDomain2 = useMemo(() => {
    if (colTimeAdv === Infinity) return [{ t: 0, v: 0 }, { t: 10, v: 0 }]
    return [
      { t: 0, v: 0 },
      { t: Math.max(0, colTimeAdv - 0.001), v: 0 },
      { t: Math.min(10, colTimeAdv + 0.001), v: vBAfter },
      { t: 10, v: vBAfter }
    ]
  }, [colTimeAdv, vBAfter])

  const advEktDomain1 = useMemo(() => {
    return advVtDomain1.map(p => ({ t: p.t, v: 0.5 * mA * p.v * p.v }))
  }, [advVtDomain1, mA])

  const advEktDomain2 = useMemo(() => {
    return advVtDomain2.map(p => ({ t: p.t, v: 0.5 * mB * p.v * p.v }))
  }, [advVtDomain2, mB])

  const advEktDomainTotal = useMemo(() => {
    if (colTimeAdv === Infinity) return [{ t: 0, v: EkBeforeAdv }, { t: 10, v: EkBeforeAdv }]
    return [
      { t: 0, v: EkBeforeAdv },
      { t: Math.max(0, colTimeAdv - 0.001), v: EkBeforeAdv },
      { t: Math.min(10, colTimeAdv + 0.001), v: EkAfterAdv },
      { t: 10, v: EkAfterAdv }
    ]
  }, [colTimeAdv, EkBeforeAdv, EkAfterAdv])

  const currentDomainVtPoints1 = isAdvanced ? advVtDomain1 : baseVtDomain1
  const currentDomainVtPoints2 = isAdvanced ? advVtDomain2 : baseVtDomain2
  const currentDomainEktPoints1 = isAdvanced ? advEktDomain1 : baseEktDomain1
  const currentDomainEktPoints2 = isAdvanced ? advEktDomain2 : baseEktDomain2
  const currentDomainEktPointsTotal = isAdvanced ? advEktDomainTotal : baseEktDomainTotal

  const currentVtPoints1 = useMemo(() => getPointsUpToTime(currentDomainVtPoints1, currentT), [currentDomainVtPoints1, currentT])
  const currentVtPoints2 = useMemo(() => getPointsUpToTime(currentDomainVtPoints2, currentT), [currentDomainVtPoints2, currentT])
  const currentEktPoints1 = useMemo(() => getPointsUpToTime(currentDomainEktPoints1, currentT), [currentDomainEktPoints1, currentT])
  const currentEktPoints2 = useMemo(() => getPointsUpToTime(currentDomainEktPoints2, currentT), [currentDomainEktPoints2, currentT])
  const currentEktPointsTotal = useMemo(() => getPointsUpToTime(currentDomainEktPointsTotal, currentT), [currentDomainEktPointsTotal, currentT])

  return {
    currentDomainVtPoints1,
    currentDomainVtPoints2,
    currentDomainEktPoints1,
    currentDomainEktPoints2,
    currentDomainEktPointsTotal,
    currentVtPoints1,
    currentVtPoints2,
    currentEktPoints1,
    currentEktPoints2,
    currentEktPointsTotal,
  }
}
