import { PhysicsGround, VectorArrow } from '@/components/Physics'
import {
  THERMO_COLORS,
  DYNAMICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
  STROKE,
} from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils'
import type { SaturatedVaporPhysicsResult } from '../hooks/useSaturatedVaporPhysics'

/** 气相空间分子示意位置（相对气缸左上角的偏移，最多渲染这么多颗，按蒸汽占比缩减） */
const MOLECULE_POSITIONS = [
  { x: 40, y: 35 }, { x: 90, y: 65 }, { x: 140, y: 30 },
  { x: 190, y: 70 }, { x: 240, y: 40 }, { x: 280, y: 75 },
  { x: 65, y: 105 }, { x: 120, y: 115 }, { x: 175, y: 95 },
  { x: 225, y: 125 }, { x: 270, y: 110 },
]

interface SaturatedVaporSceneProps {
  physics: SaturatedVaporPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  tempCelsius: number
}

export function SaturatedVaporScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
  tempCelsius,
}: SaturatedVaporSceneProps) {
  const { font } = canvasSize

  const cylinderX = 260
  const cylinderY = 40
  const cylinderW = 320
  const cylinderH = 240

  const pistonY = cylinderY + cylinderH - physics.pistonHeight
  const waterLevelY = cylinderY + cylinderH - 45

  return (
    <g>
      {/* 底部基座 */}
      <PhysicsGround
        x={vp.designLeft}
        y={cylinderY + cylinderH + 20}
        width={vp.designVisibleW}
        type="platform"
      />

      {/* 气缸外壳 */}
      <rect
        x={cylinderX}
        y={cylinderY}
        width={cylinderW}
        height={cylinderH}
        rx={6}
        fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.4)}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={3}
      />

      {/* 底部液态水池 */}
      <rect
        x={cylinderX + 3}
        y={waterLevelY}
        width={cylinderW - 6}
        height={cylinderY + cylinderH - waterLevelY - 3}
        fill={withAlpha(THERMO_COLORS.temperatureLow, 0.65)}
      />
      <line
        x1={cylinderX + 3}
        y1={waterLevelY}
        x2={cylinderX + cylinderW - 3}
        y2={waterLevelY}
        stroke={THERMO_COLORS.temperatureLow}
        strokeWidth={1.5}
      />
      <text
        x={cylinderX + cylinderW / 2}
        y={waterLevelY + 28}
        fontSize={font(12)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
        textAnchor="middle"
      >
        液态水库 (恒温 T = {tempCelsius} ℃)
      </text>

      {/* 活塞机构 */}
      <rect
        x={cylinderX + 4}
        y={pistonY}
        width={cylinderW - 8}
        height={18}
        rx={3}
        fill={SCENE_COLORS.materials.structFill}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />
      {/* 活塞拉杆 */}
      <line
        x1={cylinderX + cylinderW / 2}
        y1={cylinderY - 25}
        x2={cylinderX + cylinderW / 2}
        y2={pistonY}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <text
        x={cylinderX + cylinderW / 2}
        y={cylinderY - 32}
        fontSize={font(11)}
        fill={CANVAS_COLORS.textMuted}
        textAnchor="middle"
      >
        可推拉活塞 (调节体积 V)
      </text>

      {/* 气相空间分子小球示意：数量按气相剩余蒸汽占比缩减，直观体现"饱和后压缩→液化" */}
      <g>
        {MOLECULE_POSITIONS.slice(
          0,
          Math.max(1, Math.round(MOLECULE_POSITIONS.length * physics.vaporFraction)),
        ).map((pt, i) => {
          const actualY = pistonY + 22 + (pt.y % Math.max(20, waterLevelY - pistonY - 26))
          return (
            <circle
              key={i}
              cx={cylinderX + pt.x}
              cy={actualY}
              r={4}
              fill={THERMO_COLORS.phaseChange}
              stroke={CANVAS_COLORS.strokeDark}
              strokeWidth={0.8}
            />
          )
        })}
      </g>

      {/* 动态蒸发与凝结通量双向箭头（示意箭头，长度按速率大小归一化） */}
      <VectorArrow
        originDesign={{ x: cylinderX + 60, y: waterLevelY - 7 }}
        vector={{ x: 0, y: 1 }}
        type="force"
        arrowType="visual-only"
        sceneScale={sceneScale}
        pixelLength={12 + physics.evapFlux * 0.3}
        strokeWidth={STROKE.vectorSub}
        color={DYNAMICS_COLORS.appliedForce}
      />
      <text
        x={cylinderX + 68}
        y={waterLevelY - 22}
        fontSize={font(10)}
        fill={DYNAMICS_COLORS.appliedForce}
      >
        蒸发速率 v蒸 ∝ T
      </text>

      <VectorArrow
        originDesign={{ x: cylinderX + 210, y: waterLevelY - 27 }}
        vector={{ x: 0, y: -1 }}
        type="force"
        arrowType="visual-only"
        sceneScale={sceneScale}
        pixelLength={12 + physics.condFlux * 0.3}
        strokeWidth={STROKE.vectorSub}
        color={THERMO_COLORS.temperatureLow}
      />
      <text
        x={cylinderX + 218}
        y={waterLevelY - 22}
        fontSize={font(10)}
        fill={THERMO_COLORS.temperatureLow}
      >
        凝结速率 v凝 ∝ p
      </text>

      {/* 气相状态看板 */}
      <rect
        x={610}
        y={cylinderY + 20}
        width={200}
        height={168}
        rx={6}
        fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.9)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.5}
      />
      <text
        x={710}
        y={cylinderY + 45}
        fontSize={font(13)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
        textAnchor="middle"
      >
        气相平衡状态
      </text>
      <text x={625} y={cylinderY + 70} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 实际分压 p: {(physics.vaporPressure / 1000).toFixed(2)} kPa
      </text>
      <text x={625} y={cylinderY + 93} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 饱和汽压 ps: {(physics.ps / 1000).toFixed(2)} kPa
      </text>
      <text x={625} y={cylinderY + 116} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 相对湿度 RH: {physics.rh}%
      </text>
      <text x={625} y={cylinderY + 139} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 状态: {physics.isSaturated ? '饱和 (p = ps)' : '未饱和 (p ∝ 1/V)'}
      </text>
      <text x={625} y={cylinderY + 162} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 露点温度: {physics.dewPoint} ℃
      </text>
      <text x={625} y={cylinderY + 185} fontSize={font(10)} fill={CANVAS_COLORS.textMuted}>
        {physics.isSaturated
          ? `继续压缩 → 蒸汽液化，p 锁定 ps`
          : `继续压缩 → p 按玻意耳定律升高`}
      </text>
    </g>
  )
}
