import React from 'react'
import { SCENE_COLORS, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'

/**
 * 条形磁铁组件 Props
 */
export interface BarMagnetProps extends React.SVGAttributes<SVGGElement> {
  /** 磁铁中心 x 坐标 (px) */
  x?: number
  /** 磁铁中心 y 坐标 (px) */
  y?: number
  /** 磁铁总宽度 (px)，默认 120 */
  width?: number
  /** 磁铁总高度 (px)，默认 36 */
  height?: number
  /** 极性方向：1 = 左S右N（默认），-1 = 左N右S */
  pole?: 1 | -1
}

/**
 * 条形磁铁组件
 *
 * 绘制具有 N/S 两极的条形磁铁，支持极性切换。
 * - 左半部分与右半部分分别渲染不同颜色（红=N极，蓝=S极）
 * - 包含 3D 阴影底衬、受光面高光效果
 * - 中间分界缝隙线增强立体感
 * - 极性文字标注（N/S）
 */
export const BarMagnet: React.FC<BarMagnetProps> = ({
  x = 0,
  y = 0,
  width = 120,
  height = 36,
  pole = 1, // 默认左S右N
  className = '',
  ...props
}) => {
  const m = SCENE_COLORS.magnet

  // 极性颜色与标示配置
  const isSouthLeft = pole === 1
  const leftColorBase = isSouthLeft ? m.southBase : m.northBase
  const leftColorLight = isSouthLeft ? m.southLight : m.northLight
  const leftColorStroke = isSouthLeft ? m.southStroke : m.northStroke
  const leftLabel = isSouthLeft ? 'S' : 'N'
  const leftLabelColor = isSouthLeft ? m.southLabel : m.northLabel

  const rightColorBase = isSouthLeft ? m.northBase : m.southBase
  const rightColorLight = isSouthLeft ? m.northLight : m.northLight
  const rightColorStroke = isSouthLeft ? m.northStroke : m.northStroke
  const rightLabel = isSouthLeft ? 'N' : 'S'
  const rightLabelColor = isSouthLeft ? m.northLabel : m.northLabel

  const halfW = width / 2
  const halfH = height / 2

  return (
    <g transform={`translate(${x}, ${y})`} className={className} {...props}>
      {/* 3D 阴影底衬 */}
      <rect
        x={-halfW + 2}
        y={-halfH + 4}
        width={width}
        height={height}
        rx={6}
        fill="rgba(0, 0, 0, 0.15)"
        filter="blur(2px)"
      />

      {/* 左半部分 磁极 */}
      <path
        d={`M ${-halfW} 0 
            L ${-halfW} ${-halfH + 4} 
            Q ${-halfW} ${-halfH} ${-halfW + 4} ${-halfH} 
            L 0 ${-halfH} 
            L 0 ${halfH} 
            L ${-halfW + 4} ${halfH} 
            Q ${-halfW} ${halfH} ${-halfW} ${halfH - 4} 
            Z`}
        fill={leftColorBase}
        stroke={leftColorStroke}
        strokeWidth="1.5"
      />
      {/* 左半部分受光面高光 */}
      <path
        d={`M ${-halfW + 2} ${-halfH + 2} L 0 ${-halfH + 2}`}
        stroke={leftColorLight}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* 右半部分 磁极 */}
      <path
        d={`M 0 ${-halfH} 
            L ${halfW - 4} ${-halfH} 
            Q ${halfW} ${-halfH} ${halfW} ${-halfH + 4} 
            L ${halfW} ${halfH - 4} 
            Q ${halfW} ${halfH} ${halfW - 4} ${halfH} 
            L 0 ${halfH} 
            Z`}
        fill={rightColorBase}
        stroke={rightColorStroke}
        strokeWidth="1.5"
      />
      {/* 右半部分受光面高光 */}
      <path
        d={`M 0 ${-halfH + 2} L ${halfW - 2} ${-halfH + 2}`}
        stroke={rightColorLight}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* 中间分界缝隙/过渡 */}
      <line x1="0" y1={-halfH} x2="0" y2={halfH} stroke={withAlpha(colors.neutral[900], 0.3)} strokeWidth="1" />
      <line x1="-1" y1={-halfH} x2="-1" y2={halfH} stroke={withAlpha(colors.neutral.white, 0.2)} strokeWidth="1" />

      {/* 极性文字标注 */}
      <text
        x={-halfW / 2}
        y="5"
        fill={leftLabelColor}
        fontSize="14"
        fontWeight="bold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        {leftLabel}
      </text>
      <text
        x={halfW / 2}
        y="5"
        fill={rightLabelColor}
        fontSize="14"
        fontWeight="bold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        {rightLabel}
      </text>
    </g>
  )
}

export default BarMagnet
