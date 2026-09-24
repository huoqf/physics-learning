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
import { PHYSICS_COLORS } from '@/theme/physics'
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
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth={1.5}
        rx={6}
      />
      <text
        x={45}
        y={45}
        fontSize={font(12)}
        fontWeight={700}
        fill="#1e293b"
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
          <rect x={-50} y={-40} width={100} height={80} fill="#fef3c7" stroke="#d97706" strokeWidth={2} rx={4} />
          {/* 蛇形栅格 */}
          <path
            d="M -35 -25 L 35 -25 L 35 -10 L -35 -10 L -35 5 L 35 5 L 35 20 L -35 20"
            fill="none"
            stroke="#b45309"
            strokeWidth={3}
          />
          {/* 照射光线 */}
          <g stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 2">
            <line x1={-80} y1={-80} x2={-30} y2={-30} />
            <line x1={-50} y1={-90} x2={0} y2={-40} />
            <line x1={-20} y1={-90} x2={30} y2={-40} />
          </g>
          <text x={0} y={60} textAnchor="middle" fontSize={font(11)} fill="#64748b">
            {`实时光敏阻值 R = ${(rSensor / 1000).toFixed(1)} kΩ`}
          </text>
        </g>
      )}

      {sensorType === 1 && (
        <g transform="translate(190, 160)">
          {/* NTC 陶瓷热敏圆片 */}
          <circle cx={0} cy={0} r={42} fill="#1e293b" stroke="#64748b" strokeWidth={3} />
          <text x={0} y={4} textAnchor="middle" fontSize={font(11)} fill="#ffffff" fontWeight={600}>
            NTC 10k
          </text>
          {/* 晶格引脚 */}
          <line x1={-15} y1={42} x2={-15} y2={80} stroke="#94a3b8" strokeWidth={2.5} />
          <line x1={15} y1={42} x2={15} y2={80} stroke="#94a3b8" strokeWidth={2.5} />
          <text x={0} y={105} textAnchor="middle" fontSize={font(11)} fill="#64748b">
            {`实时热敏阻值 R = ${(rSensor / 1000).toFixed(1)} kΩ`}
          </text>
        </g>
      )}

      {sensorType === 2 && (
        <g transform="translate(190, 155)">
          {/* 磁场背景 */}
          <MagneticFieldGrid x={-70} y={-50} w={140} h={100} direction="in" />
          {/* 霍尔半导体薄片 */}
          <rect x={-55} y={-35} width={110} height={70} fill="rgba(56, 189, 248, 0.25)" stroke="#0284c7" strokeWidth={2} rx={3} />

          {/* 表面极性与积累电荷渲染 */}
          <g transform="translate(0, -35)">
            {[-40, -20, 0, 20, 40].map((xPos, idx) => (
              <text key={idx} x={xPos} y={-3} textAnchor="middle" fontSize={font(10)} fontWeight={700} fill={topPolarity === '+' ? '#ef4444' : '#3b82f6'}>
                {topPolarity}
              </text>
            ))}
          </g>
          <g transform="translate(0, 35)">
            {[-40, -20, 0, 20, 40].map((xPos, idx) => (
              <text key={idx} x={xPos} y={11} textAnchor="middle" fontSize={font(10)} fontWeight={700} fill={bottomPolarity === '+' ? '#ef4444' : '#3b82f6'}>
                {bottomPolarity}
              </text>
            ))}
          </g>

          {/* 表面极性文字 */}
          <text x={0} y={-46} textAnchor="middle" fontSize={font(12)} fontWeight={700} fill={topPolarity === '+' ? '#ef4444' : '#3b82f6'}>
            {`上表面 (${topPolarity}) 极`}
          </text>
          <text x={0} y={58} textAnchor="middle" fontSize={font(12)} fontWeight={700} fill={bottomPolarity === '+' ? '#ef4444' : '#3b82f6'}>
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
                <circle cx={0} cy={0} r={6} fill={isElectron ? '#3b82f6' : '#ef4444'} opacity={0.85} />
                <text x={0} y={3.5} textAnchor="middle" fontSize={font(9)} fill="#ffffff" fontWeight={700}>
                  {isElectron ? 'e⁻' : 'h⁺'}
                </text>
                {/* 洛伦兹力向上微箭头 */}
                <line x1={0} y1={-6} x2={0} y2={-14} stroke="#f59e0b" strokeWidth={1.5} />
                <polygon points="0,-16 -3,-13 3,-13" fill="#f59e0b" />
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
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth={1.5}
        rx={6}
      />
      <text
        x={390}
        y={45}
        fontSize={font(12)}
        fontWeight={700}
        fill="#1e293b"
      >
        【自动控制应用电路】电磁继电器 / 阈值触发
      </text>

      {/* 控制回路导线 */}
      <g stroke="#94a3b8" strokeWidth={2.5} fill="none">
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
      <rect x={495} y={135} width={50} height={30} fill="#f1f5f9" stroke="#475569" strokeWidth={1.5} rx={2} />
      <text x={520} y={154} textAnchor="middle" fontSize={font(10)} fill="#334155" fontWeight={600}>
        传感器
      </text>

      {/* 电磁继电器 / 触点开关 */}
      <g transform="translate(640, 150)">
        <rect x={-25} y={-25} width={50} height={50} fill="#f8fafc" stroke="#64748b" strokeWidth={1.5} rx={3} />
        <text x={0} y={-30} textAnchor="middle" fontSize={font(10)} fill="#64748b">
          继电器
        </text>
        {/* 动触点吸合状态 */}
        <circle cx={-12} cy={0} r={3} fill="#475569" />
        <circle cx={12} cy={0} r={3} fill="#475569" />
        {isTriggered ? (
          <line x1={-12} y1={0} x2={12} y2={0} stroke="#16a34a" strokeWidth={3} />
        ) : (
          <line x1={-12} y1={0} x2={8} y2={-15} stroke="#ef4444" strokeWidth={3} />
        )}
      </g>

      {/* 被控工作回路与受控路灯/警铃 */}
      <g stroke="#cbd5e1" strokeWidth={2} fill="none">
        <path d="M 652 150 L 730 150 L 730 200" />
        <path d="M 628 150 L 600 150 L 600 240 L 730 240 L 730 230" />
      </g>
      <LightBulb
        x={730}
        y={190}
        power={isTriggered ? 1.0 : 0}
        time={time}
      />
      <text x={730} y={245} textAnchor="middle" fontSize={font(11)} fill="#64748b">
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
          fill={isTriggered ? '#16a34a' : '#94a3b8'}
        >
          {isTriggered ? '● 继电器导通 (工作中)' : '○ 继电器断开 (静止)'}
        </text>
      </g>
    </g>
  )
}
