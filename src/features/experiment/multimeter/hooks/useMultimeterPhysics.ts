import { useMemo } from 'react'
import {
  calculateOhmReading,
  calculateVoltageReading,
  MULTIMETER_CONSTANTS,
  type MultimeterState,
} from '@/physics/experimentMultimeter'

/** 多用电表功能模式 */
export type MultimeterRange =
  | 'OFF'
  | 'DCV_2_5'
  | 'DCV_10'
  | 'DCV_50'
  | 'DCA_10mA'
  | 'DCA_100mA'
  | 'OHM_X1'
  | 'OHM_X10'
  | 'OHM_X100'
  | 'OHM_X1K'

export interface MultimeterPhysicsInput {
  /** 挡位枚举索引: 0:OFF, 1:DCV_2.5, 2:DCV_10, 3:DCV_50, 4:DCA_10mA, 5:DCA_100mA, 6:Ω_x1, 7:Ω_x10, 8:Ω_x100, 9:Ω_x1k */
  rangeIndex: number
  /** 欧姆调零电位器阻值微调偏移 (Ω): -50 ~ +50，0 为理想调零点 */
  zeroOffset: number
  /** 待测元件类型: 0:定值电阻, 1:二极管(黑表笔接正极), 2:二极管(黑表笔接负极), 3:黑箱未知元件 */
  componentType: number
  /** 待测定值电阻标称阻值 Rx (Ω) */
  rxNominal: number
  /** 表笔是否接触接通: 1:接触测试, 0:表笔开路挂起 */
  probesConnected: number
}

export interface MultimeterPhysicsResult extends MultimeterState {
  range: MultimeterRange
  rangeName: string
  rangeType: 'OFF' | 'DCV' | 'DCA' | 'OHM'
  rActual: number
  isZeroAdjusted: boolean
  polarityTip: string
  probesConnected: boolean
}

export function useMultimeterPhysics({
  rangeIndex,
  zeroOffset,
  componentType,
  rxNominal,
  probesConnected,
}: MultimeterPhysicsInput): MultimeterPhysicsResult {
  return useMemo(() => {
    const RANGE_MAP: MultimeterRange[] = [
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
    ]
    const range = RANGE_MAP[rangeIndex] ?? 'OFF'
    const isConnected = probesConnected === 1

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
      }
    }

    // 待测元件物理响应模拟
    let rEffective = rxNominal
    if (componentType === 1) {
      // 二极管正接：黑表笔接二极管正极（黑表笔为内部电源正极，正向导通）
      rEffective = 25
    } else if (componentType === 2) {
      // 二极管反接：黑表笔接二极管负极（反向截止）
      rEffective = 5000000
    } else if (componentType === 3) {
      // 黑箱未知元件
      rEffective = 2800
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

      const state = calculateOhmReading(multiplier, rEffective, zeroOffset, isConnected)
      return {
        ...state,
        range,
        rangeName,
        rangeType: 'OHM',
        rActual: rEffective,
        isZeroAdjusted,
        polarityTip: '欧姆挡黑表笔接内部电源正极（+），红表笔接内部电源负极（-）',
        probesConnected: isConnected,
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

      // 黑箱元件内部含有 6.0V 电源；常规电阻元件无外部电压时测得电压为 0 (可模拟微小信号)
      const testV = isConnected
        ? componentType === 3
          ? 6.0
          : Math.min(rxNominal * 0.005, maxV * 1.05)
        : 0
      const state = calculateVoltageReading(testV, maxV, isConnected)
      return {
        ...state,
        range,
        rangeName,
        rangeType: 'DCV',
        rActual: rEffective,
        isZeroAdjusted: true,
        polarityTip: '电压挡红表笔接高电势（+），黑表笔接低电势（-）',
        probesConnected: isConnected,
      }
    }

    // 3. 直流电流挡
    const maxA = range === 'DCA_10mA' ? 0.01 : 0.1
    const rangeName = range === 'DCA_10mA' ? '直流电流 10mA' : '直流电流 100mA'
    const testA = isConnected ? Math.min(rxNominal * 0.0001, maxA * 1.05) : 0
    const state = calculateVoltageReading(testA, maxA, isConnected)
    return {
      ...state,
      range,
      rangeName,
      rangeType: 'DCA',
      readingDisplay: `${(state.deflectionRatio * maxA * 1000).toFixed(1)} mA`,
      readingValue: +(state.deflectionRatio * maxA * 1000).toFixed(1),
      rActual: rEffective,
      isZeroAdjusted: true,
      polarityTip: '电流挡红表笔接电流流入端（+），黑表笔接流出端（-）',
      probesConnected: isConnected,
    }
  }, [rangeIndex, zeroOffset, componentType, rxNominal, probesConnected])
}
