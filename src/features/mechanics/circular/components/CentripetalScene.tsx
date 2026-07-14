import { PhysicsVectorArrow } from '@/components/Physics'
import {
  PHYSICS_COLORS, SCENE_COLORS,
  CANVAS_STYLE, STROKE, DASH,
} from '@/theme'
import { CENTRIPETAL_LAYOUT } from '../hooks/useCentripetalPhysics'
import type { CentripetalPhysicsResult } from '../hooks/useCentripetalPhysics'

interface CentripetalSceneProps {
  physics: CentripetalPhysicsResult
  font: (base: number) => number
}

export function CentripetalScene({ physics, font }: CentripetalSceneProps) {
  const {
    params,
    a_c, F_c, x, y,
    centerX, centerY, scale, ballPos,
    sceneScale,
  } = physics

  const { r, v, m, showAcceleration, showVectors } = params

  return (
    <>
      <defs>
        <radialGradient id="steel-sphere-grad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={SCENE_COLORS.sphere.steel.gradient[0]} />
          <stop offset="40%" stopColor={SCENE_COLORS.sphere.steel.gradient[1]} />
          <stop offset="80%" stopColor={SCENE_COLORS.sphere.steel.gradient[2]} />
          <stop offset="100%" stopColor={SCENE_COLORS.sphere.steel.gradient[3]} />
        </radialGradient>
      </defs>

      <circle cx={centerX} cy={centerY} r={r * scale} fill="none"
        stroke={PHYSICS_COLORS.trackHistory} strokeWidth={STROKE.trackHistory} />
      <circle cx={centerX} cy={centerY} r={r * scale} fill="none"
        stroke={PHYSICS_COLORS.trackHistory} strokeWidth={STROKE.trackHistory + 1.5} opacity={0.08} />

      <line
        x1={centerX - r * scale - CENTRIPETAL_LAYOUT.axisExtension} y1={centerY}
        x2={centerX + r * scale + CENTRIPETAL_LAYOUT.axisExtension} y2={centerY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis}
      />
      <line
        x1={centerX} y1={centerY - r * scale - CENTRIPETAL_LAYOUT.axisExtension}
        x2={centerX} y2={centerY + r * scale + CENTRIPETAL_LAYOUT.axisExtension}
        stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis}
      />

      <text x={centerX + r * scale + 20} y={centerY + 14}
        fontSize={font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>
      <text x={centerX + 12} y={centerY - r * scale - 20}
        fontSize={font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">y</text>

      <line
        x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
        stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.reference}
        strokeDasharray={DASH.axis.join(' ')}
      />

      <circle cx={ballPos.cx} cy={ballPos.cy}
        r={CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale}
        fill="url(#steel-sphere-grad)" stroke={SCENE_COLORS.sphere.steel.stroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />

      {showVectors && (
        <g>
          <PhysicsVectorArrow originDesign={{ x, y }} vector={{ x: -y * (v / r), y: x * (v / r) }}
            type="velocity" sceneScale={sceneScale} label="v" />
          {showAcceleration === 1 && (
            <PhysicsVectorArrow originDesign={{ x, y }} vector={{ x: -x * (a_c / r), y: -y * (a_c / r) }}
              type="acceleration" sceneScale={sceneScale} label="a_向" />
          )}
          <PhysicsVectorArrow originDesign={{ x, y }} vector={{ x: -x * (F_c / r), y: -y * (F_c / r) }}
            type="force" sceneScale={sceneScale} dashed={true} label="F_向 (效果力)" />
        </g>
      )}

      <text
        x={18}
        y={650 - 20}
        fontSize={font(11)}
        fill={PHYSICS_COLORS.labelTextLight}
      >
        蓝：速度 v / 红：向心加速度 a_向 / 橙虚线：向心力 F_向
      </text>
    </>
  )
}
