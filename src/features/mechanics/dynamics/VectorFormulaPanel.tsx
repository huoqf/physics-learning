import { PHYSICS_COLORS, CANVAS_STYLE } from '@/theme/physics'
import type { VectorAdditionPhysicsData } from './useVectorAdditionPhysics'

interface VectorFormulaPanelProps {
  mode: number
  f1: number
  f2: number
  angle: number
  physicsData: VectorAdditionPhysicsData
}

export function VectorFormulaPanel({ mode, f1, f2, angle, physicsData }: VectorFormulaPanelProps) {
  const { fResultant, resultAngleDeg, fxVal, fyVal } = physicsData

  return (
    <g transform="translate(20, 30)">
      <text fontSize={CANVAS_STYLE.font.title} fill={PHYSICS_COLORS.labelText}
        fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
        {mode === 2 ? "力的正交分解" : "力的合成（共点力）"}
      </text>
      <g transform="translate(0, 15)">
        {mode === 2 ? (
          <>
            <text x={0} y={15} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              原合力 F = {f1.toFixed(1)} N
            </text>
            <text x={0} y={35} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
              分解偏角 θ = {angle.toFixed(0)}°
            </text>
            <text x={0} y={65} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              水平分量 F_x = {fxVal.toFixed(2)} N
            </text>
            <text x={0} y={85} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceComponent} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              竖直分量 F_y = {fyVal.toFixed(2)} N
            </text>
          </>
        ) : (
          <>
            <text x={0} y={15} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              分力 F₁ = {f1.toFixed(1)} N
            </text>
            <text x={0} y={35} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.tension} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              分力 F₂ = {f2.toFixed(1)} N
            </text>
            <text x={0} y={55} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.labelTextLight} fontFamily={CANVAS_STYLE.font.family}>
              夹角 θ = {angle.toFixed(0)}°
            </text>
            <text x={0} y={85} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              合力 F = {fResultant.toFixed(2)} N
            </text>
            <text x={0} y={105} fontSize={CANVAS_STYLE.font.bodySize} fill={PHYSICS_COLORS.forceNet} fontWeight="bold" fontFamily={CANVAS_STYLE.font.family}>
              合力与 F₁ 夹角 α = {resultAngleDeg.toFixed(1)}°
            </text>
          </>
        )}
      </g>
    </g>
  )
}
