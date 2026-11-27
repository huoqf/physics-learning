/**
 * 纯物理计算：交流电路中电感感抗与电容容抗
 *
 * 铁律遵循：纯计算函数，无 React/DOM/Store 依赖，所有函数具备 JSDoc 与物理单位注释。
 */

/**
 * 计算电感感抗 X_L
 * 公式：X_L = 2 * π * f * L
 *
 * @param f 交流电频率 (Hz)
 * @param L 自感系数 (H)
 * @returns 感抗 (Ω)
 */
export function calculateInductiveReactance(f: number, L: number): number {
  if (f <= 0 || L <= 0) return 0
  return 2 * Math.PI * f * L
}

/**
 * 计算电容容抗 X_C
 * 公式：X_C = 1 / (2 * π * f * C)
 *
 * @param f 交流电频率 (Hz)
 * @param C 电容大小 (F)
 * @returns 容抗 (Ω)，直流 (f=0) 时返回 Infinity
 */
export function calculateCapacitiveReactance(f: number, C: number): number {
  if (f <= 0 || C <= 0) return Number.POSITIVE_INFINITY
  return 1 / (2 * Math.PI * f * C)
}

/**
 * 计算 RL 或 RC 串联支路的交流总阻抗 Z
 * 公式：Z = √(R² + X²)
 *
 * @param R 电阻 (Ω)
 * @param X 感抗或容抗 (Ω)
 * @returns 总阻抗 (Ω)
 */
export function calculateImpedance(R: number, X: number): number {
  if (!Number.isFinite(X)) return Number.POSITIVE_INFINITY
  return Math.hypot(R, X)
}

/**
 * 计算支路正弦稳态有效值电流 I_rms 与消耗功率 P
 *
 * @param U 电源有效电压 (V)
 * @param R 负载电阻 (Ω)
 * @param X 电抗 (Ω)
 * @param isDC 是否为直流电源
 * @param DCResistance 电感线圈的直流内阻 (Ω)，电容直流为断路
 * @returns { current: number (A), power: number (W), impedance: number (Ω) }
 */
export function calculateBranchCurrentAndPower(
  U: number,
  R: number,
  X: number,
  isDC = false,
  DCResistance = 0,
): { current: number; power: number; impedance: number } {
  if (isDC) {
    // 直流模式：电容容抗无穷大(断路)，电感仅有线圈直流电阻
    if (!Number.isFinite(X)) {
      return { current: 0, power: 0, impedance: Number.POSITIVE_INFINITY }
    }
    const rTotal = Math.max(1e-4, R + DCResistance)
    const current = U / rTotal
    const power = current * current * R
    return { current, power, impedance: rTotal }
  }

  const Z = calculateImpedance(R, X)
  if (!Number.isFinite(Z) || Z <= 1e-6) {
    return { current: 0, power: 0, impedance: Z }
  }
  const current = U / Z
  const power = current * current * R
  return { current, power, impedance: Z }
}

/**
 * 电感线圈的直流电阻 R_coil (Ω)。
 *
 * 人教版"通直阻交"对照实验的基准：线圈本身有 15Ω 直流电阻，所以与电感对照的
 * 电阻支路选用同样 15Ω 的定值电阻，两个灯泡亮度才可直接比较。
 * 中屏与右屏看板共用此常量。
 */
export const AC_COIL_DC_RESISTANCE = 15

/** 拔出铁芯后，空心线圈自感系数相对于有铁芯时的倍率（教学典型简化倍率） */
export const AC_AIR_CORE_RATIO = 0.2

/** 扫频演示模式的频率范围 (Hz) 与扫描总时长 (s) */
export const SWEEP_F_MIN = 10
export const SWEEP_F_MAX = 150
export const SWEEP_DURATION = 10

/** 充放与交直流示波演示模式的总时长 (s) */
export const TRANSIENT_DURATION = 6

/** 扼流滤波教学模式的三档典型信号频率 (Hz)：直流、低频市电、高频载波 */
export const FILTER_FREQUENCIES = {
  dc: 0,
  low: 50,
  high: 2000,
} as const

/** 支路中被测元件类型 */
export type ACBranchDevice = 'resistor' | 'inductor' | 'capacitor'

