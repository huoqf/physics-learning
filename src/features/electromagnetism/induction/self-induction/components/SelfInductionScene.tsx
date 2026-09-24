import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import {
  DCSource,
  CoilBase,
  LightBulb,
  Rheostat,
  MagneticFieldGrid,
  PhysicsVectorArrow,
} from '@/components/Physics'
import { PHYSICS_COLORS } from '@/theme/physics'
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
    iLamp1,
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
          fill="rgba(59, 130, 246, 0.08)"
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
        <circle cx={pivotX} cy={pivotY} r={5} fill="#475569" />
        <line
          x1={pivotX}
          x2={bobX}
          y1={pivotY}
          y2={bobY}
          stroke="#64748b"
          strokeWidth={2.5}
        />

        {/* 摆锤金属板 (整体板 vs 梳齿开缝板) */}
        <g transform={`translate(${bobX}, ${bobY}) rotate(${(-theta * 180) / Math.PI})`}>
          <rect
            x={-plateWidth / 2}
            y={-plateHeight / 2}
            width={plateWidth}
            height={plateHeight}
            fill="#cbd5e1"
            stroke="#475569"
            strokeWidth={1.8}
            rx={2}
          />
          {/* 梳齿开缝纹理 */}
          {isSlottedBool && (
            <g stroke="#ffffff" strokeWidth={2}>
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
          fill="#475569"
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
          fill={isInMagneticField ? '#16a34a' : '#94a3b8'}
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
      <g stroke="#94a3b8" strokeWidth={2.5} fill="none">
        {/* 左侧主干路 */}
        <path d="M 230 250 L 140 250 L 140 100 L 260 100" />
        {/* 单刀电键 */}
        <circle cx={260} cy={100} r={4} fill="#64748b" />
        <circle cx={320} cy={100} r={4} fill="#64748b" />
        {switchClosed ? (
          <line x1={260} y1={100} x2={320} y2={100} stroke="#3b82f6" strokeWidth={3} />
        ) : (
          <line x1={260} y1={100} x2={305} y2={75} stroke="#ef4444" strokeWidth={3} />
        )}

        {/* 上支路导线 */}
        <path d="M 320 100 L 370 100 L 370 140 L 680 140 L 680 250 L 370 250" />
        {/* 下支路导线 */}
        <path d="M 370 100 L 370 200 L 680 200" />
      </g>

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
          <Rheostat x={400} y={120} value={10} min={0} max={20} />
          <LightBulb x={580} y={120} power={powerLamp1} time={time} />
          <text x={630} y={145} fontSize={font(11)} fill="#64748b">A1 灯 (纯阻支路·瞬时亮)</text>

          <CoilBase x={400} y={170} width={100} height={50} turns={5} current={iCoil} time={time} />
          <LightBulb x={580} y={180} power={powerLamp2} time={time} />
          <text x={630} y={205} fontSize={font(11)} fill="#64748b">A2 灯 (电感支路·渐变亮)</text>

          {/* 电流动态指示箭头 */}
          {switchClosed && iLamp1 > 0.05 && (
            <PhysicsVectorArrow
              originDesign={{ x: 530, y: 140 }}
              vector={{ x: 1, y: 0 }}
              type="currentDirection"
              sceneScale={sceneScale}
            />
          )}
          {switchClosed && iCoil > 0.05 && (
            <PhysicsVectorArrow
              originDesign={{ x: 530, y: 200 }}
              vector={{ x: 1, y: 0 }}
              type="currentDirection"
              sceneScale={sceneScale}
            />
          )}
        </>
      ) : (
        // Mode 1: 断电自感（灯泡闪亮物理演示）
        <>
          <CoilBase x={440} y={115} width={120} height={50} turns={6} current={iCoil} time={time} />
          <text x={440} y={105} fontSize={font(11)} fill={PHYSICS_COLORS.magneticField}>电感线圈 L (内阻 RL)</text>

          <LightBulb x={480} y={180} power={powerLamp1} time={time} />
          <text x={530} y={205} fontSize={font(11)} fill="#64748b">小灯泡 A (阻值 RA)</text>

          {/* 断开后局部放电反向电流箭头 (由线圈向灯泡反向流动) */}
          {iLamp1 > 0.05 && (
            <PhysicsVectorArrow
              originDesign={{ x: 580, y: 180 }}
              vector={{ x: -1, y: 0 }}
              type="currentDirection"
              sceneScale={sceneScale}
            />
          )}
          {physics.willFlash && powerLamp1 > 1.2 && (
            <g transform="translate(480, 160)">
              <circle cx={0} cy={0} r={28} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2" />
              <text x={0} y={-10} fontSize={font(12)} fill="#f59e0b" fontWeight={700} textAnchor="middle">
                ⚡ 瞬态闪亮！
              </text>
            </g>
          )}
        </>
      )}

      {/* 实时参数标注文本 */}
      <g transform="translate(40, 40)">
        <text x={0} y={0} fontSize={font(12)} fill="#1e293b" fontWeight={600}>
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
