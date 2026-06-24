import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS, STROKE, CHART_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { Spring } from '@/components/UI'
import type { SceneScale } from '@/scene'

interface ElasticSceneProps {
  animLeft: number; animRight: number
  groundY: number; objW: number
  toPixelX: (x: number) => number
  state: { pos: number; v: number }
  m: number
  showVectors: boolean; isPlaying: boolean
  hoveredTarget: 'y0' | 'y_ref' | 'x0' | null
  smallFont: number; font: (n: number) => number
  sceneScale: SceneScale
}

export function ElasticScene({
  animLeft, animRight,
  groundY, objW, toPixelX,
  state, m,
  showVectors, isPlaying, hoveredTarget,
  smallFont, font, sceneScale,
}: ElasticSceneProps) {
  const blockR = objW * 0.45
  const blockCX = toPixelX(state.pos) + objW * 0.5
  const blockCY = groundY - blockR

  return (
    <g>
      <PhysicsGround x={animLeft} y={groundY} width={animRight - animLeft} />

      {/* 左侧固定墙壁 */}
      <PhysicsGround
        x={animLeft} y={groundY - 60} width={15}
        type="wall"
        wall={{ height: 60, hatchCount: 6, hatchSide: 'right' }}
        appearance={{ color: CANVAS_COLORS.trackHistory, fillColor: CANVAS_COLORS.axis, showHatch: true }}
      />

      {/* 平衡位置虚线 */}
      <line x1={toPixelX(0) + objW * 0.5} y1={groundY - 55} x2={toPixelX(0) + objW * 0.5} y2={groundY + 12} stroke={CHART_COLORS.reference} strokeWidth={1} strokeDasharray="3,2" opacity={0.8} />
      <text x={toPixelX(0) + objW * 0.5} y={groundY + 10} fontSize={font(7)} fill={CHART_COLORS.reference} textAnchor="middle" fontWeight="semibold">
        平衡位置(x=0)
      </text>

      {/* 弹簧 */}
      <Spring
        x1={animLeft + 15} y1={blockCY}
        x2={blockCX - blockR} y2={blockCY}
        coils={16} radius={12}
        color={PHYSICS_COLORS.potentialElastic}
      />

      {/* 振动钢珠 */}
      <g>
        <circle
          cx={blockCX} cy={blockCY} r={blockR}
          fill="url(#steel-sphere-grad)"
          stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
          strokeWidth={hoveredTarget === 'x0' && !isPlaying ? 2.2 : STROKE.objectLine}
        />
        <text x={blockCX} y={blockCY + 3} fontSize={smallFont} fill={colors.neutral[100]} fontWeight="bold" textAnchor="middle">
          {m.toFixed(1)}kg
        </text>

        {showVectors && Math.abs(state.pos) > 0.05 && (
          <VectorArrow
            origin={{ x: blockCX, y: -(blockCY - blockR - 6) }}
            vector={{ x: state.pos > 0 ? -1 : 1, y: 0 }}
            type="elasticForce"
            sceneScale={sceneScale}
            pixelLength={Math.min(Math.abs(state.pos) * 15 + 10, 45)}
          />
        )}
        {showVectors && Math.abs(state.v) > 0.1 && (
          <VectorArrow
            origin={{ x: blockCX, y: -(blockCY - blockR - 6) }}
            vector={{ x: state.v > 0 ? 1 : -1, y: 0 }}
            type="velocity"
            sceneScale={sceneScale}
            pixelLength={Math.min(Math.abs(state.v) * 5 + 10, 45)}
          />
        )}
      </g>
    </g>
  )
}
