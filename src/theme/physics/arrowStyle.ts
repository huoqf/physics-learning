import { MARKER_TIERS, type MarkerTier } from './vectorStyle';

export interface ArrowGeometry {
  width: number;
  height: number;
  headLength: number;
}

export function getArrowGeometry(length: number): ArrowGeometry {
  const tier: MarkerTier = length < 40 ? 'small' : length < 120 ? 'medium' : 'large';
  return { ...MARKER_TIERS[tier] };
}
