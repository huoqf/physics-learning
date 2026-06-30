import { physicsToCanvasWithOrigin } from '@/utils'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { RelationChart } from '@/components/Chart'
import { GRAVITY } from '@/physics'
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
    params, isAdvanced, showFaCard,
    a_c, F_c, x, y,
    currentPoint, activeTrajectory,
    canvasSize, centerX, centerY, scale, ballPos,
    cardWidth, cardHeight, cardX, cardY,
    sceneScale, faPoints,
    handleChartMouseDown,
  } = physics

  const { r, v, m, trackType, showAcceleration, showVectors } = params

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

      {isAdvanced && activeTrajectory.length > 0 && (
        <path
          d={activeTrajectory
            .map((pt, idx) => {
              const pos = physicsToCanvasWithOrigin(pt.x, pt.y, centerX, centerY, scale)
              return `${idx === 0 ? 'M' : 'L'} ${pos.cx} ${pos.cy}`
            })
            .join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={STROKE.trackHistory}
          strokeDasharray={DASH.trackHistory.join(' ')}
          opacity={0.6}
        />
      )}

      {(!isAdvanced || trackType === 0) ? (
        <>
          <circle cx={centerX} cy={centerY} r={r * scale} fill="none"
            stroke={PHYSICS_COLORS.trackHistory} strokeWidth={STROKE.trackHistory} />
          <circle cx={centerX} cy={centerY} r={r * scale} fill="none"
            stroke={PHYSICS_COLORS.trackHistory} strokeWidth={STROKE.trackHistory + 1.5} opacity={0.08} />
        </>
      ) : (
        <>
          <circle cx={centerX} cy={centerY} r={r * scale} fill="none"
            stroke={PHYSICS_COLORS.trackHistory} strokeWidth={1}
            strokeDasharray="4 4" opacity={0.5} />
          <circle cx={centerX} cy={centerY}
            r={r * scale + (CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale)}
            fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={1.5} opacity={0.3} />
          <circle cx={centerX} cy={centerY}
            r={r * scale - (CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale)}
            fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={1.5} opacity={0.3} />
        </>
      )}

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

      {!isAdvanced ? (
        <line
          x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
          stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.axis.join(' ')}
        />
      ) : trackType === 0 ? (
        currentPoint && (
          <line
            x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
            stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={1.8}
            strokeDasharray={currentPoint.state === 'flying' ? DASH.axis.join(' ') : undefined}
            opacity={currentPoint.state === 'flying' ? 0.55 : 1}
          />
        )
      ) : (
        <>
          <line x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
            stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={5.5} strokeLinecap="round" />
          <line x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
            stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
          <circle cx={centerX} cy={centerY} r={5}
            fill={SCENE_COLORS.pendulum.pivotFill} stroke={SCENE_COLORS.pendulum.pivotStroke} strokeWidth={1.5} />
        </>
      )}

      <circle cx={ballPos.cx} cy={ballPos.cy}
        r={CENTRIPETAL_LAYOUT.steelBallBaseRadius + m * CENTRIPETAL_LAYOUT.massRadiusScale}
        fill="url(#steel-sphere-grad)" stroke={SCENE_COLORS.sphere.steel.stroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />

      {showVectors && (
        isAdvanced && currentPoint ? (
          <g>
            <VectorArrow origin={{ x, y }} vector={{ x: currentPoint.vx, y: currentPoint.vy }}
              type="velocity" sceneScale={sceneScale} label="v" />
            {showAcceleration === 1 && (currentPoint.state === 'on-track' ? (
              <VectorArrow origin={{ x, y }}
                vector={{
                  x: -(currentPoint.N / m) * Math.sin(currentPoint.theta),
                  y: (currentPoint.N / m) * Math.cos(currentPoint.theta) - GRAVITY
                }}
                type="acceleration" sceneScale={sceneScale} label="a_合" />
            ) : (
              <VectorArrow origin={{ x, y }} vector={{ x: 0, y: -GRAVITY }}
                type="acceleration" sceneScale={sceneScale} label="a_合" />
            ))}
            <VectorArrow origin={{ x, y }} vector={{ x: 0, y: -m * GRAVITY }}
              type="gravity" sceneScale={sceneScale} label="G" />
            {currentPoint.state === 'on-track' && (
              <VectorArrow origin={{ x, y }}
                vector={{
                  x: -currentPoint.N * Math.sin(currentPoint.theta),
                  y: currentPoint.N * Math.cos(currentPoint.theta)
                }}
                type={trackType === 0 ? 'tension' : 'normalForce'}
                sceneScale={sceneScale} label={trackType === 0 ? 'F_T' : 'F_N'} />
            )}
            <VectorArrow origin={{ x, y }}
              vector={{
                x: currentPoint.state === 'on-track' ? -currentPoint.N * Math.sin(currentPoint.theta) : 0,
                y: (currentPoint.state === 'on-track' ? currentPoint.N * Math.cos(currentPoint.theta) : 0) - m * GRAVITY
              }}
              type="force" sceneScale={sceneScale} dashed={true} label="F_合 (效果力)" />
          </g>
        ) : (
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
        )
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
