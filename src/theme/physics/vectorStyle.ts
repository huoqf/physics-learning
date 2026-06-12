export type VectorType =
  | 'velocity' | 'acceleration' | 'force' | 'gravity'
  | 'friction' | 'normalForce' | 'tension'
  | 'momentum' | 'impulse'
  | 'electricField' | 'magneticField' | 'electricForce' | 'displacement';

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
};

export const VECTOR_COLORS: Record<VectorType, string> = {
  velocity: '#2563EB',
  displacement: '#4F46E5',
  acceleration: '#DC2626',
  momentum: '#DB2777',
  force: '#EA580C',
  gravity: '#15803D',
  tension: '#8B5CF6',
  friction: '#B45309',
  normalForce: '#0D9488',
  impulse: '#EC4899',
  electricForce: '#F97316',
  electricField: '#D97706',
  magneticField: '#10B981',
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
