import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { PHYSICS_COLORS, CANVAS_COLORS, FONT, SCENE_COLORS } from '@/theme/physics'
import { VectorArrow } from '@/components/Physics/VectorArrow'
import { Block } from '@/components/Physics/Block'
import { PhysicsGround } from '@/components/Physics/PhysicsGround'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import type { SceneScale } from '@/scene'
import type { FrictionSimState } from './useFrictionSimulation'

interface BasicModeSceneProps {
  simState: FrictionSimState
  F_normal_m1: number
  f_actual_m1: number
  isSliding_m1: boolean
  m: number
  mu: number
  g: number
  F_applied: number
  weight: number
  pullScale: number
  groundY: number
  boxStartX: number
  vpVisibleW: number
  font: (size: number) => number
  frictionSceneScale: SceneScale
  boxSize: number
  showVectors: boolean
}

export default function BasicModeScene({
  simState,
  F_normal_m1,
  f_actual_m1,
  isSliding_m1,
  m,
  F_applied,
  weight,
  pullScale,
  groundY,
  boxStartX,
  vpVisibleW,
  font,
  frictionSceneScale,
  boxSize,
  showVectors,
}: BasicModeSceneProps) {
  const { updateParam } = useAnimationStore(
    useShallow((s) => ({
      updateParam: s.updateParam,
    }))
  )

  const displacement_m1 = simState.x1 * pullScale
  const boxX_m1 = boxStartX + displacement_m1
  const boxY_m1 = groundY - boxSize

  return (
    <g>
      {/* 水平地面 */}
      <PhysicsGround
        x={60}
        y={groundY}
        width={vpVisibleW - 120}
        type="ground"
        appearance={{
          showHatch: true,
          color: SCENE_COLORS.materials.structStrokeMid,
        }}
      />

      {/* 滑动时的摩擦微粒 */}
      {isSliding_m1 && (
        <g opacity={0.4}>
          <circle cx={boxX_m1 - 15} cy={groundY - 4} r={2} fill={PHYSICS_COLORS.friction} />
          <circle cx={boxX_m1 - 30} cy={groundY - 3} r={1.5} fill={PHYSICS_COLORS.friction} />
          <circle cx={boxX_m1 - 8} cy={groundY - 6} r={2.5} fill={PHYSICS_COLORS.friction} />
        </g>
      )}

      {/* 木箱滑块 */}
      <Block
        x={boxX_m1 - boxSize / 2}
        y={boxY_m1}
        width={boxSize}
        height={boxSize}
        type="wood"
        label={`m = ${m}kg`}
        stroke={CANVAS_COLORS.objectStroke}
        strokeWidth={1.8}
      />

      {/* 拉绳 */}
      <line
        x1={boxX_m1 + boxSize / 2}
        y1={groundY - boxSize / 2}
        x2={vpVisibleW - 60}
        y2={groundY - boxSize / 2}
        stroke={SCENE_COLORS.surface.smoothMark}
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {/* 受力分析矢量 */}
      {showVectors && (
        <g>
          {/* 外拉力 F (向右) */}
          <VectorArrow
            origin={{ x: boxX_m1 + boxSize / 2, y: -(groundY - boxSize / 2) }}
            vector={{ x: F_applied, y: 0 }}
            type="appliedForce"
            sceneScale={frictionSceneScale}
          />

          {/* 拖拽热区与标签 */}
          {(() => {
            const refMag = frictionSceneScale.refMagnitudes?.appliedForce ?? 40
            const totalPxLen = calculateVectorPixelLength(
              F_applied,
              'appliedForce',
              frictionSceneScale.maxVectorLength,
              refMag
            )
            const tipPxX = boxX_m1 + boxSize / 2 + totalPxLen
            const tipPxY = groundY - boxSize / 2

            return (
              <>
                <text
                  x={tipPxX + 8}
                  y={tipPxY + 4}
                  fontSize={font(FONT.axisSize)}
                  fill={PHYSICS_COLORS.appliedForce}
                  fontWeight="bold"
                >
                  F = {F_applied}N
                </text>
                {/* 拖拽热区 */}
                <circle
                  cx={tipPxX}
                  cy={tipPxY}
                  r={12}
                  fill={PHYSICS_COLORS.appliedForce}
                  opacity={0.0}
                  className="cursor-ew-resize hover:opacity-15 active:opacity-30 transition-opacity duration-150"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    const startX = e.clientX
                    const startF = F_applied

                    const handlePointerMove = (ev: PointerEvent) => {
                      const deltaX = ev.clientX - startX
                      const deltaF = deltaX / 5.5
                      const newF = Math.min(40, Math.max(0, Math.round((startF + deltaF) * 2) / 2))
                      updateParam('F_applied', newF)
                    }

                    const handlePointerUp = () => {
                      window.removeEventListener('pointermove', handlePointerMove)
                      window.removeEventListener('pointerup', handlePointerUp)
                    }

                    window.addEventListener('pointermove', handlePointerMove)
                    window.addEventListener('pointerup', handlePointerUp)
                  }}
                />
              </>
            )
          })()}

          {/* 摩擦力 f (向左) */}
          {f_actual_m1 > 0.1 && (
            <>
              <VectorArrow
                origin={{ x: boxX_m1 - boxSize / 2, y: -groundY }}
                vector={{ x: -f_actual_m1, y: 0 }}
                type="friction"
                sceneScale={frictionSceneScale}
              />
              <text
                x={boxX_m1 - boxSize / 2 - 25}
                y={groundY + 14}
                fontSize={font(FONT.axisSize)}
                fill={PHYSICS_COLORS.friction}
                fontWeight="bold"
              >
                f
              </text>
            </>
          )}

          {/* 支持力 F_N (向上) */}
          <VectorArrow
            origin={{ x: boxX_m1, y: -(groundY - boxSize / 2) }}
            vector={{ x: 0, y: F_normal_m1 }}
            type="normalForce"
            sceneScale={frictionSceneScale}
          />
          <text
            x={boxX_m1 - 22}
            y={groundY - boxSize / 2 - 32}
            fontSize={font(FONT.axisSize)}
            fill={PHYSICS_COLORS.normalForce}
            fontWeight="bold"
          >
            F_N
          </text>

          {/* 重力 G (向下) */}
          <VectorArrow
            origin={{ x: boxX_m1, y: -(groundY - boxSize / 2) }}
            vector={{ x: 0, y: -weight }}
            type="gravity"
            sceneScale={frictionSceneScale}
          />
          <text
            x={boxX_m1 + 8}
            y={groundY - boxSize / 2 + 40}
            fontSize={font(FONT.axisSize)}
            fill={PHYSICS_COLORS.gravity}
            fontWeight="bold"
          >
            G
          </text>
        </g>
      )}
    </g>
  )
}