export interface ACBranchState {
  /** 支路有效值电流 (A) */
  current: number
  /** 支路总阻抗 (Ω) */
  impedance: number
  /** 灯泡自身消耗的功率 (W) = I²·R_灯 */
  bulbPower: number
  /** 该元件串入的直流电阻 (Ω)：线圈 15Ω，电阻 15Ω，电容 0 */
  seriesResistance: number
}

/**
 * 计算"灯泡 + 被测元件"串联支路的稳态电流与灯泡功率（向后兼容接口）。
 */
export function calculateACBranchState(
  voltage: number,
  bulbResistance: number,
  deviceType: ACBranchDevice,
  reactance: number,
  isDC = false,
): ACBranchState {
  const seriesResistance = deviceType === 'capacitor' ? 0 : AC_COIL_DC_RESISTANCE
  const totalR = bulbResistance + seriesResistance
  const calc = calculateBranchCurrentAndPower(voltage, totalR, reactance, isDC, 0)
  return {
    current: calc.current,
    impedance: calc.impedance,
    bulbPower: calc.current * calc.current * bulbResistance,
    seriesResistance,
  }
}

/**
 * 将扫频演示播放时刻 t (0 ~ 10s) 线性映射到交流电频率 f (10 ~ 150 Hz)
 *
 * @param time 动画播放时刻 (s)
 * @returns 当前扫频频率 (Hz)
 */
export function sweepFrequencyAtTime(time: number): number {
  const clampedT = Math.max(0, Math.min(SWEEP_DURATION, Number.isFinite(time) ? time : 0))
  const ratio = clampedT / SWEEP_DURATION
  return SWEEP_F_MIN + ratio * (SWEEP_F_MAX - SWEEP_F_MIN)
}

/**
 * 将交流频率 f (10 ~ 150 Hz) 反向映射到扫频演示时刻 t (0 ~ 10s)
 *
 * @param frequency 交流频率 (Hz)
 * @returns 对应的扫频动画时刻 (s)
 */
export function sweepTimeForFrequency(frequency: number): number {
  const clampedF = Math.max(SWEEP_F_MIN, Math.min(SWEEP_F_MAX, Number.isFinite(frequency) ? frequency : SWEEP_F_MIN))
  const ratio = (clampedF - SWEEP_F_MIN) / (SWEEP_F_MAX - SWEEP_F_MIN)
  return ratio * SWEEP_DURATION
}

/**
 * 根据是否插入铁芯计算有效自感系数 L_eff (H)
 *
 * @param inductance 标称带铁芯自感系数 (H)
 * @param hasCore 是否插入铁芯
 * @returns 有效自感系数 (H)
 */
export function calculateEffectiveInductance(inductance: number, hasCore: boolean): number {
  const safeL = Math.max(0, inductance)
  return hasCore ? safeL : safeL * AC_AIR_CORE_RATIO
}

export interface ACBranchPhasorState extends ACBranchState {
  /** 支路元件类型 */
  deviceType: ACBranchDevice
  /** 支路电抗 (Ω) */
  reactance: number
  /** 电流相对电源电压的相位角 φ (rad)：电阻为 0，电感滞后为负，电容超前为正 */
  phaseRad: number
  /** 映射到 LightBulb 组件的视觉发光功率 (W)，避免上百瓦直接饱和 */
  displayPower: number
}

/**
 * 计算含精确相位角的支路正弦稳态相量状态。
 *
 * @param voltage 电源有效电压 (V)
 * @param bulbResistance 灯泡电阻 (Ω)
 * @param deviceType 支路元件类型
 * @param reactance 支路电抗 X (Ω)
 * @param isDC 是否为直流模式
 * @param seriesResistanceOverride 对照电阻阻值覆写 (Ω)；电感对照传 15Ω，三灯频响或电容对照传 0Ω
 * @param referencePower 用于灯泡亮度归一化的参考功率 (W)
 * @returns 支路完整相量状态
 */
