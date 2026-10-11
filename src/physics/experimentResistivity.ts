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

// ─────────────────────────────────────────────────────────────────────────────
// 实验级单一可信源（SSOT）
//
// 背景：本页的电阻率 ρ 有 3 个消费方——左屏控制台所在的中屏动画 hook、
// 中屏 R-L 图（CenterExtra）、右屏数据看板（data/quantities/experimentResistivity.ts）。
// 三者若各自复刻一套公式，必然出现「图线斜率」「反推 ρ」「电流 I」互不相符。
// 因此在此处集中给出一次求解，其余三层只做展示。
// ─────────────────────────────────────────────────────────────────────────────

/** 常见合金电阻率基准 (Ω·m) */
export const RESISTIVITY_NICHROME = 1.0e-6

/** 实验电源电动势 (V) */
export const RESISTIVITY_SOURCE_E = 4.0
/** 实验电源内阻 (Ω) */
export const RESISTIVITY_SOURCE_R = 0.5
/** 电压表内阻 (Ω) */
export const RESISTIVITY_RV = 3000
/** 电流表内阻 (Ω) */
export const RESISTIVITY_RA = 0.5

/** 金属丝有效接入长度参数区间 (m) */
export const RESISTIVITY_L_RANGE: [number, number] = [0.1, 0.8]
/** 金属丝直径参数区间 (mm) */
export const RESISTIVITY_D_RANGE_MM: [number, number] = [0.2, 1.2]

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export interface ResistivityExperimentInput {
  /** 金属丝接入有效长度 (m) */
  L: number
  /** 金属丝直径 (mm) */
  d_mm: number
  /** 接法：0 电流表外接（测小电阻），1 电流表内接 */
  wiring: number
  /** 滑动变阻器接入阻值 (Ω) */
  R_slider: number
  /** 真实电阻率 (Ω·m)，默认镍铬合金 */
  rho?: number
  /** 电源电动势 (V) */
  E?: number
  /** 电源内阻 (Ω) */
  rSource?: number
  /** 电压表内阻 (Ω) */
  RV?: number
  /** 电流表内阻 (Ω) */
  RA?: number
}

export interface ResistivityExperimentResult {
  L: number
  d_mm: number
  d_m: number
  wiring: 0 | 1
  R_slider: number
  /** 金属丝真实电阻 (Ω) */
  Rx_real: number
  /** 伏安法测得的等效电阻 (Ω)，含电表内阻系统误差 */
  Rx_meas: number
  /** 单点表观电阻率 ρ_测 = πd²R_测/(4L) (Ω·m) */
  rho_meas: number
  /** 真实 R-L 斜率 k = 4ρ/(πd²) (Ω/m) */
  k_real: number
  /** 由实测 R-L 图线拟合得到的斜率 (Ω/m) */
  k_meas: number
  /** 由拟合斜率反推的电阻率 (Ω·m) —— 本页最终结论量 */
  rho_from_slope: number
  /** 真实电阻率基准 (Ω·m) */
  rho_real: number
  /** 限流回路电流 I = E/(R_测 + R_slider + r) (A) */
  currentA: number
  /** 电压表读数 U = I·R_测 (V) */
  voltageV: number
  E: number
  rSource: number
  RV: number
  RA: number
  /** 电流表量程选择 (A)：读数 ≤ 0.6A 取 0.6 挡，否则取 3 挡 */
  ammeterRange: number
  /** 电压表量程选择 (V)：读数 ≤ 1V 取 1 挡，≤3V 取 3 挡，否则 15 挡 */
  voltmeterRange: number
}

/**
 * 求解「测量金属丝的电阻率」实验的全部状态量（纯函数）。
 */
export function solveResistivityExperiment(
  input: ResistivityExperimentInput,
): ResistivityExperimentResult {
  const L = clamp(input.L, RESISTIVITY_L_RANGE[0], RESISTIVITY_L_RANGE[1])
  const d_mm = clamp(input.d_mm, RESISTIVITY_D_RANGE_MM[0], RESISTIVITY_D_RANGE_MM[1])
  const d_m = d_mm * 1e-3
  const wiring: 0 | 1 = input.wiring === 1 ? 1 : 0
  const R_slider = Math.max(input.R_slider, 0)

  const rho_real = input.rho ?? RESISTIVITY_NICHROME
  const E = input.E ?? RESISTIVITY_SOURCE_E
  const rSource = input.rSource ?? RESISTIVITY_SOURCE_R
  const RV = input.RV ?? RESISTIVITY_RV
  const RA = input.RA ?? RESISTIVITY_RA

  const Rx_real = calcTheoreticalResistance(rho_real, L, d_m)
  const Rx_meas = calcMeasuredResistance(Rx_real, wiring, RV, RA)

  // 真实 R-L 图线严格过原点，斜率 k = 4ρ/(πd²)
  const k_real = (4 * rho_real) / (Math.PI * d_m * d_m)

  // 实测 R-L 图线：
  //   外接法 R_测(L) = R(L)·RV/(R(L)+RV)，仍过原点，割线斜率 = k_real·RV/(R(L)+RV) < k_real；
  //   内接法 R_测(L) = R(L) + RA，斜率严格等于 k_real，只是纵轴截距多了 RA。
  // 因此「图像斜率法」在内接法下能自动消掉截距误差，而外接法会整体把 ρ 压低一点点。
  const k_meas = wiring === 0 ? (k_real * RV) / (Rx_real + RV) : k_real

  const rho_from_slope = calcResistivityFromSlope(k_meas, d_m)
  const rho_meas = (Rx_meas * Math.PI * d_m * d_m) / (4 * L)

  const currentA = E / (Rx_meas + R_slider + rSource)
  const voltageV = currentA * Rx_meas

  // 电表量程：按「最小可覆盖量程」选挡，保证指针偏转尽量大、读数有效数字更多
  const ammeterRange = currentA <= 0.6 ? 0.6 : 3.0
  const voltmeterRange = voltageV <= 1 ? 1 : voltageV <= 3 ? 3 : 15

  return {
    L,
    d_mm,
    d_m,
    wiring,
    R_slider,
    Rx_real,
    Rx_meas,
    rho_meas,
    k_real,
    k_meas,
    rho_from_slope,
    rho_real,
    currentA,
    voltageV,
    E,
    rSource,
    RV,
    RA,
    ammeterRange,
    voltmeterRange,
  }
}
