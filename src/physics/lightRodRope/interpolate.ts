import type { LRRModelState } from './types'

/**
 * 线性插值器取得指定时刻的状态。
 *
 * @param points - 预计算的轨迹点数组（按时间升序）
 * @param t - 目标时间 (s)
 * @returns 该时刻的插值状态，包含角度、角速度、能量、作用力等
 */
export function getLRRStateAtTime(
  points: LRRModelState[],
  t: number
): LRRModelState {
  if (points.length === 0) {
    return {
      t: 0, mode: 0, thetaA: 0, thetaB: 0, wA: 0, wB: 0, vA: 0, vB: 0,
      alphaA: 0, alphaB: 0, EpA: 0, EpB: 0, EkA: 0, EkB: 0, EA: 0, EB: 0, Etot: 0,
      F_A: { x: 0, y: 0 }, F_B: { x: 0, y: 0 }, powerB: 0, powerA: 0,
      x_A_rel: 0, y_A_rel: 0, x_B_rel: 0, y_B_rel: 0,
      isSlackA: false, isSlackB: false, T_A: 0, T_B: 0,
      vr: 0.0, stopReason: null,
      vAx: 0, vAy: 0, vBx: 0, vBy: 0
    }
  }
  if (t <= points[0].t) return { ...points[0] }
  if (t >= points[points.length - 1].t) return { ...points[points.length - 1] }

  let lo = 0
  let hi = points.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].t <= t) lo = mid
    else hi = mid
  }

  const p0 = points[lo]
  const p1 = points[hi]
  const ratio = (t - p0.t) / (p1.t - p0.t)

  return {
    t,
    mode: p0.mode,
    thetaA: p0.thetaA + (p1.thetaA - p0.thetaA) * ratio,
    thetaB: p0.thetaB + (p1.thetaB - p0.thetaB) * ratio,
    wA: p0.wA + (p1.wA - p0.wA) * ratio,
    wB: p0.wB + (p1.wB - p0.wB) * ratio,
    vA: p0.vA + (p1.vA - p0.vA) * ratio,
    vB: p0.vB + (p1.vB - p0.vB) * ratio,
    alphaA: p0.alphaA + (p1.alphaA - p0.alphaA) * ratio,
    alphaB: p0.alphaB + (p1.alphaB - p0.alphaB) * ratio,
    EpA: p0.EpA + (p1.EpA - p0.EpA) * ratio,
    EpB: p0.EpB + (p1.EpB - p0.EpB) * ratio,
    EkA: p0.EkA + (p1.EkA - p0.EkA) * ratio,
    EkB: p0.EkB + (p1.EkB - p0.EkB) * ratio,
    EA: p0.EA + (p1.EA - p0.EA) * ratio,
    EB: p0.EB + (p1.EB - p0.EB) * ratio,
    Etot: p0.Etot + (p1.Etot - p0.Etot) * ratio,
    F_A: {
      x: p0.F_A.x + (p1.F_A.x - p0.F_A.x) * ratio,
      y: p0.F_A.y + (p1.F_A.y - p0.F_A.y) * ratio,
    },
    F_B: {
      x: p0.F_B.x + (p1.F_B.x - p0.F_B.x) * ratio,
      y: p0.F_B.y + (p1.F_B.y - p0.F_B.y) * ratio,
    },
    F_A_radial: {
      x: (p0.F_A_radial?.x ?? 0) + ((p1.F_A_radial?.x ?? 0) - (p0.F_A_radial?.x ?? 0)) * ratio,
      y: (p0.F_A_radial?.y ?? 0) + ((p1.F_A_radial?.y ?? 0) - (p0.F_A_radial?.y ?? 0)) * ratio,
    },
    F_A_tangential: {
      x: (p0.F_A_tangential?.x ?? 0) + ((p1.F_A_tangential?.x ?? 0) - (p0.F_A_tangential?.x ?? 0)) * ratio,
      y: (p0.F_A_tangential?.y ?? 0) + ((p1.F_A_tangential?.y ?? 0) - (p0.F_A_tangential?.y ?? 0)) * ratio,
    },
    F_B_radial: {
      x: (p0.F_B_radial?.x ?? 0) + ((p1.F_B_radial?.x ?? 0) - (p0.F_B_radial?.x ?? 0)) * ratio,
      y: (p0.F_B_radial?.y ?? 0) + ((p1.F_B_radial?.y ?? 0) - (p0.F_B_radial?.y ?? 0)) * ratio,
    },
    F_B_tangential: {
      x: (p0.F_B_tangential?.x ?? 0) + ((p1.F_B_tangential?.x ?? 0) - (p0.F_B_tangential?.x ?? 0)) * ratio,
      y: (p0.F_B_tangential?.y ?? 0) + ((p1.F_B_tangential?.y ?? 0) - (p0.F_B_tangential?.y ?? 0)) * ratio,
    },
    powerB: p0.powerB + (p1.powerB - p0.powerB) * ratio,
    powerA: p0.powerA + (p1.powerA - p0.powerA) * ratio,
    x_A_rel: p0.x_A_rel + (p1.x_A_rel - p0.x_A_rel) * ratio,
    y_A_rel: p0.y_A_rel + (p1.y_A_rel - p0.y_A_rel) * ratio,
    x_B_rel: p0.x_B_rel + (p1.x_B_rel - p0.x_B_rel) * ratio,
    y_B_rel: p0.y_B_rel + (p1.y_B_rel - p0.y_B_rel) * ratio,
    isSlackA: ratio < 0.5 ? p0.isSlackA : p1.isSlackA,
    isSlackB: ratio < 0.5 ? p0.isSlackB : p1.isSlackB,
    T_A: p0.T_A + (p1.T_A - p0.T_A) * ratio,
    T_B: p0.T_B + (p1.T_B - p0.T_B) * ratio,
    eventA: p0.eventA || p1.eventA,
    eventB: p0.eventB || p1.eventB,
    vr: p0.vr + (p1.vr - p0.vr) * ratio,
    stopReason: p1.stopReason || p0.stopReason,
    vAx: p0.vAx + (p1.vAx - p0.vAx) * ratio,
    vAy: p0.vAy + (p1.vAy - p0.vAy) * ratio,
    vBx: p0.vBx + (p1.vBx - p0.vBx) * ratio,
    vBy: p0.vBy + (p1.vBy - p0.vBy) * ratio
  }
}
