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

  // 计算电流比率 I / I_g = rInternal / (rInternal + rx)
  const currentFull = MULTIMETER_CONSTANTS.E_BATTERY / rInternal
  const current = MULTIMETER_CONSTANTS.E_BATTERY / Math.max(rInternal + rx, 1e-6)
  const ratio = Math.min(Math.max(current / currentFull, 0), 1.05)

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
    readingDisplay: `${readingValue} V`,
    rMid: 0,
    advice,
  }
}
