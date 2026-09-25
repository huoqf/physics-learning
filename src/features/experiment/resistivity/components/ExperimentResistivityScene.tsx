import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import { DialMeter, Rheostat, Micrometer } from '@/components/Physics'
import { useExperimentResistivityPhysics } from '../hooks/useExperimentResistivityPhysics'

interface ExperimentResistivitySceneProps {
  physics: ReturnType<typeof useExperimentResistivityPhysics>
  font: (size: number) => number
}

export const ExperimentResistivityScene: React.FC<ExperimentResistivitySceneProps> = ({
  physics,
  font,
}) => {
  const {
    L,
    d_mm,
    wiring,
    R_slider,
    Rx_real,
    Rx_meas,
    currentA,
    voltageV,
  } = physics

  // 金属丝总跨度：物理长度 0.8m 映射到设计像素 380px
  // 刻度基座左端 x=60, 右端 x=440, y=70
  const wireStartX = 70
  const wireEndX = 430
  const wireY = 70
  const wireLengthPx = wireEndX - wireStartX // 360 px 代表 0.8m
  const clipX = wireStartX + (L / 0.8) * wireLengthPx

  return (
    <g className="experiment-resistivity-scene">
      {/* ────────────────── 左半区：金属丝导轨与伏安法电路 ────────────────── */}
      <g className="left-apparatus-area">
        {/* 区域背景框 */}
        <rect
          x={30}
          y={20}
          width={450}
          height={285}
          rx={8}
          fill={withAlpha(CANVAS_COLORS.axis, 0.04)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        {/* 区域标题 */}
        <text
          x={45}
          y={42}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(12)}
          fontWeight="bold"
        >
          实验装置台（有效长度与伏安测量）
        </text>

        {/* 接法徽章 */}
        <rect
          x={280}
          y={28}
          width={185}
          height={22}
          rx={4}
          fill={withAlpha(wiring === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration, 0.15)}
          stroke={wiring === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration}
          strokeWidth={1}
        />
        <text
          x={372}
          y={43}
          textAnchor="middle"
          fill={wiring === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration}
          fontSize={font(11)}
          fontWeight="bold"
        >
          {wiring === 0 ? '电流表外接法 (测小电阻推荐)' : '电流表内接法 (电流表分压)'}
        </text>

        {/* 金属丝安装基座与直尺 */}
        <rect
          x={wireStartX - 10}
          y={wireY - 12}
          width={wireLengthPx + 20}
          height={32}
          rx={4}
          fill={withAlpha(SCENE_COLORS.surface.groundStroke, 0.15)}
          stroke={SCENE_COLORS.surface.groundStroke}
          strokeWidth={1}
        />
        {/* 毫米刻度线（步进 10cm 一大格） */}
        {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((val) => {
          const tickX = wireStartX + (val / 0.8) * wireLengthPx
          return (
            <g key={val}>
              <line
                x1={tickX}
                y1={wireY + 8}
                x2={tickX}
                y2={wireY + 16}
                stroke={CANVAS_COLORS.axis}
                strokeWidth={1}
              />
              <text
                x={tickX}
                y={wireY + 28}
                textAnchor="middle"
                fill={CANVAS_COLORS.textMuted}
                fontSize={font(9)}
              >
                {Math.round(val * 100)}
              </text>
            </g>
          )
        })}

        {/* 待测金属丝（电阻丝） */}
        <line
          x1={wireStartX}
          y1={wireY}
          x2={wireEndX}
          y2={wireY}
          stroke={SCENE_COLORS.modernPhysics.activeCoating}
          strokeWidth={3}
        />
        {/* 接入电路的有效通电段高亮 */}
        <line
          x1={wireStartX}
          y1={wireY}
          x2={clipX}
          y2={wireY}
          stroke={PHYSICS_COLORS.emf}
          strokeWidth={3.5}
        />

        {/* 左接线端子 A */}
        <circle cx={wireStartX} cy={wireY} r={5} fill={PHYSICS_COLORS.electricField} />
        <text
          x={wireStartX}
          y={wireY - 16}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontWeight="bold"
        >
          端点 A
        </text>

        {/* 右滑动夹头 B (指示有效长度 L) */}
        <g transform={`translate(${clipX}, ${wireY})`}>
          <polygon
            points="0,-16 -8,-28 8,-28"
            fill={PHYSICS_COLORS.emf}
            stroke={PHYSICS_COLORS.emf}
            strokeWidth={1}
          />
          <circle cx={0} cy={0} r={5} fill={PHYSICS_COLORS.electricField} />
          <text
            x={0}
            y={-32}
            textAnchor="middle"
            fill={PHYSICS_COLORS.emf}
            fontSize={font(11)}
            fontWeight="bold"
          >
            夹头 B (L = {L.toFixed(2)} m)
          </text>
        </g>

        {/* 电压表 V (并联接在 A 与 B 之间) */}
        <DialMeter
          type="V"
          value={voltageV}
          max={4}
          x={140}
          y={170}
          r={26}
          font={font}
        />
        <text
          x={140}
          y={208}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
        >
          U = {voltageV.toFixed(2)} V
        </text>

        {/* 电流表 A */}
        <DialMeter
          type="A"
          value={currentA}
          max={1.5}
          x={250}
          y={170}
          r={26}
          font={font}
        />
        <text
          x={250}
          y={208}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
        >
          I = {currentA.toFixed(3)} A
        </text>

        {/* 滑动变阻器 Rheostat */}
        <Rheostat
          x={380}
          y={170}
          value={R_slider}
          min={5}
          max={50}
          width={110}
          label="变阻器 R"
          font={font}
        />

        {/* 直流电源示意 */}
        <g transform="translate(80, 260)">
          <rect
            x={0}
            y={0}
            width={80}
            height={30}
            rx={4}
            fill={withAlpha(PHYSICS_COLORS.potentialEnergy, 0.15)}
            stroke={PHYSICS_COLORS.potentialEnergy}
            strokeWidth={1}
          />
          <text
            x={40}
            y={19}
            textAnchor="middle"
            fill={PHYSICS_COLORS.potentialEnergy}
            fontSize={font(11)}
            fontWeight="bold"
          >
            电源 E=4V
          </text>
          {/* 正负极端子 */}
          <circle cx={10} cy={15} r={3} fill={PHYSICS_COLORS.acceleration} />
          <circle cx={70} cy={15} r={3} fill={PHYSICS_COLORS.velocity} />
        </g>

        {/* 电阻读数即时指示卡 */}
        <rect
          x={180}
          y={245}
          width={280}
          height={48}
          rx={6}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        <text
          x={195}
          y={265}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
        >
          真实电阻 Rx: <tspan fill={PHYSICS_COLORS.velocity} fontWeight="bold">{Rx_real.toFixed(3)} Ω</tspan>
        </text>
        <text
          x={195}
          y={282}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
        >
          伏安测量 Rx(测): <tspan fill={PHYSICS_COLORS.acceleration} fontWeight="bold">{Rx_meas.toFixed(3)} Ω</tspan>
          <tspan fill={CANVAS_COLORS.textMuted} fontSize={font(10)}>
            {wiring === 0 ? ' (外接偏小)' : ' (内接偏大)'}
          </tspan>
        </text>
      </g>

      {/* ────────────────── 右半区：螺旋测微器直径精确测量台 ────────────────── */}
      <g className="right-apparatus-area" transform="translate(500, 20)">
        {/* 背景框 */}
        <rect
          x={0}
          y={0}
          width={310}
          height={285}
          rx={8}
          fill={withAlpha(CANVAS_COLORS.axis, 0.04)}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        {/* 标题 */}
        <text
          x={16}
          y={24}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(12)}
          fontWeight="bold"
        >
          螺旋测微器（测量金属丝直径 d）
        </text>

        {/* 挂载 Micrometer 精密物理组件 */}
        <g transform="translate(20, 60)">
          <Micrometer
            x={10}
            y={20}
            measuredValue={d_mm}
            scale={0.88}
            showMagnifier={true}
          />
        </g>

        {/* 读数说明与方法 */}
        <rect
          x={16}
          y={195}
          width={278}
          height={75}
          rx={6}
          fill={CANVAS_COLORS.white}
          stroke={CANVAS_COLORS.axis}
          strokeWidth={1}
        />
        <text
          x={26}
          y={215}
          fill={PHYSICS_COLORS.wavelengthGreen}
          fontSize={font(12)}
          fontWeight="bold"
        >
          直径读数 d = {d_mm.toFixed(3)} mm
        </text>
        <text
          x={26}
          y={234}
          fill={CANVAS_COLORS.textMuted}
          fontSize={font(10)}
        >
          固定刻度: {Math.floor(d_mm)} mm + 半刻度 {d_mm % 1 >= 0.5 ? '0.5' : '0.0'} mm
        </text>
        <text
          x={26}
          y={252}
          fill={CANVAS_COLORS.textMuted}
          fontSize={font(10)}
        >
          可动刻度: {((d_mm % 0.5) / 0.01).toFixed(1)} × 0.01 mm（需估读一位）
        </text>
      </g>
    </g>
  )
}
