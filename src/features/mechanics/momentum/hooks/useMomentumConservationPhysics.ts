/**
 * useMomentumConservationPhysics.ts
 * 动量守恒动画 view model：碰撞检测、位置/速度计算、图表数据点
 *
 * 零 JSX，纯数据计算，可独立单测
 */
import { useMemo } from 'react'
import { getPointsUpToTime, PX_PER_METER } from '@/utils'
import { physicsToCanvasWithOrigin } from '@/utils/coordinate'
import {
  calculateCollisionVelocities,
  calculateCommonVelocity,
  calculateCommonVelocityTime,
} from '@/physics/momentumConservation'

/** 动量守恒动画布局常量 */
export const MC_LAYOUT = {
  canvasPadding: 30,
  ballBaseRadius: 16,
  massRadiusScale: 2,
  vectorMaxLength: 80,
  /** 木板高度 (px) */
  boardHeight: 18,
  /** 滑块高度 (px) */
  sliderHeight: 28,
  /** 滑块宽度 (px) */
  sliderWidth: 40,
  /** 动量条最大长度 (px) */
  momentumBarMaxLength: 120,
  /** 重力加速度 (m/s²) */
  g: 9.8,
} as const

// ─── 基础模式（两球碰撞）──────────────────────────────────────────────────

interface BasicModeParams {
  m1: number
  v1: number
  m2: number
  v2: number
  collisionType: number
  e_coefficient: number
  time: number
  groundY: number
  designWidth: number
}

interface BasicModeResult {
  R_A: number
  R_B: number
  posAx: number
  posBx: number
  currentV1: number
  currentV2: number
  collisionTime: number
  v1After: number
  v2After: number
}

/**
 * 计算基础模式（两球碰撞）的位置与速度状态
 */
function computeBasicMode(p: BasicModeParams): BasicModeResult {
  const { m1, v1, m2, v2, collisionType, e_coefficient, time, groundY, designWidth } = p

  const R_A = MC_LAYOUT.ballBaseRadius + m1 * MC_LAYOUT.massRadiusScale
  const R_B = MC_LAYOUT.ballBaseRadius + m2 * MC_LAYOUT.massRadiusScale

  const initPosAx = designWidth * 0.28
  const initPosBx = designWidth * 0.58

  const rPhysA = R_A / PX_PER_METER
  const rPhysB = R_B / PX_PER_METER
  const initPhysX_A = 0
  const initPhysX_B = (initPosBx - initPosAx) / PX_PER_METER

  let eVal = 1.0
  if (collisionType === 1) eVal = 0.0
  else if (collisionType === 2) eVal = e_coefficient

  const approachSpeed = v1 - v2
  const gapPhys = initPhysX_B - rPhysB - (initPhysX_A + rPhysA)
  let collisionTime = Infinity
  let v1After = v1
  let v2After = v2

  if (approachSpeed > 0 && gapPhys > 0) {
    collisionTime = gapPhys / approachSpeed
    const { v1After: v1A, v2After: v2A } = calculateCollisionVelocities(m1, v1, m2, v2, eVal)
    v1After = v1A
    v2After = v2A
  }

  let xPhysA = 0
  let xPhysB = initPhysX_B
  let currentV1 = v1
  let currentV2 = v2

  if (time < collisionTime) {
    xPhysA = initPhysX_A + v1 * time
    xPhysB = initPhysX_B + v2 * time
  } else {
    const dt = time - collisionTime
    const colXPhysA = initPhysX_A + v1 * collisionTime
    const colXPhysB = initPhysX_B + v2 * collisionTime
    xPhysA = colXPhysA + v1After * dt
    xPhysB = colXPhysB + v2After * dt
    currentV1 = v1After
    currentV2 = v2After
  }

  const { cx: rawPosAx } = physicsToCanvasWithOrigin(xPhysA, 0, initPosAx, groundY, PX_PER_METER)
  const { cx: rawPosBx } = physicsToCanvasWithOrigin(xPhysB, 0, initPosAx, groundY, PX_PER_METER)

  const leftBound = MC_LAYOUT.canvasPadding + R_A
  const rightBound = designWidth - MC_LAYOUT.canvasPadding - R_B
  const posAx = Math.max(leftBound, Math.min(rightBound + R_B - R_A, rawPosAx))
  const posBx = Math.max(leftBound - R_A + R_B, Math.min(rightBound, rawPosBx))

  return { R_A, R_B, posAx, posBx, currentV1, currentV2, collisionTime, v1After, v2After }
}

