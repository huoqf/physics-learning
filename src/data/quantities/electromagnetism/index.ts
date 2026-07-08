/**
 * 电磁学动画物理量看板数据构建。
 *
 * 按域拆分为 5 个子模块，由 index.ts 统一调度。
 */
import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { handleElectrostatics } from './electrostatics'
import { handleDcCircuits } from './dc-circuits'
import { handleMagnetism } from './magnetism'
import { handleInduction } from './induction'
import { handleAc } from './ac'
import { handleCombinedFields } from './combinedFields'

export function buildElectromagnetismQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
  lastChangedParam?: string | null,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  return (
    handleElectrostatics(animId, params, time, base) ??
    handleDcCircuits(animId, params, time, base) ??
    handleMagnetism(animId, params, time, base) ??
    handleInduction(animId, params, time, base) ??
    handleAc(animId, params, time, lastChangedParam ?? null, base) ??
    handleCombinedFields(animId, params, time, base) ??
    null
  )
}