export function calculateBranchPhasor(
  voltage: number,
  bulbResistance: number,
  deviceType: ACBranchDevice,
  reactance: number,
  isDC = false,
  seriesResistanceOverride?: number,
  referencePower?: number,
): ACBranchPhasorState {
  const defaultSeriesR = deviceType === 'inductor' ? AC_COIL_DC_RESISTANCE : 0
  const seriesResistance = seriesResistanceOverride ?? defaultSeriesR
  const totalR = Math.max(1e-4, bulbResistance + seriesResistance)
  const calc = calculateBranchCurrentAndPower(voltage, totalR, reactance, isDC, 0)
  const bulbPower = calc.current * calc.current * bulbResistance

  let phaseRad = 0
  if (!isDC) {
    if (deviceType === 'inductor') {
      phaseRad = -Math.atan2(reactance, totalR)
    } else if (deviceType === 'capacitor') {
      phaseRad = Number.isFinite(reactance) ? Math.atan2(reactance, totalR) : Math.PI / 2
    }
  }

  const refP = referencePower ?? (voltage * voltage) / Math.max(1, bulbResistance)
  return {
    deviceType,
    reactance,
    current: calc.current,
    impedance: calc.impedance,
    bulbPower,
    seriesResistance,
    phaseRad,
    displayPower: mapBulbDisplayPower(bulbPower, refP),
  }
}

/**
 * 按相量矢量和计算多支路并联后的干路真实有效值电流 (A)。
 *
 * 公式：I_总 = √((Σ I_k cos φ_k)² + (Σ I_k sin φ_k)²)
 *
 * @param branches 各并联支路的有效电流与相位角
 * @returns 干路总有效电流 (A)
 */
export function calculateParallelTotalCurrent(
  branches: ReadonlyArray<{ current: number; phaseRad: number }>,
): number {
  let sumReal = 0
  let sumImag = 0
  for (const b of branches) {
    sumReal += b.current * Math.cos(b.phaseRad)
    sumImag += b.current * Math.sin(b.phaseRad)
  }
  return Math.hypot(sumReal, sumImag)
}

/**
 * 将实际交流频率 (10~150 Hz) 映射为可视化慢放角速度 (rad/s)，
 * 避免 60Hz 显示屏帧率下发生频闪混叠、倒转或静止假象。
 *
 * @param frequencyHz 实际交流频率 (Hz)
 * @returns 可视化角速度 ω_vis (rad/s)
 */
export function calculateVisualAngularFrequency(frequencyHz: number): number {
  if (frequencyHz <= 0) return 0
  const clamped = Math.min(SWEEP_F_MAX, Math.max(SWEEP_F_MIN, frequencyHz))
  const visualFreq = 0.5 + ((clamped - SWEEP_F_MIN) / (SWEEP_F_MAX - SWEEP_F_MIN)) * 2.1
  return 2 * Math.PI * visualFreq
}

/**
 * 计算模式 1（充放交直示波器）在 6s 窗口内的慢放示波频率 (Hz)，
 * 保证 10~150 Hz 对应 1.5 ~ 6 个完整清晰正弦周期。
 *
 * @param frequencyHz 实际交流频率 (Hz)
 * @returns 示波器可视化频率 (Hz)
 */
export function calculateOscilloscopeFrequency(frequencyHz: number): number {
  if (frequencyHz <= 0) return 0
  const clamped = Math.min(SWEEP_F_MAX, Math.max(SWEEP_F_MIN, frequencyHz))
  return 0.25 + ((clamped - SWEEP_F_MIN) / (SWEEP_F_MAX - SWEEP_F_MIN)) * 0.75
}

/**
 * 计算模式 1 直流接通暂态的慢放教学时间常数 (s)，
 * 使 RC 充电衰减与 RL 电流爬升都在 6s 窗口内直观可见且能充分趋近稳态。
 *
 * @param resistance 灯泡电阻 (Ω)
 * @param effectiveInductance 有效自感 (H)
 * @param capacitanceMicroF 电容 (μF)
 * @returns { tauC: number (s), tauL: number (s) }
 */
export function calculateTransientTimeConstants(
  resistance: number,
  effectiveInductance: number,
  capacitanceMicroF: number,
): { tauC: number; tauL: number } {
  const safeR = Math.max(5, resistance)
  const safeL = Math.max(0.05, effectiveInductance)
  const safeC = Math.max(5, capacitanceMicroF)
  const tauC = Math.max(0.25, Math.min(1.4, 0.22 + 0.9 * (safeC / 20) * (safeR / 30) * 0.55))
  const tauL = Math.max(
    0.25,
    Math.min(1.4, 0.22 + 0.9 * (safeL / 0.4) * (45 / (safeR + AC_COIL_DC_RESISTANCE)) * 0.55),
  )
  return { tauC, tauL }
}

