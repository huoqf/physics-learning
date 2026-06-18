import { PHYSICS_COLORS } from './colors'

export type VectorType =
  | 'velocity' | 'velocityX' | 'velocityY' | 'averageVelocity'
  | 'acceleration' | 'displacement'
  | 'force' | 'appliedForce' | 'elasticForce' | 'forceComponent'
  | 'gravity' | 'friction' | 'normalForce' | 'tension'
  | 'momentum' | 'impulse'
  | 'electricField' | 'magneticField' | 'electricForce'
  | 'currentDirection' | 'lorentzForce';

export const VECTOR_VISUAL_WEIGHT: Record<VectorType, number> = {
  velocity: 1.0,
  displacement: 0.9,
  acceleration: 0.8,
  momentum: 0.8,
  force: 0.7,
  gravity: 0.7,
  tension: 0.65,
  friction: 0.6,
  normalForce: 0.6,
  impulse: 0.6,
  electricForce: 0.6,
  electricField: 0.5,
  magneticField: 0.4,
  velocityX: 0.8,
  velocityY: 0.8,
  averageVelocity: 0.85,
  appliedForce: 0.7,
  elasticForce: 0.6,
  forceComponent: 0.5,
  currentDirection: 0.5,
  lorentzForce: 0.6,
};

export const VECTOR_COLORS: Record<VectorType, string> = {
  velocity:        PHYSICS_COLORS.velocity,
  velocityX:       PHYSICS_COLORS.velocityX,
  velocityY:       PHYSICS_COLORS.velocityY,
  averageVelocity: PHYSICS_COLORS.averageVelocity,
  displacement:    PHYSICS_COLORS.displacement,
  acceleration:    PHYSICS_COLORS.acceleration,
  momentum:        PHYSICS_COLORS.momentum,
  force:           PHYSICS_COLORS.forceNet,
  appliedForce:    PHYSICS_COLORS.appliedForce,
  elasticForce:    PHYSICS_COLORS.elasticForce,
  forceComponent:  PHYSICS_COLORS.forceComponent,
  gravity:         PHYSICS_COLORS.gravity,
  tension:         PHYSICS_COLORS.tension,
  friction:        PHYSICS_COLORS.friction,
  normalForce:     PHYSICS_COLORS.normalForce,
  impulse:         PHYSICS_COLORS.impulse,
  electricForce:   PHYSICS_COLORS.electricForce,
  electricField:   PHYSICS_COLORS.electricField,
  magneticField:   PHYSICS_COLORS.magneticField,
  currentDirection: PHYSICS_COLORS.currentDirection,
  lorentzForce:    PHYSICS_COLORS.lorentzForce,
};

export const MARKER_TIERS = {
  small: { width: 6, height: 4, headLength: 6 },
  medium: { width: 8, height: 5, headLength: 8 },
  large: { width: 10, height: 6, headLength: 10 },
} as const;

export type MarkerTier = keyof typeof MARKER_TIERS;

export function selectMarkerTier(length: number): MarkerTier {
  if (length < 40) return 'small';
  if (length < 120) return 'medium';
  return 'large';
}
