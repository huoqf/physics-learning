import { useMemo } from 'react'
import {
  calculateChargingProcess,
  calculateMillikanOilDrop,
  type ChargingProcessResult,
  type MillikanOilDropResult,
} from '@/physics'

export interface UseChargeElementaryPhysicsOptions {
  mode: number
  method: number
  step: number
  qAInit: number
  qBInit: number
  inducerQ: number
  isGrounded: number
  voltageU: number
  plateGapMm: number
  chargeMultipleN: number
  dropMass1e15: number
}

export interface ChargeElementaryPhysicsResult {
  charging: ChargingProcessResult
  millikan: MillikanOilDropResult
}

/**
 * 电荷、起电方式与元电荷物理计算 Hook。
 * 复用物理层纯函数，供场景组件与右屏看板保持单一可信源（SSOT）。
 */
export function useChargeElementaryPhysics({
  method,
  step,
  qAInit,
  qBInit,
  inducerQ,
  isGrounded,
  voltageU,
  plateGapMm,
  chargeMultipleN,
  dropMass1e15,
}: UseChargeElementaryPhysicsOptions): ChargeElementaryPhysicsResult {
  return useMemo(() => {
    const charging = calculateChargingProcess({
      method,
      step,
      qAInit,
      qBInit,
      inducerQ,
      isGrounded,
    })
    const millikan = calculateMillikanOilDrop({
      voltageU,
      plateGapMm,
      chargeMultipleN,
      dropMass1e15,
    })
    return { charging, millikan }
  }, [
    method,
    step,
    qAInit,
    qBInit,
    inducerQ,
    isGrounded,
    voltageU,
    plateGapMm,
    chargeMultipleN,
    dropMass1e15,
  ])
}
