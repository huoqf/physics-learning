export {
  calculateAmpereForce,
  calculateLorentzForce,
  calculateChargeInMagField,
  calculateLorentzTrajectory,
  calcParticleRadius,
  calcParticlePeriod,
  calcTrajectoryCenter,
  calcParticleArcAngle,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
  lorentzForceDir,
  electricForceDir,
  centripetalForceDir,
  type BDirection,
} from './forces'

export {
  AMPERE_BASIC_SCENE,
  AMPERE_ADVANCED_SCENE,
  solveBasicAmpere,
  solveAdvancedAmpere,
} from './ampereForce'

export type { BasicAmperePhysicsResult, AdvancedAmperePhysicsResult } from './ampereForce'

export { calculateVelocitySelectorTrajectory } from './velocitySelector'
export type { VelocitySelectorPoint } from './velocitySelector'
