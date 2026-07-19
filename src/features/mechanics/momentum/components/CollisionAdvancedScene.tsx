/**
 * CollisionAdvancedScene.tsx
 * 进阶模式（带能量损失系数）渲染组件
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

interface CollisionAdvancedSceneProps {
  vA: number
  R_Adv: number
  R_Bdv: number
  posAAdv: number
  posBAdv: number
  curVA: number
  curVB: number
  hasCollidedAdv: boolean
  colTimeAdv: number
  velocitySwap: boolean
  heavyLight: boolean
  lightHeavy: boolean
  xCmAdv: number
  time: number
  showVectors: boolean
  sceneScale: SceneScale
  canvasSize: AnimationViewportResult['canvasSize']
  groundY: number
}

export function CollisionAdvancedScene({
  vA,
  R_Adv, R_Bdv, posAAdv, posBAdv, curVA, curVB,
  hasCollidedAdv, colTimeAdv, velocitySwap, heavyLight, lightHeavy,
  xCmAdv, time, showVectors, sceneScale, canvasSize, groundY,
}: CollisionAdvancedSceneProps) {
  const { font } = canvasSize

  return (
    <g>
      {/* 地面线 */}
      <PhysicsGround
        x={COL_LAYOUT.canvasPadding} y={groundY}
        width={COL_LAYOUT.designWidth - 2 * COL_LAYOUT.canvasPadding}
        appearance={{ color: PHYSICS_COLORS.labelText }}
      />

      {/* 特例高亮背景提示 */}
      {velocitySwap && hasCollidedAdv && (
        <rect x={0} y={0} width={COL_LAYOUT.designWidth} height={COL_LAYOUT.designWidth}
          fill={PHYSICS_COLORS.kineticEnergy} opacity={0.03} />
      )}

      {/* 质心虚线参考 */}
      <line x1={xCmAdv} y1={10} x2={xCmAdv} y2={groundY}
        stroke={PHYSICS_COLORS.referencePoint} strokeWidth={1}
        strokeDasharray="4,4" opacity={0.4} />
      <text x={xCmAdv} y={16} fontSize={font(9)} fill={PHYSICS_COLORS.referencePoint} textAnchor="middle">
        质心
      </text>

      {/* A球 */}
      <circle cx={posAAdv} cy={groundY - R_Adv} r={R_Adv}
        fill="url(#steel-sphere-grad-col)" stroke={SCENE_COLORS.materials.steelSphereGrad[2]}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={posAAdv} y={groundY - R_Adv + 4} fontSize={font(10)} fill="white" textAnchor="middle" fontWeight="bold">A</text>

      {/* B球 */}
      <circle cx={posBAdv} cy={groundY - R_Bdv} r={R_Bdv}
        fill="url(#steel-sphere-grad-col-b)" stroke={SCENE_COLORS.materials.vacuumSphereGrad[2]}
        strokeWidth={CANVAS_STYLE.stroke.objectLine} />
      <text x={posBAdv} y={groundY - R_Bdv + 4} fontSize={font(10)} fill="white" textAnchor="middle" fontWeight="bold">B</text>

      {/* 碰撞瞬间特效闪光 */}
      {hasCollidedAdv && Math.abs(time - colTimeAdv) < 0.3 && (
        <circle cx={(posAAdv + posBAdv) / 2} cy={groundY - Math.max(R_Adv, R_Bdv)}
          r={8 + (0.3 - Math.abs(time - colTimeAdv)) * 30}
          fill={PHYSICS_COLORS.kineticEnergy} opacity={0.3} />
      )}

      {/* 速度矢量箭头 */}
      {showVectors && (
        <g>
          {curVA !== 0 && (
            <PhysicsVectorArrow
              originDesign={{ x: posAAdv, y: groundY - R_Adv }}
              vector={{ x: curVA, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
            />
          )}
          <text x={posAAdv} y={groundY - R_Adv * 2 - 24} fontSize={font(10)}
            fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
            v_A' = {curVA.toFixed(2)}
          </text>

          {curVB !== 0 && (
            <PhysicsVectorArrow
              originDesign={{ x: posBAdv, y: groundY - R_Bdv }}
              vector={{ x: curVB, y: 0 }}
              type="velocity"
              sceneScale={sceneScale}
              color={PHYSICS_COLORS.elasticForce}
            />
          )}
          <text x={posBAdv} y={groundY - R_Bdv * 2 - 24} fontSize={font(10)}
            fill={PHYSICS_COLORS.elasticForce} fontWeight="bold" textAnchor="middle">
            v_B' = {curVB.toFixed(2)}
          </text>
        </g>
      )}

      {/* 物理特例与极值提示文案 */}
      {velocitySwap && hasCollidedAdv && (
        <text x={COL_LAYOUT.designWidth / 2} y={35} fontSize={font(12)}
          fill={PHYSICS_COLORS.kineticEnergy} fontWeight="bold" textAnchor="middle">
          等质量完全弹性碰撞：速度交换！A静止，B带走全部速度
        </text>
      )}
      {heavyLight && hasCollidedAdv && (
        <text x={COL_LAYOUT.designWidth / 2} y={35} fontSize={font(12)}
          fill={PHYSICS_COLORS.velocity} fontWeight="bold" textAnchor="middle">
          大撞小 ($m_A \gg m_B$)：大球速度几乎不变，小球速度变为 $v_B' \approx 2v_A$ = {(2 * vA).toFixed(1)} m/s
        </text>
      )}
      {lightHeavy && hasCollidedAdv && (
        <text x={COL_LAYOUT.designWidth / 2} y={35} fontSize={font(12)}
          fill={PHYSICS_COLORS.elasticForce} fontWeight="bold" textAnchor="middle">
          小撞大 ($m_A \ll m_B$)：小球原速率反弹，大球近似静止
        </text>
      )}
    </g>
  )
}
