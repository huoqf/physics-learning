/**
 * 恒定电流纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

/** 欧姆定律 I = U/R（A） */
export function calculateOhmLaw(U: number, R: number): { I: number; valid: boolean; shortCircuit: boolean } {
  if (R === 0) return { I: U === 0 ? NaN : Math.sign(U) * Infinity, valid: false, shortCircuit: true }
  if (R < 0) return { I: NaN, valid: false, shortCircuit: false }
  return { I: U / R, valid: true, shortCircuit: false }
}

/** 串联电阻 R_total = ΣR（Ω） */
export function calculateSeriesResistance(Rs: number[]): { R_total: number } {
  return { R_total: Rs.reduce((sum, r) => sum + r, 0) }
}

/** 并联电阻 1/R_total = Σ(1/R)（Ω）；空数组或含 0 电阻时返回 0 */
export function calculateParallelResistance(Rs: number[]): { R_total: number } {
  if (Rs.length === 0 || Rs.some((r) => r === 0)) return { R_total: 0 }
  const inv = Rs.reduce((sum, r) => sum + 1 / r, 0)
  return { R_total: 1 / inv }
}

/**
 * 闭合电路欧姆定律。
 * I = EMF/(R_ext + r)，路端电压 U = EMF - I·r
 * 输出功率 P_output = U·I，总功率 P_total = EMF·I，效率 eta = P_output/P_total
 */
export function calculateClosedCircuit(
  EMF: number,
  r: number,
  R_ext: number
): { I: number; U_terminal: number; P_output: number; P_total: number; eta: number; valid: boolean } {
  const totalR = R_ext + r
  if (totalR <= 0) {
    return { I: NaN, U_terminal: NaN, P_output: NaN, P_total: NaN, eta: NaN, valid: false }
  }
  const I = EMF / totalR
  const U_terminal = EMF - I * r
  const P_output = U_terminal * I
  const P_total = EMF * I
  const eta = P_total === 0 ? 0 : P_output / P_total
  return { I, U_terminal, P_output, P_total, eta, valid: true }
}

/** 串并联电路分析结果 */
export interface CircuitAnalysisResult {
  Rtotal: number
  Itotal: number
  U1: number
  U2: number
  I1: number
  I2: number
  I3: number
}

/**
 * 串并联电路及电路动态分析。
 * 支持：基础串联、基础并联、进阶混联
 *
 * @param mode 0=基础, 1=进阶混联
 * @param subMode 0=串联, 1=并联（仅基础模式有效）
 * @param R1 定值电阻 R₁（Ω）
 * @param R2 滑动变阻器 R₂（Ω）
 * @param R3 定值电阻 R₃（Ω，仅混联有效）
 * @param U 电源电压（V）
 */
export function calculateCircuitAnalysis(
  mode: number,
  subMode: number,
  R1: number,
  R2: number,
  R3: number,
  U: number
): CircuitAnalysisResult {
  let Rtotal = 0
  let Itotal = 0
  let U1 = 0
  let U2 = 0
  let I1 = 0
  let I2 = 0
  let I3 = 0

  if (mode === 0) {
    if (subMode === 0) {
      // 串联电路
      Rtotal = R1 + R2
      Itotal = Rtotal > 0 ? U / Rtotal : 0
      I1 = I2 = Itotal
      U1 = I1 * R1
      U2 = I2 * R2
    } else {
      // 并联电路
      const R2_eff = R2 > 0 ? R2 : 0.01
      Rtotal = (R1 * R2_eff) / (R1 + R2_eff)
      Itotal = U / Rtotal
      I1 = U / R1
      I2 = U / R2_eff
      U1 = U2 = U
    }
  } else {
    // 混联电路
    const R2_eff = R2 > 0 ? R2 : 0.001
    const R_parallel = (R2_eff * R3) / (R2_eff + R3)
    Rtotal = R1 + R_parallel
    Itotal = U / Rtotal
    U1 = Itotal * R1
    U2 = U - U1
    I3 = U2 / R3
    I2 = R2 > 0 ? U2 / R2 : Itotal
    I1 = Itotal
  }

  return { Rtotal, Itotal, U1, U2, I1, I2, I3 }
}
