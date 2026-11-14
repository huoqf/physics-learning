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
  getAmpereForceCriticalTimes,
} from './ampereForce'

export type { BasicAmperePhysicsResult, AdvancedAmperePhysicsResult } from './ampereForce'

export {
  VELOCITY_SELECTOR_PHYSICS,
  calculateVelocitySelectorTrajectory,
  getLorentzForceCriticalTimes,
} from './velocitySelector'
export type { VelocitySelectorPoint } from './velocitySelector'

export { getCoilPolarity } from './polarity'
export type { CoilPolarity } from './polarity'

export {
  computeCircularGeometryOrbit,
  isInsideMagBoundary,
  getMagneticCircularGeomCriticalTimes,
  type CircularGeometryParams,
  type CircularGeometryOrbit,
  type MagBoundaryType,
} from './circularGeometry'

export {
  WIRE_FRAME_GRAVITY_N,
  TAP_LENGTHS_M,
  FLUX_FIELD_LINE_COUNT,
  computeBFieldRatioExperiment,
  computeMagneticFluxState,
  type BFieldRatioParams,
  type BFieldRatioSamplePoint,
  type BFieldRatioResult,
  type MagneticFluxParams,
  type MagneticFluxResult,
} from './magneticFlux'
