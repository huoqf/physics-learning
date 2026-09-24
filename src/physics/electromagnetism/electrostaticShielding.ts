/**
 * 静电平衡与静电屏蔽物理纯函数
 */

export interface ElectrostaticShieldingConfig {
  /** 外电场强度 E0 (V/m 或 kN/C) */
  E0: number
  /** 模式: 0: 内部零场与等势体, 1: 尖端放电, 2: 空腔静电屏蔽 */
  mode: number
  /** 空腔是否接地 (仅模式 2 生效) */
  isGrounded?: number
  /** 尖端曲率半径 R (mm, 仅模式 1 生效) */
  tipRadius?: number
}

export interface ElectrostaticShieldingResult {
  /** 外加场强 E0 */
  E0: number
  /** 感应电荷产生的内部反向场强 E_prime (V/m) */
  EPrime: number
  /** 导体内部合电场强度 E_net = E0 - E_prime (平衡时恒为 0) */
  ENet: number
  /** 导体电势 (由于是等势体，各点电势相同) */
  potential: number
  /** 尖端表面电荷密度 (微库/米^2, 与曲率半径反比) */
  tipChargeDensity: number
  /** 是否击穿空气发生放电 */
  isAirBreakdown: boolean
  /** 空腔内部场强 (模式 2) */
  cavityField: number
}

/**
 * 计算静电平衡状态下的场强矢量与电荷分布
 */
export function calculateElectrostaticShielding(
  config: ElectrostaticShieldingConfig
): ElectrostaticShieldingResult {
  const { E0, mode, isGrounded = 0, tipRadius = 1.0 } = config
  const safeE0 = Math.max(0, E0)

  // 1. 静电平衡导体内部反向感应电场严格等于外电场
  const EPrime = safeE0
  const ENet = 0 // 内部合场强恒为 0

  // 2. 导体是等势体
  const potential = isGrounded === 1 ? 0 : safeE0 * 0.15

  // 3. 尖端放电: 电荷面密度 sigma ∝ 1/R
  const safeR = Math.max(0.2, tipRadius)
  const tipChargeDensity = (safeE0 / 100) * (2.5 / safeR)
  // 当局部场强超过空气击穿场强 (约 30 kV/cm = 3e6 V/m) 发生尖端放电
  const isAirBreakdown = mode === 1 && tipChargeDensity > 35

  // 4. 空腔内部场强:
  // 当外屏蔽时，外部电荷在空腔内激发的场与外壳感应电荷激发的场处处抵消，空腔内 E 严格为 0
  const cavityField = 0

  return {
    E0: safeE0,
    EPrime,
    ENet,
    potential: +potential.toFixed(1),
    tipChargeDensity: +tipChargeDensity.toFixed(1),
    isAirBreakdown,
    cavityField,
  }
}
