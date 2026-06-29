import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { handleMomentum } from './momentum'
import { handleImpulse } from './impulse'
import { handleMomentumConservation } from './momentumConservation'
import { handleCollision } from './collision'
import { handleCurvedSlot } from './curvedSlot'
import { handleSpringBlocks } from './springBlocks'
import { handleManBoat } from './manBoat'

export function buildMomentumQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  return (
    handleMomentum(animId, params, time, base) ??
    handleImpulse(animId, params, time, base) ??
    handleMomentumConservation(animId, params, time, base) ??
    handleCollision(animId, params, time, base) ??
    handleCurvedSlot(animId, params, time, base) ??
    handleSpringBlocks(animId, params, time, base) ??
    handleManBoat(animId, params, time, base) ??
    null
  )
}
