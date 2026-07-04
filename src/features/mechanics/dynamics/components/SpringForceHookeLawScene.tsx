/**
 * 胡克定律演示 — SVG 场景组件
 *
 * 布局：splitV（700×325）
 * 坐标系统：viewBox 固定常量 + 设计坐标（方式 A）
 */

import { useCanvasSize } from '@/utils'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PHYSICS_COLORS, CANVAS_STYLE, STROKE, DASH } from '@/theme/physics'
import { Spring } from '@/components/UI'
import { Block, PhysicsGround, VectorArrow, VectorDefs } from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { BOX_SIZE } from '@/physics/dynamics/spring-force'
import { useSpringForceHookeLaw } from '../hooks/useSpringForceHookeLaw'
import { HOOKE_DESIGN } from '../hooks/useSpringForceCutRope'

const DESIGN_WIDTH = HOOKE_DESIGN.width
const DESIGN_HEIGHT = HOOKE_DESIGN.height

export default function SpringForceHookeLawScene() {
  const [, canvasSize] = useCanvasSize(CANVAS_PRESETS.splitV)
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

  return (
    <svg
      viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      className="bg-white rounded-lg shadow-inner"
    >
      <defs>
        <VectorDefs colors={[PHYSICS_COLORS.elasticForce, PHYSICS_COLORS.gravity, PHYSICS_COLORS.tension]} />
        <marker id="arrow-displacement-start" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
          <polygon points="6 1, 0 3, 6 5" fill={PHYSICS_COLORS.displacement} />
        </marker>
        <marker id="arrow-displacement-end" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 1, 6 3, 0 5" fill={PHYSICS_COLORS.displacement} />
        </marker>
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
          <line
            x1={eqX}
            y1={groundY + displaceLabelOffset - 12}
            x2={centerX}
            y2={groundY + displaceLabelOffset - 12}
            stroke={PHYSICS_COLORS.displacement}
            strokeWidth={1.2}
            markerStart="url(#arrow-displacement-start)"
            markerEnd="url(#arrow-displacement-end)"
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
          <VectorArrow
            origin={{ x: centerX, y: -(groundY - BOX_SIZE / 2) }}
            vector={{ x: springForce * 0.4, y: 0 }}
            type="elasticForce"
            sceneScale={IDENTITY_SCENE_SCALE}
            strokeWidth={CANVAS_STYLE.stroke.vectorMain}
          />
          <text
            x={centerX + springForce * 0.4 + (springForce > 0 ? 8 : -22)}
            y={groundY - BOX_SIZE / 2 + 4}
            fontSize={font(10)}
            fill={PHYSICS_COLORS.elasticForce}
            fontWeight="bold"
          >
            F弹
          </text>
        </g>
      )}
    </svg>
  )
}
