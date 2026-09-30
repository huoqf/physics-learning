import React from 'react'
import { useUniqueSvgId } from '@/hooks'
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
  /** 外观模式：'realistic' (拟物表盘带指针, 默认) | 'symbolic' (电路原理图图例符号) */
  variant?: 'realistic' | 'symbolic'
  /** 是否在下方显示读数文本标签（symbolic 模式下默认 true） */
  showLabel?: boolean
}

/**
 * 理想电学表盘与原理图符号组件（电压表 V / 电流表 A）
 * - realistic 模式：拟物表盘、金属质感渐变、弧形刻度、动态阻尼转动指针。
 * - symbolic 模式：符合高中物理教科书标准电路图符号（圆圈 + 标志字母 A/V + 可选实时读数），零多余伪端子。
 */
export const DialMeter: React.FC<DialMeterProps> = ({
  type,
  value,
  max: customMax,
  x,
  y,
  r = 28,
  font = (n: number) => n,
  variant = 'realistic',
  showLabel = true,
}) => {
  const uniqueId = useUniqueSvgId()
  const ringGradId = `dial-ring-${type}-${uniqueId}`
  const shadowFilterId = `dial-shadow-${type}-${uniqueId}`

  const isVoltage = type === 'V'
  const max = customMax ?? (isVoltage ? 10 : 2)

  // 颜色配置
  const themeColor = isVoltage ? PHYSICS_COLORS.electricPotential : PHYSICS_COLORS.electricCurrent

  // 1. 标准原理图符号模式 (高中物理教科书纯净符号)
  if (variant === 'symbolic') {
    const unit = isVoltage ? 'V' : 'A'
    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* 表头标准外圈（白底、正圆、清晰边框） */}
        <circle
          cx={0}
          cy={0}
          r={r}
          fill={CANVAS_COLORS.white}
          stroke={isVoltage ? PHYSICS_COLORS.velocity : SCENE_COLORS.circuit.resistorStroke}
          strokeWidth={2.5}
        />
        {/* 仪表类型大写字母 "A" 或 "V" */}
        <text
          x={0}
          y={r * 0.35}
          fontSize={font(r * 0.8)}
          fill={isVoltage ? PHYSICS_COLORS.velocity : SCENE_COLORS.circuit.resistorStroke}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          {type}
        </text>

        {/* 读数标签 */}
        {showLabel && (
          <text
            x={0}
            y={r + 16}
            fontSize={font(11)}
            fill={themeColor}
            fontWeight="bold"
            textAnchor="middle"
            style={{ userSelect: 'none' }}
          >
            {value.toFixed(2)} {unit}
          </text>
        )}
      </g>
    )
  }

  // 2. 拟物真实表盘模式
  // 限制读数在 0 到 max 之间
  const clampedValue = Math.min(max, Math.max(0, value))
  // 指针旋转角度从 -60deg (0刻度) 到 60deg (最大刻度)
  const pointerAngle = -60 + (clampedValue / max) * 120

  // 颜色配置
  const textLight = PHYSICS_COLORS.labelTextLight

  // 刻度显示文本
  const minText = '0'
  const midText = (max / 2).toFixed(max % 2 === 0 ? 0 : 1)
  const maxText = max.toFixed(max % 2 === 0 ? 0 : 1)

  return (
    <g transform={`translate(${x}, ${y}) scale(${r / 28})`}>
      <defs>
        {/* 表盘金属外圈渐变 */}
        <linearGradient id={ringGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.neutral[300]} />
          <stop offset="50%" stopColor={colors.neutral[400]} />
          <stop offset="100%" stopColor={colors.neutral[600]} />
        </linearGradient>
        {/* 表盘外阴影，模拟立体悬浮 */}
        <filter id={shadowFilterId} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={SCENE_COLORS.materials.structStrokeDark} floodOpacity="0.12" />
        </filter>
      </defs>

      {/* 外圈金属边框（带立体投影） */}
      <circle cx={0} cy={0} r={28} fill={`url(#${ringGradId})`} filter={`url(#${shadowFilterId})`} />
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
        shadowColor={withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.25)}
      />

      {/* 指针轴心 */}
      <circle cx={0} cy={0} r={3} fill={SCENE_COLORS.materials.structStrokeDark} />

      {/* 正负接线柱端子（高中规范：电流从+进−出，内嵌于表盘下方） */}
      {/* 正极接线柱 "+" — 右侧 */}
      <circle cx={r * 0.45} cy={r * 0.62} r={r * 0.11} fill={SCENE_COLORS.circuit.batteryPos} stroke={SCENE_COLORS.circuit.batteryPos} strokeWidth={1} />
      <circle cx={r * 0.45} cy={r * 0.62} r={r * 0.04} fill={SCENE_COLORS.circuit.meterScale} />
      <text x={r * 0.45} y={r * 0.44} fontSize={font(7.5)} fill={SCENE_COLORS.circuit.batteryPos} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>+</text>
      {/* 负极接线柱 "−" — 左侧 */}
      <circle cx={-r * 0.45} cy={r * 0.62} r={r * 0.11} fill={SCENE_COLORS.circuit.batteryNeg} stroke={SCENE_COLORS.circuit.batteryNeg} strokeWidth={1} />
      <circle cx={-r * 0.45} cy={r * 0.62} r={r * 0.04} fill={SCENE_COLORS.circuit.meterScale} />
      <text x={-r * 0.45} y={r * 0.44} fontSize={font(7.5)} fill={SCENE_COLORS.circuit.batteryNeg} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>−</text>
    </g>
  )
}
