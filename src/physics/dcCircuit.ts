import { GRAVITY } from './constants'

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
    const R_A = (R_g * R_p) / (R_g + R_p)
    const I_total = U_input / R_A
    const I_g_meas = I_total * (R_p / (R_g + R_p))
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

/** 电动机电路模型单一真源默认参数与物理常数（SI 单位） */
export const MOTOR_CIRCUIT_CONSTANTS = {
  /** 机电比例常数 k (N/A = V·s/m)，取 g/2 使匀速提升所需电流 I = mg/k = 2m */
  kv: GRAVITY / 2,
  /** 默认电源电压 (V) */
  defaultU: 12,
  /** 默认保护电阻 (Ω) */
  defaultRProtect: 2.0,
  /** 默认电动机线圈内阻 (Ω) */
  defaultRM: 1.0,
  /** 默认重物质量 (kg) */
  defaultMass: 0.5,
  /** 卷扬滑轮半径 (m) */
  pulleyRadius: 0.12,
} as const

/** 电动机停止转动的原因：'none' 正常转动，'locked' 人为卡住，'overload' 重物过重或电压不足导致无法转动 */
export type MotorStallReason = 'none' | 'locked' | 'overload'

/** 电动机电路计算输入参数（SI 单位） */
export interface MotorCircuitInput {
  /** 电源总电压 U (V) */
  U: number
  /** 保护电阻阻值 R保 (Ω) */
  R_protect: number
  /** 电动机线圈内阻 rM (Ω) */
  r_M: number
  /** 开关/控制状态：1=正常接通尝试转动，0=转轴卡住 */
  motorState: number
  /** 悬挂重物质量 m (kg) */
  mass: number
}

/** 电动机电路计算结果（SI 单位） */
export interface MotorCircuitResult {
  /** 干路电流 I (A) */
  I: number
  /** 电动机两端电压 U_M (V) */
  U_M: number
  /** 保护电阻两端电压 U_R (V) */
  U_R: number
  /** 电源总功率 P_总 = U·I (W) */
  P_total: number
  /** 保护电阻发热功率 P_R = I²·R保 (W) */
  P_heat_R: number
  /** 电动机输入电功率 P_入 = U_M·I (W) */
  P_in_motor: number
  /** 电动机线圈发热功率 P_热 = I²·rM (W) */
  P_heat_M: number
  /** 电动机输出机械功率 P_机 = P_入 - P_热 (W) */
  P_mech: number
  /** 电动机自身效率 η = P_机 / P_入（0~1） */
  efficiency: number
  /** 全回路总效率 η_总 = P_机 / P_总（0~1） */
  totalEfficiency: number
  /** 重物匀速提升速度 v (m/s) */
  v_lift: number
  /** 卷扬滑轮与转子角速度 ω (rad/s) */
  omega: number
  /** 若误用纯电阻欧姆定律算得的电流 U_M / rM (A) */
  I_ohmWrong: number
  /** 是否处于卡住不转状态 */
  isStalled: boolean
  /** 卡住原因 */
  stallReason: MotorStallReason
  /** 当前电路卡住临界电流 I_卡 = U / (R保 + rM) (A) */
  I_stall: number
  /** 输出机械功率最大时的电流 I_opt = I_卡 / 2 (A) */
  I_opt: number
  /** 当前电路最大输出机械功率 P_机max = U² / [4(R保 + rM)] (W) */
  P_mech_max: number
  /** 对应最大输出机械功率的重物质量 m_opt (kg) */
  m_opt: number
  /** 电动机能提起的最大重物质量 m_max (kg) */
  m_max: number
  /** 参数是否有效 */
  valid: boolean
}

/** P-I 功率特性曲线采样点 */
export interface MotorPowerCurvePoint {
  /** 干路电流 I (A) */
  I: number
  /** 电源总功率 P_总 = U·I (W) */
  P_total: number
  /** 回路总热功率 P_总热 = I²(R保 + rM) (W) */
  P_heat_total: number
  /** 电动机输出机械功率 P_机 = P_总 - P_总热 (W) */
  P_mech: number
}

/**
 * 计算含电动机的非纯电阻电路稳态物理量（高中物理机电功率耦合模型）。
 *
 * 正常匀速提升时：拉起质量 m 所需电流 I = mg / k，端电压 U_M = U - I·R保，
 * 电动机输入电功率 P_入 = U_M·I = I²·rM + P_机，匀速上升速度 v = P_机 / (mg)。
 * 当转轴卡住（motorState = 0）或所需电流 I ≥ I_卡 = U / (R保 + rM) 时，
 * 电动机退化为纯电阻电路，机械功率为 0，电能全部转化为焦耳热。
 */
