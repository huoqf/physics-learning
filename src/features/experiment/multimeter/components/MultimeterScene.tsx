import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import type { MultimeterPhysicsResult } from '../hooks/useMultimeterPhysics'

interface MultimeterSceneProps {
  physics: MultimeterPhysicsResult
  font: (size: number) => number
}

export const MultimeterScene: React.FC<MultimeterSceneProps> = ({ physics, font }) => {
  const {
    pointerAngleDeg,
    range,
    readingDisplay,
    isZeroAdjusted,
    probesConnected,
  } = physics

  // 表壳几何中心与设计尺寸 (针对 560 x 580 表壳区域)
  const caseX = 40
  const caseY = 30
  const caseW = 460
  const caseH = 580

  // 扇形表头几何
  const meterCenterX = caseX + caseW / 2 // 270
  const meterCenterY = 280 // 表针转轴圆心
  const dialRadius = 175 // 表盘主刻度弧线半径
  const pointerLength = 160 // 指针长度

  // 刻度弧度换算辅助 (angleDeg: -45° 为左端, +45° 为右端；SVG 坐标系 0°为水平右, 故轴线转 270° + angleDeg)
  const getDialPos = (angleDeg: number, r: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: meterCenterX + r * Math.cos(rad),
      y: meterCenterY + r * Math.sin(rad),
    }
  }

  // 1. 欧姆刻度数据点 (标号: 0, 5, 10, 15(中值), 20, 30, 50, 100, 500, ∞)
  const ohmTicks = [
    { val: 0, label: '0' },
    { val: 2, label: '2' },
    { val: 5, label: '5' },
    { val: 10, label: '10' },
    { val: 15, label: '15' }, // 中值
    { val: 20, label: '20' },
    { val: 30, label: '30' },
    { val: 50, label: '50' },
    { val: 100, label: '100' },
    { val: 200, label: '200' },
    { val: 500, label: '500' },
    { val: Infinity, label: '∞' },
  ]

  // 2. 直流电压/电流线性均匀刻度 (0 ~ 50 及 0 ~ 10 及 0 ~ 2.5)
  const linearTicks = [0, 10, 20, 30, 40, 50]

  // 下部挡位大旋钮几何 (x: 270, y: 460)
  const knobX = meterCenterX
  const knobY = 465
  const knobR = 48

  // 3. 挡位大旋钮数据定义（角度与文字位置统一极坐标计算）
  const KNOB_RANGES = [
    { key: 'OFF', label: 'OFF', angleDeg: 0, color: colors.danger[500] },
    { key: 'DCV_2_5', label: '2.5V', angleDeg: 35, color: PHYSICS_COLORS.negativeCharge },
    { key: 'DCV_10', label: '10V', angleDeg: 68, color: PHYSICS_COLORS.negativeCharge },
    { key: 'DCV_50', label: '50V', angleDeg: 100, color: PHYSICS_COLORS.negativeCharge },
    { key: 'DCA_10mA', label: '10mA', angleDeg: 135, color: PHYSICS_COLORS.positiveCharge },
    { key: 'DCA_100mA', label: '100mA', angleDeg: 165, color: PHYSICS_COLORS.positiveCharge },
    { key: 'OHM_X1K', label: '×1k', angleDeg: -165, color: PHYSICS_COLORS.wavelengthGreen },
    { key: 'OHM_X100', label: '×100', angleDeg: -135, color: PHYSICS_COLORS.wavelengthGreen },
    { key: 'OHM_X10', label: '×10', angleDeg: -100, color: PHYSICS_COLORS.wavelengthGreen },
    { key: 'OHM_X1', label: '×1', angleDeg: -68, color: PHYSICS_COLORS.wavelengthGreen },
  ] as const

  const activeKnobItem = KNOB_RANGES.find((item) => item.key === range) ?? KNOB_RANGES[0]
  const currentKnobAngle = activeKnobItem.angleDeg

  return (
    <g className="multimeter-scene select-none">
      {/* ────────────────── 1. 表壳外廓与工业质感面板 ────────────────── */}
      <rect
        x={caseX}
        y={caseY}
        width={caseW}
        height={caseH}
        rx={24}
        fill={colors.neutral[800]} // 深暗哑光工业工程塑料表壳
        stroke={colors.neutral[900]}
        strokeWidth={3}
      />
      {/* 内边框高光凹槽 */}
      <rect
        x={caseX + 8}
        y={caseY + 8}
        width={caseW - 16}
        height={caseH - 16}
        rx={18}
        fill="none"
        stroke={withAlpha(colors.neutral[400], 0.2)}
        strokeWidth={2}
      />

      {/* ────────────────── 2. 表头视窗区 (Dial Window) ────────────────── */}
      <rect
        x={caseX + 24}
        y={caseY + 20}
        width={caseW - 48}
        height={260}
        rx={12}
        fill={CANVAS_COLORS.white} // 防眩光表盘底色
        stroke={colors.neutral[700]}
        strokeWidth={2}
      />

      {/* 表头型号与精度标志 */}
      <text
        x={caseX + 40}
        y={caseY + 45}
        fill={colors.neutral[600]}
        fontSize={font(10)}
        fontWeight="bold"
      >
        MF-47 MULTIMETER
      </text>
      <text
        x={caseX + caseW - 44}
        y={caseY + 45}
        textAnchor="end"
        fill={colors.neutral[500]}
        fontSize={font(9)}
      >
        ⎓ 20kΩ/V  ~ 9kΩ/V
      </text>

      {/* 弧度反光镜条 (帮助视线垂直对准，消除读数视差) */}
      <path
        d={`M ${getDialPos(-44, dialRadius - 28).x} ${getDialPos(-44, dialRadius - 28).y} A ${dialRadius - 28} ${dialRadius - 28} 0 0 1 ${getDialPos(44, dialRadius - 28).x} ${getDialPos(44, dialRadius - 28).y}`}
        fill="none"
        stroke={colors.neutral[200]}
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* ────── 2.1 顶层刻度弧线：电阻 Ω 刻度（绿色，反向非线性，左密右疏） ────── */}
      <path
        d={`M ${getDialPos(-45, dialRadius).x} ${getDialPos(-45, dialRadius).y} A ${dialRadius} ${dialRadius} 0 0 1 ${getDialPos(45, dialRadius).x} ${getDialPos(45, dialRadius).y}`}
        fill="none"
        stroke={PHYSICS_COLORS.wavelengthGreen}
        strokeWidth={2}
      />
      <text
        x={getDialPos(-48, dialRadius + 14).x}
        y={getDialPos(-48, dialRadius + 14).y}
        fill={PHYSICS_COLORS.wavelengthGreen}
        fontSize={font(10)}
        fontWeight="bold"
      >
        Ω
      </text>

      {/* 欧姆刻度线与文字标注 */}
      {ohmTicks.map((tick) => {
        const ratio = tick.val === Infinity ? 0 : 15 / (15 + tick.val)
        const angle = -45 + ratio * 90
        const p1 = getDialPos(angle, dialRadius)
        const p2 = getDialPos(angle, dialRadius + (tick.val === 15 || tick.val === 0 || tick.val === Infinity ? 8 : 5))
        const pText = getDialPos(angle, dialRadius + 16)
        const isMid = tick.val === 15

        return (
          <g key={tick.label}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={PHYSICS_COLORS.wavelengthGreen}
              strokeWidth={isMid ? 2 : 1}
            />
            <text
              x={pText.x}
              y={pText.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isMid ? PHYSICS_COLORS.velocity : PHYSICS_COLORS.wavelengthGreen}
              fontSize={font(isMid ? 11 : 9)}
              fontWeight={isMid ? 'bold' : 'normal'}
            >
              {tick.label}
            </text>
          </g>
        )
      })}

      {/* ────── 2.2 中层刻度弧线：直流电压/电流刻度（黑色，线性均匀，0~50） ────── */}
      <path
        d={`M ${getDialPos(-45, dialRadius - 15).x} ${getDialPos(-45, dialRadius - 15).y} A ${dialRadius - 15} ${dialRadius - 15} 0 0 1 ${getDialPos(45, dialRadius - 15).x} ${getDialPos(45, dialRadius - 15).y}`}
        fill="none"
        stroke={colors.neutral[800]}
        strokeWidth={1.5}
      />
      <text
        x={getDialPos(-48, dialRadius - 15).x}
        y={getDialPos(-48, dialRadius - 15).y}
        fill={colors.neutral[800]}
        fontSize={font(9)}
        fontWeight="bold"
      >
        V·mA
      </text>

      {/* 均匀刻度细分 */}
      {linearTicks.map((val) => {
        const ratio = val / 50
        const angle = -45 + ratio * 90
        const p1 = getDialPos(angle, dialRadius - 15)
        const p2 = getDialPos(angle, dialRadius - 22)
        const pText = getDialPos(angle, dialRadius - 30)

        return (
          <g key={val}>
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={colors.neutral[800]}
              strokeWidth={1.5}
            />
            <text
              x={pText.x}
              y={pText.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colors.neutral[800]}
              fontSize={font(9)}
            >
              {val}
            </text>
          </g>
        )
      })}

      {/* ────── 2.3 指针系统 (Pointer) ────── */}
      {/* 红色细长指针 */}
      {(() => {
        const tipPos = getDialPos(pointerAngleDeg, pointerLength)
        const tailPos = getDialPos(pointerAngleDeg + 180, 20)
        return (
          <g>
            <line
              x1={tailPos.x}
              y1={tailPos.y}
              x2={tipPos.x}
              y2={tipPos.y}
              stroke={PHYSICS_COLORS.electricCurrent}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* 指针轴心盖帽 */}
            <circle cx={meterCenterX} cy={meterCenterY} r={10} fill={colors.neutral[700]} />
            <circle cx={meterCenterX} cy={meterCenterY} r={4} fill={PHYSICS_COLORS.electricCurrent} />
          </g>
        )
      })()}

      {/* ────── 2.4 机械调零螺钉 (Mechanical Zero Screw) ────── */}
      <g transform={`translate(${meterCenterX}, 298)`}>
        <circle cx={0} cy={0} r={12} fill={colors.neutral[300]} stroke={colors.neutral[600]} strokeWidth={1.5} />
        {/* 一字螺丝槽 */}
        <line x1={-8} y1={0} x2={8} y2={0} stroke={colors.neutral[700]} strokeWidth={2} />
        <text x={0} y={18} textAnchor="middle" fill={colors.neutral[500]} fontSize={font(8)}>
          机械调零
        </text>
      </g>

      {/* ────────────────── 3. 欧姆调零旋钮 (Ohm Zero Adjuster) ────────────────── */}
      <g transform={`translate(${caseX + 70}, 345)`}>
        <circle
          cx={0}
          cy={0}
          r={22}
          fill={colors.neutral[700]}
          stroke={isZeroAdjusted ? PHYSICS_COLORS.wavelengthGreen : colors.warning[500]}
          strokeWidth={2}
        />
        {/* 旋钮滚花刻纹 */}
        {[-45, 0, 45, 90, 135, 180, 225].map((ang) => {
          const rad = (ang * Math.PI) / 180
          return (
            <line
              key={ang}
              x1={15 * Math.cos(rad)}
              y1={15 * Math.sin(rad)}
              x2={21 * Math.cos(rad)}
              y2={21 * Math.sin(rad)}
              stroke={colors.neutral[500]}
              strokeWidth={1.5}
            />
          )
        })}
        <circle cx={0} cy={0} r={6} fill={colors.neutral[800]} />
        <text x={0} y={34} textAnchor="middle" fill={colors.neutral[200]} fontSize={font(10)} fontWeight="bold">
          Ω 调零旋钮
        </text>
        {!isZeroAdjusted && (
          <text x={0} y={46} textAnchor="middle" fill={colors.warning[500]} fontSize={font(9)}>
            ⚠️ 请调零
          </text>
        )}
      </g>

      {/* 实时读数悬浮标牌 */}
      <g transform={`translate(${caseX + caseW - 110}, 330)`}>
        <rect
          x={-45}
          y={0}
          width={90}
          height={40}
          rx={6}
          fill={colors.neutral[900]}
          stroke={PHYSICS_COLORS.velocity}
          strokeWidth={1.5}
        />
        <text x={0} y={15} textAnchor="middle" fill={colors.neutral[400]} fontSize={font(9)}>
          当前测量读数
        </text>
        <text
          x={0}
          y={32}
          textAnchor="middle"
          fill={PHYSICS_COLORS.emf}
          fontSize={font(12)}
          fontWeight="bold"
        >
          {readingDisplay}
        </text>
      </g>

      {/* ────────────────── 4. 中央 360° 挡位功能旋转大盘 ────────────────── */}
      <g transform={`translate(${knobX}, ${knobY})`}>
        {/* 挡位底盘圆盘与四个颜色功能扇区 */}
        <circle cx={0} cy={0} r={knobR + 32} fill={colors.neutral[900]} stroke={colors.neutral[600]} strokeWidth={2} />

        {/* 挡位刻度文字圈：通过极坐标自动排布，保证与旋钮箭头绝对对齐 */}
        {KNOB_RANGES.map((item) => {
          const rad = (item.angleDeg * Math.PI) / 180
          const textR = knobR + 18
          const tx = textR * Math.sin(rad)
          const ty = -textR * Math.cos(rad)
          const isSelected = item.key === range
          return (
            <text
              key={item.key}
              x={tx}
              y={ty + 3}
              textAnchor="middle"
              fill={isSelected ? colors.neutral.white : item.color}
              fontSize={font(isSelected ? 10 : 8)}
              fontWeight={isSelected ? 'bold' : 'normal'}
            >
              {item.label}
            </text>
          )
        })}

        {/* 旋转物理旋钮体 */}
        <circle cx={0} cy={0} r={knobR} fill={colors.neutral[700]} stroke={colors.neutral[800]} strokeWidth={3} />
        {/* 旋钮手柄指示箭头 */}
        <g transform={`rotate(${currentKnobAngle})`}>
          <rect x={-7} y={-knobR + 4} width={14} height={knobR - 8} rx={4} fill={colors.neutral[50]} />
          <polygon points="0,-knobR -8,-knobR+12 8,-knobR+12" fill={PHYSICS_COLORS.electricCurrent} />
        </g>
        <circle cx={0} cy={0} r={12} fill={colors.neutral[800]} />
      </g>

      {/* ────────────────── 5. 表笔插孔 (Probe Jacks) ────────────────── */}
      {/* 负极插孔 COM (接黑表笔) */}
      <g transform={`translate(${caseX + 90}, 550)`}>
        <circle cx={0} cy={0} r={14} fill={colors.neutral[900]} stroke={colors.neutral[700]} strokeWidth={2} />
        <circle cx={0} cy={0} r={8} fill={colors.neutral[900]} />
        <text x={0} y={-18} textAnchor="middle" fill={colors.neutral[300]} fontSize={font(9)} fontWeight="bold">
          COM (-)
        </text>
        <text x={0} y={24} textAnchor="middle" fill={colors.neutral[400]} fontSize={font(9)}>
          黑表笔
        </text>
      </g>

      {/* 正极插孔 + (接红表笔) */}
      <g transform={`translate(${caseX + caseW - 90}, 550)`}>
        <circle cx={0} cy={0} r={14} fill={withAlpha(PHYSICS_COLORS.electricCurrent, 0.3)} stroke={PHYSICS_COLORS.electricCurrent} strokeWidth={2} />
        <circle cx={0} cy={0} r={8} fill={PHYSICS_COLORS.electricCurrent} />
        <text x={0} y={-18} textAnchor="middle" fill={colors.danger[300]} fontSize={font(9)} fontWeight="bold">
          (+)
        </text>
        <text x={0} y={24} textAnchor="middle" fill={PHYSICS_COLORS.electricCurrent} fontSize={font(9)}>
          红表笔
        </text>
      </g>

      {/* 表笔连接态动效导线 */}
      {probesConnected && (
        <path
          d={`M ${caseX + 90} 550 C ${caseX + 110} 590, ${caseX + caseW - 110} 590, ${caseX + caseW - 90} 550`}
          fill="none"
          stroke={PHYSICS_COLORS.emf}
          strokeWidth={3}
          strokeDasharray="6 3"
        />
      )}
    </g>
  )
}
