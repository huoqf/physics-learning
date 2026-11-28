import { useUniqueSvgId } from '@/hooks'
import type { SceneScale } from '@/scene'
import {
  Block,
  DCSource,
  DialMeter,
  PhysicsVectorArrow,
  Pulley,
} from '@/components/Physics'
import {
  CANVAS_COLORS,
  PHYSICS_COLORS,
  SCENE_COLORS,
  withAlpha,
} from '@/theme/physics'
import { GRAVITY } from '@/physics'
import { MOTOR_LAYOUT } from './layout'
import type { MotorCircuitViewState } from './useMotorCircuitPhysics'

interface MotorCircuitSceneProps {
  state: MotorCircuitViewState
  font: (base: number) => number
  sceneScale: SceneScale
}

/** 非纯电阻电路与电动机主场景（SVG，纯设计坐标，全部颜色与组件符合规范） */
export function MotorCircuitScene({ state, font, sceneScale }: MotorCircuitSceneProps) {
  const uid = useUniqueSvgId()
  const dangerGlowId = `motor-heat-glow-${uid}`

  const { U, mass, r_M, R_protect, showEquivalent, showForces, res, rotorAngleDeg, pulleyAngleDeg, rulerPhase, currentPulses } =
    state
  const { circuit, source, resistor, ammeter, voltmeter, motor, equivalentCard, mechanics, cards } =
    MOTOR_LAYOUT

  const heatOpacity = res.valid ? Math.min(0.85, res.P_heat_M / 36) : 0
  const ammeterMax = Math.max(5, Math.ceil(Math.max(res.I_stall, res.I) * 1.2))
  const voltmeterMax = Math.max(15, Math.ceil(U * 1.1))

  const blockX = mechanics.ropeX - mechanics.blockWidth / 2
  const blockY = mechanics.blockTopY
  const blockCenterY = blockY + mechanics.blockHeight / 2
  const blockWeightN = mass * GRAVITY

  const rotorRad = (rotorAngleDeg * Math.PI) / 180
  const pulleyRad = (pulleyAngleDeg * Math.PI) / 180
  const rulerTicks = [0, 1, 2, 3, 4, 5]

  return (
    <>
      <defs>
        <radialGradient id={dangerGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CANVAS_COLORS.alertRed} stopOpacity={heatOpacity} />
          <stop offset="60%" stopColor={CANVAS_COLORS.alertRed} stopOpacity={heatOpacity * 0.35} />
          <stop offset="100%" stopColor={CANVAS_COLORS.alertRed} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ── 1. 主回路导线（严格与 DCSource/DialMeter 端子对接） ── */}
      <g stroke={SCENE_COLORS.circuit.wire} strokeWidth={2.5} strokeLinecap="round" fill="none">
        {/* 左竖边 */}
        <line x1={circuit.leftX} y1={circuit.topY} x2={circuit.leftX} y2={circuit.bottomY} />
        {/* 顶横边：左上 -> 保护电阻 -> 电流表 -> 右上 */}
        <line x1={circuit.leftX} y1={circuit.topY} x2={resistor.x - resistor.width / 2} y2={circuit.topY} />
        <line x1={resistor.x + resistor.width / 2} y1={circuit.topY} x2={ammeter.x - ammeter.r} y2={circuit.topY} />
        <line x1={ammeter.x + ammeter.r} y1={circuit.topY} x2={circuit.rightX} y2={circuit.topY} />
        {/* 右竖边：右上 -> 电动机 -> 右下 */}
        <line x1={circuit.rightX} y1={circuit.topY} x2={circuit.rightX} y2={motor.y - motor.r} />
        <line x1={circuit.rightX} y1={motor.y + motor.r} x2={circuit.rightX} y2={circuit.bottomY} />
        {/* 底横边：左下 -> 电源正极端子；电源负极端子 -> 右下 */}
        <line x1={circuit.leftX} y1={circuit.bottomY} x2={source.leftTermX} y2={circuit.bottomY} />
        <line x1={source.rightTermX} y1={circuit.bottomY} x2={circuit.rightX} y2={circuit.bottomY} />
        {/* 电压表并联分支 */}
        <path d={`M ${circuit.rightX} ${voltmeter.branchTopY} L ${voltmeter.x} ${voltmeter.branchTopY} L ${voltmeter.x} ${voltmeter.y - voltmeter.r}`} />
        <path d={`M ${voltmeter.x} ${voltmeter.y + voltmeter.r} L ${voltmeter.x} ${voltmeter.branchBottomY} L ${circuit.rightX} ${voltmeter.branchBottomY}`} />
      </g>

      {/* 并联节点圆点 */}
      <circle cx={circuit.rightX} cy={voltmeter.branchTopY} r={3.5} fill={SCENE_COLORS.circuit.node} />
      <circle cx={circuit.rightX} cy={voltmeter.branchBottomY} r={3.5} fill={SCENE_COLORS.circuit.node} />

      {/* 动态电流粒子脉冲 */}
      <g pointerEvents="none">
        {currentPulses.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={res.isStalled ? 3.4 : 2.8}
            fill={PHYSICS_COLORS.electricCurrent}
            opacity={0.85}
          />
        ))}
      </g>

      {/* ── 2. 直流电源 ── */}
      <DCSource
        type="symbol"
        orientation="horizontal"
        x={source.x}
        y={source.y}
        voltage={U}
        label={`电源 U = ${U.toFixed(1)} V`}
        polarity="left-positive"
      />

      {/* ── 3. 保护电阻 R保 ── */}
      <g transform={`translate(${resistor.x}, ${resistor.y})`}>
        <rect
          x={-resistor.width / 2}
          y={-resistor.height / 2}
          width={resistor.width}
          height={resistor.height}
          fill={SCENE_COLORS.circuit.resistorFill}
          stroke={SCENE_COLORS.circuit.resistorStroke}
          strokeWidth={2}
          rx={2}
        />
        <text x={0} y={3.5} fill={CANVAS_COLORS.labelText} fontSize={font(10)} fontWeight="bold" textAnchor="middle">
          R保
        </text>
        <text x={0} y={resistor.valueOffsetY} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)} textAnchor="middle">
          {R_protect.toFixed(1)} Ω
        </text>
      </g>

      {/* ── 4. 电流表与电压表 ── */}
      <DialMeter
        type="A"
        variant="symbolic"
        value={res.I}
        max={ammeterMax}
        x={ammeter.x}
        y={ammeter.y}
        r={ammeter.r}
        font={font}
        labelPosition="top"
      />
      <DialMeter
        type="V"
        variant="symbolic"
        value={res.U_M}
        max={voltmeterMax}
        x={voltmeter.x}
        y={voltmeter.y}
        r={voltmeter.r}
        font={font}
        labelPosition="bottom"
      />

      {/* ── 5. 电动机与发热/卡住提示 ── */}
      {res.P_heat_M > 1 && (
        <circle
          cx={motor.x}
          cy={motor.y}
          r={motor.glowR}
          fill={`url(#${dangerGlowId})`}
          className={res.isStalled ? 'animate-pulse' : undefined}
        />
      )}

      <g transform={`translate(${motor.x}, ${motor.y})`}>
        <circle
          cx={0}
          cy={0}
          r={motor.r}
          fill={CANVAS_COLORS.white}
          stroke={res.isStalled ? CANVAS_COLORS.alertRed : SCENE_COLORS.circuit.wire}
          strokeWidth={2.5}
        />
        <circle
          cx={0}
          cy={0}
          r={motor.rotorR}
          fill={SCENE_COLORS.materials.structFillPale}
          stroke={SCENE_COLORS.materials.structStrokeLight}
          strokeWidth={1.5}
        />
        <line
          x1={0}
          y1={0}
          x2={motor.rotorR * Math.cos(rotorRad)}
          y2={motor.rotorR * Math.sin(rotorRad)}
          stroke={PHYSICS_COLORS.electricCurrent}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <text x={0} y={4.5} fill={CANVAS_COLORS.labelText} fontSize={font(12)} fontWeight="bold" textAnchor="middle">
          M
        </text>
      </g>

      <text x={motor.labelX} y={motor.labelY} fill={CANVAS_COLORS.labelText} fontSize={font(9.5)} fontWeight="bold" textAnchor="start">
        电动机 (rM={r_M.toFixed(1)}Ω)
      </text>

      {res.isStalled && (
        <g transform={`translate(${motor.x}, ${motor.stallBadgeY})`}>
          <rect
            x={-44}
            y={-9}
            width={88}
            height={18}
            rx={4}
            fill={CANVAS_COLORS.alertRed}
          />
          <text
            x={0}
            y={3.5}
            fill={CANVAS_COLORS.white}
            fontSize={font(9)}
            fontWeight="bold"
            textAnchor="middle"
          >
            {res.stallReason === 'overload' ? '带不动·纯电阻!' : '转轴卡住!'}
          </text>
        </g>
      )}

      {/* ── 6. 开关控制：电机内部能量拆解卡片 ── */}
      {showEquivalent && (
        <g>
          <rect
            x={equivalentCard.x}
            y={equivalentCard.y}
            width={equivalentCard.width}
            height={equivalentCard.height}
            rx={6}
            fill={withAlpha(CANVAS_COLORS.white, 0.94)}
            stroke={PHYSICS_COLORS.electricPotential}
            strokeWidth={1.2}
            strokeDasharray="4,3"
          />
          <text
            x={equivalentCard.x + equivalentCard.width / 2}
            y={equivalentCard.titleY}
            fill={PHYSICS_COLORS.electricPotential}
            fontSize={font(9.5)}
            fontWeight="bold"
            textAnchor="middle"
          >
            电机内部能量拆解
          </text>
          <text
            x={equivalentCard.x + 10}
            y={equivalentCard.row1Y}
            fill={PHYSICS_COLORS.internalEnergy}
            fontSize={font(9)}
            fontWeight="bold"
          >
            线圈发热 I²rM = {res.P_heat_M.toFixed(2)} W
          </text>
          <text
            x={equivalentCard.x + 10}
            y={equivalentCard.row2Y}
            fill={PHYSICS_COLORS.work}
            fontSize={font(9)}
            fontWeight="bold"
          >
            输出机械 P机 = {res.P_mech.toFixed(2)} W
          </text>
          <text
            x={equivalentCard.x + 10}
            y={equivalentCard.row3Y}
            fill={CANVAS_COLORS.labelTextLight}
            fontSize={font(9)}
          >
            总输入 U_M·I = {res.P_in_motor.toFixed(2)} W
          </text>
        </g>
      )}

      {/* ── 7. 机械传动轴、定滑轮、高度标尺与重物 ── */}
      <line
        x1={mechanics.shaftStartX}
        y1={mechanics.shaftY}
        x2={mechanics.pulleyX - mechanics.pulleyR}
        y2={mechanics.pulleyY}
        stroke={SCENE_COLORS.materials.structStrokeLight}
        strokeWidth={2.5}
        strokeDasharray="5,3"
      />
      <text
        x={mechanics.shaftLabelX}
        y={mechanics.shaftLabelY}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={font(9)}
        textAnchor="middle"
      >
        传动轴
      </text>

      <Pulley
        cx={mechanics.pulleyX}
        cy={mechanics.pulleyY}
        r={mechanics.pulleyR}
        hangerTopY={mechanics.hangerTopY}
      />
      {/* 滑轮旋转辐条（与电机同轴同步） */}
      <g
        transform={`translate(${mechanics.pulleyX}, ${mechanics.pulleyY})`}
        stroke={SCENE_COLORS.materials.structStrokeMid}
        strokeWidth={1.5}
        pointerEvents="none"
      >
        <line
          x1={-(mechanics.pulleyR - 4) * Math.cos(pulleyRad)}
          y1={-(mechanics.pulleyR - 4) * Math.sin(pulleyRad)}
          x2={(mechanics.pulleyR - 4) * Math.cos(pulleyRad)}
          y2={(mechanics.pulleyR - 4) * Math.sin(pulleyRad)}
        />
        <line
          x1={-(mechanics.pulleyR - 4) * Math.cos(pulleyRad + Math.PI / 2)}
          y1={-(mechanics.pulleyR - 4) * Math.sin(pulleyRad + Math.PI / 2)}
          x2={(mechanics.pulleyR - 4) * Math.cos(pulleyRad + Math.PI / 2)}
          y2={(mechanics.pulleyR - 4) * Math.sin(pulleyRad + Math.PI / 2)}
        />
      </g>
      <text
        x={mechanics.pulleyX}
        y={mechanics.pulleyLabelY}
        fill={CANVAS_COLORS.labelText}
        fontSize={font(9.5)}
        fontWeight="bold"
        textAnchor="middle"
      >
        卷扬滑轮
      </text>

      {/* 吊绳与滚动上升参考标尺 */}
      <line
        x1={mechanics.ropeX}
        y1={mechanics.pulleyY}
        x2={mechanics.ropeX}
        y2={blockY}
        stroke={SCENE_COLORS.materials.structStroke}
        strokeWidth={2}
      />
      <g opacity={res.isStalled ? 0.35 : 0.8}>
        <line
          x1={mechanics.rulerX}
          y1={mechanics.rulerTopY}
          x2={mechanics.rulerX}
          y2={mechanics.rulerTopY + mechanics.rulerHeight}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1.5}
        />
        {rulerTicks.map((idx) => {
          const tickY = mechanics.rulerTopY + ((idx * 16 + rulerPhase) % mechanics.rulerHeight)
          return (
            <line
              key={idx}
              x1={mechanics.rulerX - 5}
              y1={tickY}
              x2={mechanics.rulerX + 2}
              y2={tickY}
              stroke={CANVAS_COLORS.labelTextLight}
              strokeWidth={1.2}
            />
          )
        })}
      </g>

      {/* 复用公共 Block 组件渲染重物 */}
      <Block
        x={blockX}
        y={blockY}
        width={mechanics.blockWidth}
        height={mechanics.blockHeight}
        type="metal"
        label={`${mass.toFixed(2)}kg`}
        font={font}
      />

      {/* 受力与速度矢量箭头（均走 PhysicsVectorArrow 归一化） */}
      {showForces && (
        <>
          <PhysicsVectorArrow
            originDesign={{ x: mechanics.ropeX, y: blockY + mechanics.blockHeight }}
            vector={{ x: 0, y: -blockWeightN }}
            type="gravity"
            sceneScale={sceneScale}
            strokeWidth={2.5}
            label="mg"
            labelPlacement="side"
            font={font}
          />
          {!res.isStalled && (
            <>
              <PhysicsVectorArrow
                originDesign={{ x: mechanics.ropeX, y: blockY }}
                vector={{ x: 0, y: blockWeightN }}
                type="tension"
                sceneScale={sceneScale}
                strokeWidth={2.5}
                label="T"
                labelPlacement="side"
                font={font}
              />
              {res.v_lift > 0.01 && (
                <PhysicsVectorArrow
                  originDesign={{ x: mechanics.velocityArrowX, y: blockCenterY }}
                  vector={{ x: 0, y: res.v_lift }}
                  type="velocity"
                  sceneScale={sceneScale}
                  label="v"
                  labelPlacement="tip"
                  font={font}
                />
              )}
            </>
          )}
        </>
      )}

      {/* ── 8. 右侧状态与欧姆定律对比卡片 ── */}
      <g>
        {/* 上卡：机械输出状态 */}
        <rect
          x={cards.x}
          y={cards.output.y}
          width={cards.width}
          height={cards.output.height}
          rx={8}
          fill={SCENE_COLORS.materials.structBgLight}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1.2}
        />
        <text
          x={cards.x + cards.padX}
          y={cards.output.titleY}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10.5)}
          fontWeight="bold"
        >
          机械输出状态
        </text>
        <line
          x1={cards.x + cards.padX}
          y1={cards.output.titleY + 8}
          x2={cards.x + cards.width - cards.padX}
          y2={cards.output.titleY + 8}
          stroke={CANVAS_COLORS.grid}
          strokeWidth={1}
        />

        <text x={cards.x + cards.padX} y={cards.output.rowYs[0]} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
          提升速度 v
        </text>
        <text x={cards.x + cards.width - cards.padX} y={cards.output.rowYs[0]} fill={PHYSICS_COLORS.velocity} fontSize={font(10)} fontWeight="bold" textAnchor="end">
          {res.v_lift.toFixed(2)} m/s
        </text>

        <text x={cards.x + cards.padX} y={cards.output.rowYs[1]} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
          机械功率 P机
        </text>
        <text x={cards.x + cards.width - cards.padX} y={cards.output.rowYs[1]} fill={PHYSICS_COLORS.work} fontSize={font(10)} fontWeight="bold" textAnchor="end">
          {res.P_mech.toFixed(2)} W
        </text>

        <text x={cards.x + cards.padX} y={cards.output.rowYs[2]} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
          电机效率 η
        </text>
        <text x={cards.x + cards.width - cards.padX} y={cards.output.rowYs[2]} fill={PHYSICS_COLORS.work} fontSize={font(10)} fontWeight="bold" textAnchor="end">
          {(res.efficiency * 100).toFixed(1)}%
        </text>

        <text x={cards.x + cards.padX} y={cards.output.rowYs[3]} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
          最大可提质量
        </text>
        <text x={cards.x + cards.width - cards.padX} y={cards.output.rowYs[3]} fill={CANVAS_COLORS.labelText} fontSize={font(9.5)} fontWeight="bold" textAnchor="end">
          {res.m_max.toFixed(2)} kg
        </text>

        {/* 下卡：欧姆定律适用检验 */}
        <rect
          x={cards.x}
          y={cards.ohmCheck.y}
          width={cards.width}
          height={cards.ohmCheck.height}
          rx={8}
          fill={res.isStalled ? CANVAS_COLORS.dangerBg : SCENE_COLORS.materials.structBgLight}
          stroke={res.isStalled ? CANVAS_COLORS.dangerBorder : CANVAS_COLORS.grid}
          strokeWidth={1.2}
        />
        <text
          x={cards.x + cards.padX}
          y={cards.ohmCheck.titleY}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10.5)}
          fontWeight="bold"
        >
          欧姆定律适用检验
        </text>
        <line
          x1={cards.x + cards.padX}
          y1={cards.ohmCheck.titleY + 8}
          x2={cards.x + cards.width - cards.padX}
          y2={cards.ohmCheck.titleY + 8}
          stroke={res.isStalled ? CANVAS_COLORS.dangerBorder : CANVAS_COLORS.grid}
          strokeWidth={1}
        />

        <text x={cards.x + cards.padX} y={cards.ohmCheck.row1Y} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
          按 U_M/rM 估算
        </text>
        <text x={cards.x + cards.width - cards.padX} y={cards.ohmCheck.row1Y} fill={PHYSICS_COLORS.electricPotential} fontSize={font(10)} fontWeight="bold" textAnchor="end">
          {res.I_ohmWrong.toFixed(2)} A
        </text>

        <text x={cards.x + cards.padX} y={cards.ohmCheck.row2Y} fill={CANVAS_COLORS.labelTextLight} fontSize={font(9.5)}>
          电流表实测 I
        </text>
        <text x={cards.x + cards.width - cards.padX} y={cards.ohmCheck.row2Y} fill={PHYSICS_COLORS.electricCurrent} fontSize={font(10)} fontWeight="bold" textAnchor="end">
          {res.I.toFixed(2)} A
        </text>

        <rect
          x={cards.x + cards.padX}
          y={cards.ohmCheck.badgeY}
          width={cards.width - cards.padX * 2}
          height={cards.ohmCheck.badgeHeight}
          rx={5}
          fill={res.isStalled ? CANVAS_COLORS.dangerDark : PHYSICS_COLORS.appliedForce}
        />
        <text
          x={cards.x + cards.width / 2}
          y={cards.ohmCheck.badgeY + 15.5}
          fill={CANVAS_COLORS.white}
          fontSize={font(9)}
          fontWeight="bold"
          textAnchor="middle"
        >
          {res.isStalled ? 'U_M = I·rM（纯电阻）' : 'U_M > I·rM（非纯电阻）'}
        </text>
      </g>
    </>
  )
}