export function calculateMotorCircuit(input: MotorCircuitInput): MotorCircuitResult {
  const { U, R_protect, r_M, motorState, mass } = input
  const safeRProtect = Math.max(0, R_protect)
  const safeRM = Math.max(0, r_M)
  const safeMass = Math.max(0, mass)
  const totalR = safeRProtect + safeRM

  if (U <= 0 || totalR <= 0 || safeRM <= 0) {
    return {
      I: 0,
      U_M: 0,
      U_R: 0,
      P_total: 0,
      P_heat_R: 0,
      P_in_motor: 0,
      P_heat_M: 0,
      P_mech: 0,
      efficiency: 0,
      totalEfficiency: 0,
      v_lift: 0,
      omega: 0,
      I_ohmWrong: 0,
      isStalled: true,
      stallReason: 'locked',
      I_stall: 0,
      I_opt: 0,
      P_mech_max: 0,
      m_opt: 0,
      m_max: 0,
      valid: false,
    }
  }

  const I_stall = U / totalR
  const I_opt = I_stall / 2
  const P_mech_max = (U * U) / (4 * totalR)
  const m_max = (MOTOR_CIRCUIT_CONSTANTS.kv * I_stall) / GRAVITY
  const m_opt = m_max / 2
  const I_required = (safeMass * GRAVITY) / MOTOR_CIRCUIT_CONSTANTS.kv

  const stallReason: MotorStallReason =
    motorState === 0 ? 'locked' : I_required >= I_stall ? 'overload' : 'none'
  const isStalled = stallReason !== 'none'

  if (isStalled) {
    const I = I_stall
    const U_R = I * safeRProtect
    const U_M = I * safeRM
    const P_total = U * I
    const P_heat_R = I * I * safeRProtect
    const P_in_motor = U_M * I
    const P_heat_M = I * I * safeRM
    return {
      I,
      U_M,
      U_R,
      P_total,
      P_heat_R,
      P_in_motor,
      P_heat_M,
      P_mech: 0,
      efficiency: 0,
      totalEfficiency: 0,
      v_lift: 0,
      omega: 0,
      I_ohmWrong: U_M / safeRM,
      isStalled: true,
      stallReason,
      I_stall,
      I_opt,
      P_mech_max,
      m_opt,
      m_max,
      valid: true,
    }
  }

  const I = I_required
  const U_R = I * safeRProtect
  const U_M = U - U_R
  const P_total = U * I
  const P_heat_R = I * I * safeRProtect
  const P_in_motor = U_M * I
  const P_heat_M = I * I * safeRM
  const P_mech = Math.max(0, P_in_motor - P_heat_M)
  const efficiency = P_in_motor > 0 ? P_mech / P_in_motor : 0
  const totalEfficiency = P_total > 0 ? P_mech / P_total : 0
  const v_lift = safeMass > 0 ? P_mech / (safeMass * GRAVITY) : 0
  const omega = v_lift / MOTOR_CIRCUIT_CONSTANTS.pulleyRadius

  return {
    I,
    U_M,
    U_R,
    P_total,
    P_heat_R,
    P_in_motor,
    P_heat_M,
    P_mech,
    efficiency,
    totalEfficiency,
    v_lift,
    omega,
    I_ohmWrong: U_M / safeRM,
    isStalled: false,
    stallReason: 'none',
    I_stall,
    I_opt,
    P_mech_max,
    m_opt,
    m_max,
    valid: true,
  }
}

/**
 * 生成电动机回路 P-I 功率特性曲线数据（0 ≤ I ≤ I_卡）。
 *
 * 包含总功率 P_总 = UI、总热功率 P_总热 = I²(R保 + rM) 与输出机械功率 P_机 = P_总 - P_总热，
 * 并确保包含精确极值顶点 I_opt = U / [2(R保 + rM)] 与终点 I_卡。
 */
export function generateMotorPowerCurve(
  U: number,
  R_protect: number,
  r_M: number,
  steps = 80,
): MotorPowerCurvePoint[] {
  const safeRProtect = Math.max(0, R_protect)
  const safeRM = Math.max(0, r_M)
  const totalR = safeRProtect + safeRM
  if (U <= 0 || totalR <= 0) {
    return [
      { I: 0, P_total: 0, P_heat_total: 0, P_mech: 0 },
      { I: 1, P_total: 0, P_heat_total: 0, P_mech: 0 },
    ]
  }

  const I_stall = U / totalR
  const I_opt = I_stall / 2
  const count = Math.max(10, Math.round(steps))
  const iValues: number[] = []
  for (let k = 0; k <= count; k++) {
    iValues.push((k / count) * I_stall)
  }
  if (!iValues.some((val) => Math.abs(val - I_opt) < 1e-9)) {
    iValues.push(I_opt)
    iValues.sort((a, b) => a - b)
  }

  return iValues.map((I) => {
    const P_total = U * I
    const P_heat_total = I * I * totalR
    const P_mech = Math.max(0, P_total - P_heat_total)
    return { I, P_total, P_heat_total, P_mech }
  })
}