export interface ACTransientAtTime {
  /** 支路1（对照电阻）瞬时电流 (A) */
  i1: number
  /** 支路2（电容或电感）瞬时电流 (A) */
  i2: number
  /** 干路瞬时总电流 (A) */
  iTotal: number
  /** 支路1 灯泡当前显示功率 (W) */
  displayPower1: number
  /** 支路2 灯泡当前显示功率 (W) */
  displayPower2: number
  /** 电容极板归一化带电量 [-1, 1]（直流充电从 0→1，交流与电流积分同源） */
  capacitorChargeNorm: number
  /** 直流暂态有效时间常数 τ (s) */
  tau: number
}

/**
 * 计算充放交直模式（mode=1）在任意时刻 t (s) 的两支路瞬时电流、灯泡显示功率与极板带电量。
 */
export function calculateTransientStateAtTime(
  params: {
    voltage: number
    frequency: number
    resistance: number
    effectiveInductance: number
    capacitance: number
    isDC: boolean
    compareTarget: 0 | 1
    referencePower: number
    branch1Rms: number
    branch2Rms: number
    branch2PhaseRad: number
  },
  time: number,
): ACTransientAtTime {
  const t = Math.max(0, Number.isFinite(time) ? time : 0)
  const {
    voltage,
    frequency,
    resistance,
    effectiveInductance,
    capacitance,
    isDC,
    compareTarget,
    referencePower,
    branch1Rms,
    branch2Rms,
    branch2PhaseRad,
  } = params
  const { tauC, tauL } = calculateTransientTimeConstants(resistance, effectiveInductance, capacitance)
  const tau = compareTarget === 0 ? tauC : tauL

  if (isDC) {
    const i1 = branch1Rms
    let i2 = 0
    let capacitorChargeNorm = 0

    if (compareTarget === 0) {
      // 直流接通给电容充电：i(t) = (U/R) * e^(-t/τ_C)，q(t)/Q_m = 1 - e^(-t/τ_C)
      const i0 = voltage / Math.max(1, resistance)
      const decay = Math.exp(-t / tauC)
      i2 = i0 * decay
      capacitorChargeNorm = 1 - decay
    } else {
      // 直流接通电感线圈：i(t) = I_steady * (1 - e^(-t/τ_L))
      const iSteady = voltage / Math.max(1, resistance + AC_COIL_DC_RESISTANCE)
      i2 = iSteady * (1 - Math.exp(-t / tauL))
    }

    const p1 = i1 * i1 * resistance
    const p2 = i2 * i2 * resistance
    return {
      i1,
      i2,
      iTotal: i1 + i2,
      displayPower1: mapBulbDisplayPower(p1, referencePower),
      displayPower2: mapBulbDisplayPower(p2, referencePower),
      capacitorChargeNorm,
      tau,
    }
  }

  const oscFreq = calculateOscilloscopeFrequency(frequency)
  const omegaVis = 2 * Math.PI * oscFreq
  const i1 = Math.SQRT2 * branch1Rms * Math.sin(omegaVis * t)
  const i2 = Math.SQRT2 * branch2Rms * Math.sin(omegaVis * t + branch2PhaseRad)
  const capacitorChargeNorm =
    compareTarget === 0 ? -Math.cos(omegaVis * t + branch2PhaseRad) : 0

  return {
    i1,
    i2,
    iTotal: i1 + i2,
    // 交流下灯泡热惯性显示有效功率
    displayPower1: mapBulbDisplayPower(branch1Rms * branch1Rms * resistance, referencePower),
    displayPower2: mapBulbDisplayPower(branch2Rms * branch2Rms * resistance, referencePower),
    capacitorChargeNorm,
    tau,
  }
}

/**
 * 将真实灯泡功率 (W) 按参考功率映射为 LightBulb 组件的有效视觉功率 (0 ~ 6.5 W)，
 * 避免数十至上百瓦的电路功率直接让光晕饱和导致各支路看不出明暗差别。
 *
 * @param bulbPower 灯泡实际电功率 (W)
 * @param referencePower 基准亮灯参考功率 (W)
 * @returns 传入 LightBulb 的等效显示功率 (W)
 */
