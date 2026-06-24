import { PHYSICS_COLORS, SCENE_COLORS, STROKE, DASH } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import type { SceneScale } from '@/scene'

interface GravitySceneProps {
  animLeft: number; animRight: number; animCenterX: number
  groundY: number; ballR: number
  toPixelY: (y: number) => number
  state: { pos: number; v: number }
  m: number; y_ref: number
  showVectors: boolean; isPlaying: boolean
  hoveredTarget: 'y0' | 'y_ref' | 'x0' | null
  smallFont: number; font: (n: number) => number
  sceneScale: SceneScale
}

export function GravityScene({
  animLeft, animRight, animCenterX,
  groundY, ballR, toPixelY,
  state, m, y_ref,
  showVectors, isPlaying, hoveredTarget,
  smallFont, font, sceneScale,
}: GravitySceneProps) {
  return (
    <g>
      <PhysicsGround
        x={animLeft} y={groundY} width={animRight - animLeft}
        appearance={{ showHatch: true }}
      />

      <line x1={animCenterX} y1={toPixelY(10.0)} x2={animCenterX} y2={groundY}
        stroke={colors.neutral[200]} strokeWidth={1} strokeDasharray="3,3" />

      <g>
        <line x1={animLeft} y1={toPixelY(y_ref)} x2={animRight} y2={toPixelY(y_ref)}
          stroke={PHYSICS_COLORS.potentialEnergy}
          strokeWidth={hoveredTarget === 'y_ref' ? 2 : 1.2}
          strokeDasharray={DASH.reference.join(',')} opacity={0.85} />
        <text x={animRight - 4} y={toPixelY(y_ref) - 5} fontSize={font(8)}
          fill={PHYSICS_COLORS.potentialEnergy} textAnchor="end" fontWeight="bold">
          Ep=0 (y={y_ref.toFixed(1)}m)
        </text>
        <circle cx={animRight} cy={toPixelY(y_ref)} r={hoveredTarget === 'y_ref' ? 6 : 4}
          fill={PHYSICS_COLORS.potentialEnergy} stroke={colors.neutral.white} strokeWidth={1} opacity={0.9} />
      </g>

      <g>
        <circle cx={animCenterX} cy={toPixelY(state.pos) - ballR} r={ballR}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
          strokeWidth={hoveredTarget === 'y0' && !isPlaying ? 2.2 : STROKE.objectLine} />
        <text x={animCenterX} y={toPixelY(state.pos) - ballR + 3} fontSize={smallFont}
          fill={colors.neutral[100]} fontWeight="bold" textAnchor="middle">
          {m.toFixed(1)}kg
        </text>
        {showVectors && Math.abs(state.v) > 0.15 && (
          <VectorArrow
            origin={{ x: animCenterX + ballR + 4, y: -(toPixelY(state.pos) - ballR) }}
            vector={{ x: 0, y: state.v < 0 ? 1 : -1 }}
            type="velocity" sceneScale={sceneScale}
            pixelLength={Math.min(Math.abs(state.v) * 3.5, 45) + 4} />
        )}
      </g>

      {[0, 2, 4, 6, 8, 10].map(h => (
        <g key={`ruler-${h}`}>
          <line x1={animLeft} y1={toPixelY(h)} x2={animLeft + 8} y2={toPixelY(h)} stroke={colors.neutral[400]} strokeWidth={0.5} />
          <text x={animLeft + 10} y={toPixelY(h) + 3} fontSize={font(7)} fill={colors.neutral[400]}>{h}m</text>
        </g>
      ))}
    </g>
  )
}
