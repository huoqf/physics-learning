import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { handleConnectedBodies } from './connectedBodies'
import { handleSpringForce } from './springForce'
import { handleFriction } from './friction'
import { handleInclinedPlane } from './inclinedPlane'
import { handleEquilibrium } from './equilibrium'
import { handleVectorAddition } from './vectorAddition'
import { handleNewtonSecond } from './newtonSecond'
import { handleWeightlessness } from './weightlessness'
import { handleGravityBasic } from './gravityBasic'
import { handleGravity } from './gravity'
import { handleConveyor } from './conveyor'
import { handleBlockBoard } from './blockBoard'

export function buildDynamicsQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const base: PhysicsQuantity[] = []

  return (
    handleConnectedBodies(animId, params, time, base) ??
    handleSpringForce(animId, params, time, base) ??
    handleInclinedPlane(animId, params, time, base) ??
    handleFriction(animId, params, time, base) ??
    handleEquilibrium(animId, params, time, base) ??
    handleVectorAddition(animId, params, time, base) ??
    handleNewtonSecond(animId, params, time, base) ??
    handleWeightlessness(animId, params, time, base) ??
    handleGravityBasic(animId, params, time, base) ??
    handleGravity(animId, params, time, base) ??
    handleConveyor(animId, params, time, base) ??
    handleBlockBoard(animId, params, time, base) ??
    null
  )
}

