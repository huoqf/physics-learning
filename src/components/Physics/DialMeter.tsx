import React from 'react'
import { PHYSICS_COLORS, CANVAS_COLORS, SCENE_COLORS, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { MeterPointer } from './MeterPointer'

export interface DialMeterProps {
  /** 仪表类型：'V' (电压表) 或 'A' (电流表) */
  type: 'V' | 'A'
  /** 当前读数 */
  value: number
  /** 最大量程，电压表默认 10，电流表默认 2 */
  max?: number
  /** 表盘中心 x 坐标 */
  x: number
  /** 表盘中心 y 坐标 */
  y: number
  /** 表盘外圈半径，默认 28 */
  r?: number
  /** 字体缩放函数（由父组件 useCanvasSize 提供） */
  font?: (base: number) => number
}

/**
 * 理想电学表盘组件（电压表 V / 电流表 A）
 * 包含金属外壳渐变、弧形刻度、标志字母和动态偏转的指针。
 * 已完成美化：增加立体阴影、玻璃拟态质感、指针阴影和阻尼转动动画。
 */
export const DialMeter: React.FC<DialMeterProps> = ({
  type,
  value,
  max: customMax,
  x,
  y,
  r = 28,
  font = (n: number) => n,
}) => {
  const isVoltage = type === 'V'
  const max = customMax ?? (isVoltage ? 10 : 2)

  // 限制读数在 0 到 max 之间
  const clampedValue = Math.min(max, Math.max(0, value))
  // 指针旋转角度从 -60deg (0刻度) 到 60deg (最大刻度)
  const pointerAngle = -60 + (clampedValue / max) * 120

  // 颜色配置
  const themeColor = isVoltage ? PHYSICS_COLORS.electricPotential : PHYSICS_COLORS.electricCurrent
  const textLight = PHYSICS_COLORS.labelTextLight

  // 刻度显示文本
  const minText = '0'
  const midText = (max / 2).toFixed(max % 2 === 0 ? 0 : 1)
  const maxText = max.toFixed(max % 2 === 0 ? 0 : 1)

  return (
    <g transform={`translate(${x}, ${y}) scale(${r / 28})`}>
      <defs>
        {/* 表盘金属外圈渐变 */}
        <linearGradient id={`dial-ring-${type}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.neutral[300]} />
          <stop offset="50%" stopColor={colors.neutral[400]} />
          <stop offset="100%" stopColor={colors.neutral[600]} />
        </linearGradient>
        {/* 表盘外阴影，模拟立体悬浮 */}
        <filter id={`dial-shadow-${type}`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={SCENE_COLORS.materials.structStrokeDark} floodOpacity="0.12" />
        </filter>
      </defs>

      {/* 外圈金属边框（带立体投影） */}
      <circle cx={0} cy={0} r={28} fill={`url(#dial-ring-${type})`} filter={`url(#dial-shadow-${type})`} />
      {/* 表盘底色 (毛玻璃透明质感) */}
      <circle cx={0} cy={0} r={25} fill={withAlpha(SCENE_COLORS.materials.structBgLight, 0.94)} stroke={SCENE_COLORS.materials.structStrokeMid} strokeWidth={1.0} />

      {/* 弧形刻度线 */}
      <path
        d="M -16 6 A 18 18 0 0 1 16 6"
        fill="none"
        stroke={CANVAS_COLORS.labelTextLight}
        strokeWidth={1}
        strokeDasharray="1,1.5"
      />

      {/* 刻度值文本 */}
      <text x={-15} y={11} fontSize={font(6)} fill={textLight} textAnchor="middle" fontFamily="monospace">
        {minText}
      </text>
      <text x={0} y={-14} fontSize={font(6)} fill={textLight} textAnchor="middle" fontFamily="monospace">
        {midText}
      </text>
      <text x={15} y={11} fontSize={font(6)} fill={textLight} textAnchor="middle" fontFamily="monospace">
        {maxText}
      </text>

      {/* 仪表类型标识 "V" 或 "A" */}
      <text x={0} y={16} fontSize={font(10)} fill={themeColor} fontWeight="bold" textAnchor="middle">
        {type}
      </text>

      {/* 指针（带阻尼过渡动画） */}
      <MeterPointer
        angle={pointerAngle}
        length={21}
        color={themeColor}
        tailOffset={4}
        shadowDx={1}
        shadowDy={1}
        shadowColor="rgba(15, 23, 42, 0.25)"
      />

      {/* 指针轴心 */}
      <circle cx={0} cy={0} r={3} fill={colors.neutral[800]} />
    </g>
  )
}
