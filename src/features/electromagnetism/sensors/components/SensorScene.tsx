import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import {
  DCSource,
  LightBulb,
  MagneticFieldGrid,
  CapacitorPlates,
  Rheostat,
} from '@/components/Physics'
import { colors } from '@/theme/colors'
import {
  PHYSICS_COLORS,
  SCENE_COLORS,
  CANVAS_COLORS,
  EM_COLORS,
  DYNAMICS_COLORS,
  withAlpha,
} from '@/theme/physics'
import {
  CAP_SENSOR_TRIGGER_GAP_MM,
  HALL_TRIGGER_VOLTAGE_MV,
  LIGHT_RELAY_I_PULL,
  NTC_RELAY_I_PULL,
} from '@/physics/electromagnetism/sensors'
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
  sceneScale: _sceneScale,
  time,
}: SensorSceneProps) {
  const { font } = canvasSize
  const {
    sensorType,
    rSensor,
    uHallMilliVolts,
    topPolarity,
    bottomPolarity,
    circuitCurrent,
    isArmatureAttracted,
    isTriggered,
    capacitancePf,
  } = physics

  return (
    <g>
      {/* ── 左半区：传感器微观与物理结构特写 (30,20, 320×285) ───────────────────────── */}
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
          ? '【光敏电阻特写】硫化镉光电导效应'
          : sensorType === 1
          ? '【NTC热敏电阻特写】半导体晶格载流子激发'
          : sensorType === 2
          ? '【霍尔元件微观平衡】洛伦兹力偏转与霍尔电压'
          : '【电容式传感器特写】微位移极板间距动态响应'}
      </text>

      {/* 0: 光敏电阻微观结构 */}
      {sensorType === 0 && (
        <g transform="translate(190, 160)">
          {/* 光敏底板与电极 */}
          <rect
            x={-55}
            y={-45}
            width={110}
            height={90}
            fill={withAlpha(PHYSICS_COLORS.referencePoint, 0.15)}
            stroke={EM_COLORS.electricField}
            strokeWidth={2}
            rx={4}
          />
          {/* 硫化镉 (CdS) 蛇形光敏栅格 */}
          <path
            d="M -40 -30 L 40 -30 L 40 -12 L -40 -12 L -40 6 L 40 6 L 40 24 L -40 24"
            fill="none"
            stroke={DYNAMICS_COLORS.friction}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 光线照射 */}
          <g stroke={CANVAS_COLORS.referencePoint} strokeWidth={2} strokeDasharray="4 2">
            <line x1={-85} y1={-85} x2={-35} y2={-35} />
            <line x1={-55} y1={-95} x2={-5} y2={-45} />
            <line x1={-25} y1={-95} x2={25} y2={-45} />
          </g>
          <text x={0} y={62} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.textMuted} fontWeight={600}>
            {`实时光敏阻值 RG = ${(rSensor / 1000).toFixed(1)} kΩ`}
          </text>
        </g>
      )}

      {/* 1: NTC 热敏电阻微观结构 */}
      {sensorType === 1 && (
        <g transform="translate(190, 160)">
          {/* NTC 陶瓷热敏圆片 */}
          <circle
            cx={0}
            cy={0}
            r={45}
            fill={SCENE_COLORS.materials.structStroke}
            stroke={CANVAS_COLORS.textMuted}
            strokeWidth={3}
          />
          <text x={0} y={4} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.white} fontWeight={700}>
            NTC 10k
          </text>
          {/* 金属引脚 */}
          <line x1={-18} y1={45} x2={-18} y2={85} stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.5} />
          <line x1={18} y1={45} x2={18} y2={85} stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.5} />
          <text x={0} y={105} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.textMuted} fontWeight={600}>
            {`实时热敏阻值 RT = ${(rSensor / 1000).toFixed(1)} kΩ`}
          </text>
        </g>
      )}

      {/* 2: 霍尔元件微观平衡 */}
      {sensorType === 2 && (
        <g transform="translate(190, 155)">
          {/* 垂直纸面向里磁场 */}
          <MagneticFieldGrid x={-70} y={-50} w={140} h={100} direction="in" />
          {/* 霍尔半导体薄片 */}
          <rect
            x={-55}
            y={-35}
            width={110}
            height={70}
            fill={withAlpha(PHYSICS_COLORS.capacitor, 0.25)}
            stroke={EM_COLORS.capacitor}
            strokeWidth={2}
            rx={3}
          />

          {/* 上下表面极性电荷标记 */}
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
            const speed = isElectron ? -40 : 40
            const rawX = baseX + ((time * speed) % 90)
            const clampedX = Math.max(-45, Math.min(45, rawX > 45 ? rawX - 90 : rawX < -45 ? rawX + 90 : rawX))
            const curveY = -Math.abs(Math.sin((clampedX / 45) * Math.PI)) * 14

            return (
              <g key={i} transform={`translate(${clampedX}, ${curveY})`}>
                <circle cx={0} cy={0} r={6} fill={isElectron ? EM_COLORS.negativeCharge : EM_COLORS.positiveCharge} opacity={0.85} />
                <text x={0} y={3.5} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.white} fontWeight={700}>
                  {isElectron ? 'e⁻' : 'h⁺'}
                </text>
                {/* 洛伦兹力偏转微箭头 */}
                <line x1={0} y1={-6} x2={0} y2={-14} stroke={CANVAS_COLORS.referencePoint} strokeWidth={1.5} />
                <polygon points="0,-16 -3,-13 3,-13" fill={CANVAS_COLORS.referencePoint} />
              </g>
            )
          })}

          {/* 控制电流 I 输入与流向指示 (左右电极引线) */}
          <line x1={-75} y1={0} x2={-55} y2={0} stroke={EM_COLORS.electricCurrent} strokeWidth={2.4} />
          <polygon points="-55,0 -61,-3.5 -61,3.5" fill={EM_COLORS.electricCurrent} />
          <text x={-78} y={3.5} textAnchor="end" fontSize={font(10)} fill={EM_COLORS.electricCurrent} fontWeight={700}>
            I
          </text>
          <line x1={55} y1={0} x2={75} y2={0} stroke={EM_COLORS.electricCurrent} strokeWidth={2.4} />
          <polygon points="75,0 69,-3.5 69,3.5" fill={EM_COLORS.electricCurrent} />

          <text x={0} y={80} textAnchor="middle" fontSize={font(11)} fill={PHYSICS_COLORS.electricField} fontWeight={600}>
            {`微观平衡: UH = ${uHallMilliVolts.toFixed(2)} mV`}
          </text>
        </g>
      )}

      {/* 3: 电容式位移/压力传感器 */}
      {sensorType === 3 && (
        <g transform="translate(190, 155)">
          {(() => {
            // 线性无死区平滑映射：d ∈ [1.0, 10.0] mm -> gap ∈ [16, 65.5] px
            const plateGap = 16 + (physics.currentX - 1.0) * 5.5
            // 垂直 CapacitorPlates 中右极板厚度为 10，其外壁坐标为 plateGap/2 + 10
            const pushRodX = plateGap / 2 + 10

            return (
              <>
                {/* 平行板电容器组件（垂直排布，左板固定，右动片随间距移动） */}
                <CapacitorPlates
                  x={0}
                  y={0}
                  height={90}
                  gap={plateGap}
                  orientation="vertical"
                  chargeSign="+"
                  showField={true}
                  thickness={10}
                  showElectricFieldLines={true}
                />
                {/* 左侧固定基座 */}
                <rect x={-plateGap / 2 - 13} y={-50} width={8} height={100} fill={colors.neutral[500]} rx={1} />
                <text x={-plateGap / 2 - 9} y={62} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight}>
                  固定极板
                </text>

                {/* 右侧动片测头推杆：紧密贴合动片右外壁 */}
                <g transform={`translate(${pushRodX}, 0)`}>
                  {/* 传力测头顶针 */}
                  <rect x={0} y={-8} width={35} height={16} fill={colors.neutral[400]} stroke={colors.neutral[700]} strokeWidth={1.2} rx={2} />
                  <polygon points="35,-8 45,0 35,8" fill={colors.neutral[600]} />
                  {/* 受力箭头 */}
                  <path d="M 55 0 L 46 0" stroke={PHYSICS_COLORS.forceNet} strokeWidth={2.5} markerEnd="" />
                  <polygon points="45,0 52,-4 52,4" fill={PHYSICS_COLORS.forceNet} />
                  <text x={65} y={4} fontSize={font(9)} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
                    F受压
                  </text>
                  <text x={20} y={-14} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight}>
                    可动动片
                  </text>
                </g>
              </>
            )
          })()}

          {/* 实时电容读数指示 */}
          <text x={0} y={75} textAnchor="middle" fontSize={font(11)} fill={EM_COLORS.capacitor} fontWeight={700}>
            {`实时电容 C = ${capacitancePf.toFixed(2)} pF (d = ${physics.currentX.toFixed(1)} mm)`}
          </text>
        </g>
      )}

      {/* ── 右半区：宏观自动控制应用电路 (370,20, 440×285) ─────────────────────────── */}
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
        【自动控制应用电路】弱电控制回路与高压受控回路
      </text>

      {/* ── 1. 低压控制回路（DC 5V 控制侧） ── */}
      {/* 控制电源 DCSource（水平放置，长正极在右） */}
      <DCSource
        type="symbol"
        orientation="horizontal"
        x={440}
        y={235}
        voltage={5}
        polarity="right-positive"
        label="E₁ = 5V"
      />

      {/* 控制回路导线骨架（端子级正交闭合） */}
      {(() => {
        const wireY = 235
        const negX = 440 - 25
        const posX = 440 + 25
        return (
          <g stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* 负极 -> (395,235) -> 向上直通变阻器左端(395,85) -> (410,85) */}
            <path d={`M ${negX} ${wireY} L 395 ${wireY} L 395 85 L 410 85`} />
            {/* 变阻器右端(480,85) -> 传感器左端(490,85) */}
            <path d="M 480 85 L 490 85" />
            {/* 传感器右端(538,85) -> 拐角(550,85) -> 电磁铁上线圈端子(550,130) */}
            <path d="M 538 85 L 550 85 L 550 130" />
            {/* 电磁铁下线圈端子(550,180) -> 拐角(550,235) -> 正极(465,235) */}
            <path d={`M 550 180 L 550 ${wireY} L ${posX} ${wireY}`} />
          </g>
        )
      })()}

      {/* 滑动变阻器 R0：复用规范组件 Rheostat */}
      <g transform="translate(445, 85)">
        <Rheostat
          width={70}
          variant="symbolic"
          wiringMode="current-limiting"
          showLabel={false}
          font={font}
        />
        <text x={0} y={-16} textAnchor="middle" fontSize={font(9.5)} fill={CANVAS_COLORS.labelText} fontWeight={600}>
          变阻器 R₀
        </text>
      </g>

      {/* 传感器符号元件 */}
      <g transform="translate(514, 85)">
        <rect
          x={-24}
          y={-12}
          width={48}
          height={24}
          fill={CANVAS_COLORS.objectFillNeutral}
          stroke={PHYSICS_COLORS.emf}
          strokeWidth={1.8}
          rx={2}
        />
        <text x={0} y={4} textAnchor="middle" fontSize={font(9.5)} fill={PHYSICS_COLORS.emf} fontWeight={700}>
          {sensorType === 0 ? '光敏 RG' : sensorType === 1 ? '热敏 RT' : sensorType === 2 ? '霍尔 UH' : '电容 C'}
        </text>
        <text x={0} y={-16} textAnchor="middle" fontSize={font(9)} fill={CANVAS_COLORS.labelTextLight}>
          传感器
        </text>
      </g>

      {/* 回路电流指示（在左侧垂直导线上，遵从 CIRCUIT_RULES 仅文字与微三角标记） */}
      {circuitCurrent > 0.0001 && (
        <g fill={PHYSICS_COLORS.electricCurrent}>
          <polygon points="395,160 391,150 399,150" />
          <text x={383} y={158} fontSize={font(9.5)} fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold" textAnchor="end">
            {`I控 = ${(circuitCurrent * 1000).toFixed(2)}mA`}
          </text>
        </g>
      )}

      {/* ── 2. 电磁继电器整体机构（标准隔离框） ── */}
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
        {sensorType === 0 ? '继电器 (常闭型)' : '继电器 (常开型)'}
      </text>

      {/* 电磁铁铁芯与线圈绕组 */}
      <g transform="translate(550, 155)">
        <rect x={-8} y={-22} width={16} height={44} fill={colors.neutral[400]} stroke={colors.neutral[700]} strokeWidth={1.5} rx={2} />
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
        {/* 磁吸动作红虚线发光框 */}
        {isArmatureAttracted && (
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

      {/* 衔铁、回位弹簧与常闭/常开触点真实机械联动 */}
      {(() => {
        // 衔铁水平位移：当吸合时向左移动 6px
        const armatureX = isArmatureAttracted ? 578 : 584
        // 是否常闭路灯模式
        const isNCMode = sensorType === 0

        return (
          <g>
            {/* 复位弹簧 */}
            <path
              d={`M ${armatureX} 135 L 598 135`}
              stroke={CANVAS_COLORS.textMuted}
              strokeWidth={1.5}
              strokeDasharray="2,2"
            />
            {/* 衔铁 */}
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

            {/* 静触点端子 */}
            <circle cx={625} cy={145} r={3} fill={SCENE_COLORS.materials.structStrokeMid} />
            <circle cx={625} cy={165} r={3} fill={SCENE_COLORS.materials.structStrokeMid} />

            {/* 动触点簧片联动逻辑：
                1) 常闭型 (NC, sensorType === 0):
                   未吸合 (白天无吸力) -> 闭合在静触点上 (工作回路接通)
                   吸合时 (天亮吸下衔铁) -> 动触点被向左拉开 (工作回路断开)
                2) 常开型 (NO, sensorType !== 0):
                   未吸合 -> 动触点向左悬空 (断开)
                   吸合时 -> 动触点被向左推至闭合静触点 (工作回路导通)
            */}
            {isNCMode ? (
              isArmatureAttracted ? (
                // 常闭被拉开 (灭灯)
                <line x1={625} y1={165} x2={616} y2={148} stroke={SCENE_COLORS.circuit.switchOpen} strokeWidth={2.5} strokeLinecap="round" />
              ) : (
                // 常闭未动作，保持闭合 (点亮路灯)
                <line x1={625} y1={145} x2={625} y2={165} stroke={SCENE_COLORS.circuit.switchClosed} strokeWidth={2.8} strokeLinecap="round" />
              )
            ) : (
              isArmatureAttracted ? (
                // 常开被推合 (报警)
                <line x1={625} y1={145} x2={625} y2={165} stroke={SCENE_COLORS.circuit.switchClosed} strokeWidth={2.8} strokeLinecap="round" />
              ) : (
                // 常开未动作，保持断开
                <line x1={625} y1={165} x2={616} y2={148} stroke={SCENE_COLORS.circuit.switchOpen} strokeWidth={2.5} strokeLinecap="round" />
              )
            )}
          </g>
        )
      })()}

      {/* ── 3. 高压强电工作回路（220V 强电受控侧，完全电气隔离） ── */}
      <g stroke={SCENE_COLORS.materials.structStrokeDark} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 触点上端子(625,145) -> 拐角(655,145) -> 顶线(655,85) -> 负载上端子(740,85) -> (740,120) */}
        <path d="M 625 145 L 655 145 L 655 85 L 740 85 L 740 120" />
        {/* 负载下端子(740,170) -> 拐角(740,247) -> 220V电源右端子(705,247) */}
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

      {/* 受控负载：路灯 L 或报警器 */}
      <LightBulb
        x={740}
        y={145}
        power={isTriggered ? 1.0 : 0}
        time={time}
        scale={0.9}
        label={sensorType === 0 ? '路灯 L' : '报警装置'}
        font={font}
      />
      <text
        x={740}
        y={192}
        textAnchor="middle"
        fontSize={font(10.5)}
        fill={isTriggered ? CANVAS_COLORS.alertRed : CANVAS_COLORS.textMuted}
        fontWeight={600}
      >
        {sensorType === 0
          ? isTriggered
            ? '● 夜晚自动点亮'
            : '○ 白天熄灭'
          : isTriggered
          ? '● 触发报警接通'
          : '○ 正常监控断开'}
      </text>

      {/* ── 4. 底部状态栏与欧姆定律动作指示 ── */}
      <g transform="translate(390, 282)">
        {sensorType === 0 && (
          <>
            <text x={0} y={0} fontSize={font(10.5)} fill={PHYSICS_COLORS.electricPotential} fontWeight={600}>
              {`控制回路 I = ${(circuitCurrent * 1000).toFixed(2)} mA | 释放阈值 I = ${(LIGHT_RELAY_I_PULL * 1000).toFixed(2)} mA (弱光亮灯)`}
            </text>
            <text
              x={310}
              y={0}
              fontSize={font(10.5)}
              fontWeight={700}
              fill={isTriggered ? SCENE_COLORS.circuit.switchClosed : CANVAS_COLORS.trackHistory}
            >
              {isArmatureAttracted ? '● 强光吸合拉开触点(灭灯)' : '● 弱光常闭复位(点亮)'}
            </text>
          </>
        )}
        {sensorType === 1 && (
          <>
            <text x={0} y={0} fontSize={font(10.5)} fill={PHYSICS_COLORS.electricPotential} fontWeight={600}>
              {`控制回路 I = ${(circuitCurrent * 1000).toFixed(2)} mA | 吸合阈值 I = ${(NTC_RELAY_I_PULL * 1000).toFixed(2)} mA (超温报警)`}
            </text>
            <text
              x={310}
              y={0}
              fontSize={font(10.5)}
              fontWeight={700}
              fill={isTriggered ? CANVAS_COLORS.alertRed : CANVAS_COLORS.trackHistory}
            >
              {isArmatureAttracted ? '● 超温吸合常开触点(报警)' : '○ 正常温度未吸合'}
            </text>
          </>
        )}
        {sensorType === 2 && (
          <>
            <text x={0} y={0} fontSize={font(10.5)} fill={PHYSICS_COLORS.electricPotential} fontWeight={600}>
              {`霍尔输出 UH = ${uHallMilliVolts.toFixed(1)} mV | 动作门限 Uth = ${HALL_TRIGGER_VOLTAGE_MV.toFixed(1)} mV`}
            </text>
            <text
              x={310}
              y={0}
              fontSize={font(10.5)}
              fontWeight={700}
              fill={isTriggered ? SCENE_COLORS.circuit.switchClosed : CANVAS_COLORS.trackHistory}
            >
              {isArmatureAttracted ? '● 强磁触发闭合无触点开关' : '○ 弱磁未达动作门限'}
            </text>
          </>
        )}
        {sensorType === 3 && (
          <>
            <text x={0} y={0} fontSize={font(10.5)} fill={PHYSICS_COLORS.electricPotential} fontWeight={600}>
              {`极板间距 d = ${physics.currentX.toFixed(1)} mm | 极限阈值 d ≤ ${CAP_SENSOR_TRIGGER_GAP_MM} mm`}
            </text>
            <text
              x={310}
              y={0}
              fontSize={font(10.5)}
              fontWeight={700}
              fill={isTriggered ? CANVAS_COLORS.alertRed : CANVAS_COLORS.trackHistory}
            >
              {isTriggered ? '● 间距过小触发受压超程报警' : '○ 间距正常安全监控'}
            </text>
          </>
        )}
      </g>
    </g>
  )
}
