/**
 * src/physics/momentum.ts
 * 动量（Momentum）纯物理计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m/s, kg·m/s, J）
 */

// ─── 基础模式（单球）────────────────────────────────────────────────────────

/**
 * 计算单球动量
 * p = m·v
 *
 * @param m 物体质量 (kg)，必须 > 0
 * @param v 物体速度大小 (m/s)，必须 ≥ 0
 * @returns p 动量大小 (kg·m/s)
 */
export function calculateMomentumScalar(m: number, v: number): number {
  return m * v
}

/**
 * 计算单球动能
 * E_k = p² / (2m) = ½mv²
 *
 * @param p 动量大小 (kg·m/s)
 * @param m 物体质量 (kg)，必须 > 0
 * @returns E_k 动能 (J)
 */
export function kineticEnergyFromMomentum(p: number, m: number): number {
  return (p * p) / (2 * m)
}

// ─── 进阶模式（双球一维对冲）────────────────────────────────────────────────

/**
 * 计算双球一维动量
 * p = m·v（带正负号，正方向为 x 轴正方向）
 *
 * @param m 物体质量 (kg)，必须 > 0
 * @param v 物体速度 (m/s)，带正负号
 * @returns p 动量 (kg·m/s)，带正负号
 */
export function calculateMomentum1D(m: number, v: number): number {
  return m * v
}

/**
 * 计算系统总动量（一维）
 * p_total = p_A + p_B
 *
 * @param pA A球动量 (kg·m/s)
 * @param pB B球动量 (kg·m/s)
 * @returns p_total 系统总动量 (kg·m/s)
 */
export function calculateTotalMomentum(pA: number, pB: number): number {
  return pA + pB
}

/**
 * 计算质心位置（一维）
 * x_cm = (m_A·x_A + m_B·x_B) / (m_A + m_B)
 *
 * @param mA A球质量 (kg)
 * @param xA A球位置 (m)
 * @param mB B球质量 (kg)
 * @param xB B球位置 (m)
 * @returns x_cm 质心位置 (m)
 */
export function calculateCenterOfMass(
  mA: number, xA: number,
  mB: number, xB: number
): number {
  return (mA * xA + mB * xB) / (mA + mB)
}

/**
 * 计算质心速度（一维）
 * v_cm = p_total / (m_A + m_B)
 *
 * @param pTotal 系统总动量 (kg·m/s)
 * @param mA A球质量 (kg)
 * @param mB B球质量 (kg)
 * @returns v_cm 质心速度 (m/s)
 */
export function calculateCenterOfMassVelocity(
  pTotal: number,
  mA: number,
  mB: number
): number {
  return pTotal / (mA + mB)
}

/**
 * 动量-动能关系图数据点
 * E_k = p² / (2m)，保持 p 不变，变化 m
 *
 * @param p 固定动量 (kg·m/s)
 * @param mMin 质量下限 (kg)
 * @param mMax 质量上限 (kg)
 * @param steps 采样点数
 * @returns [{ m, Ek }] 质量与动能对应关系
 */
export function generateMomentumEnergyCurve(
  p: number,
  mMin: number,
  mMax: number,
  steps: number = 20
): Array<{ m: number; Ek: number }> {
  const result: Array<{ m: number; Ek: number }> = []
  const dm = (mMax - mMin) / steps
  for (let i = 0; i <= steps; i++) {
    const m = mMin + dm * i
    result.push({ m, Ek: kineticEnergyFromMomentum(p, m) })
  }
  return result
}

// ─── 弹性碰撞 ─────────────────────────────────────────────────────────────

/**
 * 计算一维弹性碰撞后速度（动量守恒 + 动能守恒）
 *
 * v_A' = ((m_A - m_B)·v_A + 2·m_B·v_B) / (m_A + m_B)
 * v_B' = ((m_B - m_A)·v_B + 2·m_A·v_A) / (m_A + m_B)
 *
 * @param mA A球质量 (kg)，必须 > 0
 * @param vA A球碰前速度 (m/s)
 * @param mB B球质量 (kg)，必须 > 0
 * @param vB B球碰前速度 (m/s)
 * @returns [vA_after, vB_after] 碰后速度 (m/s)
 */
export function elasticCollision1D(
  mA: number, vA: number,
  mB: number, vB: number
): [number, number] {
  const totalM = mA + mB
  const vAf = ((mA - mB) * vA + 2 * mB * vB) / totalM
  const vBf = ((mB - mA) * vB + 2 * mA * vA) / totalM
  return [vAf, vBf]
}
