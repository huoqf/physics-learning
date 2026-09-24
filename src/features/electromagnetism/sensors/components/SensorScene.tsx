import type { CanvasSize } from '@/utils'
import type { ViewportInfo } from '@/utils/useViewport'
import type { SceneScale } from '@/scene'
import {
  DCSource,
  Rheostat,
  LightBulb,
  MagneticFieldGrid,
  PhysicsVectorArrow,
} from '@/components/Physics'
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

      {/* ── 右半区：宏观自动控制电路 ─────────────────────────────── */}
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
        【自动控制应用电路】电磁继电器 / 阈值触发
      </text>

      {/* 控制回路导线 */}
      <g stroke={CANVAS_COLORS.trackHistory} strokeWidth={2.5} fill="none">
        <path d="M 430 240 L 400 240 L 400 90 L 520 90" />
        <path d="M 520 90 L 520 120" />
        <path d="M 520 180 L 520 240 L 470 240" />
        <path d="M 520 150 L 610 150" />
      </g>

      {/* 控制电源 DCSource */}
      <DCSource
        type="instrument"
        x={450}
        y={225}
        voltage={5}
        polarity="right-positive"
      />

      {/* 分压变阻器 Rheostat 与传感器符号 */}
      <Rheostat x={490} y={85} value={5} min={1} max={10} />
      <rect x={495} y={135} width={50} height={30} fill={CANVAS_COLORS.objectFillNeutral} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={1.5} rx={2} />
      <text x={520} y={154} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.strokeDark} fontWeight={600}>
        传感器
      </text>

      {/* 电磁继电器 / 触点开关 */}
      <g transform="translate(640, 150)">
        <rect x={-25} y={-25} width={50} height={50} fill={SCENE_COLORS.materials.structBgLight} stroke={CANVAS_COLORS.textMuted} strokeWidth={1.5} rx={3} />
        <text x={0} y={-30} textAnchor="middle" fontSize={font(10)} fill={CANVAS_COLORS.textMuted}>
          继电器
        </text>
        {/* 动触点吸合状态 */}
        <circle cx={-12} cy={0} r={3} fill={SCENE_COLORS.materials.structStrokeMid} />
        <circle cx={12} cy={0} r={3} fill={SCENE_COLORS.materials.structStrokeMid} />
        {isTriggered ? (
          <line x1={-12} y1={0} x2={12} y2={0} stroke={SCENE_COLORS.circuit.switchClosed} strokeWidth={3} />
        ) : (
          <line x1={-12} y1={0} x2={8} y2={-15} stroke={SCENE_COLORS.circuit.switchOpen} strokeWidth={3} />
        )}
      </g>

      {/* 被控工作回路与受控路灯/警铃 */}
      <g stroke={SCENE_COLORS.materials.structStrokePale} strokeWidth={2} fill="none">
        <path d="M 652 150 L 730 150 L 730 200" />
        <path d="M 628 150 L 600 150 L 600 240 L 730 240 L 730 230" />
      </g>
      <LightBulb
        x={730}
        y={190}
        power={isTriggered ? 1.0 : 0}
        time={time}
      />
      <text x={730} y={245} textAnchor="middle" fontSize={font(11)} fill={CANVAS_COLORS.textMuted}>
        受控路灯 / 报警器
      </text>

      {/* 控制输出状态判定框 */}
      <g transform="translate(390, 275)">
        <text x={0} y={0} fontSize={font(11)} fill={PHYSICS_COLORS.electricPotential}>
          {`控制输出端电压 Vout = ${vOut.toFixed(2)} V (动作阈值 Vth = 2.50 V)`}
        </text>
        <text
          x={330}
          y={0}
          fontSize={font(11)}
          fontWeight={700}
          fill={isTriggered ? SCENE_COLORS.circuit.switchClosed : CANVAS_COLORS.trackHistory}
        >
          {isTriggered ? '● 继电器导通 (工作中)' : '○ 继电器断开 (静止)'}
        </text>
      </g>
    </g>
  )
}
