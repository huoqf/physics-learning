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

/**
 * 小灯泡非线性电阻模型。
 * 简化模型：R_eff = R0 + k·U，其中 R0 = 5Ω（冷态基础阻值），k = 2Ω/V（温度系数）。
 * 返回有效电阻 R_eff (Ω)、电流 I (A)、功率 P (W)。
 */
export function calculateBulbResistance(U: number): { R_eff: number; I: number; P: number } {
  const R_eff = 5 + 2 * U
  const I = R_eff > 0 ? U / R_eff : 0
  const P = U * I
  return { R_eff, I, P }
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

// ===== 电表改装物理计算 =====
export interface MeterExpansionResult {
  I_g_meas: number
  Rs: number
  Rp: number
  ratio: number
  valid: boolean
}

export function calculateMeterExpansion(
  mode: number,
  U_input: number,
  R_g: number,
  I_g: number,
  R_s: number,
  R_p: number
): MeterExpansionResult {
  if (mode === 1) {
    const R_V = R_g + R_s
    if (R_V <= 0) return { I_g_meas: 0, Rs: R_s, Rp: R_p, ratio: 0, valid: false }
    const I_g_meas = U_input / R_V
    const ratio = Math.max(0, Math.min(1.2, I_g_meas / I_g))
    return { I_g_meas, Rs: R_s, Rp: R_p, ratio, valid: true }
  }
  if (mode === 2) {
    if (R_p <= 0 || R_g <= 0) return { I_g_meas: 0, Rs: R_s, Rp: R_p, ratio: 0, valid: false }
    const I_g_meas = U_input * (R_p / (R_g + R_p))
    const ratio = Math.max(0, Math.min(1.2, I_g_meas / I_g))
    return { I_g_meas, Rs: R_s, Rp: R_p, ratio, valid: true }
  }
  return { I_g_meas: 0, Rs: R_s, Rp: R_p, ratio: 0, valid: false }
}

// ===== 欧姆表原理物理计算 =====
export interface OhmmeterResult {
  I: number
  R_internal: number
  ratio: number
  isZeroed: boolean
  valid: boolean
}

export function calculateOhmmeter(
  E: number,
  R_g: number,
  r: number,
  R_adjust: number,
  R_x: number,
  multiplier: number,
  I_g: number
): OhmmeterResult {
  const R_internal_actual = R_g + r + R_adjust * multiplier
  const totalR = R_internal_actual + R_x / multiplier
  if (totalR <= 0) return { I: 0, R_internal: 0, ratio: 0, isZeroed: false, valid: false }
  
  const I = E / totalR
  const ratio = Math.max(0, Math.min(1.2, I / I_g))
  const I_short = E / R_internal_actual
  const isZeroed = Math.abs(I_short - I_g) < 0.01 * I_g

  return { I, R_internal: R_internal_actual, ratio, isZeroed, valid: true }
}

// ===== 测电源电动势与内阻实验误差计算 =====
export interface ExperimentErResult {
  I_meas: number
  U_meas: number
  I_real: number
  U_real: number
  valid: boolean
}

export function calculateExperimentEr(
  E_real: number,
  r_real: number,
  R_slider: number,
  wiring: number,
  R_V: number,
  R_A: number
): ExperimentErResult {
  if (wiring === 0) {
    // 电路甲（电流表外接法）：电压表并联在路端，电流表与滑动变阻器串联后并联在电压表两端
    if (R_slider <= 0) return { I_meas: 0, U_meas: 0, I_real: 0, U_real: 0, valid: false }
    const R_branch = R_slider + R_A
    const R_parallel = (R_branch * R_V) / (R_branch + R_V)
    const R_total = r_real + R_parallel
    
    const I_total = E_real / R_total // 真实干路总电流
    const U_meas = E_real - I_total * r_real // 电压表读数（路端电压）
    const I_meas = U_meas / R_branch // 电流表读数
    const U_real = I_meas * R_slider // 变阻器真实电压
    
    return {
      I_meas,
      U_meas,
      I_real: I_total,
      U_real,
      valid: true
    }
  }
  
  if (wiring === 1) {
    // 电路乙（电流表内接法）：电流表串联在干路，电压表与滑动变阻器并联
    if (R_slider <= 0) return { I_meas: 0, U_meas: 0, I_real: 0, U_real: 0, valid: false }
    const R_parallel = (R_slider * R_V) / (R_slider + R_V)
    const R_total = r_real + R_A + R_parallel
    
    const I_total = E_real / R_total // 真实干路总电流（等于电流表读数）
    const I_meas = I_total
    const U_meas = I_total * R_parallel // 电压表读数（变阻器两端电压）
    const U_real = E_real - I_total * r_real // 电池真实路端电压
    
    return {
      I_meas,
      U_meas,
      I_real: I_total,
      U_real,
      valid: true
    }
  }

  return { I_meas: 0, U_meas: 0, I_real: 0, U_real: 0, valid: false }
}

// ===== 非纯电阻电动机电路计算 =====
export interface MotorCircuitResult {
  I: number
  U_M: number
  P_total: number
  P_heat_M: number
  P_heat_R: number
  P_mech: number
  v_lift: number
  valid: boolean
}

export function calculateMotorCircuit(
  U_source: number,
  R_protect: number,
  r_M: number,
  state: number,
  E_back: number,
  m_load: number
): MotorCircuitResult {
  const g = 9.8
  
  if (state === 0) {
    const totalR = R_protect + r_M
    if (totalR <= 0) return { I: 0, U_M: 0, P_total: 0, P_heat_M: 0, P_heat_R: 0, P_mech: 0, v_lift: 0, valid: false }
    const I = U_source / totalR
    const U_M = I * r_M
    const P_total = U_source * I
    const P_heat_M = I * I * r_M
    const P_heat_R = I * I * R_protect
    return {
      I,
      U_M,
      P_total,
      P_heat_M,
      P_heat_R,
      P_mech: 0,
      v_lift: 0,
      valid: true
    }
  }
  
  if (state === 1) {
    const totalR = R_protect + r_M
    if (totalR <= 0 || U_source <= E_back) {
      return { I: 0, U_M: 0, P_total: 0, P_heat_M: 0, P_heat_R: 0, P_mech: 0, v_lift: 0, valid: false }
    }
    const I = (U_source - E_back) / totalR
    const U_M = E_back + I * r_M
    const P_total = U_source * I
    const P_heat_M = I * I * r_M
    const P_heat_R = I * I * R_protect
    const P_mech = E_back * I
    const v_lift = m_load > 0 ? P_mech / (m_load * g) : 0
    
    return {
      I,
      U_M,
      P_total,
      P_heat_M,
      P_heat_R,
      P_mech,
      v_lift,
      valid: true
    }
  }

  return { I: 0, U_M: 0, P_total: 0, P_heat_M: 0, P_heat_R: 0, P_mech: 0, v_lift: 0, valid: false }
}
