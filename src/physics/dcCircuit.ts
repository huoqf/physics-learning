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
