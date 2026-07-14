import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

interface EquivalentPolesOverlayProps {
  showEquivalentPoles: number
  fluxChange: string
  equivalentPole: 'N' | 'S' | null
  coilY: number
  cx: number
  upperPoleTextPos: { x: number; y: number }
  lowerPoleTextPos: { x: number; y: number }
  getOpacity: (steps: number[]) => number
  font: (size: number) => number
  labelFontSize: number
}

export const EquivalentPolesOverlay: React.FC<EquivalentPolesOverlayProps> = ({
  showEquivalentPoles,
  fluxChange,
  equivalentPole,
  coilY,
  cx,
  upperPoleTextPos,
  lowerPoleTextPos,
  getOpacity,
  font,
  labelFontSize,
}) => {
  if (showEquivalentPoles !== 1 || fluxChange === 'stable' || !equivalentPole) return null

  return (
    <g opacity={getOpacity([4])} className="transition-opacity duration-300">
      {/* 上等效极 */}
      <circle
        cx={cx}
        cy={coilY - 85}
        r="13"
        fill={equivalentPole === 'N' ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth}
        stroke={CANVAS_COLORS.gridSubtle}
        strokeWidth="1.5"
        style={{ filter: `drop-shadow(0px 0px 4px ${withAlpha(CANVAS_COLORS.gridSubtle, 0.4)})` }}
      />
      <text
        x={cx}
        y={coilY - 81}
        textAnchor="middle"
        fill={CANVAS_COLORS.white}
        fontWeight="bold"
        fontSize={font(12)}
      >
        {equivalentPole}
      </text>
      <text
        x={upperPoleTextPos.x}
        y={upperPoleTextPos.y}
        textAnchor="end"
        fill={equivalentPole === 'N' ? PHYSICS_COLORS.magnetNorth : PHYSICS_COLORS.magnetSouth}
        fontWeight="bold"
        fontSize={labelFontSize}
      >
        等效{equivalentPole}极
      </text>

      {/* 下等效极 */}
      <circle
        cx={cx}
        cy={coilY + 85}
        r="13"
        fill={equivalentPole === 'N' ? PHYSICS_COLORS.magnetSouth : PHYSICS_COLORS.magnetNorth}
        stroke={CANVAS_COLORS.gridSubtle}
        strokeWidth="1.5"
        style={{ filter: `drop-shadow(0px 0px 4px ${withAlpha(CANVAS_COLORS.gridSubtle, 0.4)})` }}
      />
      <text
        x={cx}
        y={coilY + 89}
        textAnchor="middle"
        fill={CANVAS_COLORS.white}
        fontWeight="bold"
        fontSize={font(12)}
      >
        {equivalentPole === 'N' ? 'S' : 'N'}
      </text>
      <text
        x={lowerPoleTextPos.x}
        y={lowerPoleTextPos.y}
        textAnchor="end"
        fill={equivalentPole === 'N' ? PHYSICS_COLORS.magnetSouth : PHYSICS_COLORS.magnetNorth}
        fontWeight="bold"
        fontSize={labelFontSize}
      >
        等效{equivalentPole === 'N' ? 'S' : 'N'}极
      </text>
    </g>
  )
}
