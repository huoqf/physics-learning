import { FC } from 'react'
import { CANVAS_COLORS } from '@/theme/physics'

export interface SVGSingleBarProps {
  /** 柱体左上角 X 坐标（像素） */
  x: number
  /** 基准线 Y 坐标（像素），柱体从此处向上或向下生长 */
  baseY: number
  /** 柱体高度（像素），正值向上生长，负值向下生长 */
  height: number
  /** 柱体宽度（像素） */
  barWidth: number
  /** 填充颜色，须遵守项目规范引用 PHYSICS_COLORS 等 Token */
  color: string
  /** 柱底物理量标签文本（如 "WF"、"Ek"） */
  label: string
  /** 柱顶数值文本（如 "3.5J"） */
  valueText: string
  /** 响应式字体缩放函数 */
  font: (size: number) => number
  /** 是否显示浅灰色背景轨道，默认 true */
  showTrack?: boolean
  /** 轨道总高度（像素），仅 showTrack=true 时生效，默认 60 */
  trackHeight?: number
  /** 柱体圆角半径（像素），默认 1.5 */
  rx?: number
}

/**
 * SVGSingleBar 通用 SVG 能量柱子组件
 *
 * 设计意图：
 * 1. 统一项目中所有 SVG 内嵌能量柱的渲染风格（轨道背景、圆角柱体、数值标注、标签）。
 * 2. 支持正值（向上生长）和负值（向下生长），以零线为基准双向渲染。
 * 3. 圆角方向自适应：正柱上圆角，负柱下圆角。
 * 4. 数值标签位置自适应：正柱标签在柱顶上方，负柱标签在柱底下方。
 */
export const SVGSingleBar: FC<SVGSingleBarProps> = ({
  x,
  baseY,
  height,
  barWidth,
  color,
  label,
  valueText,
  font,
  showTrack = true,
  trackHeight = 60,
  rx = 1.5,
}) => {
  const isPositive = height >= 0
  const absH = Math.abs(height)

  // 柱体 Y 坐标：正值从 baseY 向上，负值从 baseY 向下
  const barY = isPositive ? baseY - absH : baseY

  // 圆角：正值上圆角，负值下圆角
  const rxAttr = isPositive
    ? `${rx} ${rx} 0 0`
    : `0 0 ${rx} ${rx}`

  // 数值标签位置：正值在柱顶上方，负值在柱底下方
  const valueY = isPositive ? barY - font(3.5) : barY + absH + font(10)

  // 标签位置：始终在基准线下方
  const labelY = baseY + font(11)

  return (
    <g>
      {/* 背景轨道 */}
      {showTrack && (
        <rect
          x={x}
          y={baseY - trackHeight}
          width={barWidth}
          height={trackHeight}
          fill={CANVAS_COLORS.grid}
          rx={2}
          opacity={0.3}
        />
      )}

      {/* 柱体 */}
      <rect
        x={x}
        y={barY}
        width={barWidth}
        height={Math.max(0.5, absH)}
        fill={color}
        opacity={0.85}
        rx={rxAttr}
      />

      {/* 数值标注 */}
      <text
        x={x + barWidth / 2}
        y={valueY}
        fontSize={font(8.5)}
        fill={color}
        textAnchor="middle"
        fontWeight="bold"
      >
        {valueText}
      </text>

      {/* 柱底标签 */}
      <text
        x={x + barWidth / 2}
        y={labelY}
        fontSize={font(9)}
        fill={color}
        textAnchor="middle"
        fontWeight="semibold"
      >
        {label}
      </text>
    </g>
  )
}

export default SVGSingleBar
