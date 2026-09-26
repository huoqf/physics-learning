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
}

/**
 * 实验室经典单刀单掷电键（开关 S）
 * 包含底座、左右金属接线柱、可旋转的动触刀闸与绝缘手柄。
 */
export const CircuitSwitch: React.FC<CircuitSwitchProps> = ({
  x,
  y,
  closed = true,
  onToggle,
  label = 'S',
  font = (n) => n,
}) => {
  // 开关底座尺寸
  const baseW = 50
  const baseH = 20

  // 刀闸旋转角度：闭合为 0°，断开为 -30°
  const knifeAngle = closed ? 0 : -32

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