export function mapBulbDisplayPower(bulbPower: number, referencePower: number): number {
  if (bulbPower <= 1e-4 || referencePower <= 1e-4) return 0
  const ratio = Math.min(1.2, Math.max(0, bulbPower / referencePower))
  if (ratio <= 0.005) return 0
  return 0.08 + Math.pow(ratio, 0.72) * 6.4
}

/** 滤波演示模式下的电路接法：0 低频扼流圈 | 1 高频扼流圈 | 2 高频旁路电容 */
export type ACFilterType = 0 | 1 | 2

export interface ACFilterState {
  filterType: ACFilterType
  /** 直流 (0 Hz) 输出通过率 (0~1) */
  dcGain: number
  /** 低频 (50 Hz) 输出通过率 (0~1) */
  lfGain: number
  /** 高频 (2000 Hz) 输出通过率 (0~1) */
  hfGain: number
  /** 低频 (50 Hz) 下扼流电抗或旁路容抗 (Ω) */
  reactanceLF: number
  /** 高频 (2000 Hz) 下扼流电抗或旁路容抗 (Ω) */
  reactanceHF: number
  /** 等效电感 (H) */
  effectiveInductanceH: number
  /** 等效电容 (μF) */
  effectiveCapacitanceMicroF: number
}

/**
 * 计算三种典型扼流/旁路滤波电路对直流、低频(50Hz)、高频(2000Hz)成分的输出通过率。
 *
 * @param filterType 0: 低频扼流圈 | 1: 高频扼流圈 | 2: 高频旁路电容
 * @param inductance 标称自感 L (H)
 * @param capacitanceMicroF 标称电容 C (μF)
 * @param loadResistance 负载电阻 R (Ω)
 * @returns 三频段增益与电抗参数
 */
export function calculateFilterState(
  filterType: ACFilterType,
  inductance: number,
  capacitanceMicroF: number,
  loadResistance: number,
): ACFilterState {
  const safeR = Math.max(1, loadResistance)

  if (filterType === 0) {
    // 低频扼流圈：铁芯+多匝，大电感 L_eff = 10L，内阻 r_L = 15Ω
    const lEff = Math.max(0.1, inductance) * 10
    const rTotal = safeR + AC_COIL_DC_RESISTANCE
    const xlLF = calculateInductiveReactance(FILTER_FREQUENCIES.low, lEff)
    const xlHF = calculateInductiveReactance(FILTER_FREQUENCIES.high, lEff)
    const dcGain = safeR / rTotal
    const lfGain = safeR / Math.hypot(rTotal, xlLF)
    const hfGain = safeR / Math.hypot(rTotal, xlHF)
    return {
      filterType,
      dcGain,
      lfGain,
      hfGain,
      reactanceLF: xlLF,
      reactanceHF: xlHF,
      effectiveInductanceH: lEff,
      effectiveCapacitanceMicroF: capacitanceMicroF,
    }
  }

  if (filterType === 1) {
    // 高频扼流圈：铁氧体/空心少匝，小电感 L_eff = 0.02L，直流内阻可忽略
    const lEff = Math.max(0.05, inductance) * 0.02
    const xlLF = calculateInductiveReactance(FILTER_FREQUENCIES.low, lEff)
    const xlHF = calculateInductiveReactance(FILTER_FREQUENCIES.high, lEff)
    const dcGain = 1
    const lfGain = safeR / Math.hypot(safeR, xlLF)
    const hfGain = safeR / Math.hypot(safeR, xlHF)
    return {
      filterType,
      dcGain,
      lfGain,
      hfGain,
      reactanceLF: xlLF,
      reactanceHF: xlHF,
      effectiveInductanceH: lEff,
      effectiveCapacitanceMicroF: capacitanceMicroF,
    }
  }

  // 高频旁路电容：信号源内阻 R_s = R 与负载 R 分压，电容 C_eff = 0.5 * C 并联在负载两端
  const cEffMicroF = Math.max(1, capacitanceMicroF) * 0.5
  const cEffFarad = cEffMicroF * 1e-6
  const xcLF = calculateCapacitiveReactance(FILTER_FREQUENCIES.low, cEffFarad)
  const xcHF = calculateCapacitiveReactance(FILTER_FREQUENCIES.high, cEffFarad)
  const dcGain = 1
  const lfGain = 1 / Math.hypot(1, Math.PI * FILTER_FREQUENCIES.low * safeR * cEffFarad)
  const hfGain = 1 / Math.hypot(1, Math.PI * FILTER_FREQUENCIES.high * safeR * cEffFarad)
  return {
    filterType,
    dcGain,
    lfGain,
    hfGain,
    reactanceLF: xcLF,
    reactanceHF: xcHF,
    effectiveInductanceH: inductance,
    effectiveCapacitanceMicroF: cEffMicroF,
  }
}

