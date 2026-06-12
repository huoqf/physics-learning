import { MARKER_TIERS, type MarkerTier } from '../../theme/physics/vectorStyle';

export function markerId(tier: MarkerTier, color: string): string {
  return `arrow-${tier}-${color.replace('#', '')}`;
}

function markerPath(w: number, h: number): string {
  return `M0,0 L${w},${h / 2} L0,${h} Z`;
}

export function VectorDefs({ colors }: { colors: string[] }) {
  return (
    <defs>
      {colors.map((color) =>
        (Object.keys(MARKER_TIERS) as MarkerTier[]).map((tier) => {
          const { width, height } = MARKER_TIERS[tier];
          return (
            <marker
              key={`${tier}-${color}`}
              id={markerId(tier, color)}
              markerWidth={width}
              markerHeight={height}
              refX={width}
              refY={height / 2}
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d={markerPath(width, height)} fill={color} />
            </marker>
          );
        }),
      )}
    </defs>
  );
}
