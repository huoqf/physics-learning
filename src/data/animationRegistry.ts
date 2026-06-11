import { AnimationConfig } from './types'
import { mechanicsKinematicsAnimations } from './registries/mechanics-kinematics'
import { mechanicsDynamicsAnimations } from './registries/mechanics-dynamics'
import { mechanicsCircularGravitationAnimations } from './registries/mechanics-circular-gravitation'
import { mechanicsForceMotionAnimations } from './registries/mechanics-force-motion'
import { mechanicsEnergyAnimations } from './registries/mechanics-energy'
import { mechanicsMomentumAnimations } from './registries/mechanics-momentum'
import { electromagnetismElectrostaticsAnimations } from './registries/electromagnetism-electrostatics'
import { electromagnetismDcCircuitsAnimations } from './registries/electromagnetism-dc-circuits'
import { electromagnetismMagnetismAnimations } from './registries/electromagnetism-magnetism'
import { electromagnetismInductionAnimations } from './registries/electromagnetism-induction'
import { electromagnetismAcAnimations } from './registries/electromagnetism-ac'

export const animationRegistry: Record<string, AnimationConfig> = {
  ...mechanicsKinematicsAnimations,
  ...mechanicsDynamicsAnimations,
  ...mechanicsCircularGravitationAnimations,
  ...mechanicsForceMotionAnimations,
  ...mechanicsEnergyAnimations,
  ...mechanicsMomentumAnimations,
  ...electromagnetismElectrostaticsAnimations,
  ...electromagnetismDcCircuitsAnimations,
  ...electromagnetismMagnetismAnimations,
  ...electromagnetismInductionAnimations,
  ...electromagnetismAcAnimations,
}

export function getAnimationConfig(id: string): AnimationConfig | undefined {
  return animationRegistry[id]
}

export { defineAnimations } from './defineAnimations'
