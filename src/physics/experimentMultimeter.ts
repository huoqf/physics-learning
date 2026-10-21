/**
 * 多用电表物理计算核心模块（纯计算函数，无 React/DOM 依赖）
 *
 * 遵循高考物理多用电表欧姆挡与直流交直流挡位经典原理：
 * 1. 欧姆挡回路：I = E / (R_in + R_x)
 *    满偏电流 I_g = E / R_in，中值电阻 R_mid = R_in
 *    指针偏角比值：ratio = I / I_g = R_mid / (R_mid + R_x)
 * 2. 刻度特性：欧姆刻度反向（0 在最右侧，∞ 在最左侧），非线性（左密右疏）
 * 3. 电源极性：“红进黑出”，黑表笔接内部电源正极，红表笔接内部电源负极
 */

export interface MultimeterState {
  /** 归一化指针偏角比率 [0, 1]，0 为最左端机械零点，1 为最右端满偏 */
  deflectionRatio: number
  /** 指针物理偏转角（度，-45° ~ +45°） */
  pointerAngleDeg: number
  /** 当前读数值 */
  readingValue: number
  /** 格式化显示文本 */
  readingDisplay: string
  /** 中值电阻 R_mid (Ω) */
  rMid: number
  /** 换挡/调零决策建议 */
  advice: 'ok' | 'switch_larger' | 'switch_smaller' | 'adjust_zero'
}

/** 内部基准参数 */
export const MULTIMETER_CONSTANTS = {
  E_BATTERY: 1.5, // 内部电源电动势 (V)
  SCALE_MID: 15, // 刻度盘中值标号刻度
  MIN_ANGLE_DEG: -45, // 最左端指针角度
  MAX_ANGLE_DEG: 45, // 最右端指针角度
  TOTAL_SWEEP_DEG: 90, // 总偏转角范围 90°
} as const

/**
 * 计算欧姆挡指针偏转与测量值
 *
 * @param multiplier 欧姆挡倍率（1, 10, 100, 1000）
 * @param rx 待测电阻阻值 (Ω)
 * @param zeroOffset 欧姆调零偏差 (Ω)，0 为精准调零
 * @param isConnected 表笔是否闭合连接
 */
export function calculateOhmReading(
  multiplier: number,
  rx: number,
  zeroOffset: number,
  isConnected: boolean,
): MultimeterState {
  const rMid = MULTIMETER_CONSTANTS.SCALE_MID * multiplier
  // 实际内阻（调零偏差影响）
  const rInternal = rMid + zeroOffset * multiplier * 0.05
  const isZeroAdjusted = Math.abs(zeroOffset) <= 2

  if (!isConnected) {
    return {
      deflectionRatio: 0,
      pointerAngleDeg: MULTIMETER_CONSTANTS.MIN_ANGLE_DEG,
      readingValue: Infinity,
      readingDisplay: '∞ (开路)',
      rMid,
      advice: isZeroAdjusted ? 'ok' : 'adjust_zero',
    }
  }

  // 指针偏转比 I / I_g。表头满偏电流 I_g = E / R_mid 是**固定**的（结构决定），
  // 不能随调零状态漂移；因此 ratio = R_mid / (R_内 + R_x)。
  // 未精准调零时 R_内 ≠ R_mid，短接（R_x = 0）指针便到不了满偏——这正是"换挡必调零"的物理由来。
  const ratio = Math.min(Math.max(rMid / Math.max(rInternal + rx, 1e-6), 0), 1.05)

  // 偏角计算：-45° 为左端 0 电流（欧姆 ∞），+45° 为右端满偏（欧姆 0）
  const pointerAngleDeg =
    MULTIMETER_CONSTANTS.MIN_ANGLE_DEG + ratio * MULTIMETER_CONSTANTS.TOTAL_SWEEP_DEG

  let readingValue = 0
  let readingDisplay = '0 Ω'

  if (ratio >= 0.999) {
    readingValue = 0
    readingDisplay = '0 Ω'
  } else if (ratio <= 0.01) {
    readingValue = Infinity
    readingDisplay = '∞'
  } else {
    // 由比例反推标尺刻度：scale = 15 * (1 - ratio) / ratio
    const scale = MULTIMETER_CONSTANTS.SCALE_MID * (1 - ratio) / ratio
    readingValue = +(scale * multiplier).toFixed(1)
    readingDisplay = `${readingValue} Ω`
  }

  let advice: 'ok' | 'switch_larger' | 'switch_smaller' | 'adjust_zero' = 'ok'
  if (!isZeroAdjusted) {
    advice = 'adjust_zero'
  } else if (ratio < 0.2) {
    // 偏角过小（指针偏在刻度盘左侧，刻度过密，读数误差大，应换更大倍率）
    advice = 'switch_larger'
  } else if (ratio > 0.8) {
    // 偏角过大（指针偏在刻度盘右侧，应换更小倍率）
    advice = 'switch_smaller'
  }

  return {
    deflectionRatio: ratio,
    pointerAngleDeg,
    readingValue,
    readingDisplay,
    rMid,
    advice,
  }
}

