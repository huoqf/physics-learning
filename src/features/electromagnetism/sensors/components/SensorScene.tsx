import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import {
  DCSource,
  LightBulb,
  MagneticFieldGrid,
  PhysicsVectorArrow,
  VectorArrow,
} from '@/components/Physics'
import { IDENTITY_SCENE_SCALE } from '@/scene'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  EM_COLORS,
  DYNAMICS_COLORS,
  withAlpha,
} from '@/theme/physics'
import type { SensorPhysicsResult } from '../hooks/useSensorPhysics'

export interface SensorSceneProps {
  physics: SensorPhysicsResult
  canvasSize: CanvasSize
  sceneScale: SceneScale
  vp: ViewportInfo
  time: number
}

export function SensorScene({
  physics,
  canvasSize,
  sceneScale,
  time,
}: SensorSceneProps) {
  const { font } = canvasSize
  const {
    sensorType,
    rSensor,
    uHallMilliVolts,
    topPolarity,
    bottomPolarity,
    vOut,
    isTriggered,
  } = physics

  return (
    <g>
      {/* ── 左半区：传感器微观与物理结构特写 ───────────────────────── */}
      <rect
        x={30}
        y={20}
        width={320}
        height={285}
        fill={SCENE_COLORS.materials.structBgLight}
        stroke={SCENE_COLORS.materials.structFillPale}
        strokeWidth={1.5}
        rx={6}
      />
      <text
        x={45}
        y={45}
        fontSize={font(12)}
        fontWeight={700}
        fill={CANVAS_COLORS.labelText}
      >
        {sensorType === 0
          ? '【光敏电阻特写】光生载流子'
          : sensorType === 1
          ? '【NTC热敏电阻特写】半导体载流子激发'
          : '【霍尔元件微观平衡】qvB = q·UH/d'}
      </text>

      {sensorType === 0 && (
        <g transform="translate(190, 160)">
          {/* 光敏电极 */}
          <rect x={-50} y={-40} width={100} height={80} fill={withAlpha(PHYSICS_COLORS.referencePoint, 0.2)} stroke={EM_COLORS.electricField} strokeWidth={2} rx={4} />
          {/* 蛇形栅格 */}
          <path
            d="M -35 -25 L 35 -25 L 35 -10 L -35 -10 L -35 5 L 35 5 L 35 20 L -35 20"
            fill="none"
            stroke={DYNAMICS_COLORS.friction}
            strokeWidth={3}
          />
          {/* 照射光线 */}
          <g stroke={CANVAS_COLORS.referencePoint} strokeWidth={2} strokeDasharray="4 2">
            <line x1={-80} y1={-80} x2={-30} y2={-30} />
            <line x1={-50} y1={-90} x2={0} y2={-40} />
            <line x1={-20} y1={-90} x2={30} y2={-40} />
          </g>
          <text x={0} y={60} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.textMuted}>
            {`实时光敏阻值 R = ${(rSensor / 1000).toFixed(1)} kΩ`}
          </text>
        </g>
      )}

      {sensorType === 1 && (
        <g transform="translate(190, 160)">
          {/* NTC 陶瓷热敏圆片 */}
          <circle cx={0} cy={0} r={42} fill={SCENE_COLORS.materials.structStroke} stroke={CANVAS_COLORS.textMuted} strokeWidth={3} />
          <text x={0} y={4} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.white} fontWeight={600}>
            NTC 10k
          </text>
          {/* 晶格引脚 */}
          <line x1={-15} y1={42} x2={-15} y2={80} stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.5} />
          <line x1={15} y1={42} x2={15} y2={80} stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.5} />
          <text x={0} y={105} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.textMuted}>
            {`实时热敏阻值 R = ${(rSensor / 1000).toFixed(1)} kΩ`}
          </text>
        </g>
      )}

      {sensorType === 2 && (
        <g transform="translate(190, 155)">
          {/* 磁场背景 */}
          <MagneticFieldGrid x={-70} y={-50} w={140} h={100} direction="in" />
          {/* 霍尔半导体薄片 */}
          <rect x={-55} y={-35} width={110} height={70} fill={withAlpha(PHYSICS_COLORS.capacitor, 0.25)} stroke={EM_COLORS.capacitor} strokeWidth={2} rx={3} />

          {/* 表面极性与积累电荷渲染 */}
          <g transform="translate(0, -35)">
            {[-40, -20, 0, 20, 40].map((xPos, idx) => (
              <text key={idx} x={xPos} y={-3} textAnchor="middle" fontSize={font(10)} fontWeight={700} fill={topPolarity === '+' ? EM_COLORS.positiveCharge : EM_COLORS.negativeCharge}>
                {topPolarity}
              </text>
            ))}
          </g>
          <g transform="translate(0, 35)">
            {[-40, -20, 0, 20, 40].map((xPos, idx) => (
              <text key={idx} x={xPos} y={11} textAnchor="middle" fontSize={font(10)} fontWeight={700} fill={bottomPolarity === '+' ? EM_COLORS.positiveCharge : EM_COLORS.negativeCharge}>
                {bottomPolarity}
              </text>
            ))}
          </g>

          {/* 表面极性文字 */}
          <text x={0} y={-46} textAnchor="middle" fontSize={font(12)} fontWeight={700} fill={topPolarity === '+' ? EM_COLORS.positiveCharge : EM_COLORS.negativeCharge}>
            {`上表面 (${topPolarity}) 极`}
          </text>
          <text x={0} y={58} textAnchor="middle" fontSize={font(12)} fontWeight={700} fill={bottomPolarity === '+' ? EM_COLORS.positiveCharge : EM_COLORS.negativeCharge}>
            {`下表面 (${bottomPolarity}) 极`}
          </text>

          {/* 微观载流子受洛伦兹力偏转动画 */}
          {[-30, 0, 30].map((baseX, i) => {
            const isElectron = topPolarity === '-'
            // 电子向左运动 (v < 0), 空穴向右运动 (v > 0)
            const speed = isElectron ? -40 : 40
            const rawX = baseX + ((time * speed) % 90)
            const clampedX = Math.max(-45, Math.min(45, rawX > 45 ? rawX - 90 : rawX < -45 ? rawX + 90 : rawX))
            // 洛伦兹力向上偏转: y 向上偏移
            const curveY = -Math.abs(Math.sin((clampedX / 45) * Math.PI)) * 14

            return (
              <g key={i} transform={`translate(${clampedX}, ${curveY})`}>
                <circle cx={0} cy={0} r={6} fill={isElectron ? EM_COLORS.negativeCharge : EM_COLORS.positiveCharge} opacity={0.85} />
                <text x={0} y={3.5} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.white} fontWeight={700}>
                  {isElectron ? 'e⁻' : 'h⁺'}
                </text>
                {/* 洛伦兹力向上微箭头 */}
                <line x1={0} y1={-6} x2={0} y2={-14} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.5} />
                <polygon points="0,-16 -3,-13 3,-13" fill={CANVAS_COLORS.referencePoint} />
              </g>
            )
          })}

          {/* 控制电流方向提示 */}
          <PhysicsVectorArrow
            originDesign={{ x: 135, y: 155 }}
            vector={{ x: 1, y: 0 }}
            type="currentDirection"
            sceneScale={sceneScale}
          />
          <text x={0} y={80} textAnchor="middle" fontSize={font(11)} fill={PHYSICS_COLORS.electricField} fontWeight={600}>
            {`微观平衡: UH = ${uHallMilliVolts.toFixed(2)} mV`}
          </text>
        </g>
      )}

      {/* ── 右半区：宏观自动控制电路（电磁继电器弱电控制强电） ─────────────────────────────── */}
      <rect
        x={370}
        y={20}
        width={440}
        height={285}
        fill={CANVAS_COLORS.white}
        stroke={SCENE_COLORS.materials.structStrokePale}
        strokeWidth={1.5}
        rx={6}
      />
      <text
        x={390}
        y={45}
        fontSize={font(12)}
        fontWeight={700}
        fill={CANVAS_COLORS.labelText}
      >
        【自动控制应用电路】电磁继电器 / 弱电控制强电
      </text>

      {/* ── 1. 低压控制回路（DC 5V 控制侧） ── */}
      {/* 控制电源 DCSource（标准原理图长正短负符号，水平导线放置） */}
      <DCSource
        type="symbol"
        orientation="horizontal"
        x={440}
        y={235}
        voltage={5}
        polarity="right-positive"
        label="E₁ = 5V"
      />

      {/* 控制回路导线走线（端子级闭合回路） */}
      {(() => {
        const wireY = 235
        const negX = 440 - 25
        const posX = 440 + 25
        return (
          <g stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* 负极 -> 左下拐角(395,235) -> 左侧直上至变阻器左端(395,85) */}
            <path d={`M ${negX} ${wireY} L 395 ${wireY} L 395 85 L 430 85`} />
            {/* 变阻器右端(470,85) -> 传感器左端(485,85) */}
            <path d="M 470 85 L 485 85" />
            {/* 传感器右端(535,85) -> 拐角(550,85) -> 电磁铁上线圈端子(550,130) */}
            <path d="M 535 85 L 550 85 L 550 130" />
            {/* 电磁铁下线圈端子(550,180) -> 拐角(550,235) -> 正极(465,235) */}
            <path d={`M 550 180 L 550 ${wireY} L ${posX} ${wireY}`} />
          </g>
        )
      })()}

      {/* 可调分压/限流变阻器 R0 */}
      <g transform="translate(450, 85)">
        <rect x={-20} y={-10} width={40} height={20} fill={SCENE_COLORS.circuit.resistorFill} stroke={SCENE_COLORS.circuit.resistorStroke} strokeWidth={1.8} rx={2} />
        <line x1={-15} y1={12} x2={15} y2={-12} stroke={PHYSICS_COLORS.labelText} strokeWidth={1.5} />
        <path d="M 11 -12 L 15 -12 L 15 -8" fill="none" stroke={PHYSICS_COLORS.labelText} strokeWidth={1.2} />
        <text x={0} y={-14} textAnchor="middle" fontSize={font(9.5)} fill={CANVAS_COLORS.labelText} fontWeight={600}>
          变阻器 R₀
        </text>
      </g>

      {/* 传感器符号元件 */}
      <g transform="translate(510, 85)">
        <rect x={-25} y={-12} width={50} height={24} fill={CANVAS_COLORS.objectFillNeutral} stroke={PHYSICS_COLORS.emf} strokeWidth={1.8} rx={2} />
        <text x={0} y={4} textAnchor="middle" fontSize={font(10)} fill={PHYSICS_COLORS.emf} fontWeight={700}>
          {sensorType === 0 ? '光敏 RG' : sensorType === 1 ? '热敏 RT' : '霍尔 UH'}
        </text>
        <text x={0} y={-16} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight}>
          传感器
        </text>
      </g>

      {/* 控制回路电流方向指示（箭头居中在导线，文字在左侧净空区） */}
      {vOut > 0.1 && (
        <g fill={PHYSICS_COLORS.electricCurrent}>
          <polygon points="395,165 391,155 399,155" />
          <text x={382} y={162} fontSize={font(9.5)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="end">
            I控
          </text>
        </g>
      )}

      {/* ── 2. 电磁继电器整体机构（标准虚线隔离框） ── */}
      <rect
        x={535}
        y={105}
        width={105}
        height={105}
        rx={6}
        fill={withAlpha(colors.neutral[100], 0.35)}
        stroke={PHYSICS_COLORS.axis}
        strokeWidth={1.5}
        strokeDasharray="4,4"
      />
      <text x={587} y={120} textAnchor="middle" fontSize={font(10)} fill={PHYSICS_COLORS.axis} fontWeight="bold">
        电磁继电器 J
      </text>

      {/* 电磁铁铁芯与线圈绕组 */}
      <g transform="translate(550, 155)">
        {/* 铁芯（软铁） */}
        <rect x={-8} y={-22} width={16} height={44} fill={colors.neutral[400]} stroke={colors.neutral[700]} strokeWidth={1.5} rx={2} />
        {/* 线圈立体绕组 */}
        {[-14, -7, 0, 7, 14].map((offsetY, idx) => (
          <ellipse
            key={idx}
            cx={0}
            cy={offsetY}
            rx={11}
            ry={3.5}
            fill="none"
            stroke={PHYSICS_COLORS.magnetSouth}
            strokeWidth={2}
          />
        ))}
        {/* 电磁吸力发光效果 */}
        {isTriggered && (
          <rect
            x={-10}
            y={-24}
            width={20}
            height={48}
            fill="none"
            stroke={CANVAS_COLORS.alertRed}
            strokeWidth={1.5}
            strokeDasharray="2,2"
            opacity={0.8}
            rx={3}
          />
        )}
      </g>

      {/* 衔铁、回位弹簧与绝缘触点机械联动 */}
      {(() => {
        // 衔铁水平位移：吸合时向左靠拢 5px
        const armatureX = isTriggered ? 578 : 584
        return (
          <g>
            {/* 回位弹簧 */}
            <path
              d={`M ${armatureX} 135 L 598 135`}
              stroke={CANVAS_COLORS.textMuted}
              strokeWidth={1.5}
              strokeDasharray="2,2"
            />
            {/* 衔铁（动铁片） */}
            <rect
              x={armatureX}
              y={130}
              width={5}
              height={50}
              fill={colors.neutral[600]}
              stroke={colors.neutral[800]}
              strokeWidth={1}
              rx={1}
            />
            {/* 绝缘推杆 */}
            <line x1={armatureX + 5} y1={155} x2={armatureX + 16} y2={155} stroke={colors.neutral[400]} strokeWidth={2} />

            {/* 常开触点开关 S：动触点与静触点 */}
            {/* 静触点端子 */}
            <circle cx={625} cy={145} r={3} fill={SCENE_COLORS.materials.structStrokeMid} />
            <circle cx={625} cy={165} r={3} fill={SCENE_COLORS.materials.structStrokeMid} />
            {/* 动触点簧片 */}
            {isTriggered ? (
              <line x1={625} y1={145} x2={625} y2={165} stroke={SCENE_COLORS.circuit.switchClosed} strokeWidth={2.8} strokeLinecap="round" />
            ) : (
              <line x1={625} y1={165} x2={616} y2={148} stroke={SCENE_COLORS.circuit.switchOpen} strokeWidth={2.5} strokeLinecap="round" />
            )}
          </g>
        )
      })()}

      {/* ── 3. 高压强电工作回路（220V 强电受控侧，完全电气隔离） ── */}
      <g stroke={SCENE_COLORS.materials.structStrokeDark} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 触点上端子(625,145) -> 拐角(655,145) -> 顶线(655,85) -> 路灯上端子(740,85) -> (740,115) */}
        <path d="M 625 145 L 655 145 L 655 85 L 740 85 L 740 120" />
        {/* 路灯下端子(740,175) -> 拐角(740,247) -> 220V电源右端子(705,247) */}
        <path d="M 740 170 L 740 247 L 705 247" />
        {/* 220V电源左端子(655,247) -> 拐角(640,247) -> (640,165) -> 触点下端子(625,165) */}
        <path d="M 655 247 L 640 247 L 640 165 L 625 165" />
      </g>

      {/* 受控高压工作电源（220V 交流正弦符号） */}
      <g transform="translate(680, 247)">
        <circle cx={0} cy={0} r={18} fill={CANVAS_COLORS.white} stroke={SCENE_COLORS.materials.structStrokeDark} strokeWidth={2} />
        <path d="M -8 0 Q -4 -6, 0 0 T 8 0" fill="none" stroke={SCENE_COLORS.materials.structStrokeDark} strokeWidth={2} strokeLinecap="round" />
        <text x={0} y={26} textAnchor="middle" fontSize={font(9.5)} fill={CANVAS_COLORS.labelTextLight} fontWeight={600}>
          高压工作电源 ~220V
        </text>
      </g>

      {/* 受控路灯 / 报警器 */}
      <LightBulb
        x={740}
        y={145}
        power={isTriggered ? 1.0 : 0}
        time={time}
        scale={0.9}
        label="路灯 L"
        font={font}
      />
      <text x={740} y={192} textAnchor="middle" fontSize={font(10.5)} fill={isTriggered ? CANVAS_COLORS.alertRed : CANVAS_COLORS.textMuted} fontWeight={600}>
        {isTriggered ? '● 路灯点亮工作' : '○ 路灯熄灭'}
      </text>

      {/* 工作回路导通时的电流方向矢量指示 */}
      {isTriggered && (
        <VectorArrow
          originDesign={{ x: 740, y: 100 }}
          vector={{ x: 0, y: -1 }}
          type="currentDirection"
          arrowType="visual-only"
          sceneScale={IDENTITY_SCENE_SCALE}
          pixelLength={20}
          label="I工"
          font={font}
        />
      )}

      {/* ── 4. 控制状态与动作阈值底部状态栏 ── */}
      <g transform="translate(390, 282)">
        <text x={0} y={0} fontSize={font(10.5)} fill={PHYSICS_COLORS.electricPotential} fontWeight={600}>
          {`控制输出端电压 Vout = ${vOut.toFixed(2)} V (动作阈值 Vth = 2.50 V)`}
        </text>
        <text
          x={330}
          y={0}
          fontSize={font(10.5)}
          fontWeight={700}
          fill={isTriggered ? SCENE_COLORS.circuit.switchClosed : CANVAS_COLORS.trackHistory}
        >
          {isTriggered ? '● 磁吸动作 (触点闭合)' : '○ 磁力不足 (触点断开)'}
        </text>
      </g>
    </g>
  )
}
