import { useMemo } from 'react'
import { computeDualRodsStateAtTime } from '@/physics'
import { computeScale, physicsToCanvasWithOrigin } from '@/utils/coordinate'
import type { CanvasSize } from '@/utils/useCanvasSize'

const DUAL_RODS_WORLD = { xMin: -3.0, xMax: 3.0, yMin: -1.4, yMax: 1.4 } as const

export interface DualRodsParams {
  scenario: number
  massA: number
  massB: number
  fieldB: number
  railL: number
  resSum: number
  initialV0: number
  appliedForce: number
}

export interface DualRodsPhysicsResult {
  currentVA: number
  currentVB: number
  currentDeltaV: number
  currentEmf: number
  currentI: number
  forceAmpere: number
  totalMomentum: number
  posA: number
  posB: number
  scale: number
  originX: number
  originY: number
  T_max: number
  vtPointsA: Array<{ t: number; v: number }>
  vtPointsB: Array<{ t: number; v: number }>
  ptPoints: Array<{ x: number; y: number }>
  vMax: number
  pMax: number
}

export function useDualRodsPhysics(
  params: DualRodsParams,
  canvasSize: CanvasSize,
  time: number
): DualRodsPhysicsResult {
  const { scenario, massA, massB, fieldB, railL, resSum, initialV0, appliedForce } = params

  // 1. 根据画布分辨率 (默认 splitV = 700x325) 和物理世界边界计算标准物理比例尺 scale
  const scale = useMemo(
    () => computeScale(canvasSize.width, canvasSize.height, DUAL_RODS_WORLD, 40),
    [canvasSize.width, canvasSize.height]
  )
  const originX = canvasSize.width / 2
  const originY = canvasSize.height / 2

  // 阻尼系数 k = (B^2 L^2 / R) * (mA+mB)/(mA*mB)
  const totalMass = massA + massB
  const k = (fieldB * fieldB * railL * railL / resSum) * (totalMass / (massA * massB))
  const tau = 1 / k
  // 采样最大周期 T_max
  const T_max = useMemo(() => Math.max(6.0, Math.min(15.0, 4.5 * tau)), [tau])

  // 生成顶部图表所需的历史采样点序列
  const { vtPointsA, vtPointsB, ptPoints, vMax, pMax } = useMemo(() => {
    const ptsA: Array<{ t: number; v: number }> = []
    const ptsB: Array<{ t: number; v: number }> = []
    const ptsP: Array<{ x: number; y: number }> = []
    const count = 100
    let maxV = 1.0
    let maxP = 1.0

    for (let i = 0; i <= count; i++) {
      const tVal = (i / count) * T_max
      const state = computeDualRodsStateAtTime(
        tVal, scenario, initialV0, appliedForce, fieldB, railL, resSum, massA, massB
      )
      ptsA.push({ t: tVal, v: state.vA })
      ptsB.push({ t: tVal, v: state.vB })
      ptsP.push({ x: tVal, y: state.totalMomentum })

      if (Math.abs(state.vA) > maxV) maxV = Math.abs(state.vA)
      if (Math.abs(state.vB) > maxV) maxV = Math.abs(state.vB)
      if (Math.abs(state.totalMomentum) > maxP) maxP = Math.abs(state.totalMomentum)
    }

    return {
      vtPointsA: ptsA,
      vtPointsB: ptsB,
      ptPoints: ptsP,
      vMax: maxV * 1.15,
      pMax: maxP * 1.25,
    }
  }, [T_max, scenario, initialV0, appliedForce, fieldB, railL, resSum, massA, massB])

  // 计算瞬时物理量
  const stateAtT = useMemo(
    () => computeDualRodsStateAtTime(
      time, scenario, initialV0, appliedForce, fieldB, railL, resSum, massA, massB
    ),
    [time, scenario, initialV0, appliedForce, fieldB, railL, resSum, massA, massB]
  )

  // 2. 物理世界相对位移到画布像素坐标的标准映射
  // 设两棒初始物理相对中心位置为：b棒位于 x=-0.6m，a棒位于 x=+0.6m (间距 1.2 米)
  // 随着差分位移发生，相对间距动态演变
  const { posA, posB } = useMemo(() => {
    const deltaX = stateAtT.xA - stateAtT.xB
    const halfGap = 0.5 + Math.min(1.8, Math.abs(deltaX) * 0.4)
    const physXA = halfGap
    const physXB = -halfGap

    const ptA = physicsToCanvasWithOrigin(physXA, 0, originX, originY, scale)
    const ptB = physicsToCanvasWithOrigin(physXB, 0, originX, originY, scale)
    return {
      posA: ptA.cx,
      posB: ptB.cx,
    }
  }, [stateAtT.xA, stateAtT.xB, originX, originY, scale])

  return {
    currentVA: stateAtT.vA,
    currentVB: stateAtT.vB,
    currentDeltaV: stateAtT.deltaV,
    currentEmf: stateAtT.emf,
    currentI: stateAtT.currentI,
    forceAmpere: stateAtT.forceAmpere,
    totalMomentum: stateAtT.totalMomentum,
    posA,
    posB,
    scale,
    originX,
    originY,
    T_max,
    vtPointsA,
    vtPointsB,
    ptPoints,
    vMax,
    pMax,
  }
}
