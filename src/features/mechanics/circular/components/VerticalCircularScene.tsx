import { PhysicsVectorArrow } from '@/components/Physics'
import { worldToDesign } from '@/scene'
import { GRAVITY } from '@/physics'
import {
  PHYSICS_COLORS, SCENE_COLORS,
  CANVAS_STYLE, STROKE, DASH,
} from '@/theme'
import { VERTICAL_CIRCULAR_LAYOUT } from '../hooks/useVerticalCircularPhysics'
import type { VerticalCircularPhysicsResult } from '../hooks/useVerticalCircularPhysics'

interface VerticalCircularSceneProps {
  physics: VerticalCircularPhysicsResult
}

export function VerticalCircularScene({ physics }: VerticalCircularSceneProps) {
  const {
    params, currentPoint, activeTrajectory,
    canvasSize, centerX, centerY, scale, ballPos,
    sceneScale,
  } = physics

  const { r, m, trackType, showAcceleration, showVectors } = params

  const x = currentPoint ? currentPoint.x : 0
  const y = currentPoint ? currentPoint.y : -r

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

      {activeTrajectory.length > 0 && (
        <path
          d={activeTrajectory
            .map((pt, idx) => {
              const pos = worldToDesign(pt.x, pt.y, sceneScale)
              return `${idx === 0 ? 'M' : 'L'} ${pos.px} ${pos.py}`
            })
            .join(' ')}
          fill="none"
          stroke={PHYSICS_COLORS.trackHistory}
          strokeWidth={STROKE.trackHistory}
          strokeDasharray={DASH.trackHistory.join(' ')}
          opacity={0.6}
        />
      )}

      {trackType === 0 ? (
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
            r={r * scale + (VERTICAL_CIRCULAR_LAYOUT.steelBallBaseRadius + m * VERTICAL_CIRCULAR_LAYOUT.massRadiusScale)}
            fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={1.5} opacity={0.3} />
          <circle cx={centerX} cy={centerY}
            r={r * scale - (VERTICAL_CIRCULAR_LAYOUT.steelBallBaseRadius + m * VERTICAL_CIRCULAR_LAYOUT.massRadiusScale)}
            fill="none" stroke={PHYSICS_COLORS.trackHistory} strokeWidth={1.5} opacity={0.3} />
        </>
      )}

      <line
        x1={centerX - r * scale - 30} y1={centerY}
        x2={centerX + r * scale + 30} y2={centerY}
        stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis}
      />
      <line
        x1={centerX} y1={centerY - r * scale - 30}
        x2={centerX} y2={centerY + r * scale + 30}
        stroke={PHYSICS_COLORS.axis} strokeWidth={STROKE.axis}
      />

      <text x={centerX + r * scale + 20} y={centerY + 14}
        fontSize={canvasSize.font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">x</text>
      <text x={centerX + 12} y={centerY - r * scale - 20}
        fontSize={canvasSize.font(12)} fill={PHYSICS_COLORS.labelText} textAnchor="middle">y</text>

      {currentPoint && (
        trackType === 0 ? (
          <line
            x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
            stroke={SCENE_COLORS.surface.ropeColor} strokeWidth={1.8}
            strokeDasharray={currentPoint.state === 'flying' ? DASH.axis.join(' ') : undefined}
            opacity={currentPoint.state === 'flying' ? 0.55 : 1}
          />
        ) : (
          <>
            <line x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
              stroke={SCENE_COLORS.pendulum.rodFill} strokeWidth={5.5} strokeLinecap="round" />
            <line x1={centerX} y1={centerY} x2={ballPos.cx} y2={ballPos.cy}
              stroke={SCENE_COLORS.pendulum.rodStroke} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
            <circle cx={centerX} cy={centerY} r={5}
              fill={SCENE_COLORS.pendulum.pivotFill} stroke={SCENE_COLORS.pendulum.pivotStroke} strokeWidth={1.5} />
          </>
        )
      )}

      <circle cx={ballPos.cx} cy={ballPos.cy}
        r={VERTICAL_CIRCULAR_LAYOUT.steelBallBaseRadius + m * VERTICAL_CIRCULAR_LAYOUT.massRadiusScale}
        fill="url(#steel-sphere-grad)" stroke={SCENE_COLORS.sphere.steel.stroke}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />

      {showVectors && currentPoint && (
        <g>
          <PhysicsVectorArrow originDesign={{ x, y }} vector={{ x: currentPoint.vx, y: currentPoint.vy }}
            type="velocity" sceneScale={sceneScale} label="v" />
          {showAcceleration === 1 && (currentPoint.state === 'on-track' ? (
            <PhysicsVectorArrow originDesign={{ x, y }}
              vector={{
                x: -(currentPoint.N / m) * Math.sin(currentPoint.theta),
                y: (currentPoint.N / m) * Math.cos(currentPoint.theta) - GRAVITY
              }}
              type="acceleration" sceneScale={sceneScale} label="a_合" />
          ) : (
            <PhysicsVectorArrow originDesign={{ x, y }} vector={{ x: 0, y: -GRAVITY }}
              type="acceleration" sceneScale={sceneScale} label="a_合" />
          ))}
          <PhysicsVectorArrow originDesign={{ x, y }} vector={{ x: 0, y: -m * GRAVITY }}
            type="gravity" sceneScale={sceneScale} label="G" />
          {currentPoint.state === 'on-track' && (
            <PhysicsVectorArrow originDesign={{ x, y }}
              vector={{
                x: -currentPoint.N * Math.sin(currentPoint.theta),
                y: currentPoint.N * Math.cos(currentPoint.theta)
              }}
              type={trackType === 0 ? 'tension' : 'normalForce'}
              sceneScale={sceneScale} label={trackType === 0 ? 'F_T' : 'F_N'} />
          )}
          <PhysicsVectorArrow originDesign={{ x, y }}
            vector={{
              x: currentPoint.state === 'on-track' ? -currentPoint.N * Math.sin(currentPoint.theta) : 0,
              y: (currentPoint.state === 'on-track' ? currentPoint.N * Math.cos(currentPoint.theta) : 0) - m * GRAVITY
            }}
            type="force" sceneScale={sceneScale} dashed={true} label="F_合 (效果力)" />
        </g>
      )}

      <text
        x={18}
        y={canvasSize.height - 20}
        fontSize={canvasSize.font(11)}
        fill={PHYSICS_COLORS.labelTextLight}
      >
        蓝：速度 v / 绿：重力 G / 紫：拉力 F_T / 天蓝：支持力 F_N / 橙：合力 F_合
      </text>
    </>
  )
}
