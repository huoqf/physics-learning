import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import {
  DCSource,
  CoilBase,
  LightBulb,
  Rheostat,
  MagneticFieldGrid,
  CircuitSwitch,
  PhysicsVectorArrow,
} from '@/components/Physics'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  withAlpha,
} from '@/theme/physics'
import type { SelfInductionPhysicsResult } from '../hooks/useSelfInductionPhysics'

export interface SelfInductionSceneProps {
  physics: SelfInductionPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  time: number
}

export function SelfInductionScene({
  physics,
  canvasSize,
  sceneScale,
  time,
}: SelfInductionSceneProps) {
  const { font } = canvasSize
  const {
    mode,
    iCoil,
    powerLamp1,
    powerLamp2,
    switchClosed,
    theta,
    isSlottedBool,
    isInMagneticField,
  } = physics

  if (mode === 2) {
    // Mode 2: 电磁阻尼摆动场景
    const pivotX = 420
    const pivotY = 30
    const armLength = 190
    const bobX = pivotX + armLength * Math.sin(theta)
    const bobY = pivotY + armLength * Math.cos(theta)
    const plateWidth = 60
    const plateHeight = 44

    return (
      <g>
        {/* 匀强磁场区 */}
        <rect
          x={360}
          y={170}
          width={120}
          height={90}
          fill={withAlpha(PHYSICS_COLORS.negativeCharge, 0.08)}
          stroke={PHYSICS_COLORS.magneticField}
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <MagneticFieldGrid x={360} y={170} w={120} h={90} direction="in" />
        <text
          x={420}
          y={164}
          fill={PHYSICS_COLORS.magneticField}
          fontSize={font(11)}
          textAnchor="middle"
          fontWeight={600}
        >
          匀强磁场区 B
        </text>

        {/* 摆杆与悬挂支架 */}
        <circle cx={pivotX} cy={pivotY} r={5} fill={SCENE_COLORS.materials.structStrokeMid} />
        <line
          x1={pivotX}
          x2={bobX}
          y1={pivotY}
          y2={bobY}
          stroke={CANVAS_COLORS.textMuted}
          strokeWidth={2.5}
        />

        {/* 摆锤金属板 (整体板 vs 梳齿开缝板) */}
        <g transform={`translate(${bobX}, ${bobY}) rotate(${(-theta * 180) / Math.PI})`}>
          <rect
            x={-plateWidth / 2}
            y={-plateHeight / 2}
            width={plateWidth}
            height={plateHeight}
            fill={SCENE_COLORS.materials.structStrokePale}
            stroke={SCENE_COLORS.materials.structStrokeMid}
            strokeWidth={1.8}
            rx={2}
          />
          {/* 梳齿开缝纹理 */}
          {isSlottedBool && (
            <g stroke={CANVAS_COLORS.white} strokeWidth={2}>
              <line x1={-18} y1={-plateHeight / 2} x2={-18} y2={10} />
              <line x1={-6} y1={-plateHeight / 2} x2={-6} y2={10} />
              <line x1={6} y1={-plateHeight / 2} x2={6} y2={10} />
              <line x1={18} y1={-plateHeight / 2} x2={18} y2={10} />
            </g>
          )}

          {/* 涡流示意环路 (仅在处于磁场区且未开缝时显现) */}
          {!isSlottedBool && isInMagneticField && Math.abs(physics.omega) > 0.05 && (
            <ellipse
              cx={0}
              cy={0}
              rx={18}
              ry={12}
              fill="none"
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}
        </g>

        {/* 阻尼安培力矢量：必须在磁场内且具有相对速度时才存在 */}
        {isInMagneticField && Math.abs(physics.omega) > 0.05 && (
          <PhysicsVectorArrow
            originDesign={{ x: bobX, y: bobY }}
            vector={{ x: -physics.omega * (isSlottedBool ? 0.15 : 0.8), y: 0 }}
            type="force"
            sceneScale={sceneScale}
          />
        )}

        {/* 状态与考点提示 */}
        <text
          x={140}
          y={60}
          fill={CANVAS_COLORS.labelTextLight}
          fontSize={font(12)}
        >
          {isSlottedBool ? '【梳齿片】：切断大涡流回路，阻尼微弱' : '【完整铜片】：感应强涡流，安培力强阻尼'}
        </text>
        <text
          x={140}
          y={85}
          fill={PHYSICS_COLORS.kineticEnergy}
          fontSize={font(11)}
        >
          {`机械能保留率: ${(physics.energyRatio * 100).toFixed(1)}%`}
        </text>
        <text
          x={140}
          y={105}
          fill={isInMagneticField ? SCENE_COLORS.coil.activeGlow : CANVAS_COLORS.trackHistory}
          fontSize={font(11)}
        >
          {isInMagneticField ? '● 处于磁场切割区：受阻尼安培力' : '○ 离开磁场：仅受重力与拉力，安培力为零'}
        </text>
      </g>
    )
  }

  // Mode 0 与 Mode 1: 电路场景
  return (
    <g>
      {/* 电路导线基座 */}
      <g stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.5} fill="none">
        {/* 左侧主干路：电源负极(248,257) -> 拐角 -> 开关左端(232,100)
             instrument 模式 negTerminal: x=270-22=248, y=235+22=257 */}
        <path d="M 248 257 L 140 257 L 140 100 L 232 100" />

        {/* 主干路开关右端(268,100) -> 分流节点(340,100) */}
        <path d="M 268 100 L 340 100" />

        {/* 上支路导线(y=140) */}
        <path d="M 340 100 L 340 140 L 660 140" />

        {/* 下支路导线(y=200) */}
        <path d="M 340 100 L 340 200 L 660 200" />

        {/* 汇流右竖线 -> 电源正极(292,257)
             instrument 模式 posTerminal: x=270+22=292, y=235+22=257 */}
        <path d="M 660 140 L 660 257 L 292 257" />
      </g>

      {/* 并联节点圆点 */}
      <circle cx={340} cy={100} r={3.5} fill={PHYSICS_COLORS.labelText} />
      <circle cx={660} cy={140} r={3.5} fill={PHYSICS_COLORS.labelText} />
      <circle cx={660} cy={200} r={3.5} fill={PHYSICS_COLORS.labelText} />

      {/* 标准电键开关 S */}
      <CircuitSwitch
        x={250}
        y={100}
        closed={switchClosed}
        label="S"
        font={font}
      />

      {/* 直流电源 DCSource */}
      <DCSource
        type="instrument"
        x={270}
        y={235}
        voltage={12}
        polarity="right-positive"
      />

      {/* 支路元器件 */}
      {mode === 0 ? (
        // Mode 0: 通电自感（并联双灯延时变亮对比）
        <>
          <Rheostat x={400} y={130} value={10} min={0} max={20} font={font} />
          <LightBulb x={560} y={140} power={powerLamp1} time={time} />
          <text x={560} y={105} fontSize={font(11)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">A1 灯 (纯阻支路·瞬时亮)</text>

          <CoilBase x={400} y={175} width={100} height={50} turns={5} current={iCoil} time={time} />
          <LightBulb x={560} y={200} power={powerLamp2} time={time} />
          <text x={560} y={235} fontSize={font(11)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">A2 灯 (电感支路·渐变亮)</text>
        </>
      ) : (
        // Mode 1: 断电自感（灯泡闪亮物理演示）
        <>
          <CoilBase x={440} y={115} width={120} height={50} turns={6} current={iCoil} time={time} />
          <text x={440} y={100} fontSize={font(11)} fill={PHYSICS_COLORS.magneticField} textAnchor="middle">电感线圈 L (内阻 RL)</text>

          <LightBulb x={500} y={200} power={powerLamp1} time={time} />
          <text x={500} y={235} fontSize={font(11)} fill={CANVAS_COLORS.textMuted} textAnchor="middle">小灯泡 A (阻值 RA)</text>

          {physics.willFlash && powerLamp1 > 1.2 && (
            <g transform="translate(500, 160)">
              <circle cx={0} cy={0} r={28} fill="none" stroke={CANVAS_COLORS.referencePoint} strokeWidth={2} strokeDasharray="4 2" />
              <text x={0} y={-10} fontSize={font(12)} fill={CANVAS_COLORS.referencePoint} fontWeight={700} textAnchor="middle">
                ⚡ 瞬态闪亮！
              </text>
            </g>
          )}
        </>
      )}

      {/* 实时参数标注文本 */}
      <g transform="translate(40, 40)">
        <text x={0} y={0} fontSize={font(12)} fill={CANVAS_COLORS.labelText} fontWeight={600}>
          {mode === 0 ? '通电自感演示' : '断电自感演示'}
        </text>
        <text x={0} y={20} fontSize={font(11)} fill={PHYSICS_COLORS.electricCurrent}>
          {`线圈支路电流 IL = ${iCoil.toFixed(2)} A`}
        </text>
        <text x={0} y={38} fontSize={font(11)} fill={PHYSICS_COLORS.emf}>
          {mode === 0
            ? `A2 灯发光功率 P2 = ${(powerLamp2 * 100).toFixed(0)}%`
            : `灯泡相对发光强度 = ${(powerLamp1 * 100).toFixed(0)}%`}
        </text>
      </g>
    </g>
  )
}
