import { Ball, Spring, PhysicsGround, PhysicsVectorArrow } from '@/components/Physics'
import {
  KINEMATICS_COLORS,
  DYNAMICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
  STROKE,
} from '@/theme/physics'
import { worldToDesign } from '@/scene'
import type { SceneScale } from '@/scene'
import type { ViewportInfo } from '@/utils/useViewport'
import type { CanvasSize } from '@/utils'
import type { ForcedResonancePhysicsResult } from '../hooks/useForcedResonancePhysics'

interface ForcedResonanceSceneProps {
  physics: ForcedResonancePhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  time: number
}

export function ForcedResonanceScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
}: ForcedResonanceSceneProps) {
  const { font } = canvasSize

  // 坐标映射
  const ballPoint = worldToDesign(physics.ballPos.x, physics.ballPos.y, sceneScale)
  const driverPoint = worldToDesign(physics.driverPos.x, physics.driverPos.y, sceneScale)
  const equilibriumPoint = worldToDesign(5.0, 2.0, sceneScale)

  // 偏心轮机构设计坐标
  const wheelCenter = { px: driverPoint.px, py: driverPoint.py - 70 }
  const wheelR = 26
  const crankPin = {
    px: wheelCenter.px + wheelR * Math.cos(physics.rotAngle),
    py: wheelCenter.py + wheelR * Math.sin(physics.rotAngle),
  }

  // 阻尼液槽坐标
  const damperTankY = ballPoint.py + 45
  const damperW = 90
  const damperH = 65

  return (
    <g>
      {/* 顶部固定安装台座 */}
      <PhysicsGround
        x={vp.designLeft}
        y={wheelCenter.py - 40}
        width={vp.designVisibleW}
        type="platform"
      />

      {/* 偏心轮驱动源 */}
      <circle
        cx={wheelCenter.px}
        cy={wheelCenter.py}
        r={wheelR + 4}
        fill={withAlpha(SCENE_COLORS.materials.structStroke, 0.15)}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.axis}
      />
      <circle
        cx={wheelCenter.px}
        cy={wheelCenter.py}
        r={4}
        fill={CANVAS_COLORS.axis}
      />
      {/* 偏心连杆 */}
      <line
        x1={crankPin.px}
        y1={crankPin.py}
        x2={driverPoint.px}
        y2={driverPoint.py}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle
        cx={crankPin.px}
        cy={crankPin.py}
        r={3.5}
        fill={KINEMATICS_COLORS.velocity}
      />

      {/* 驱动杆滑块横梁 */}
      <rect
        x={driverPoint.px - 36}
        y={driverPoint.py - 6}
        width={72}
        height={12}
        rx={3}
        fill={SCENE_COLORS.materials.structFill}
        stroke={CANVAS_COLORS.strokeDark}
      />

      {/* 弹簧 (连接驱动杆与振子) */}
      <Spring
        x1={driverPoint.px}
        y1={driverPoint.py + 6}
        x2={ballPoint.px}
        y2={ballPoint.py - 16}
        coils={10}
        radius={10}
      />

      {/* 平衡位置参考虚线 */}
      <line
        x1={equilibriumPoint.px - 140}
        y1={equilibriumPoint.py}
        x2={equilibriumPoint.px + 140}
        y2={equilibriumPoint.py}
        stroke={CANVAS_COLORS.axis}
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <text
        x={equilibriumPoint.px + 148}
        y={equilibriumPoint.py + 4}
        fontSize={font(11)}
        fill={CANVAS_COLORS.textMuted}
      >
        平衡位置 (O)
      </text>

      {/* 阻尼活塞与液槽 */}
      <rect
        x={ballPoint.px - damperW / 2}
        y={damperTankY}
        width={damperW}
        height={damperH}
        rx={4}
        fill={withAlpha(DYNAMICS_COLORS.friction, 0.12)}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />
      <text
        x={ballPoint.px}
        y={damperTankY + damperH - 8}
        fontSize={font(10)}
        fill={CANVAS_COLORS.textMuted}
        textAnchor="middle"
      >
        阻尼介质槽
      </text>
      {/* 阻尼连杆与叶片 */}
      <line
        x1={ballPoint.px}
        y1={ballPoint.py + 16}
        x2={ballPoint.px}
        y2={damperTankY + 28}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={2.5}
      />
      <rect
        x={ballPoint.px - 22}
        y={damperTankY + 28}
        width={44}
        height={8}
        rx={2}
        fill={SCENE_COLORS.materials.structStroke}
      />

      {/* 振子质量小球 */}
      <Ball
        cx={ballPoint.px}
        cy={ballPoint.py}
        r={16}
        type="steel"
      />

      {/* 速度矢量标注 */}
      {Math.abs(physics.velocity) > 0.02 && (
        <PhysicsVectorArrow
          originDesign={{ x: ballPoint.px + 28, y: ballPoint.py }}
          vector={{ x: 0, y: physics.velocity }}
          type="velocity"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorMain}
        />
      )}

      {/* 驱动力矢量标注 */}
      <PhysicsVectorArrow
        originDesign={{ x: driverPoint.px - 45, y: driverPoint.py }}
        vector={{ x: 0, y: physics.fDriver }}
        type="force"
        sceneScale={sceneScale}
        strokeWidth={STROKE.vectorMain}
      />

      {/* 关键物理数值标尺与说明 */}
      <text
        x={driverPoint.px - 50}
        y={driverPoint.py - 10}
        fontSize={font(11)}
        fill={DYNAMICS_COLORS.appliedForce}
        textAnchor="end"
      >
        驱动力 F
      </text>

      <text
        x={ballPoint.px + 28}
        y={ballPoint.py - 22}
        fontSize={font(11)}
        fill={KINEMATICS_COLORS.velocity}
      >
        {`v = ${physics.velocity.toFixed(2)} m/s`}
      </text>
    </g>
  )
}