export interface ACImpedanceNamedBranch extends ACBranchPhasorState {
  id: 'resistor' | 'inductor' | 'capacitor'
  shortLabel: string
  bulbLabel: string
}

export interface ACImpedanceSnapshot {
  mode: 0 | 1 | 2
  isDC: boolean
  compareTarget: 0 | 1
  filterType: ACFilterType
  hasCore: boolean
  chartType: 0 | 1
  voltage: number
  frequency: number
  inductance: number
  effectiveInductance: number
  capacitance: number
  resistance: number
  XL: number
  XC: number
  f0: number
  referencePower: number
  branches: ACImpedanceNamedBranch[]
  totalCurrent: number
  transient: ACTransientAtTime | null
  filterState: ACFilterState
}

function clampIntOption<T extends number>(
  val: number | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (val == null || !Number.isFinite(val)) return fallback
  const rounded = Math.round(val)
  return (allowed as readonly number[]).includes(rounded) ? (rounded as T) : fallback
}

/**
 * 统一物理快照构建器：中屏 Hook 与右屏看板共同调用，确保单一真源、零数值分叉。
 *
 * @param rawParams 参数字典（来自 store 或看板）
 * @param time 当前播放时刻 (s)
 * @returns 完整的交流电抗、扫频、暂态与滤波快照
 */