/**
 * 计算电压挡偏转
 *
 * @param testVoltage 被测输入电压 (V)
 * @param fullScaleVoltage 满偏量程 (V)，如 2.5, 10, 50
 * @param isConnected 表笔是否接通
 */
export function calculateVoltageReading(
  testVoltage: number,
  fullScaleVoltage: number,
  isConnected: boolean,
): MultimeterState {
  if (!isConnected) {
    return {
      deflectionRatio: 0,
      pointerAngleDeg: MULTIMETER_CONSTANTS.MIN_ANGLE_DEG,
      readingValue: 0,
      readingDisplay: '0.00 V',
      rMid: 0,
      advice: 'ok',
    }
  }

  const ratio = Math.min(Math.max(testVoltage / fullScaleVoltage, 0), 1.05)
  const pointerAngleDeg =
    MULTIMETER_CONSTANTS.MIN_ANGLE_DEG + ratio * MULTIMETER_CONSTANTS.TOTAL_SWEEP_DEG
  const readingValue = +(ratio * fullScaleVoltage).toFixed(2)

  let advice: 'ok' | 'switch_larger' | 'switch_smaller' | 'adjust_zero' = 'ok'
  if (ratio > 1.0) {
    advice = 'switch_larger'
  } else if (ratio < 0.15 && ratio > 0) {
    advice = 'switch_smaller'
  }

  return {
    deflectionRatio: ratio,
    pointerAngleDeg,
    readingValue,
    readingDisplay: `${readingValue.toFixed(2)} V`,
    rMid: 0,
    advice,
  }
}

/** 黑箱内部等效电源与阻抗 */
export const MULTIMETER_BLACK_BOX = {
  voltage: 6.0, // 内部等效电动势 (V)
  internalResistance: 15, // 内部电源内阻 (Ω)
  seriesResistance: 2800, // 内部串联电阻 (Ω)
} as const

export const MULTIMETER_RANGE_MAP = [
  'OFF',
  'DCV_2_5',
  'DCV_10',
  'DCV_50',
  'DCA_10mA',
  'DCA_100mA',
  'OHM_X1',
  'OHM_X10',
  'OHM_X100',
  'OHM_X1K',
] as const

export type MultimeterRange = (typeof MULTIMETER_RANGE_MAP)[number]

export interface MultimeterCircuitInput {
  rangeIndex: number
  zeroOffset: number
  componentType: number
  rxNominal: number
  probesConnected: boolean
}

export interface MultimeterCircuitResult extends MultimeterState {
  range: MultimeterRange
  rangeName: string
  rangeType: 'OFF' | 'DCV' | 'DCA' | 'OHM'
  rActual: number
  isZeroAdjusted: boolean
  polarityTip: string
  probesConnected: boolean
  statusText: string
}

/**
 * 多用电表整机测试电路物理响应计算（单一真源）
 */
