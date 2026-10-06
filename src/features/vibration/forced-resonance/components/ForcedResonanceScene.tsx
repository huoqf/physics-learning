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
  showForces?: number
}

export function ForcedResonanceScene({
  physics,
  canvasSize,
  sceneScale,
  vp,
  showForces = 1,
}: ForcedResonanceSceneProps) {
  const { font } = canvasSize

  // 统一物理坐标转换（唯一合法路径）
  const ballPoint = worldToDesign(physics.ballPhys.x, physics.ballPhys.y, sceneScale)
  const driverPoint = worldToDesign(physics.driverPhys.x, physics.driverPhys.y, sceneScale)
  const wheelCenter = worldToDesign(physics.wheelCenterPhys.x, physics.wheelCenterPhys.y, sceneScale)
  const crankPin = worldToDesign(physics.crankPinPhys.x, physics.crankPinPhys.y, sceneScale)
  const equilibriumPoint = worldToDesign(physics.equilibriumPhys.x, physics.equilibriumPhys.y, sceneScale)

  // 阻尼槽物理投影（固定不随振子晃动）
  const damperTankBottom = worldToDesign(physics.damperTankPhys.x, physics.damperTankPhys.y, sceneScale)
  const damperTankTop = worldToDesign(
    physics.damperTankPhys.x,
    physics.damperTankPhys.y + physics.damperTankPhys.height,
    sceneScale
  )
  const damperBlade = worldToDesign(physics.ballPhys.x, physics.damperBladeY, sceneScale)

  const wheelR = physics.wheelRadius * sceneScale.scale
  const damperTankW = physics.damperTankPhys.width * sceneScale.scale
  const damperTankH = Math.abs(damperTankBottom.py - damperTankTop.py)

  return (
    <g>
      {/* 顶部固定机架平台 */}
      <PhysicsGround
        x={vp.designLeft}
        y={wheelCenter.py - 48}
        width={vp.designVisibleW}
        type="platform"
      />

      {/* 竖直双导轨（限位驱动滑块） */}
      <line
        x1={driverPoint.px - 42}
        y1={wheelCenter.py - 24}
        x2={driverPoint.px - 42}
        y2={equilibriumPoint.py - 60}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={2}
        strokeDasharray="6 3"
      />
      <line
        x1={driverPoint.px + 42}
        y1={wheelCenter.py - 24}
        x2={driverPoint.px + 42}
        y2={equilibriumPoint.py - 60}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={2}
        strokeDasharray="6 3"
      />

      {/* 偏心轮驱动电机外壳与轮盘 */}
      <rect
        x={wheelCenter.px - wheelR - 16}
        y={wheelCenter.py - wheelR - 10}
        width={(wheelR + 16) * 2}
        height={(wheelR + 10) * 2}
        rx={6}
        fill={withAlpha(SCENE_COLORS.materials.structStroke, 0.06)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth={1}
      />
      <circle
        cx={wheelCenter.px}
        cy={wheelCenter.py}
        r={wheelR}
        fill={withAlpha(SCENE_COLORS.materials.structStroke, 0.18)}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={STROKE.axis}
      />
      {/* 偏心轮旋转辐射刻线 */}
      <line
        x1={wheelCenter.px}
        y1={wheelCenter.py}
        x2={crankPin.px}
        y2={crankPin.py}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={2}
        strokeDasharray="3 3"
      />
      {/* 轮心主轴轴承 */}
      <circle
        cx={wheelCenter.px}
        cy={wheelCenter.py}
        r={6}
        fill={SCENE_COLORS.materials.structFill}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />
      <circle
        cx={wheelCenter.px}
        cy={wheelCenter.py}
        r={2.5}
        fill={CANVAS_COLORS.axis}
      />

      {/* 偏心曲柄臂 (连接轴心与曲柄销) */}
      <line
        x1={wheelCenter.px}
        y1={wheelCenter.py}
        x2={crankPin.px}
        y2={crankPin.py}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={wheelCenter.px}
        y1={wheelCenter.py}
        x2={crankPin.px}
        y2={crankPin.py}
        stroke={SCENE_COLORS.materials.structFill}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* 曲柄销钉 (Crank Pin) */}
      <circle
        cx={crankPin.px}
        cy={crankPin.py}
        r={5}
        fill={KINEMATICS_COLORS.velocity}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />

      {/* 刚性曲柄传动连杆 (连接曲柄销与驱动滑块，严密刚体咬合) */}
      <line
        x1={crankPin.px}
        y1={crankPin.py}
        x2={driverPoint.px}
        y2={driverPoint.py}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <line
        x1={crankPin.px}
        y1={crankPin.py}
        x2={driverPoint.px}
        y2={driverPoint.py}
        stroke={SCENE_COLORS.materials.structFill}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* 驱动滑块横梁组件 */}
      <rect
        x={driverPoint.px - 44}
        y={driverPoint.py - 8}
        width={88}
        height={16}
        rx={4}
        fill={SCENE_COLORS.materials.structFill}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={2}
      />
      {/* 滑块导向滚轮 */}
      <circle
        cx={driverPoint.px - 42}
        cy={driverPoint.py}
        r={3.5}
        fill={CANVAS_COLORS.axis}
      />
      <circle
        cx={driverPoint.px + 42}
        cy={driverPoint.py}
        r={3.5}
        fill={CANVAS_COLORS.axis}
      />
      {/* 铰链中心销 */}
      <circle
        cx={driverPoint.px}
        cy={driverPoint.py}
        r={4}
        fill={SCENE_COLORS.materials.structStroke}
      />
      {/* 驱动力吊钩 */}
      <rect
        x={driverPoint.px - 3}
        y={driverPoint.py + 8}
        width={6}
        height={8}
        rx={1}
        fill={CANVAS_COLORS.strokeDark}
      />

      {/* 弹簧 (连接驱动端与小球) */}
      <Spring
        x1={driverPoint.px}
        y1={driverPoint.py + 16}
        x2={ballPoint.px}
        y2={ballPoint.py - 16}
        coils={10}
        radius={11}
      />

      {/* 平衡位置基准线 */}
      <line
        x1={vp.designLeft + 15}
        y1={equilibriumPoint.py}
        x2={vp.designLeft + vp.designVisibleW - 15}
        y2={equilibriumPoint.py}
        stroke={CANVAS_COLORS.axis}
        strokeDasharray="5 4"
        strokeWidth={1.2}
      />
      <text
        x={vp.designLeft + vp.designVisibleW - 20}
        y={equilibriumPoint.py - 6}
        fontSize={font(11)}
        fill={CANVAS_COLORS.textMuted}
        textAnchor="end"
      >
        平衡位置 (O)
      </text>

      {/* ── 阻尼系统 ────────────────────────────────────────────── */}
      {/* 静止固定的阻尼介质槽 (固定在基座上，绝不随振子晃动) */}
      <rect
        x={damperTankTop.px - damperTankW / 2}
        y={damperTankTop.py}
        width={damperTankW}
        height={damperTankH}
        rx={6}
        fill={withAlpha(DYNAMICS_COLORS.friction, 0.15)}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={2}
      />
      {/* 阻尼液体半透明分界面 */}
      <line
        x1={damperTankTop.px - damperTankW / 2 + 3}
        y1={damperTankTop.py + 8}
        x2={damperTankTop.px + damperTankW / 2 - 3}
        y2={damperTankTop.py + 8}
        stroke={DYNAMICS_COLORS.friction}
        strokeWidth={1.5}
        strokeDasharray="4 2"
      />
      <text
        x={damperTankTop.px}
        y={damperTankBottom.py - 10}
        fontSize={font(10)}
        fill={CANVAS_COLORS.textMuted}
        textAnchor="middle"
      >
        阻尼介质槽 (油/水)
      </text>

      {/* 随小球振动的阻尼拉杆与十字叶片 */}
      <line
        x1={ballPoint.px}
        y1={ballPoint.py + 16}
        x2={ballPoint.px}
        y2={damperBlade.py}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={2.5}
      />
      {/* 阻尼阻力叶片横梁 */}
      <rect
        x={damperBlade.px - 32}
        y={damperBlade.py - 4}
        width={64}
        height={8}
        rx={2}
        fill={SCENE_COLORS.materials.structStroke}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1}
      />
      {/* 阻尼叶片垂直导流鳍片 */}
      <line
        x1={damperBlade.px - 20}
        y1={damperBlade.py - 8}
        x2={damperBlade.px - 20}
        y2={damperBlade.py + 8}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={2}
      />
      <line
        x1={damperBlade.px + 20}
        y1={damperBlade.py - 8}
        x2={damperBlade.px + 20}
        y2={damperBlade.py + 8}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={2}
      />

      {/* 底部铸铁防震机座 */}
      <PhysicsGround
        x={vp.designLeft}
        y={damperTankBottom.py}
        width={vp.designVisibleW}
        type="ground"
      />

      {/* 振子质量小球 */}
      <Ball
        cx={ballPoint.px}
        cy={ballPoint.py}
        r={16}
        type="steel"
      />

      {/* ── 物理矢量标注体系 ──────────────────────────────────────── */}
      {/* 1. 速度矢量标注 */}
      {Math.abs(physics.state.v) > 0.03 && (
        <PhysicsVectorArrow
          originDesign={{ x: ballPoint.px + 28, y: ballPoint.py }}
          vector={{ x: 0, y: physics.state.v }}
          type="velocity"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorMain}
        />
      )}

      {/* 2. 驱动力矢量标注 (标注在驱动滑块处) */}
      {Math.abs(physics.state.fDriver) > 0.05 && (
        <PhysicsVectorArrow
          originDesign={{ x: driverPoint.px - 52, y: driverPoint.py }}
          vector={{ x: 0, y: physics.state.fDriver }}
          type="force"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorMain}
        />
      )}

      {/* 3. 弹力与阻力矢量标注 (当开启 showForces 时显示) */}
      {Boolean(showForces) && Math.abs(physics.state.elasticForce) > 0.05 && (
        <PhysicsVectorArrow
          originDesign={{ x: ballPoint.px - 28, y: ballPoint.py - 6 }}
          vector={{ x: 0, y: physics.state.elasticForce }}
          type="tension"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorSub}
        />
      )}

      {Boolean(showForces) && Math.abs(physics.state.dampingForce) > 0.05 && (
        <PhysicsVectorArrow
          originDesign={{ x: ballPoint.px - 28, y: ballPoint.py + 6 }}
          vector={{ x: 0, y: physics.state.dampingForce }}
          type="friction"
          sceneScale={sceneScale}
          strokeWidth={STROKE.vectorSub}
        />
      )}

      {/* ── 物理文字与参数标注 ────────────────────────────────────── */}
      <text
        x={driverPoint.px - 56}
        y={driverPoint.py - 8}
        fontSize={font(11)}
        fill={DYNAMICS_COLORS.appliedForce}
        textAnchor="end"
      >
        {`驱动力 F: ${physics.state.fDriver.toFixed(2)} N`}
      </text>

      <text
        x={ballPoint.px + 30}
        y={ballPoint.py - 18}
        fontSize={font(11)}
        fill={KINEMATICS_COLORS.velocity}
      >
        {`v = ${physics.state.v.toFixed(2)} m/s`}
      </text>

      {/* 位移标注 */}
      <text
        x={ballPoint.px + 30}
        y={ballPoint.py + 26}
        fontSize={font(11)}
        fill={CANVAS_COLORS.textMuted}
      >
        {`x = ${(physics.state.x * 100).toFixed(1)} cm`}
      </text>

      {/* 偏心轮驱动源标识 */}
      <text
        x={wheelCenter.px + wheelR + 24}
        y={wheelCenter.py + 4}
        fontSize={font(11)}
        fill={CANVAS_COLORS.textMuted}
      >
        偏心轮驱动
      </text>
    </g>
  )
}
