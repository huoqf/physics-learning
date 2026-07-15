/**
 * 胡克定律演示 — SVG 场景组件
 *
 * 布局：splitV（840×325）
 * 坐标系统：viewBox 固定常量 + 设计坐标（方式 A）
 */

import { useAnimationViewport } from '@/hooks'
import { AnimationSvgCanvas } from '@/components/Layout'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, DASH } from '@/theme/physics'
import { Spring } from '@/components/UI'
import { Block, PhysicsGround, PhysicsVectorArrow, VectorArrow, VectorDefs } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { BOX_SIZE, PIXELS_PER_METER } from '@/physics/dynamics/spring-force'
import { calculateVectorPixelLength } from '@/utils/vectorLength'
import { useSpringForceHookeLaw } from '../hooks/useSpringForceHookeLaw'
import { HOOKE_DESIGN } from '../hooks/useSpringForceCutRope'

const DESIGN_WIDTH = HOOKE_DESIGN.width

export default function SpringForceHookeLawScene() {
  const { containerRef, canvasSize, vp } = useAnimationViewport({
    preset: CANVAS_PRESETS.splitV,
  })
  const { font } = canvasSize

  const {
    centerX,
    displacement,
    springForce,
    showVectors,
    m,
  } = useSpringForceHookeLaw()

  const { groundY, wallY, eqX, springLeftX, displaceLabelOffset } = HOOKE_DESIGN
  const wallHeight = groundY - wallY

  // 矢量场景配置：maxVectorLength 取场景可用宽度的 40%，refMagnitude 覆盖高中弹簧力范围
  const forceSceneScale = {
    ...IDENTITY_SCENE_SCALE,
    maxVectorLength: DESIGN_WIDTH * 0.4,
    refMagnitudes: { elasticForce: 100 },
  }

  return (
    <AnimationSvgCanvas containerRef={containerRef} transform={vp.transform}>
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.elasticForce, PHYSICS_COLORS.gravity, PHYSICS_COLORS.tension, PHYSICS_COLORS.displacement]} />
      </defs>

      <PhysicsGround
        x={20}
        y={groundY}
        width={DESIGN_WIDTH - 40}
        type="ground"
        appearance={{ color: PHYSICS_COLORS.axis, showBaseShadow: true }}
      />

      <PhysicsGround
        x={20}
        y={wallY}
        width={40}
        type="wall"
        wall={{ height: wallHeight, hatchCount: 8, hatchSide: 'right' }}
        appearance={{
          color: PHYSICS_COLORS.axis,
          fillColor: PHYSICS_COLORS.objectFillNeutral,
          showHatch: true,
        }}
      />

      <Spring
        x1={springLeftX}
        y1={groundY - BOX_SIZE / 2}
        x2={centerX - BOX_SIZE / 2}
        y2={groundY - BOX_SIZE / 2}
        coils={12}
        radius={13}
      />

      <Block
        x={centerX - BOX_SIZE / 2}
        y={groundY - BOX_SIZE}
        width={BOX_SIZE}
        height={BOX_SIZE}
        type="metal"
        label={`m = ${m}kg`}
        font={font}
        showCenterOfMass
        translucent
      />

      {/* 平衡位置参考线 */}
      <line
        x1={eqX}
        y1={wallY - 20}
        x2={eqX}
        y2={groundY + 10}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={STROKE.reference}
        strokeDasharray={DASH.reference.join(' ')}
      />
      <text
        x={eqX}
        y={wallY - 28}
        fontSize={font(11)}
        fill={PHYSICS_COLORS.labelTextLight}
        textAnchor="middle"
        fontWeight="bold"
      >
        平衡位置 (x=0)
      </text>

      {/* 位移标注 */}
      {Math.abs(displacement) > 0.01 && (
        <g>
          {/* 垂直投影辅助线 */}
          <line
            x1={centerX}
            y1={groundY - BOX_SIZE}
            x2={centerX}
            y2={groundY + 28}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={0.5}
            strokeDasharray="2,2"
            opacity={0.6}
          />
          <line
            x1={eqX}
            y1={groundY}
            x2={eqX}
            y2={groundY + 28}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={0.5}
            strokeDasharray="2,2"
            opacity={0.6}
          />
          {/* 位移矢量箭头（从平衡位置指向当前位置，长度 = displacement × PIXELS_PER_METER） */}
          <VectorArrow
            originDesign={{ x: eqX, y: groundY + displaceLabelOffset - 12 }}
            vector={{ x: displacement, y: 0 }}
            type="displacement"
            arrowType="visual-only"
            sceneScale={IDENTITY_SCENE_SCALE}
            strokeWidth={1.2}
            pixelLength={Math.abs(displacement * PIXELS_PER_METER)}
          />
          <text
            x={(eqX + centerX) / 2}
            y={groundY + displaceLabelOffset}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.displacement}
            textAnchor="middle"
            fontWeight="bold"
          >
            x = {displacement > 0 ? '+' : ''}{displacement.toFixed(2)}m
          </text>
        </g>
      )}

      {/* 弹力矢量 */}
      {showVectors && Math.abs(springForce) > 0.1 && (
        <g>
          <PhysicsVectorArrow
            originDesign={{ x: centerX, y: groundY - BOX_SIZE / 2 }}
            vector={{ x: springForce, y: 0 }}
            type="elasticForce"
            sceneScale={forceSceneScale}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text
            x={centerX + (springForce > 0 ? 1 : -1) * (calculateVectorPixelLength(Math.abs(springForce), 'elasticForce', forceSceneScale.maxVectorLength, 100) + 8)}
            y={groundY - BOX_SIZE / 2 + 4}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.elasticForce}
            fontWeight="bold"
          >
            F弹
          </text>
        </g>
      )}
    </AnimationSvgCanvas>
  )
}
