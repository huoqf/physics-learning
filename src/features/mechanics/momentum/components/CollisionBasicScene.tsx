/**
 * CollisionBasicScene.tsx
 * 基础模式（弹性/非弹性碰撞）渲染组件
 */

import { PhysicsVectorArrow, PhysicsGround } from '@/components/Physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_STYLE,
} from '@/theme/physics'
import { COL_LAYOUT } from '../collisionHooks'
import type { AnimationViewportResult } from '@/hooks'
import type { SceneScale } from '@/scene/SceneScale'

interface CollisionBasicSceneProps {
  isElastic: number
  R_A: number
  R_B: number
  posAx: number
  posBx: number
  currentV1: number
  currentV2: number
  hasCollided: boolean
  collisionTime: number
  EkBefore: number
  EkAfter: number
  time: number
  showVectors: boolean
  sceneScale: SceneScale
  canvasSize: AnimationViewportResult['canvasSize']
  groundY: number
}

export function CollisionBasicScene({
  isElastic,
  R_A, R_B, posAx, posBx, currentV1, currentV2,
  hasCollided, collisionTime, EkBefore, EkAfter,
  time, showVectors, sceneScale, canvasSize, groundY,
}: CollisionBasicSceneProps) {
  const { font } = canvasSize

  return (
    <g>
      {/* 地面线 */}
      <PhysicsGround
        x={COL_LAYOUT.canvasPadding} y={groundY}
        width={COL_LAYOUT.designWidth - 2 * COL_LAYOUT.canvasPadding}
        appearance={{ color: PHYSICS_COLORS.labelText }}
      />

      {/* A球 */}
      <circle cx={posAx} cy={groundY - R_A} r={R_A}
        fill="url(#steel-sphere-grad-col)" stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={posAx} y={groundY - R_A + 4} fontSize={font(10)} fill="white" textAnchor="middle" fontWeight="bold">A</text>

      {/* B球 */}
      <circle cx={posBx} cy={groundY - R_B} r={R_B}
        fill="url(#steel-sphere-grad-col-b)" stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={posBx} y={groundY - R_B + 4} fontSize={font(10)} fill="white" textAnchor="middle" fontWeight="bold">B</text>

      {/* 碰撞特效：弹性=弹簧，非弹性=胶水 */}
      {hasCollided && Math.abs(time - collisionTime) < 0.4 && (
        <g>
          {isElastic === 1 ? (
            <path
              d={`M ${posAx + R_A},${groundY - R_A} L ${posAx + R_A + 5},${groundY - R_A - 6} L ${posAx + R_A + 10},${groundY - R_A + 6} L ${posAx + R_A + 15},${groundY - R_A - 6} L ${posBx - R_B},${groundY - R_B}`}
              fill="none" stroke={PHYSICS_COLORS.elasticForce} strokeWidth={2}
            />
          ) : (
            <rect
              x={(posAx + posBx) / 2 - 8}
              y={groundY - Math.max(R_A, R_B) - 5}
              width={16}
              height={10}
              rx={3}
              fill={PHYSICS_COLORS.impulse}
              opacity={0.6}
            />
          )}
        </g>
      )}

      {/* 速度矢量箭头 */}
      {showVectors && (
        <g>
          {currentV1 !== 0 && (
            <PhysicsVectorArrow
              origin={{ x: posAx, y: R_A }}
              vector={{ x: currentV1, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
            />
          )}
          <text x={posAx} y={groundY - R_A * 2 - 24} fontSize={font(10)}
            fill={PHYSICS_COLORS.velocity} textAnchor="middle" fontWeight="bold">
            v₁={currentV1.toFixed(1)}
          </text>

          {currentV2 !== 0 && (
            <PhysicsVectorArrow
              origin={{ x: posBx, y: R_B }}
              vector={{ x: currentV2, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.elasticForce}
            />
          )}
          <text x={posBx} y={groundY - R_B * 2 - 24} fontSize={font(10)}
            fill={PHYSICS_COLORS.elasticForce} textAnchor="middle" fontWeight="bold">
            v₂={currentV2.toFixed(1)}
          </text>
        </g>
      )}

      {/* 状态简要文本标注 */}
      <g transform={`translate(${COL_LAYOUT.canvasPadding}, 25)`}>
        <text fontSize={font(12)} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          {isElastic === 1 ? '完全弹性碰撞' : '完全非弹性碰撞'}
        </text>
        <text x={0} y={18} fontSize={font(10)} fill={PHYSICS_COLORS.kineticEnergy}>
          系统总动能：{EkBefore.toFixed(1)} J
        </text>
        {hasCollided && (
          <text x={0} y={34} fontSize={font(10)}
            fill={Math.abs(EkBefore - EkAfter) < 0.1 ? PHYSICS_COLORS.kineticEnergy : PHYSICS_COLORS.heatLoss}
            fontWeight="bold">
            {Math.abs(EkBefore - EkAfter) < 0.1 ? '✓ 机械能守恒' : `动能损失: ${(EkBefore - EkAfter).toFixed(1)} J`}
          </text>
        )}
      </g>
    </g>
  )
}
