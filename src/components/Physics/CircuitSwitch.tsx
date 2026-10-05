import React from 'react'
import { SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

const ELECTRICAL = SCENE_COLORS.electricalApparatus

export interface CircuitSwitchProps {
  /** 中心 x 坐标 */
  x: number
  /** 中心 y 坐标 */
  y: number
  /** 是否闭合导通 */
  closed?: boolean
  /** 点击切换开关状态 */
  onToggle?: () => void
  /** 标签文本，默认 'S' */
  label?: string
  /** 字体缩放函数 */
  font?: (size: number) => number
  /** 外观模式：'realistic' (拟物胶木底座带铜闸, 默认) | 'symbolic' (电路原理图图例符号) */
  variant?: 'realistic' | 'symbolic'
}

/**
 * 实验室经典单刀单掷电键（开关 S）
 * - realistic 模式：包含绝缘胶木底座、金属接线柱、可旋转的动触铜质刀闸与绝缘小手柄。
 * - symbolic 模式：标准高中物理教科书原理图符号（左右端子圆点 + 旋转开闭闸刀 + 状态标签）。
 */
export const CircuitSwitch: React.FC<CircuitSwitchProps> = ({
  x,
  y,
  closed = true,
  onToggle,
  label = 'S',
  font = (n) => n,
  variant = 'realistic',
}) => {
  // 开关底座尺寸
  const baseW = 50
  const baseH = 20

  // 刀闸旋转角度：闭合为 0°，断开为 -32°
  const knifeAngle = closed ? 0 : -32

  // 1. 标准原理图符号模式 (高中物理教科书纯净图例)
  if (variant === 'symbolic') {
    const rad = (-32 * Math.PI) / 180
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className="circuit-switch cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* 点击感应透明热区 */}
        <rect x={-25} y={-22} width={50} height={40} fill="transparent" />

        {/* 左接线端子与铰链 */}
        <circle cx={-18} cy={0} r={3.5} fill={colors.neutral[800]} />
        {/* 右接线端子与静触点 */}
        <circle cx={18} cy={0} r={3.5} fill={colors.neutral[800]} />

        {/* 动态闸刀 */}
        {closed ? (
          <line x1={-18} y1={0} x2={18} y2={0} stroke={colors.neutral[800]} strokeWidth={3} strokeLinecap="round" />
        ) : (
          <line
            x1={-18}
            y1={0}
            x2={-18 + 36 * Math.cos(rad)}
            y2={36 * Math.sin(rad)}
            stroke={CANVAS_COLORS.alertRed}
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}

        {/* 状态文本标签 */}
        <text
          x={0}
          y={closed ? -15 : -22}
          textAnchor="middle"
          fontSize={font(10.5)}
          fontWeight="bold"
          fill={closed ? CANVAS_COLORS.labelText : CANVAS_COLORS.alertRed}
        >
          {label} {closed ? '(闭合)' : '(断开)'}
        </text>
      </g>
    )
  }

  // 2. 拟物真实电键模式

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="circuit-switch cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* 1. 绝缘胶木底座 */}
      <rect
        x={-baseW / 2}
        y={-baseH / 2}
        width={baseW}
        height={baseH}
        rx={3}
        fill={ELECTRICAL.rheostatBase}
        stroke={ELECTRICAL.terminalCap}
        strokeWidth={1}
      />

      {/* 2. 左接线柱 (动触点支架) */}
      <circle cx={-18} cy={0} r={4} fill={ELECTRICAL.terminalBody} />
      <circle cx={-18} cy={0} r={2} fill={ELECTRICAL.terminalCore} />

      {/* 3. 右接线柱 (静触片) */}
      <circle cx={18} cy={0} r={4} fill={ELECTRICAL.terminalBody} />
      <circle cx={18} cy={0} r={2} fill={ELECTRICAL.terminalCore} />
      {/* 静触片卡口 */}
      <rect x={16} y={-4} width={4} height={8} fill={ELECTRICAL.terminalCore} rx={0.5} />

      {/* 4. 旋转铜质刀闸 */}
      <g transform={`translate(-18, 0) rotate(${knifeAngle})`}>
        {/* 铜刀片 */}
        <line
          x1={0}
          y1={0}
          x2={36}
          y2={0}
          stroke={SCENE_COLORS.coil.copperBase}
          strokeWidth={closed ? 2.5 : 2.2}
          strokeLinecap="round"
        />
        {/* 绝缘手柄 (红色小圆柄) */}
        <circle cx={32} cy={-5} r={3} fill={colors.danger[500]} stroke={colors.danger[700]} strokeWidth={0.8} />
      </g>

      {/* 5. 标识字母 */}
      <text
        x={0}
        y={baseH / 2 + 12}
        textAnchor="middle"
        fontSize={font(11)}
        fontWeight="bold"
        fill={CANVAS_COLORS.textMuted}
      >
        {label} {closed ? '(闭合)' : '(断开)'}
      </text>
    </g>
  )
}
