/**
 * 狭义相对论物理计算纯函数
 *
 * 涵盖：
 * 1. 洛伦兹因子 γ = 1 / sqrt(1 - β^2)
 * 2. 时间延缓（动钟变慢）Δt = γ * Δτ
 * 3. 长度收缩（动尺收缩）l = l0 / γ
 * 4. 质能方程与质速关系 m = γ * m0, E = m * c^2
 * 5. 相对论速度合成定理
 *
 * 所有函数均为纯函数，无 React/DOM 依赖。
 */

/** 光速常数 c (m/s) */
export const SPEED_OF_LIGHT = 299792458

/**
 * 计算洛伦兹因子 γ (无量纲)
 * @param beta 速度与光速之比 v/c，必须满足 0 <= beta < 1
 * @returns 洛伦兹因子 γ >= 1
 */
export function calcLorentzFactor(beta: number): number {
  const b = Math.min(Math.max(beta, 0), 0.9999)
  return 1 / Math.sqrt(1 - b * b)
}

/**
 * 计算时间延缓（动钟变慢）
 * 静止在运动参考系中的时钟测得的固有时间为 tau0，
 * 地面参考系测得的经过时间为 t = γ * tau0
 * @param tau0 固有时间（秒，s）
 * @param beta 速度与光速比 v/c
 * @returns 地面参考系时间（秒，s）
 */
export function calcTimeDilation(tau0: number, beta: number): number {
  return tau0 * calcLorentzFactor(beta)
}

/**
 * 计算长度收缩（动尺变短）
 * 物体在自身静止系中的固有长度为 l0，
 * 地面参考系测得沿运动方向的长度为 l = l0 / γ = l0 * sqrt(1 - β^2)
 * @param l0 固有长度（米，m）
 * @param beta 速度与光速比 v/c
 * @returns 沿运动方向收缩后的长度（米，m）
 */
export function calcLengthContraction(l0: number, beta: number): number {
  return l0 / calcLorentzFactor(beta)
}

/**
 * 计算相对论质能关系
 * @param m0 静止质量（千克，kg）
 * @param beta 速度与光速比 v/c
 * @returns { relativisticMass, restEnergy, totalEnergy, kineticEnergy } 单位均为 SI 标准单位
 */
export function calcRelativisticEnergy(
  m0: number,
  beta: number,
  c: number = SPEED_OF_LIGHT,
): {
  gamma: number
  relativisticMass: number
  restEnergy: number
  totalEnergy: number
  kineticEnergy: number
} {
  const gamma = calcLorentzFactor(beta)
  const relativisticMass = gamma * m0
  const c2 = c * c
  const restEnergy = m0 * c2
  const totalEnergy = relativisticMass * c2
  const kineticEnergy = totalEnergy - restEnergy

  return {
    gamma,
    relativisticMass,
    restEnergy,
    totalEnergy,
    kineticEnergy,
  }
}

/**
 * 相对论一维速度合成公式
 * u = (v1 + v2) / (1 + v1 * v2 / c^2)
 * @param v1 速度1与光速比 (u'/c)
 * @param v2 速度2与光速比 (v/c)
 * @returns 合成后速度与光速比 (u/c)
 */
export function calcRelativisticVelocityAddition(v1: number, v2: number): number {
  const denom = 1 + v1 * v2
  if (Math.abs(denom) < 1e-12) return 1
  const result = (v1 + v2) / denom
  return Math.min(Math.max(result, -0.9999), 0.9999)
}
