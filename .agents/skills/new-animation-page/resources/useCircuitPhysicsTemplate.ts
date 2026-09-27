import { useMemo } from 'react'

export interface CircuitPhysicsInput {
  emf?: number             // 电动势 E (V)
  internalR?: number       // 内阻 r (Ω)
  resistance?: number      // 外部负载阻值 R (Ω)
  maxResistance?: number   // 变阻器最大阻值 (Ω)
  isClosed?: boolean       // 开关通断状态
}

export interface CircuitPhysicsResult {
  current: number          // 回路电流 I (A)
  terminalVoltage: number  // 路端电压 U (V)
  resistance: number       // 当前负载阻值 (Ω)
  maxResistance: number    // 负载最大阻值 (Ω)
  sliderRatio: number      // 滑片位置 0~1
  isClosed: boolean        // 通断状态
}

/**
 * 标准电路实验物理计算 Hook 模板
 * 严格遵守闭合电路欧姆定律与通断物理真实性：
 * - 开关断开 (isClosed = false): 回路电流为 0，路端电压为开路电动势 E，变阻器分压为 0
 * - 开关闭合 (isClosed = true): I = E / (R + r), U = E - I * r
 */
export function useCircuitPhysicsTemplate(params: CircuitPhysicsInput): CircuitPhysicsResult {
  const {
    emf = 3.0,
    internalR = 0.5,
    resistance = 10.0,
    maxResistance = 20.0,
    isClosed = true,
  } = params

  return useMemo(() => {
    const sliderRatio = Math.max(0, Math.min(1, maxResistance > 0 ? resistance / maxResistance : 0))

    if (!isClosed) {
      return {
        current: 0,
        terminalVoltage: emf, // 开路时电压表接电源两端测得电动势
        resistance,
        maxResistance,
        sliderRatio,
        isClosed: false,
      }
    }

    const totalR = internalR + resistance
    const current = totalR > 1e-4 ? emf / totalR : 0
    const terminalVoltage = emf - current * internalR

    return {
      current,
      terminalVoltage,
      resistance,
      maxResistance,
      sliderRatio,
      isClosed: true,
    }
  }, [emf, internalR, resistance, maxResistance, isClosed])
}
