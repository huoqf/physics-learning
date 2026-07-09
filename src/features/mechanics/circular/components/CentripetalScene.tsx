import { VectorArrow } from '@/components/Physics'
import { RelationChart } from '@/components/Chart'
import {
  PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS,
  CANVAS_STYLE, STROKE, DASH,
} from '@/theme'
import { CENTRIPETAL_LAYOUT, CENTRIPETAL_CHART_RANGE } from '../hooks/useCentripetalPhysics'
import type { CentripetalPhysicsResult } from '../hooks/useCentripetalPhysics'

interface CentripetalSceneProps {
  physics: CentripetalPhysicsResult
}

export function CentripetalScene({ physics }: CentripetalSceneProps) {
  const {
    params, showFaCard,
    a_c, F_c, x, y,
    canvasSize, centerX, centerY, scale, ballPos,
    cardWidth, cardHeight, cardX, cardY,
    sceneScale, faPoints,
    handleChartMouseDown,
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
        fontSize={canvasSize.font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>
      <text x={centerX + 12} y={centerY - r * scale - 20}
        fontSize={canvasSize.font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">y</text>

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
          <VectorArrow origin={{ x, y }} vector={{ x: -y * (v / r), y: x * (v / r) }}
            type="velocity" sceneScale={sceneScale} label="v" />
          {showAcceleration === 1 && (
            <VectorArrow origin={{ x, y }} vector={{ x: -x * (a_c / r), y: -y * (a_c / r) }}
              type="acceleration" sceneScale={sceneScale} label="a_向" />
          )}
          <VectorArrow origin={{ x, y }} vector={{ x: -x * (F_c / r), y: -y * (F_c / r) }}
            type="force" sceneScale={sceneScale} dashed={true} label="F_向 (效果力)" />
        </g>
      )}

      {showFaCard && (
        <g transform={`translate(${cardX}, ${cardY})`}>
          <rect width={cardWidth} height={cardHeight} fill={SCENE_COLORS.materials.specularWhite}
            rx={8} stroke={CHART_COLORS.axisLine} strokeWidth={0.8} />
          <foreignObject x={4} y={4} width={cardWidth - 8} height={cardHeight - 8}
            style={{ pointerEvents: 'none' }}>
            <div style={{ width: '100%', height: '100%' }}>
              <RelationChart
                points={faPoints}
                xDomain={[0, CENTRIPETAL_CHART_RANGE.aMax]}
                yDomain={[0, CENTRIPETAL_CHART_RANGE.fMax]}
                xLabel="a (m/s²)" yLabel="F (N)"
                title={`动力学联动 (F_c = m · a_c)  m=${m.toFixed(1)}kg`}
                color={PHYSICS_COLORS.appliedForce} strokeWidth={1.5}
                cursorX={a_c}
                cursorLabel={(_x, f) => `F=${f.toFixed(1)}N`}
                markers={[]}
              />
            </div>
          </foreignObject>
          <rect x={0} y={0} width={cardWidth} height={cardHeight}
            fill="transparent" className="cursor-ew-resize"
            onMouseDown={handleChartMouseDown} />
        </g>
      )}
    </>
  )
}
