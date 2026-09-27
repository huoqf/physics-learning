import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS, CIRCUIT_COLORS, withAlpha } from '@/theme/physics'
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
          y={40}
          fill={CANVAS_COLORS.labelText}
          fontSize={font(11)}
          fontWeight="bold"
        >
          实验装置台（有效长度与伏安测量）
        </text>

        {/* 接法徽章（右移并紧凑化） */}
        <g transform="translate(290, 26)">
          <rect
            x={0}
            y={0}
            width={175}
            height={20}
            rx={4}
            fill={withAlpha(wiring === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration, 0.15)}
            stroke={wiring === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration}
            strokeWidth={1}
          />
          <text
            x={87}
            y={14}
            textAnchor="middle"
            fill={wiring === 0 ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.acceleration}
            fontSize={font(10)}
            fontWeight="bold"
          >
            {wiring === 0 ? '电流表外接法 (测小电阻推荐)' : '电流表内接法 (分压误差)'}
          </text>
        </g>

        {/* 金属丝安装基座与直尺 (y=80) */}
        <rect
          x={wireStartX - 10}
          y={wireY - 10}
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
          y={wireY - 14}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
          fontWeight="bold"
        >
          端点 A
        </text>

        {/* 右滑动夹头 B (指示有效长度 L，坐标标签上移至 y=-18，加背景避免遮挡) */}
        <g transform={`translate(${clipX}, ${wireY})`}>
          <polygon
            points="0,-10 -6,-20 6,-20"
            fill={PHYSICS_COLORS.emf}
            stroke={PHYSICS_COLORS.emf}
            strokeWidth={1}
          />
          <circle cx={0} cy={0} r={5} fill={PHYSICS_COLORS.electricField} />
          <g transform="translate(0, -28)">
            <rect x={-45} y={-11} width={90} height={15} rx={3} fill={withAlpha(CANVAS_COLORS.white, 0.88)} stroke={PHYSICS_COLORS.emf} strokeWidth={0.8} />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={PHYSICS_COLORS.emf}
              fontSize={font(9.5)}
              fontWeight="bold"
            >
              夹头 B ({L.toFixed(2)}m)
            </text>
          </g>
        </g>

        {/* ── 实验导线网络（绘制真实连线，彻底告别悬空） ── */}
        {/* 1. 主回路：电源负极(80, 275) -> 端点A(70, 70) */}
        <path
          d={`M 80 275 L 50 275 L 50 70 L ${wireStartX} 70`}
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 2. 主回路：电源正极(130, 275) -> 开关S(150, 275) */}
        <line x1={130} y1={275} x2={145} y2={275} stroke={CIRCUIT_COLORS.wire} strokeWidth={2} />

        {/* 开关 S (闭合) */}
        <g transform="translate(155, 275)">
          <circle cx={-8} cy={0} r={2.5} fill={CIRCUIT_COLORS.node} />
          <circle cx={8} cy={0} r={2.5} fill={CIRCUIT_COLORS.node} />
          <line x1={-8} y1={0} x2={8} y2={0} stroke={CIRCUIT_COLORS.switchClosed} strokeWidth={2.5} />
          <text x={0} y={-8} fill={CANVAS_COLORS.labelText} fontSize={font(9)} fontWeight="bold" textAnchor="middle">S</text>
        </g>

        {/* 3. 开关S右端(163, 275) -> 滑动变阻器一上一下限流接入(385, 185) */}
        <path
          d="M 163 275 L 430 275 L 430 185"
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 4. 滑动变阻器滑杆引出(340, 150) -> 电流表(275, 170) */}
        <path
          d="M 340 150 L 300 150 L 300 170 L 276 170"
          fill="none"
          stroke={CIRCUIT_COLORS.wire}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 5. 电流表与金属丝连接（区分外接法与内接法） */}
        {wiring === 0 ? (
          // 外接法：电流表直接连到夹头 B，电压表并联在金属丝 A-B 两端
          <g>
            {/* 电流表(224, 170) -> 夹头 B */}
            <path
              d={`M 224 170 L 224 125 L ${clipX} 125 L ${clipX} ${wireY}`}
              fill="none"
              stroke={CIRCUIT_COLORS.wire}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {/* 电压表跨接在 A 与 B 之间 */}
            <path
              d={`M ${wireStartX} ${wireY} L ${wireStartX} 140 L 115 140 L 115 170`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="3,2"
              strokeLinejoin="round"
            />
            <path
              d={`M 165 170 L 180 170 L 180 115 L ${clipX} 115 L ${clipX} ${wireY}`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="3,2"
              strokeLinejoin="round"
            />
          </g>
        ) : (
          // 内接法：电流表串联在金属丝与变阻器之间，电压表跨接在电流表+金属丝两端
          <g>
            <path
              d={`M 224 170 L 224 125 L ${clipX} 125 L ${clipX} ${wireY}`}
              fill="none"
              stroke={CIRCUIT_COLORS.wire}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {/* 电压表跨接在 A 与 变阻器出线端(300, 150) */}
            <path
              d={`M ${wireStartX} ${wireY} L ${wireStartX} 140 L 115 140 L 115 170`}
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="3,2"
              strokeLinejoin="round"
            />
            <path
              d="M 165 170 L 180 170 L 180 140 L 300 140 L 300 150"
              fill="none"
              stroke={PHYSICS_COLORS.electricPotential}
              strokeWidth={1.8}
              strokeDasharray="3,2"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* 电压表 V */}
        <DialMeter
          type="V"
          value={voltageV}
          max={4}
          x={140}
          y={170}
          r={25}
          font={font}
        />
        <text
          x={140}
          y={206}
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
          r={25}
          font={font}
        />
        <text
          x={250}
          y={206}
          textAnchor="middle"
          fill={CANVAS_COLORS.labelText}
          fontSize={font(10)}
        >
          I = {currentA.toFixed(3)} A
        </text>

        {/* 滑动变阻器 Rheostat */}
        <Rheostat
          x={385}
          y={170}
          value={R_slider}
          min={5}
          max={50}
          width={90}
          label="变阻器 R"
          font={font}
        />

        {/* 直流电源示意 */}
        <g transform="translate(60, 260)">
          <rect
            x={0}
            y={0}
            width={75}
            height={26}
            rx={4}
            fill={withAlpha(PHYSICS_COLORS.potentialEnergy, 0.15)}
            stroke={PHYSICS_COLORS.potentialEnergy}
            strokeWidth={1}
          />
          <text
            x={37}
            y={17}
            textAnchor="middle"
            fill={PHYSICS_COLORS.potentialEnergy}
            fontSize={font(10)}
            fontWeight="bold"
          >
            电源 4V
          </text>
          {/* 正负极端子 */}
          <circle cx={70} cy={13} r={2.5} fill={PHYSICS_COLORS.acceleration} />
          <circle cx={5} cy={13} r={2.5} fill={PHYSICS_COLORS.velocity} />
          <text x={70} y={9} fill={PHYSICS_COLORS.acceleration} fontSize={font(8)} fontWeight="bold">+</text>
          <text x={5} y={9} fill={PHYSICS_COLORS.velocity} fontSize={font(8)} fontWeight="bold">-</text>
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