export function calculateMultimeterCircuit(
  input: MultimeterCircuitInput,
): MultimeterCircuitResult {
  const { rangeIndex, zeroOffset, componentType, rxNominal, probesConnected } = input
  const range = MULTIMETER_RANGE_MAP[rangeIndex] ?? 'OFF'
  const isConnected = probesConnected

  if (range === 'OFF') {
    return {
      range: 'OFF',
      rangeName: '关断 (OFF)',
      rangeType: 'OFF',
      pointerAngleDeg: MULTIMETER_CONSTANTS.MIN_ANGLE_DEG,
      deflectionRatio: 0,
      readingDisplay: 'OFF',
      readingValue: 0,
      rMid: 0,
      rActual: 0,
      advice: 'ok',
      isZeroAdjusted: true,
      polarityTip: '表笔已断开',
      probesConnected: isConnected,
      statusText: '仪表已关断',
    }
  }

  // 待测元件等效电阻 (欧姆特性)
  let rEffective = rxNominal
  if (componentType === 1) {
    // 二极管正接：黑表笔接二极管正极（黑表笔为内部电源正极，正向导通）
    rEffective = 25
  } else if (componentType === 2) {
    // 二极管反接：黑表笔接二极管负极（反向截止）
    rEffective = 5000000
  } else if (componentType === 3) {
    // 黑箱内部电阻
    rEffective = MULTIMETER_BLACK_BOX.seriesResistance
  }

  const isZeroAdjusted = Math.abs(zeroOffset) <= 2

  // 1. 欧姆挡
  if (range.startsWith('OHM_')) {
    let multiplier = 1
    let rangeName = '欧姆挡 ×1'
    if (range === 'OHM_X1') {
      multiplier = 1
      rangeName = '欧姆挡 ×1'
    } else if (range === 'OHM_X10') {
      multiplier = 10
      rangeName = '欧姆挡 ×10'
    } else if (range === 'OHM_X100') {
      multiplier = 100
      rangeName = '欧姆挡 ×100'
    } else if (range === 'OHM_X1K') {
      multiplier = 1000
      rangeName = '欧姆挡 ×1k'
    }

    if (isConnected && componentType === 3) {
      // 高考核心警示：严禁带电测电阻！
      return {
        deflectionRatio: 1.05,
        pointerAngleDeg: MULTIMETER_CONSTANTS.MAX_ANGLE_DEG + 3,
        readingValue: 0,
        readingDisplay: '过载/含源',
        rMid: 15 * multiplier,
        rActual: rEffective,
        advice: 'ok',
        range,
        rangeName,
        rangeType: 'OHM',
        isZeroAdjusted,
        polarityTip: '⚠️ 严禁使用欧姆挡直接测量含源电路或有源黑箱！',
        probesConnected: isConnected,
        statusText: '⚠️ 严禁用欧姆挡测量含源器件！',
      }
    }

    const state = calculateOhmReading(multiplier, rEffective, zeroOffset, isConnected)
    let statusText = '适宜读数区（中值附近）'
    if (!isConnected) {
      statusText = '表笔断开（开路状态）'
    } else if (state.advice === 'switch_larger') {
      statusText = '偏角过小（建议换大倍率挡）'
    } else if (state.advice === 'switch_smaller') {
      statusText = '偏角过大（建议换小倍率挡）'
    } else if (state.advice === 'adjust_zero') {
      statusText = '未精准调零（误差偏大）'
    }

    return {
      ...state,
      range,
      rangeName,
      rangeType: 'OHM',
      rActual: rEffective,
      isZeroAdjusted,
      polarityTip:
        '欧姆挡红表笔接内部电源负极，黑表笔接内部电源正极（电流由黑出、红进）',
      probesConnected: isConnected,
      statusText,
    }
  }

  // 2. 直流电压挡
  if (range.startsWith('DCV_')) {
    let maxV = 10
    let rangeName = '直流电压 10V'
    if (range === 'DCV_2_5') {
      maxV = 2.5
      rangeName = '直流电压 2.5V'
    } else if (range === 'DCV_10') {
      maxV = 10
      rangeName = '直流电压 10V'
    } else if (range === 'DCV_50') {
      maxV = 50
      rangeName = '直流电压 50V'
    }

    // 只有含源黑箱内部有 6.0V 电源；常规电阻和二极管无源，外电路无电压时测得电压为 0
    const testV = isConnected
      ? componentType === 3
        ? MULTIMETER_BLACK_BOX.voltage
        : 0
      : 0
    const state = calculateVoltageReading(testV, maxV, isConnected)
    let statusText = '直流电压测量态'
    if (!isConnected) {
      statusText = '表笔未接通'
    } else if (componentType !== 3) {
      statusText = '无源元件两端无电势差 (0V)'
    } else if (testV > maxV) {
      statusText = '超量程（建议换大电压挡）'
    } else if (testV < 0.15 * maxV) {
      statusText = '读数偏小（建议换小电压挡）'
    }

    return {
      ...state,
      range,
      rangeName,
      rangeType: 'DCV',
      rActual: rEffective,
      isZeroAdjusted: true,
      polarityTip: '电压挡红表笔接高电势（+），黑表笔接低电势（-）',
      probesConnected: isConnected,
      statusText,
    }
  }

  // 3. 直流电流挡
  const maxA = range === 'DCA_10mA' ? 0.01 : 0.1
  const rangeName = range === 'DCA_10mA' ? '直流电流 10mA' : '直流电流 100mA'
  // 含源黑箱回路电流：E / (R_box + r_box) = 6.0 / (2800 + 15) ≈ 2.13mA
  const testA = isConnected
    ? componentType === 3
      ? MULTIMETER_BLACK_BOX.voltage /
        (MULTIMETER_BLACK_BOX.seriesResistance + MULTIMETER_BLACK_BOX.internalResistance)
      : 0
    : 0
  const state = calculateVoltageReading(testA, maxA, isConnected)
  const readingValMA = +(state.deflectionRatio * maxA * 1000).toFixed(2)
  let statusText = '直流电流测量态'
  if (!isConnected) {
    statusText = '表笔未接通'
  } else if (componentType !== 3) {
    statusText = '无源元件无外加电流注入 (0mA)'
  } else if (testA > maxA) {
    statusText = '超量程（建议换大电流挡）'
  } else if (testA < 0.15 * maxA) {
    statusText = '读数偏小（建议换小电流挡）'
  }

  return {
    ...state,
    range,
    rangeName,
    rangeType: 'DCA',
    readingDisplay: `${readingValMA} mA`,
    readingValue: readingValMA,
    rActual: rEffective,
    isZeroAdjusted: true,
    polarityTip: '电流挡红表笔接电流流入端（+），黑表笔接流出端（-）',
    probesConnected: isConnected,
    statusText,
  }
}
