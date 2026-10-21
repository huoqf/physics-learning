import { useMemo } from 'react'
import {
  calculateMultimeterCircuit,
  type MultimeterRange,
  type MultimeterCircuitResult,
} from '@/physics/experimentMultimeter'

export type { MultimeterRange }

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

export type MultimeterPhysicsResult = MultimeterCircuitResult

export function useMultimeterPhysics({
  rangeIndex,
  zeroOffset,
  componentType,
  rxNominal,
  probesConnected,
}: MultimeterPhysicsInput): MultimeterPhysicsResult {
  return useMemo(
    () =>
      calculateMultimeterCircuit({
        rangeIndex,
        zeroOffset,
        componentType,
        rxNominal,
        probesConnected: probesConnected === 1,
      }),
    [rangeIndex, zeroOffset, componentType, rxNominal, probesConnected],
  )
}
