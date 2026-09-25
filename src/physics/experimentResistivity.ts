/**
 * 高考实验：测量金属丝的电阻率
 *
 * 物理公式：
 * R = ρ * L / S = ρ * 4L / (π * d^2)
 * ρ = R * π * d^2 / (4L)
 *
 * 在 R-L 图像中：
 * 斜率 k = ΔR / ΔL = 4ρ / (π * d^2)
 * 电阻率 ρ = k * π * d^2 / 4
 *
 * 误差分析：
 * - 电流表外接法（小电阻适用）：R_meas = Rx * RV / (Rx + RV) < Rx，测得 ρ 偏小；
 * - 电流表内接法（大电阻适用）：R_meas = Rx + RA > Rx，测得 ρ 偏大。
 *
 * 所有函数均为纯函数，无 React/DOM 依赖。
 */

/**
 * 计算金属丝的真实理论电阻 (Ω)
 * @param rho 电阻率 (Ω·m)，如镍铬合金约为 1.0e-6 Ω·m
 * @param L 金属丝接入有效长度 (m)
 * @param d 金属丝直径 (m)
 * @returns 真实电阻 Rx (Ω)
 */
export function calcTheoreticalResistance(rho: number, L: number, d: number): number {
  if (d <= 0) return 0
  const area = (Math.PI * d * d) / 4
  return (rho * L) / area
}

/**
 * 计算伏安法测电阻的测量值（考虑电表内阻系统误差）
 * @param Rx 金属丝真实电阻 (Ω)
 * @param wiring 接法：0 为电流表外接法，1 为电流表内接法
 * @param RV 电压表内阻 (Ω)，如 3000 Ω
 * @param RA 电流表内阻 (Ω)，如 0.5 Ω
 * @returns 测量电阻 R_meas (Ω)
 */
export function calcMeasuredResistance(
  Rx: number,
  wiring: 0 | 1,
  RV: number = 3000,
  RA: number = 0.5,
): number {
  if (wiring === 0) {
    // 外接法：电压表与待测电阻并联，电流表测总电流
    // R_meas = U / I = Rx * RV / (Rx + RV)
    return (Rx * RV) / (Rx + RV)
  } else {
    // 内接法：电流表与待测电阻串联，电压表测总电压
    // R_meas = U / I = Rx + RA
    return Rx + RA
  }
}

/**
 * 根据 R-L 图像斜率反推电阻率 ρ
 * @param slope 斜率 k = ΔR / ΔL (Ω/m)
 * @param d 金属丝直径 (m)
 * @returns 电阻率 ρ (Ω·m)
 */
export function calcResistivityFromSlope(slope: number, d: number): number {
  return (slope * Math.PI * d * d) / 4
}
