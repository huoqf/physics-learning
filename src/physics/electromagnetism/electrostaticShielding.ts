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
  /** 外加场强 E0 (V/m) */
  E0: number
  /** 感应电荷产生的内部反向场强 E_prime (V/m)，静电平衡时严格等于 E0 */
  EPrime: number
  /** 导体内部合电场强度 E_net = E0 - E_prime (平衡时恒为 0) */
  ENet: number
  /**
   * 导体电势 (V)。
   *
   * ⚠️ 示意量：孤立导体在匀强外场中的绝对电势取决于零电势参考点选取与几何形状，
   * 高中阶段不作定量要求，此处仅随 E0 单调变化，用于表现"接地则 φ = 0"。
   */
  potential: number
  /**
   * 尖端表面电荷面密度指数（无量纲相对量）。
   *
   * ⚠️ 非 SI 量：真实 σ 需由几何边界条件求解，此处按 σ ∝ E0 / R 归一化为相对指数，
   * 仅用于比较"尖端 vs 圆钝端"电荷分布的相对大小。
   */
  tipChargeDensity: number
  /** 是否击穿空气发生放电（基于上述相对指数的模型判据，非真实 3×10⁶ V/m 场强判据） */
  isAirBreakdown: boolean
  /** 空腔内部场强 (模式 2) */
  cavityField: number
}

/** 电荷面密度指数的归一化系数（示意模型参数，无量纲） */
const CHARGE_DENSITY_INDEX_COEFF = 2.5
/** 电荷面密度指数的场强归一化基准 (V/m) */
const CHARGE_DENSITY_INDEX_E0_BASE = 100
/** 尖端放电判据阈值（相对指数，由模型标定，非 SI 击穿场强） */
const AIR_BREAKDOWN_INDEX_THRESHOLD = 35
/** 孤立导体电势的示意比例系数（无量纲，仅供视觉上随 E0 变化） */
const POTENTIAL_INDEX_COEFF = 0.15

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

  // 2. 导体是等势体（接地时取零电势参考点，φ = 0；否则按示意比例随 E0 单调变化）
  const potential = isGrounded === 1 ? 0 : safeE0 * POTENTIAL_INDEX_COEFF

  // 3. 尖端放电: 电荷面密度 sigma ∝ 1/R（归一化为相对指数）
  const safeR = Math.max(0.2, tipRadius)
  const tipChargeDensity =
    (safeE0 / CHARGE_DENSITY_INDEX_E0_BASE) * (CHARGE_DENSITY_INDEX_COEFF / safeR)
  const isAirBreakdown = mode === 1 && tipChargeDensity > AIR_BREAKDOWN_INDEX_THRESHOLD

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
