/**
 * src/physics/collision.ts
 * 弹性碰撞与非弹性碰撞纯物理计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m/s, J）
 */

// ─── 基础模式 ──────────────────────────────────────────────────────────

/**
 * 计算完全弹性碰撞后速度（一维）
 * v₁' = ((m₁-m₂)v₁ + 2m₂v₂) / (m₁+m₂)
 * v₂' = ((m₂-m₁)v₂ + 2m₁v₁) / (m₁+m₂)
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球碰前速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球碰前速度 (m/s)
 * @returns [v1_after, v2_after] 碰后速度 (m/s)
 */
export function elasticCollision(
  m1: number, v1: number, m2: number, v2: number
): [number, number] {
  const totalM = m1 + m2
  const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / totalM
  const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / totalM
  return [v1f, v2f]
}

/**
 * 计算完全非弹性碰撞后速度（碰后粘合）
 * v' = (m₁v₁ + m₂v₂) / (m₁+m₂)
 *
 * 注意：此函数已在 momentumConservation.ts 中导出为 perfectlyInelasticCollision，
 * 此处使用不同函数名避免 barrel export 冲突。
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球碰前速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球碰前速度 (m/s)
 * @returns v_after 碰后共同速度 (m/s)
 */
export function inelasticCollisionSpeed(
  m1: number, v1: number, m2: number, v2: number
): number {
  return (m1 * v1 + m2 * v2) / (m1 + m2)
}

/**
 * 计算碰撞前总动能
 * E_k = ½m₁v₁² + ½m₂v₂²
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球速度 (m/s)
 * @returns E_k 总动能 (J)
 */
export function calculateInitialKineticEnergy(
  m1: number, v1: number, m2: number, v2: number
): number {
  return 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2
}

/**
 * 计算碰撞后总动能
 *
 * @param m1 A球质量 (kg)
 * @param v1After A球碰后速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2After B球碰后速度 (m/s)
 * @returns E_k_after 碰后总动能 (J)
 */
export function calculateFinalKineticEnergy(
  m1: number, v1After: number, m2: number, v2After: number
): number {
  return 0.5 * m1 * v1After * v1After + 0.5 * m2 * v2After * v2After
}

// ─── 进阶模式 ──────────────────────────────────────────────────────────

/**
 * 计算带能量损失系数的碰撞后速度
 * 能量损失系数 k_loss: 0=完全弹性, 1=完全非弹性
 * 恢复系数 e = 1 - k_loss
 *
 * 使用恢复系数法：
 * e = -(v₁'-v₂') / (v₁-v₂)
 * 联立动量守恒求解
 *
 * @param mA A球质量 (kg)
 * @param vA A球碰前速度 (m/s)
 * @param mB B球质量 (kg)，碰前静止 vB=0
 * @param kLoss 能量损失系数 (0~1)
 * @returns [vA_after, vB_after] 碰后速度 (m/s)
 */
export function collisionWithEnergyLoss(
  mA: number, vA: number, mB: number, kLoss: number
): [number, number] {
  const e = 1 - kLoss // 恢复系数
  const totalM = mA + mB
  // vB=0 时的简化公式
  const vAf = (mA - e * mB) / totalM * vA
  const vBf = (1 + e) * mA / totalM * vA
  return [vAf, vBf]
}

/**
 * 计算碰撞机械能损失
 * ΔE_k = E_k初 - E_k末
 *
 * @param mA A球质量 (kg)
 * @param vA A球碰前速度 (m/s)
 * @param mB B球质量 (kg)
 * @param vA_after A球碰后速度 (m/s)
 * @param vB_after B球碰后速度 (m/s)
 * @returns deltaEk 机械能损失 (J)
 */
export function calculateEnergyLoss(
  mA: number, vA: number, mB: number, vA_after: number, vB_after: number
): number {
  const EkBefore = 0.5 * mA * vA * vA
  const EkAfter = 0.5 * mA * vA_after * vA_after + 0.5 * mB * vB_after * vB_after
  return EkBefore - EkAfter
}

/**
 * 计算极大机械能损失（完全非弹性碰撞）
 * ΔE_k_max = m_A·m_B / (2(m_A+m_B)) · v_A²
 *
 * @param mA A球质量 (kg)
 * @param mB B球质量 (kg)
 * @param vA A球碰前速度 (m/s)
 * @returns deltaEkMax 最大机械能损失 (J)
 */
export function calculateMaxEnergyLoss(
  mA: number, mB: number, vA: number
): number {
  return (mA * mB) / (2 * (mA + mB)) * vA * vA
}

/**
 * 判断是否为等质量完全弹性碰撞（速度交换特例）
 *
 * @param mA A球质量 (kg)
 * @param mB B球质量 (kg)
 * @param kLoss 能量损失系数
 * @returns isSpecialCase 是否为速度交换特例
 */
export function isVelocitySwapCase(
  mA: number, mB: number, kLoss: number
): boolean {
  return Math.abs(mA - mB) < 0.01 && kLoss < 0.01
}

/**
 * 判断是否为大质量撞小质量特例
 * mA >> mB 时 vB' ≈ 2vA
 *
 * @param mA A球质量 (kg)
 * @param mB B球质量 (kg)
 * @param ratio 质量比阈值，默认 5
 * @returns isHeavyLightCase 是否为大撞小特例
 */
export function isHeavyLightCase(
  mA: number, mB: number, ratio: number = 5
): boolean {
  return mA / mB >= ratio
}
