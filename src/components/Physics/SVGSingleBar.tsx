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
 * 3. 数值标签位置自适应：正柱标签在柱顶上方，负柱标签在柱底下方。
 *
 * 圆角说明（曾经的 Bug）：旧实现想按"正柱圆上两角、负柱圆下两角"来做，于是把
 * `${rx} ${rx} 0 0` 直接喂给了 `<rect rx>` —— 但 **SVG 的 rx 只接受单个长度**，
 * 四值语法是 CSS `border-radius` 的。浏览器遇到 `rx="5 5 0 0"` 会整条丢弃
 * （控制台报 `<rect> attribute rx: Expected length`），结果是四角全直角，
 * 与注释宣称的"圆角方向自适应"正好相反。SVG `<rect>` 无法只圆两个角，
 * 而柱宽 30px、rx 1.5~5px 的差异在投影上不可见，故统一用单值 rx。
 * 若将来确实需要"只圆上沿"，必须改用 `<path>` 画圆角，不能回到多值 rx。
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

      {/* 柱体：rx 必须是单个长度；浏览器会按 min(rx, width/2, height/2) 自动收敛，
          所以极矮柱子（电荷槽刚起步时的 0.5px）也不会画出畸形图形 */}
      <rect
        x={x}
        y={barY}
        width={barWidth}
        height={Math.max(0.5, absH)}
        fill={color}
        opacity={0.85}
        rx={rx}
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


