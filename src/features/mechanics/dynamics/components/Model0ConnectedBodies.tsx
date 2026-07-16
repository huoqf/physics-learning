import { worldToDesign } from '@/scene'
import { Block, PhysicsVectorArrow } from '@/components/Physics'
import { colors } from '@/theme/colors'
import { SystemViewBox } from './SystemViewBox'
import type { SceneScale } from '@/scene/SceneScale'

interface Model0Props {
  sceneScale: SceneScale
  groundY: number
  isSystemView: boolean
  isIsolatedView: boolean
  activeObject: number
  m1: number
  m2: number
  F: number
  g: number
  model0: {
    m1_pos: { x: number; y: number }
    m2_pos: { x: number; y: number }
    w1: number
    h1: number
    w2: number
    h2: number
    ropeLeft: { x: number; y: number }
    ropeRight: { x: number; y: number }
    T: number
    f1: number
    f2: number
  }
  font: (size: number) => number
}

export function Model0ConnectedBodies({
  sceneScale,
  groundY,
  isSystemView,
  isIsolatedView,
  activeObject,
  m1,
  m2,
  F,
  g,
  model0,
  font,
}: Model0Props) {
  return (
    <g>
      {/* 整体法虚线包裹框 */}
      {isSystemView && (
        <SystemViewBox
          sceneScale={sceneScale}
          topLeft={{ x: model0.m1_pos.x - 0.2, y: model0.m1_pos.y + model0.h1 + 0.3 }}
          bottomRight={{ x: model0.m2_pos.x + model0.w2 + 0.2, y: model0.m2_pos.y - 0.1 }}
          m1={m1}
          m2={m2}
          font={font}
        />
      )}

      {/* 物体 m1 */}
      {(() => {
        const opacity = isIsolatedView && activeObject !== 0 ? 0.15 : 1
        const lt = worldToDesign(model0.m1_pos.x, model0.m1_pos.y + model0.h1, sceneScale)
        const w = model0.w1 * sceneScale.scaleX
        const h = model0.h1 * sceneScale.scaleY
        return (
          <g opacity={opacity} className="transition-opacity duration-200">
            <Block
              x={lt.px}
              y={lt.py}
              width={w}
              height={h}
              type="standard"
              label={`m₁ = ${m1}kg`}
              font={font}
              translucent={isIsolatedView && activeObject === 0}
            />
          </g>
        )
      })()}

      {/* 连接绳 */}
      {(() => {
        const pLeft = worldToDesign(model0.ropeLeft.x, model0.ropeLeft.y, sceneScale)
        const pRight = worldToDesign(model0.ropeRight.x, model0.ropeRight.y, sceneScale)
        const opacity = isSystemView ? 0.15 : 1
        return (
          <line
            x1={pLeft.px}
            y1={pLeft.py}
            x2={pRight.px}
            y2={pRight.py}
            stroke={colors.neutral[800]}
            strokeWidth={3}
            strokeDasharray={isSystemView ? '3,3' : '0'}
            opacity={opacity}
            className="transition-opacity duration-200"
          />
        )
      })()}

      {/* 物体 m2 */}
      {(() => {
        const opacity = isIsolatedView && activeObject !== 1 ? 0.15 : 1
        const lt = worldToDesign(model0.m2_pos.x, model0.m2_pos.y + model0.h2, sceneScale)
        const w = model0.w2 * sceneScale.scaleX
        const h = model0.h2 * sceneScale.scaleY
        return (
          <g opacity={opacity} className="transition-opacity duration-200">
            <Block
              x={lt.px}
              y={lt.py}
              width={w}
              height={h}
              type="standard"
              label={`m₂ = ${m2}kg`}
              font={font}
              translucent={isIsolatedView && activeObject === 1}
            />
          </g>
        )
      })()}

      {/* 外力与内力受力分析箭头 */}
      {(
        <g>
          {/* 整体法：只画外力 */}
          {isSystemView && (
            <g>
              <PhysicsVectorArrow
                origin={model0.ropeRight}
                vector={{ x: F, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
                label={`F = ${F}N`}
                font={font}
                glow
              />
              <PhysicsVectorArrow
                origin={{ x: (model0.m1_pos.x + model0.m2_pos.x + model0.w2) / 2, y: groundY + model0.h1 / 2 }}
                vector={{ x: 0, y: -(m1 + m2) * g }}
                type="gravity"
                sceneScale={sceneScale}
                label={`(m₁+m₂)g = ${((m1 + m2) * g).toFixed(1)}N`}
                font={font}
              />
              <PhysicsVectorArrow
                origin={{ x: (model0.m1_pos.x + model0.m2_pos.x + model0.w2) / 2, y: groundY }}
                vector={{ x: 0, y: (m1 + m2) * g }}
                type="normalForce"
                sceneScale={sceneScale}
                label="N_地"
                font={font}
              />
              <PhysicsVectorArrow
                origin={{ x: (model0.m1_pos.x + model0.m2_pos.x + model0.w2) / 2, y: groundY }}
                vector={{ x: -(model0.f1 + model0.f2), y: 0 }}
                type="friction"
                sceneScale={sceneScale}
                label={`f_总 = ${(model0.f1 + model0.f2).toFixed(1)}N`}
                font={font}
              />
            </g>
          )}

          {/* 隔离法 1：隔离 m1 */}
          {isIsolatedView && activeObject === 0 && (
            <g>
              <PhysicsVectorArrow
                origin={model0.ropeLeft}
                vector={{ x: model0.T, y: 0 }}
                type="tension"
                sceneScale={sceneScale}
                label={`T = ${model0.T.toFixed(1)}N`}
                font={font}
                glow
              />
              <PhysicsVectorArrow
                origin={{ x: model0.m1_pos.x + model0.w1 / 2, y: groundY + model0.h1 / 2 }}
                vector={{ x: 0, y: -m1 * g }}
                type="gravity"
                sceneScale={sceneScale}
                label="m₁g"
                font={font}
              />
              <PhysicsVectorArrow
                origin={{ x: model0.m1_pos.x + model0.w1 / 2, y: groundY }}
                vector={{ x: 0, y: m1 * g }}
                type="normalForce"
                sceneScale={sceneScale}
                label="N₁"
                font={font}
              />
              <PhysicsVectorArrow
                origin={{ x: model0.m1_pos.x + model0.w1 / 2, y: groundY }}
                vector={{ x: -model0.f1, y: 0 }}
                type="friction"
                sceneScale={sceneScale}
                label="f₁"
                font={font}
              />
            </g>
          )}

          {/* 隔离法 2：隔离 m2 */}
          {isIsolatedView && activeObject === 1 && (
            <g>
              <PhysicsVectorArrow
                origin={{ x: model0.m2_pos.x + model0.w2, y: groundY + model0.h2 / 2 }}
                vector={{ x: F, y: 0 }}
                type="appliedForce"
                sceneScale={sceneScale}
                label={`F = ${F}N`}
                font={font}
                glow
              />
              <PhysicsVectorArrow
                origin={model0.ropeRight}
                vector={{ x: -model0.T, y: 0 }}
                type="tension"
                sceneScale={sceneScale}
                label={`T = ${model0.T.toFixed(1)}N`}
                font={font}
                glow
              />
              <PhysicsVectorArrow
                origin={{ x: model0.m2_pos.x + model0.w2 / 2, y: groundY + model0.h2 / 2 }}
                vector={{ x: 0, y: -m2 * g }}
                type="gravity"
                sceneScale={sceneScale}
                label="m₂g"
                font={font}
              />
              <PhysicsVectorArrow
                origin={{ x: model0.m2_pos.x + model0.w2 / 2, y: groundY }}
                vector={{ x: 0, y: m2 * g }}
                type="normalForce"
                sceneScale={sceneScale}
                label="N₂"
                font={font}
              />
              <PhysicsVectorArrow
                origin={{ x: model0.m2_pos.x + model0.w2 / 2, y: groundY }}
                vector={{ x: -model0.f2, y: 0 }}
                type="friction"
                sceneScale={sceneScale}
                label="f₂"
                font={font}
              />
            </g>
          )}
        </g>
      )}
    </g>
  )
}