export type CircuitType = 'voltage-divider' | 'current-limiting'
export type MeterWiring = 'external' | 'internal'

export interface CircuitStateOptions {
  circuitType: CircuitType
  meterWiring: MeterWiring
  sliderRatio: number
  E?: number
  r?: number
  R_slider_max?: number
  Rx?: number
  RV?: number
  RA?: number
  closed?: boolean
}

export interface CircuitStateResult {
  U_meas: number
  I_meas: number
  U_real: number
  I_real: number
  R_meas: number
  R_branch: number
  circuitType: CircuitType
  meterWiring: MeterWiring
}

/**
 * 闭合电路实验参量计算（分压式 vs 限流式，外接法 vs 内接法）。
 * 严格按照闭合电路欧姆定律与混联电阻公式计算。
 */
export function calculateCircuitState(options: CircuitStateOptions): CircuitStateResult {
  const {
    circuitType,
    meterWiring,
    sliderRatio,
    E = 6.0,
    r = 0.5,
    R_slider_max = 20,
    Rx = 5.0,
    RV = 3000,
    RA = 0.5,
    closed = true,
  } = options

  if (!closed) {
    return {
      U_meas: 0,
      I_meas: 0,
      U_real: 0,
      I_real: 0,
      R_meas: 0,
      R_branch: 0,
      circuitType,
      meterWiring,
    }
  }

  const ratio = Math.max(0.0001, Math.min(0.9999, sliderRatio))

  if (circuitType === 'voltage-divider') {
    const Rp = R_slider_max * ratio
    const Rs = R_slider_max * (1 - ratio)

    let R_branch = 0
    if (meterWiring === 'external') {
      const R_x_parallel_V = (Rx * RV) / (Rx + RV)
      R_branch = R_x_parallel_V + RA
    } else {
      const R_x_series_A = Rx + RA
      R_branch = (R_x_series_A * RV) / (R_x_series_A + RV)
    }

    const R_parallel = (Rp * R_branch) / (Rp + R_branch)
    const R_total = r + Rs + R_parallel
    const I_main = E / R_total
    const U_out = I_main * R_parallel

    let U_meas = 0
    let I_meas = 0
    let U_real = 0
    let I_real = 0

    if (meterWiring === 'external') {
      I_meas = U_out / R_branch
      const R_x_parallel_V = (Rx * RV) / (Rx + RV)
      U_meas = I_meas * R_x_parallel_V
      U_real = U_meas
      I_real = U_real / Rx
    } else {
      U_meas = U_out
      const R_x_series_A = Rx + RA
      I_meas = U_out / R_x_series_A
      I_real = I_meas
      U_real = I_real * Rx
    }

    const R_meas = I_meas > 0 ? U_meas / I_meas : 0

    return {
      U_meas,
      I_meas,
      U_real,
      I_real,
      R_meas,
      R_branch,
      circuitType,
      meterWiring,
    }
  } else {
    const R_slider = R_slider_max * (1 - ratio)

    let R_branch = 0
    if (meterWiring === 'external') {
      const R_x_parallel_V = (Rx * RV) / (Rx + RV)
      R_branch = R_x_parallel_V + RA
    } else {
      const R_x_series_A = Rx + RA
      R_branch = (R_x_series_A * RV) / (R_x_series_A + RV)
    }

    const R_total = r + R_slider + R_branch
    const I_total = E / R_total

    let U_meas = 0
    let I_meas = 0
    let U_real = 0
    let I_real = 0

    if (meterWiring === 'external') {
      I_meas = I_total
      const R_x_parallel_V = (Rx * RV) / (Rx + RV)
      U_meas = I_meas * R_x_parallel_V
      U_real = U_meas
      I_real = U_real / Rx
    } else {
      const R_x_series_A = Rx + RA
      I_meas = (I_total * RV) / (R_x_series_A + RV)
      U_meas = I_total * R_branch
      I_real = I_meas
      U_real = I_real * Rx
    }

    const R_meas = I_meas > 0 ? U_meas / I_meas : 0

    return {
      U_meas,
      I_meas,
      U_real,
      I_real,
      R_meas,
      R_branch,
      circuitType,
      meterWiring,
    }
  }
}
