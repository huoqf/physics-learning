import React from 'react'
import { PHYSICS_COLORS } from '@/theme/physics'
import { Galvanometer } from '@/components/Physics'

interface GalvanometerWiringProps {
  wireTopD: string
  wireBotD: string
  fluxChange: 'increasing' | 'decreasing' | 'stable'
  time: number
  galX: number
  galY: number
  velocity: number
  inducedCurrentDirection: 'counterclockwise' | 'clockwise'
  getOpacity: (steps: number[]) => number
}

export const GalvanometerWiring: React.FC<GalvanometerWiringProps> = ({
  wireTopD,
  wireBotD,
  fluxChange,
  time,
  galX,
  galY,
  velocity,
  inducedCurrentDirection,
  getOpacity,
}) => {
  return (
    <g opacity={getOpacity([4])} className="transition-opacity duration-300">
      <path
        d={wireTopD}
        fill="none"
        stroke={PHYSICS_COLORS.labelTextLight}
        strokeWidth="2.5"
      />
      <path
        d={wireBotD}
        fill="none"
        stroke={PHYSICS_COLORS.labelTextLight}
        strokeWidth="2.5"
      />

      {fluxChange !== 'stable' && (
        <>
          <path
            d={wireTopD}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeDashoffset={time * -30}
          />
          <path
            d={wireBotD}
            fill="none"
            stroke={PHYSICS_COLORS.electricCurrent}
            strokeWidth="2.5"
            strokeDasharray="6 6"
            strokeDashoffset={time * -30}
          />
        </>
      )}

      <Galvanometer
        x={galX}
        y={galY}
        value={velocity === 0 ? 0 : (inducedCurrentDirection === 'counterclockwise' ? 1 : -1) * Math.min(1, Math.abs(velocity) * 0.45)}
        width={120}
        height={110}
      />
    </g>
  )
}
