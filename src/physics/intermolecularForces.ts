/**
 * 分子间作用力 — 纯物理计算模块。
 *
 * 采用简化 Lennard-Jones 势模型：
 * - 斥力：F_斥 = A / r^13
 * - 引力：F_引 = B / r^7
 * - 合力：F_合 = F_斥 - F_引（正值=斥力，负值=引力）
 * - 势能：E_p = A' / r^12 - B' / r^6
 *
 * 所有距离以 r_0（平衡距离）为归一化单位。
 */

/** 斥力系数常数 */
const A_DEFAULT = 1.0

/** 引力系数常数（由 r_0=1 时 F_合=0 确定：A/r0^13 = B/r0^7 → B = A/r0^6 = A） */
const B_DEFAULT = 1.0

/**
 * 斥力大小（正值）。
 * @param r - 分子间距（以 r_0 为单位）
 * @param A - 斥力系数
 * @returns 斥力大小，单位 N（归一化）
 */
export function repulsiveForce(r: number, A: number = A_DEFAULT): number {
  if (r <= 0) return Infinity
  return A / Math.pow(r, 13)
}

/**
 * 引力大小（正值）。
 * @param r - 分子间距（以 r_0 为单位）
 * @param B - 引力系数
 * @returns 引力大小，单位 N（归一化）
 */
export function attractiveForce(r: number, B: number = B_DEFAULT): number {
  if (r <= 0) return Infinity
  return B / Math.pow(r, 7)
}

/**
 * 合力（正值=斥力，负值=引力）。
 * @param r - 分子间距（以 r_0 为单位）
 * @param A - 斥力系数
 * @param B - 引力系数
 * @returns 合力，正值表示斥力，负值表示引力
 */
export function netMolecularForce(
  r: number,
  A: number = A_DEFAULT,
  B: number = B_DEFAULT,
): number {
  return repulsiveForce(r, A) - attractiveForce(r, B)
}

/**
 * 分子势能（以 r→∞ 时 E_p=0 为参考）。
 * @param r - 分子间距（以 r_0 为单位）
 * @param A - 斥力系数
 * @param B - 引力系数
 * @returns 分子势能，单位 J（归一化）
 */
export function molecularPotentialEnergy(
  r: number,
  A: number = A_DEFAULT,
  B: number = B_DEFAULT,
): number {
  if (r <= 0) return Infinity
  // E_p = A' / r^12 - B' / r^6，其中 A' = A/12, B' = B/6
  const Ap = A / 12
  const Bp = B / 6
  return Ap / Math.pow(r, 12) - Bp / Math.pow(r, 6)
}

/**
 * 求平衡距离 r_0（F_合=0 的根，二分法）。
 * @param A - 斥力系数
 * @param B - 引力系数
 * @returns 平衡距离 r_0（以 r_0 为单位，理论值为 1.0）
 */
export function findEquilibriumDistance(
  A: number = A_DEFAULT,
  B: number = B_DEFAULT,
): number {
  let lo = 0.1
  let hi = 10.0

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const fMid = netMolecularForce(mid, A, B)
    if (Math.abs(fMid) < 1e-12) return mid
    if (fMid > 0) {
      hi = mid
    } else {
      lo = mid
    }
  }
  return (lo + hi) / 2
}