// ─── 进阶模式（滑块-木板）────────────────────────────────────────────────

interface AdvancedModeParams {
  m_slider: number
  M_board: number
  v0: number
  mu: number
  L: number
  time: number
  groundY: number
  designWidth: number
}

interface AdvancedModeResult {
  boardPixelX: number
  sliderPixelX: number
  boardTopY: number
  sliderTopY: number
  boardPixelW: number
  currentVSlider: number
  currentVBoard: number
  currentDeltaX: number
  sliderOffBoard: boolean
  vCommon: number
  tCommon: number
  isFallen: boolean
  /** 滑块滑落前的速度 (m/s) */
  vSliderFall: number
  /** 木板在滑块滑落瞬间的速度 (m/s) */
  vBoardFall: number
  tFall: number
  /** 质心在 canvas 上的 x 坐标 (px) */
  centerOfMassX: number
}

/**
 * 计算进阶模式（滑块-木板）的位置与速度状态
 */
function computeAdvancedMode(p: AdvancedModeParams): AdvancedModeResult {
  const { m_slider, M_board, v0, mu, L, time, groundY, designWidth } = p
  const g = MC_LAYOUT.g

  const vCommon = calculateCommonVelocity(m_slider, v0, M_board)
  const a_rel = mu * g * (1 + m_slider / M_board)
  const tCommon = calculateCommonVelocityTime(M_board, vCommon, mu, m_slider, g)

  const x1AtCommon = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
  const x2AtCommon = 0.5 * (mu * m_slider * g / M_board) * tCommon * tCommon
  const deltaXAtCommon = x1AtCommon - x2AtCommon
  const isFallen = deltaXAtCommon > L

  let tFall = Infinity
  let vSliderFall = v0
  let vBoardFall = 0
  let x1AtFall = 0
  let x2AtFall = 0

  if (isFallen) {
    tFall = (v0 - Math.sqrt(v0 * v0 - 2 * a_rel * L)) / a_rel
    vSliderFall = v0 - mu * g * tFall
    vBoardFall = (mu * m_slider * g / M_board) * tFall
    x1AtFall = v0 * tFall - 0.5 * mu * g * tFall * tFall
    x2AtFall = 0.5 * (mu * m_slider * g / M_board) * tFall * tFall
  }

  let currentXSlider = 0
  let currentXBoard = 0
  let currentVSlider = 0
  let currentVBoard = 0
  let sliderOffBoard = false
  let yOffset = 0

  const tDrop = 0.4

  if (isFallen) {
    if (time < tFall) {
      currentVSlider = v0 - mu * g * time
      currentVBoard = (mu * m_slider * g / M_board) * time
      currentXSlider = v0 * time - 0.5 * mu * g * time * time
      currentXBoard = 0.5 * (mu * m_slider * g / M_board) * time * time
    } else {
      currentVSlider = vSliderFall
      currentVBoard = vBoardFall
      currentXSlider = x1AtFall + vSliderFall * (time - tFall)
      currentXBoard = x2AtFall + vBoardFall * (time - tFall)
      sliderOffBoard = true

      const dtFall = time - tFall
      if (dtFall < tDrop) {
        yOffset = MC_LAYOUT.boardHeight * (dtFall / tDrop) * (dtFall / tDrop)
      } else {
        yOffset = MC_LAYOUT.boardHeight
      }
    }
  } else {
    if (time < tCommon) {
      currentVSlider = v0 - mu * g * time
      currentVBoard = (mu * m_slider * g / M_board) * time
      currentXSlider = v0 * time - 0.5 * mu * g * time * time
      currentXBoard = 0.5 * (mu * m_slider * g / M_board) * time * time
    } else {
      currentVSlider = vCommon
      currentVBoard = vCommon
      currentXSlider = x1AtCommon + vCommon * (time - tCommon)
      currentXBoard = x2AtCommon + vCommon * (time - tCommon)
    }
  }

  const currentDeltaX = Math.min(currentXSlider - currentXBoard, L)

  const boardInitX = designWidth * 0.28
  const { cx: boardPixelX } = physicsToCanvasWithOrigin(currentXBoard, 0, boardInitX, groundY, PX_PER_METER)
  const { cx: sliderPixelX } = physicsToCanvasWithOrigin(currentXSlider, 0, boardInitX, groundY, PX_PER_METER)
  const boardPixelW = L * PX_PER_METER

  const boardTopY = groundY - MC_LAYOUT.boardHeight
  const sliderTopY = boardTopY - MC_LAYOUT.sliderHeight + yOffset

  const centerOfMassX = boardInitX + (m_slider * v0 * time) / (m_slider + M_board) * PX_PER_METER

  return {
    boardPixelX, sliderPixelX, boardTopY, sliderTopY, boardPixelW,
    currentVSlider, currentVBoard, currentDeltaX, sliderOffBoard,
    vCommon, tCommon, isFallen,
    vSliderFall, vBoardFall, tFall,
    centerOfMassX,
  }
}

