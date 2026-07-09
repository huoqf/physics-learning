import { VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'

import { MT_LAYOUT } from './constants'
import type { CanvasSize } from '@/utils/useCanvasSize'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene/SceneScale'

interface MomentumBasicSceneProps {
  layout: {
    h: number
    phase: 'falling' | 'compressing' | 'recovering' | 'done'
    cushionCompression: number
    R_ball: number
    cushionTopY: number
    ballRestY: number
    ballY: number
    fallV: number
    F_avg: number
    collisionDt: number
  }
  sceneScale: SceneScale
  canvasSize: CanvasSize
  showVectors: boolean
  vp: ViewportInfo
  groundY: number
}

export function MomentumBasicScene({ layout, sceneScale, canvasSize, showVectors, vp, groundY }: MomentumBasicSceneProps) {
  const {
    h,
    phase, cushionCompression, R_ball, cushionTopY, ballRestY, ballY,
    fallV, F_avg, collisionDt
  } = layout

  const ballCenterX = vp.centerX

  return (
    <g transform={`translate(0, ${groundY})`}>
      {/* 缓冲垫 */}
      <rect
        x={ballCenterX - 40}
        y={cushionTopY + cushionCompression}
        width={80}
        height={MT_LAYOUT.cushionHeight - cushionCompression}
        rx={4}
        fill="url(#cushion-grad)"
        stroke={PHYSICS_COLORS.elasticForce}
        strokeWidth={1.5}
      />

      {/* 缓冲垫文字与指示标注 */}
      <line
        x1={ballCenterX + 42}
        y1={cushionTopY + 10}
        x2={ballCenterX + 52}
        y2={cushionTopY + 10}
        stroke={PHYSICS_COLORS.elasticForce}
        strokeWidth={1}
        strokeDasharray="2,2"
      />
      <text
        x={ballCenterX + 55}
        y={cushionTopY + 13}
        fontSize={canvasSize.font(11)}
        fill={PHYSICS_COLORS.elasticForce}
        textAnchor="start"
        fontWeight="bold"
      >
        缓冲垫
      </text>

      {/* 下落球 */}
      <circle
        cx={ballCenterX}
        cy={ballY}
        r={R_ball}
        fill="url(#steel-sphere-grad-mt)"
        stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
        strokeWidth={CANVAS_STYLE.stroke.objectLine}
      />
      <text
        x={ballCenterX}
        y={ballY + 4}
        fontSize={canvasSize.font(11)}
        fill="white"
        textAnchor="middle"
        fontWeight="bold"
      >
        m
      </text>

      {/* 速度矢量箭头 */}
      {showVectors && phase === 'falling' && fallV > 0 && (
        <VectorArrow
          origin={{ x: ballCenterX, y: ballY - R_ball - 4 }}
          vector={{ x: 0, y: -fallV }}
          type="velocity"
          sceneScale={sceneScale}
        />
      )}

      {/* 碰撞力条（支持力） */}
      {showVectors && (phase === 'compressing' || phase === 'recovering') && (
        <VectorArrow
          origin={{ x: ballCenterX, y: ballY + R_ball + 4 }}
          vector={{ x: 0, y: F_avg }}
          type="normalForce"
          sceneScale={sceneScale}
        />
      )}

      {/* 高度标注线 */}
      <line
        x1={ballCenterX - R_ball - 20}
        y1={ballRestY - h * MT_LAYOUT.fallScale}
        x2={ballCenterX - R_ball - 20}
        y2={ballRestY}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={1}
        strokeDasharray="4,3"
      />
      <text
        x={ballCenterX - R_ball - 25}
        y={(ballRestY - h * MT_LAYOUT.fallScale / 2)}
        fontSize={canvasSize.font(11)}
        fill={PHYSICS_COLORS.axis}
        textAnchor="end"
      >
        h
      </text>

      {/* Δt 标注 */}
      {(phase === 'compressing' || phase === 'recovering') && (
        <text
          x={ballCenterX + R_ball + 15}
          y={cushionTopY + 10}
          fontSize={canvasSize.font(11)}
          fill={PHYSICS_COLORS.impulse}
          fontWeight="bold"
        >
          Δt = {collisionDt.toFixed(2)} s
        </text>
      )}
    </g>
  )
}
