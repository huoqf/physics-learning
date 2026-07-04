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
          <path d={thetaArcPath} fill="none" stroke={PHYSICS_COLORS.labelText}
            strokeWidth={1.8} />
          <rect x={thetaTextPos.cx - 19} y={thetaTextPos.cy - 9} width={38} height={18}
            fill="white" fillOpacity={1} rx={3} />
          <text x={thetaTextPos.cx} y={thetaTextPos.cy + 4} fontSize={CANVAS_STYLE.font.label}
            fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.labelText} textAnchor="middle">
            θ {angle.toFixed(0)}°
          </text>
        </g>
      )}

      {mode === 0 && alphaArcPath && (
        <g>
          <path d={alphaArcPath} fill="none" stroke={PHYSICS_COLORS.forceNet}
            strokeWidth={0.8} opacity={0.6} />
          <rect x={alphaTextPos.cx - 16} y={alphaTextPos.cy - 7} width={32} height={14}
            fill="white" fillOpacity={0.9} rx={2} />
          <text x={alphaTextPos.cx} y={alphaTextPos.cy + 3} fontSize={font(10)}
            fontFamily={CANVAS_STYLE.font.family} fill={PHYSICS_COLORS.forceNet}
            textAnchor="middle">
            α {resultAngleDeg.toFixed(0)}°
          </text>
        </g>
      )}
    </>
  )
}
