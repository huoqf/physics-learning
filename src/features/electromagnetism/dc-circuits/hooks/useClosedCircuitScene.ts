import { useMemo } from 'react'

/** 回路几何常量（基于 viewBox 0 0 840 400，与 ClosedCircuit.tsx LAYOUT 保持一致） */
const LOOP = {
  left: 150,
  top: 100,
  right: 550,
  bottom: 300,
  batteryStart: 250,
  batteryEnd: 450,
  perimeter: 1200,
} as const

/** 各段长度 */
const SEG_LEN = {
  posToCorner: 100,
  vertical: 200,
  horizontal: 400,
  negToCorner: 100,
  battery: 200,
} as const

/** 电荷粒子数量 */
const NUM_CHARGES = 26

/** 电荷流速因子（px/s per A） */
const CHARGE_SPEED_FACTOR = 120

/**
 * 计算闭合回路中某一位置对应的坐标。
 * 回路为矩形，电源内部泵送。
 */
function getLoopPosition(pos: number): { x: number; y: number } {
  let p = pos % LOOP.perimeter
  if (p < 0) p += LOOP.perimeter

  // 段 1: 电源右端正极向右到右下角 [长度 100]
  if (p < SEG_LEN.posToCorner) {
    return { x: LOOP.batteryEnd + p, y: LOOP.bottom }
  }
  p -= SEG_LEN.posToCorner

  // 段 2: 右下角向上到右上角 [长度 200]
  if (p < SEG_LEN.vertical) {
    return { x: LOOP.right, y: LOOP.bottom - p }
  }
  p -= SEG_LEN.vertical

  // 段 3: 右上角向左到左上角 [长度 400]
  if (p < SEG_LEN.horizontal) {
    return { x: LOOP.right - p, y: LOOP.top }
  }
  p -= SEG_LEN.horizontal

  // 段 4: 左上角向下到左下角 [长度 200]
  if (p < SEG_LEN.vertical) {
    return { x: LOOP.left, y: LOOP.top + p }
  }
  p -= SEG_LEN.vertical

  // 段 5: 左下角到电源左端负极 [长度 100]
  if (p < SEG_LEN.negToCorner) {
    return { x: LOOP.left + p, y: LOOP.bottom }
  }
  p -= SEG_LEN.negToCorner

  // 段 6: 电源内部泵送 [长度 200]
  return { x: LOOP.batteryStart + p, y: LOOP.bottom }
}

export interface ClosedCircuitScene {
  /** 电荷粒子坐标数组 */
  chargeParticles: { x: number; y: number }[]
  /** 内阻发热高亮透明度 [0, 0.75] */
  heatOpacity: number
}

/**
 * 闭合电路欧姆定律场景动画 hook。
 *
 * 职责：
 * 1. 计算回路中电荷粒子的实时位置（流速与电流成正比）
 * 2. 计算内阻发热遮罩的实时透明度
 */
export function useClosedCircuitScene(
  I: number,
  time: number,
  highlightLoss: boolean
): ClosedCircuitScene {
  const chargeParticles = useMemo(() => {
    return Array.from({ length: NUM_CHARGES }, (_, idx) => {
      const pos =
        (idx * (LOOP.perimeter / NUM_CHARGES) + time * CHARGE_SPEED_FACTOR * I) %
        LOOP.perimeter
      return getLoopPosition(pos)
    })
  }, [I, time])

  const heatOpacity = useMemo(() => {
    return highlightLoss ? Math.min(0.75, I * 0.15) : 0
  }, [I, highlightLoss])

  return { chargeParticles, heatOpacity }
}
