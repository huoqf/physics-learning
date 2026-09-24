import { PhysicsGround } from '@/components/Physics'
import {
  THERMO_COLORS,
  DYNAMICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
} from '@/theme/physics'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils'
import type { SaturatedVaporPhysicsResult } from '../hooks/useSaturatedVaporPhysics'

interface SaturatedVaporSceneProps {
  physics: SaturatedVaporPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  tempCelsius: number
  vaporPressure: number
}

export function SaturatedVaporScene({
  physics,
  canvasSize,
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

      {/* 气相空间分子小球示意 */}
      <g>
        {[
          { x: 40, y: 35 }, { x: 90, y: 65 }, { x: 140, y: 30 },
          { x: 190, y: 70 }, { x: 240, y: 40 }, { x: 280, y: 75 },
          { x: 65, y: 105 }, { x: 120, y: 115 }, { x: 175, y: 95 },
          { x: 225, y: 125 }, { x: 270, y: 110 },
        ].map((pt, i) => {
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

      {/* 动态蒸发与凝结通量双向箭头 */}
      <g transform={`translate(${cylinderX + 60}, ${waterLevelY - 32})`}>
        {/* 蒸发向上箭头 */}
        <line x1={0} y1={25} x2={0} y2={5} stroke={DYNAMICS_COLORS.appliedForce} strokeWidth={2.5} />
        <polygon points="-4,8 0,0 4,8" fill={DYNAMICS_COLORS.appliedForce} />
        <text x={8} y={16} fontSize={font(10)} fill={DYNAMICS_COLORS.appliedForce}>
          蒸发速率 v蒸 ∝ T
        </text>

        {/* 凝结向下箭头 */}
        <line x1={150} y1={5} x2={150} y2={25} stroke={THERMO_COLORS.temperatureLow} strokeWidth={2.5} />
        <polygon points="146,22 150,30 154,22" fill={THERMO_COLORS.temperatureLow} />
        <text x={158} y={18} fontSize={font(10)} fill={THERMO_COLORS.temperatureLow}>
          凝结速率 v凝 ∝ p
        </text>
      </g>

      {/* 气相状态状态看板 */}
      <rect
        x={610}
        y={cylinderY + 20}
        width={180}
        height={130}
        rx={6}
        fill={withAlpha(CANVAS_COLORS.objectFillNeutral, 0.9)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1.5}
      />
      <text
        x={700}
        y={cylinderY + 45}
        fontSize={font(13)}
        fontWeight="bold"
        fill={CANVAS_COLORS.labelText}
        textAnchor="middle"
      >
        气相平衡状态
      </text>
      <text x={625} y={cylinderY + 70} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 相对湿度 RH: {physics.rh}%
      </text>
      <text x={625} y={cylinderY + 95} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 状态: {physics.status === 'saturated' ? '已达动态平衡 (饱和)' : physics.status === 'supersaturated' ? '过饱和 (凝结析出水珠)' : '未饱和 (持续净蒸发)'}
      </text>
      <text x={625} y={cylinderY + 120} fontSize={font(11)} fill={CANVAS_COLORS.labelText}>
        • 露点温度: {physics.dewPoint} ℃
      </text>
    </g>
  )
}
