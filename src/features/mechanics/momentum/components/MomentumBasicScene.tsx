import { VectorArrow } from '@/components/Physics'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_STYLE } from '@/theme/physics'

import { MT_LAYOUT } from './constants'
import type { CanvasSize } from '@/utils/useCanvasSize'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene/SceneScale'

interface MomentumBasicSceneProps {
  layout: {
    m: number
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
  showGravity: boolean
  showVelocity: boolean
  showNormalForce: boolean
  vp: ViewportInfo
  groundY: number
}

export function MomentumBasicScene({ layout, sceneScale, canvasSize, showVectors, showGravity, showVelocity, showNormalForce, vp, groundY }: MomentumBasicSceneProps) {
  const {
    m, h,
    phase, cushionCompression, R_ball, cushionTopY, ballRestY, ballY,
    fallV, F_avg, collisionDt
  } = layout

  // 设计坐标：可视区域水平中心
  const ballCenterX = (vp.centerX - vp.tx) / vp.scale

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

      {/* 重力矢量 mg（全程显示，从球心向下） */}
      {showVectors && showGravity && (
        <VectorArrow
          originPixel={{ x: ballCenterX, y: ballY }}
          vector={{ x: 0, y: -m * MT_LAYOUT.g }}
          type="gravity"
          sceneScale={sceneScale}
          label="mg"
        />
      )}

      {/* 速度矢量 v（下落阶段，从球心向下） */}
      {showVectors && showVelocity && phase === 'falling' && fallV > 0 && (
        <VectorArrow
          originPixel={{ x: ballCenterX, y: ballY }}
          vector={{ x: 0, y: -fallV }}
          type="velocity"
          sceneScale={sceneScale}
          label="v"
        />
      )}

      {/* 支持力矢量 F_N（碰撞阶段，从球心向上） */}
      {showVectors && showNormalForce && (phase === 'compressing' || phase === 'recovering') && (
        <VectorArrow
          originPixel={{ x: ballCenterX, y: ballY }}
          vector={{ x: 0, y: F_avg }}
          type="normalForce"
          sceneScale={sceneScale}
          label="FN"
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
