export {
  calculateAmpereForce,
  calculateLorentzForce,
  calculateChargeInMagField,
  calculateLorentzTrajectory,
  calcParticleRadius,
  calcParticlePeriod,
  calculateDoubleBoundaryExit,
  calculateCircularBoundaryExit,
  lorentzForceDir,
  electricForceDir,
  centripetalForceDir,
  ampereForceDir,
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

export { getCoilPolarity } from './polarity'
export type { CoilPolarity } from './polarity'

export {
  computeCircularGeometryOrbit,
  isInsideMagBoundary,
  type CircularGeometryParams,
  type CircularGeometryOrbit,
  type MagBoundaryType,
} from './circularGeometry'