export function computeACImpedanceSnapshot(
  rawParams: Record<string, number | undefined>,
  time = 0,
): ACImpedanceSnapshot {
  const mode = clampIntOption(rawParams.mode, [0, 1, 2] as const, 0)
  // mode === 0 为交流扫频演示，恒按正弦交流处理
  const isDC = mode === 1 && rawParams.isDC === 1
  const compareTarget = clampIntOption(rawParams.compareTarget, [0, 1] as const, 0)
  const filterType = clampIntOption(rawParams.filterType, [0, 1, 2] as const, 0)
  const hasCore = rawParams.hasCore !== 0
  const chartType = clampIntOption(rawParams.chartType, [0, 1] as const, 0)

  const voltage = Math.max(10, rawParams.voltage ?? 100)
  const frequency =
    mode === 0
      ? sweepFrequencyAtTime(time)
      : isDC
        ? 0
        : Math.max(SWEEP_F_MIN, Math.min(SWEEP_F_MAX, rawParams.frequency ?? 50))
  const inductance = Math.max(0.05, rawParams.inductance ?? 0.4)
  const effectiveInductance = calculateEffectiveInductance(inductance, hasCore)
  const capacitance = Math.max(5, rawParams.capacitance ?? 20)
  const resistance = Math.max(5, rawParams.resistance ?? 30)

  const capFarad = capacitance * 1e-6
  const XL = calculateInductiveReactance(frequency, effectiveInductance)
  const XC = calculateCapacitiveReactance(frequency, capFarad)
  const f0 = calculateResonanceFrequency(effectiveInductance, capFarad)

  // 基准参考功率：mode=1 且电阻 vs 电感时串联 15Ω，其余按纯灯泡支路 U²/R 归一化
  const compareSeriesR = mode === 1 && compareTarget === 1 ? AC_COIL_DC_RESISTANCE : 0
  const refI = voltage / (resistance + compareSeriesR)
  const referencePower = refI * refI * resistance

  const branches: ACImpedanceNamedBranch[] = []
  let transient: ACTransientAtTime | null = null

  if (mode === 0) {
    const bR = calculateBranchPhasor(voltage, resistance, 'resistor', 0, false, 0, referencePower)
    const bL = calculateBranchPhasor(
      voltage,
      resistance,
      'inductor',
      XL,
      false,
      AC_COIL_DC_RESISTANCE,
      referencePower,
    )
    const bC = calculateBranchPhasor(voltage, resistance, 'capacitor', XC, false, 0, referencePower)
    branches.push(
      { ...bR, id: 'resistor', shortLabel: '电阻 R', bulbLabel: 'L_R' },
      { ...bL, id: 'inductor', shortLabel: '电感 L', bulbLabel: 'L_L' },
      { ...bC, id: 'capacitor', shortLabel: '电容 C', bulbLabel: 'L_C' },
    )
  } else if (mode === 1) {
    const bRef = calculateBranchPhasor(
      voltage,
      resistance,
      'resistor',
      0,
      isDC,
      compareSeriesR,
      referencePower,
    )
    branches.push({
      ...bRef,
      id: 'resistor',
      shortLabel: compareTarget === 1 ? `对照 R=${AC_COIL_DC_RESISTANCE}Ω` : '对照直通',
      bulbLabel: 'L₁',
    })

    let branch2Phase = 0
    let branch2Rms = 0
    if (compareTarget === 0) {
      const bC = calculateBranchPhasor(voltage, resistance, 'capacitor', XC, isDC, 0, referencePower)
      branch2Phase = bC.phaseRad
      branch2Rms = bC.current
      branches.push({
        ...bC,
        id: 'capacitor',
        shortLabel: '电容 C',
        bulbLabel: 'L₂',
      })
    } else {
      const bL = calculateBranchPhasor(
        voltage,
        resistance,
        'inductor',
        XL,
        isDC,
        AC_COIL_DC_RESISTANCE,
        referencePower,
      )
      branch2Phase = bL.phaseRad
      branch2Rms = bL.current
      branches.push({
        ...bL,
        id: 'inductor',
        shortLabel: `线圈 L (r=${AC_COIL_DC_RESISTANCE}Ω)`,
        bulbLabel: 'L₂',
      })
    }

    transient = calculateTransientStateAtTime(
      {
        voltage,
        frequency,
        resistance,
        effectiveInductance,
        capacitance,
        isDC,
        compareTarget,
        referencePower,
        branch1Rms: bRef.current,
        branch2Rms,
        branch2PhaseRad: branch2Phase,
      },
      time,
    )

    // 直流暂态下中屏灯泡亮度与瞬时电流直接对应
    if (isDC) {
      branches[0] = { ...branches[0], displayPower: transient.displayPower1 }
      branches[1] = { ...branches[1], displayPower: transient.displayPower2 }
    }
  }

  const totalCurrent = calculateParallelTotalCurrent(branches)
  const filterState = calculateFilterState(filterType, inductance, capacitance, resistance)

  return {
    mode,
    isDC,
    compareTarget,
    filterType,
    hasCore,
    chartType,
    voltage,
    frequency,
    inductance,
    effectiveInductance,
    capacitance,
    resistance,
    XL,
    XC,
    f0,
    referencePower,
    branches,
    totalCurrent,
    transient,
    filterState,
  }
}

function roundGrid(t: number): number {
  return Math.round(t * 100) / 100
}

/**
 * 计算关键临界时刻列表（严格落在 0.01s 网格、严格升序、位于 (0, maxTime]）。
 */
