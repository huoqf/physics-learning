import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { handleVelocity } from './velocity'
import { handleAcceleration } from './acceleration'
import { handleChaseMeeting } from './chaseMeeting'
import { handleUniformAcceleration } from './uniformAcceleration'
import { handleFreeFall } from './freeFall'
import { handleVerticalThrow } from './verticalThrow'
import { handleKinematicsAdvanced } from './kinematicsAdvanced'
import { handleProjectile } from './projectile'
import { handleObliqueThrow } from './obliqueThrow'

export function buildKinematicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  return (
    handleVelocity(animId, params, time, base) ??
    handleAcceleration(animId, params, time, base) ??
    handleChaseMeeting(animId, params, time, base) ??
    handleUniformAcceleration(animId, params, time, base) ??
    handleFreeFall(animId, params, time, base) ??
    handleVerticalThrow(animId, params, time, base) ??
    handleKinematicsAdvanced(animId, params, time, base) ??
    handleProjectile(animId, params, time, base) ??
    handleObliqueThrow(animId, params, time, base) ??
    null
  )
}
