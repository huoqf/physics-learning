import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import type { VectorAdditionPhysicsData } from './useVectorAdditionPhysics'

interface VectorAngleArcProps {
  physicsData: VectorAdditionPhysicsData
  angle: number
  mode: number
  font: (size: number) => number
}

export function VectorAngleArc({ physicsData, angle, mode, font }: VectorAngleArcProps) {
  const { thetaArcPath, thetaTextPos, alphaArcPath, alphaTextPos, resultAngleDeg } = physicsData

  return (
    <>
      {thetaArcPath && (
        <g>
          <path d={thetaArcPath} fill="none" stroke={PHYSICS_COLORS.labelTextLight}
            strokeWidth={1.2} strokeDasharray="2,2" />
          <rect x={thetaTextPos.cx - 16} y={thetaTextPos.cy - 9} width={32} height={16}
            fill="white" fillOpacity={0.85} rx={3} />
          <text x={thetaTextPos.cx} y={thetaTextPos.cy + 3} fontSize={CANVAS_STYLE.font.annotation}
            fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
            {angle.toFixed(0)}°
          </text>
        </g>
      )}

      {mode !== 2 && alphaArcPath && (
        <g>
          <path d={alphaArcPath} fill="none" stroke={PHYSICS_COLORS.forceNet} strokeWidth={1} />
          <rect x={alphaTextPos.cx - 18} y={alphaTextPos.cy - 9} width={36} height={16}
            fill="white" fillOpacity={0.85} rx={3} />
          <text x={alphaTextPos.cx} y={alphaTextPos.cy + 3} fontSize={font(11)}
            fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.forceNet}
            fontWeight="bold" textAnchor="middle">
            α={resultAngleDeg.toFixed(0)}°
          </text>
        </g>
      )}
    </>
  )
}