// ─── 主 Hook ──────────────────────────────────────────────────────────────

export interface MomentumConservationPhysics {
  // 基础模式
  basic: BasicModeResult
  // 进阶模式
  advanced: AdvancedModeResult
  // 当前模式选择
  isAdvanced: boolean
  // 图表数据
  chartData: {
    currentDomainVtPoints1: { t: number; v: number }[]
    currentDomainVtPoints2: { t: number; v: number }[]
    currentDomainPtPoints1: { t: number; v: number }[]
    currentDomainPtPoints2: { t: number; v: number }[]
    currentDomainPtPointsTotal: { t: number; v: number }[]
    currentVtPoints1: { t: number; v: number }[]
    currentVtPoints2: { t: number; v: number }[]
    currentPtPoints1: { t: number; v: number }[]
    currentPtPoints2: { t: number; v: number }[]
    currentPtPointsTotal: { t: number; v: number }[]
  }
  // 动量条数据
  p1: number
  p2: number
  pTotal: number
  mapArrowLen: (val: number) => number
  mapMomentumBar: (p: number) => number
}

/**
 * 动量守恒动画物理计算 Hook
 *
 * @param params 动画参数
 * @param time 当前时间
 */
export function useMomentumConservationPhysics(
  params: Record<string, number>,
  time: number,
  groundY: number,
  designWidth: number,
): MomentumConservationPhysics {
  const {
    m1 = 3, v1 = 5,
    m2 = 2, v2 = 0,
    m_slider = 1, M_board = 3, v0 = 6, mu = 0.3, L = 2,
    advancedMode = 0,
    collisionType = 0,
    e_coefficient = 0.5,
  } = params

  const isAdvanced = advancedMode === 1

  // ── 基础模式计算 ──
  const basic = useMemo(
    () => computeBasicMode({ m1, v1, m2, v2, collisionType, e_coefficient, time, groundY, designWidth }),
    [m1, v1, m2, v2, collisionType, e_coefficient, time, groundY, designWidth]
  )

  // ── 进阶模式计算 ──
  const advanced = useMemo(
    () => computeAdvancedMode({ m_slider, M_board, v0, mu, L, time, groundY, designWidth }),
    [m_slider, M_board, v0, mu, L, time, groundY, designWidth]
  )

  // ── 图表数据 ──
  const chartData = useMemo(() => {
    const { collisionTime, v1After, v2After } = basic
    const { vCommon, tCommon, isFallen, vSliderFall, vBoardFall, tFall } = advanced

    // 基础模式 V-T 点集
    const baseVtDomain1 = collisionTime === Infinity
      ? [{ t: 0, v: v1 }, { t: 10, v: v1 }]
      : [
        { t: 0, v: v1 },
        { t: Math.max(0, collisionTime - 0.001), v: v1 },
        { t: Math.min(10, collisionTime + 0.001), v: v1After },
        { t: 10, v: v1After },
      ]

    const baseVtDomain2 = collisionTime === Infinity
      ? [{ t: 0, v: v2 }, { t: 10, v: v2 }]
      : [
        { t: 0, v: v2 },
        { t: Math.max(0, collisionTime - 0.001), v: v2 },
        { t: Math.min(10, collisionTime + 0.001), v: v2After },
        { t: 10, v: v2After },
      ]

    const basePtDomain1 = baseVtDomain1.map(p => ({ t: p.t, v: m1 * p.v }))
    const basePtDomain2 = baseVtDomain2.map(p => ({ t: p.t, v: m2 * p.v }))
    const basePtDomainTotal = [{ t: 0, v: m1 * v1 + m2 * v2 }, { t: 10, v: m1 * v1 + m2 * v2 }]

    // 进阶模式 V-T 点集
    const advVtDomain1 = isFallen
      ? [{ t: 0, v: v0 }, { t: tFall, v: vSliderFall }, { t: 10, v: vSliderFall }]
      : [{ t: 0, v: v0 }, { t: tCommon, v: vCommon }, { t: 10, v: vCommon }]

    const advVtDomain2 = isFallen
      ? [{ t: 0, v: 0 }, { t: tFall, v: vBoardFall }, { t: 10, v: vBoardFall }]
      : [{ t: 0, v: 0 }, { t: tCommon, v: vCommon }, { t: 10, v: vCommon }]

    const advPtDomain1 = advVtDomain1.map(p => ({ t: p.t, v: m_slider * p.v }))
    const advPtDomain2 = advVtDomain2.map(p => ({ t: p.t, v: M_board * p.v }))
    const advPtDomainTotal = [{ t: 0, v: m_slider * v0 }, { t: 10, v: m_slider * v0 }]

    // 选择当前数据集
    const currentDomainVtPoints1 = isAdvanced ? advVtDomain1 : baseVtDomain1
    const currentDomainVtPoints2 = isAdvanced ? advVtDomain2 : baseVtDomain2
    const currentDomainPtPoints1 = isAdvanced ? advPtDomain1 : basePtDomain1
    const currentDomainPtPoints2 = isAdvanced ? advPtDomain2 : basePtDomain2
    const currentDomainPtPointsTotal = isAdvanced ? advPtDomainTotal : basePtDomainTotal

    // 动态截断
    const currentVtPoints1 = getPointsUpToTime(currentDomainVtPoints1, time)
    const currentVtPoints2 = getPointsUpToTime(currentDomainVtPoints2, time)
    const currentPtPoints1 = getPointsUpToTime(currentDomainPtPoints1, time)
    const currentPtPoints2 = getPointsUpToTime(currentDomainPtPoints2, time)
    const currentPtPointsTotal = getPointsUpToTime(currentDomainPtPointsTotal, time)

    return {
      currentDomainVtPoints1, currentDomainVtPoints2,
      currentDomainPtPoints1, currentDomainPtPoints2, currentDomainPtPointsTotal,
      currentVtPoints1, currentVtPoints2,
      currentPtPoints1, currentPtPoints2, currentPtPointsTotal,
    }
  }, [basic, advanced, isAdvanced, m1, v1, m2, v2, m_slider, M_board, v0, time])

  // ── 矢量/动量条映射 ──
  const vMaxRef = 10
  const mapArrowLen = (val: number) => (Math.abs(val) / vMaxRef) * MC_LAYOUT.vectorMaxLength

  const p1 = m1 * basic.currentV1
  const p2 = m2 * basic.currentV2
  const pTotal = isAdvanced ? m_slider * v0 : m1 * v1 + m2 * v2
  const pMaxRef = 10 * 10
  const mapMomentumBar = (p: number) => (Math.abs(p) / pMaxRef) * MC_LAYOUT.momentumBarMaxLength

  return { basic, advanced, isAdvanced, chartData, p1, p2, pTotal, mapArrowLen, mapMomentumBar }
}