export function getACImpedanceCriticalTimes(
  rawParams: Record<string, number | undefined>,
): Array<{ time: number; label: string }> {
  const mode = clampIntOption(rawParams.mode, [0, 1, 2] as const, 0)
  if (mode === 2) return []

  const hasCore = rawParams.hasCore !== 0
  const inductance = Math.max(0.05, rawParams.inductance ?? 0.4)
  const effectiveInductance = calculateEffectiveInductance(inductance, hasCore)
  const capacitance = Math.max(5, rawParams.capacitance ?? 20)
  const resistance = Math.max(5, rawParams.resistance ?? 30)

  if (mode === 0) {
    const f0 = calculateResonanceFrequency(effectiveInductance, capacitance * 1e-6)
    const list: Array<{ time: number; label: string }> = [
      { time: roundGrid(sweepTimeForFrequency(20)), label: '低频 20Hz' },
    ]
    if (f0 > 24 && f0 < 136) {
      list.push({
        time: roundGrid(sweepTimeForFrequency(f0)),
        label: `等电抗 (${f0.toFixed(0)}Hz)`,
      })
    }
    list.push({ time: roundGrid(sweepTimeForFrequency(140)), label: '高频 140Hz' })
    return list
  }

  // mode === 1 (6s 示波/暂态窗)
  const isDC = rawParams.isDC === 1
  const compareTarget = clampIntOption(rawParams.compareTarget, [0, 1] as const, 0)
  if (isDC) {
    const { tauC, tauL } = calculateTransientTimeConstants(resistance, effectiveInductance, capacitance)
    const tau = compareTarget === 0 ? tauC : tauL
    const t1 = roundGrid(tau)
    const t2 = roundGrid(Math.min(4.8, 3 * tau))
    return [
      { time: t1, label: '暂态 1τ' },
      { time: t2, label: '趋近稳态' },
      { time: 5.5, label: '直流稳态' },
    ]
  }

  const freq = Math.max(SWEEP_F_MIN, Math.min(SWEEP_F_MAX, rawParams.frequency ?? 50))
  const oscFreq = calculateOscilloscopeFrequency(freq)
  const periodVis = 1 / oscFreq
  const rawPoints = [
    { time: roundGrid(periodVis * 0.25), label: '正向峰值' },
    { time: roundGrid(periodVis * 0.5), label: '零点换向' },
    { time: roundGrid(periodVis * 0.75), label: '反向峰值' },
  ]
  return rawPoints.filter((pt) => pt.time > 0 && pt.time <= TRANSIENT_DURATION)
}

/**
 * 计算播放进度条的过程阶段分段（供 AnimationControls 分段着色）。
 */
export function getACImpedanceTimeStages(
  rawParams: Record<string, number | undefined>,
): Array<{ from: number; to: number; label: string; variant: 'primary' | 'secondary' | 'accent' | 'neutral' }> {
  const mode = clampIntOption(rawParams.mode, [0, 1, 2] as const, 0)
  const hasCore = rawParams.hasCore !== 0
  const inductance = Math.max(0.05, rawParams.inductance ?? 0.4)
  const effectiveInductance = calculateEffectiveInductance(inductance, hasCore)
  const capacitance = Math.max(5, rawParams.capacitance ?? 20)
  const resistance = Math.max(5, rawParams.resistance ?? 30)

  if (mode === 0) {
    const f0 = calculateResonanceFrequency(effectiveInductance, capacitance * 1e-6)
    if (f0 <= 24 || f0 >= 136) return []
    const t0 = roundGrid(sweepTimeForFrequency(f0))
    return [
      { from: 0, to: t0, label: '低频区 (L亮C暗)', variant: 'accent' },
      { from: t0, to: SWEEP_DURATION, label: '高频区 (C亮L暗)', variant: 'secondary' },
    ]
  }

  if (mode === 1 && rawParams.isDC === 1) {
    const compareTarget = clampIntOption(rawParams.compareTarget, [0, 1] as const, 0)
    const { tauC, tauL } = calculateTransientTimeConstants(resistance, effectiveInductance, capacitance)
    const tau = compareTarget === 0 ? tauC : tauL
    const tSplit = roundGrid(Math.min(4.8, 3 * tau))
    return [
      { from: 0, to: tSplit, label: compareTarget === 0 ? '极板充电暂态' : '自感阻滞上升', variant: 'primary' },
      { from: tSplit, to: TRANSIENT_DURATION, label: compareTarget === 0 ? '充满断路稳态' : '直流稳定导通', variant: 'neutral' },
    ]
  }

  return []
}

/**
 * 计算 LC 谐振频率 f0 (使 X_L = X_C 的固有频率)
 * 公式：f_0 = 1 / (2 * π * √(L * C))
 *
 * @param L 电感 (H)
 * @param C 电容 (F)
 * @returns 谐振频率 (Hz)
 */
export function calculateResonanceFrequency(L: number, C: number): number {
  if (L <= 0 || C <= 0) return 0
  return 1 / (2 * Math.PI * Math.sqrt(L * C))
}
