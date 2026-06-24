import React from 'react'
import { SCENE_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

const ELECTRICAL = SCENE_COLORS.electricalApparatus

// 字体基准常量（按设计稿比例缩放，不走 font() 以免与 getInstrumentLayout 双缩放）
const FONT_BASE = {
  instrument: {
    voltage: 14,
    brand: 7,
    terminal: 9,
  },
  battery: {
    polarity: 11,
    label: 7,
  },
  symbol: {
    label: 10,
  },
} as const

/**
 * DCSource 直流电源组件 Props 接口。
 * 支持三种渲染模式：数字稳压电源、干电池、电路原理图符号。
 */
export interface DCSourceProps {
  /**
   * 中心 x 坐标（SVG 坐标系）。
   * @default 0
   */
  x?: number
  /**
   * 中心 y 坐标（SVG 坐标系）。
   * @default 0
   */
  y?: number
  /**
   * 电压值（单位：V）。
   * 会显示在电源的显示屏或标签上。
   * @default 0
   */
  voltage?: number
  /**
   * 电源类型。
   * - 'instrument': 数字稳压电源（拟物风格，带 LED 显示屏）
   * - 'battery': 干电池（拟物经典电池外观）
   * - 'symbol': 电路原理图符号（标准电路图符号）
   * @default 'instrument'
   */
  type?: 'instrument' | 'battery' | 'symbol'
  /**
   * 自定义宽度（像素）。
   * 不传则使用各类型的默认尺寸。
   */
  width?: number
  /**
   * 自定义高度（像素）。
   * 不传则使用各类型的默认尺寸。
   */
  height?: number
  /**
   * 自定义标签文本。
   * 不传则使用默认标签（如 'DC SOURCE' 或 '1.5V'）。
   */
  label?: string
  /**
   * 极性朝向。
   * - 'left-positive': 正极在左，负极在右
   * - 'right-positive': 正极在右，负极在左
   * @default 'left-positive'
   */
  polarity?: 'left-positive' | 'right-positive'
  /**
   * 是否禁用/不工作。
   * 为 true 时会降低透明度并禁用交互。
   * @default false
   */
  disabled?: boolean
  /**
   * 额外的 CSS 类名。
   */
  className?: string
}

const SCENE_COLORS_CIRCUIT = SCENE_COLORS.circuit

// 渲染计算函数
const getInstrumentLayout = (width: number, height: number) => {
  const baseW = 80
  const baseH = 80
  const scaleX = width / baseW
  const scaleY = height / baseH
  
  return {
    baseW: width,
    baseH: height,
    ledW: 56 * scaleX,
    ledH: 24 * scaleY,
    terminalR: 6.5 * Math.min(scaleX, scaleY),
    axisR: 2.5 * Math.min(scaleX, scaleY),
    cornerRadius: 8 * Math.min(scaleX, scaleY),
  }
}

const getBatteryLayout = (width: number, height: number) => {
  const baseW = 60
  const baseH = 30
  const scaleX = width / baseW
  const scaleY = height / baseH
  
  return {
    baseW: width,
    baseH: height,
    cornerRadius: 4 * Math.min(scaleX, scaleY),
  }
}

/**
 * DCSource 直流电源组件
 *
 * 【设计意图】
 * 1. 统一物理实验中直流电源的视觉表现，支持三种渲染模式。
 * 2. 数字稳压电源模式：拟物 LED 显示屏，实时显示电压值。
 * 3. 干电池模式：经典电池外观，带极性涂装和电极头部。
 * 4. 电路原理图符号：标准电路图符号，适用于原理图展示。
 * 5. 所有模式支持极性反转和禁用状态，满足不同实验场景需求。
 *
 * @example
 * ```tsx
 * // 数字稳压电源
 * <DCSource
 *   x={100}
 *   y={200}
 *   voltage={12.0}
 *   type="instrument"
 * />
 *
 * // 干电池（正极在右）
 * <DCSource
 *   x={150}
 *   y={200}
 *   voltage={1.5}
 *   type="battery"
 *   polarity="right-positive"
 * />
 *
 * // 电路原理图符号
 * <DCSource
 *   x={200}
 *   y={200}
 *   voltage={9.0}
 *   type="symbol"
 *   label="9V"
 * />
 * ```
 */
export const DCSource: React.FC<DCSourceProps> = ({
  x = 0,
  y = 0,
  voltage = 0,
  type = 'instrument',
  width = type === 'instrument' ? 80 : 60,
  height = type === 'instrument' ? 80 : 30,
  label,
  polarity = 'left-positive',
  disabled = false,
  className = '',
}) => {
  const c = SCENE_COLORS.circuit

  // 1. 渲染：数显直流稳压电源
  if (type === 'instrument') {
    const layout = getInstrumentLayout(width, height)
    const isLeftPositive = polarity === 'left-positive'
    // 保持接线柱相对位置与原布局比例一致
    const posTerminalX = (isLeftPositive ? -22 : 22) * (width / 80)
    const negTerminalX = (isLeftPositive ? 22 : -22) * (width / 80)
    const terminalY = 22 * (height / 80)

    return (
      <g
        transform={`translate(${x}, ${y})`}
        className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        <defs>
          {/* 金属质感外壳渐变 */}
          <linearGradient id="dc-source-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.neutral[600]} />
            <stop offset="100%" stopColor={colors.neutral[800]} />
          </linearGradient>
        </defs>

        {/* 3D 阴影 */}
        <rect
          x={-layout.baseW / 2 + 2}
          y={-layout.baseH / 2 + 3}
          width={layout.baseW}
          height={layout.baseH}
          rx={layout.cornerRadius}
          fill="rgba(15, 23, 42, 0.15)"
          filter="blur(2px)"
        />

        {/* 外壳 */}
        <rect
          x={-layout.baseW / 2}
          y={-layout.baseH / 2}
          width={layout.baseW}
          height={layout.baseH}
          rx={layout.cornerRadius}
          fill="url(#dc-source-metallic)"
          stroke={colors.neutral[900]}
          strokeWidth={1.5}
        />

        {/* LED 数显屏 */}
        <rect
          x={-layout.ledW / 2}
          y={-28 * (height / 80)}
          width={layout.ledW}
          height={layout.ledH}
          rx={4 * (height / 80)}
          fill={ELECTRICAL.ledScreenBg}
          stroke={colors.neutral[700]}
          strokeWidth={1}
        />

        {/* 电压示数 */}
        <text
          x={0}
          y={-11 * (height / 80)}
          fill={ELECTRICAL.ledDisplayGreen}
          fontSize={FONT_BASE.instrument.voltage * (Math.min(width, height) / 80)}
          fontWeight="bold"
          fontFamily="monospace"
          textAnchor="middle"
          style={{ filter: 'drop-shadow(0px 0px 2px rgba(34, 197, 94, 0.8))', userSelect: 'none' }}
        >
          {voltage.toFixed(1)} V
        </text>

        {/* 器材品牌小字 */}
        <text
          x={0}
          y={8 * (height / 80)}
          fill={colors.neutral[400]}
          fontSize={FONT_BASE.instrument.brand * (Math.min(width, height) / 80)}
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing={0.5}
          style={{ userSelect: 'none' }}
        >
          {label ?? 'DC SOURCE'}
        </text>

        {/* 正极接线柱 (+) */}
        <circle cx={posTerminalX} cy={terminalY} r={layout.terminalR} fill={SCENE_COLORS_CIRCUIT.batteryPos} stroke={SCENE_COLORS_CIRCUIT.batteryPos} strokeWidth={1} />
        <circle cx={posTerminalX} cy={terminalY} r={layout.axisR} fill={SCENE_COLORS_CIRCUIT.batteryPos} />
        <text x={posTerminalX} y={terminalY - 11 * (height / 80)} fill={SCENE_COLORS_CIRCUIT.batteryPos} fontSize={FONT_BASE.instrument.terminal * (Math.min(width, height) / 80)} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          +
        </text>

        {/* 负极接线柱 (-) */}
        <circle cx={negTerminalX} cy={terminalY} r={layout.terminalR} fill={SCENE_COLORS_CIRCUIT.batteryNeg} stroke={colors.neutral[900]} strokeWidth={1} />
        <circle cx={negTerminalX} cy={terminalY} r={layout.axisR} fill={colors.neutral[900]} />
        <text x={negTerminalX} y={terminalY - 11 * (height / 80)} fill={colors.neutral[400]} fontSize={FONT_BASE.instrument.terminal * (Math.min(width, height) / 80)} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          -
        </text>
      </g>
    )
  }

  // 2. 渲染：拟物经典干电池
  if (type === 'battery') {
    const layout = getBatteryLayout(width, height)
    const isLeftPositive = polarity === 'left-positive'
    
    // 正负极分界坐标：正极占前部分，负极占后部分
    return (
      <g
        transform={`translate(${x}, ${y})`}
        className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        {/* 电池阴影 */}
        <rect
          x={-layout.baseW / 2 + 1.5}
          y={-layout.baseH / 2 + 2}
          width={layout.baseW}
          height={layout.baseH}
          rx={layout.cornerRadius}
          fill="rgba(15, 23, 42, 0.12)"
          filter="blur(1.5px)"
        />

        {/* 电池主体 */}
        <rect
          x={-layout.baseW / 2}
          y={-layout.baseH / 2}
          width={layout.baseW}
          height={layout.baseH}
          rx={layout.cornerRadius}
          fill={SCENE_COLORS_CIRCUIT.batteryBody}
          stroke={colors.neutral[800]}
          strokeWidth={1.5}
        />

        {/* 极性涂装：正极 */}
        {isLeftPositive ? (
          <path
            d={`M ${-layout.baseW / 2} ${-layout.baseH / 2} L -12 L -12 ${layout.baseH / 2} L ${-layout.baseW / 2} ${layout.baseH / 2} Z`}
            fill={SCENE_COLORS_CIRCUIT.batteryPos}
          />
        ) : (
          <path
            d={`M ${layout.baseW / 2} ${-layout.baseH / 2} L 12 L 12 ${layout.baseH / 2} L ${layout.baseW / 2} ${layout.baseH / 2} Z`}
            fill={SCENE_COLORS_CIRCUIT.batteryPos}
          />
        )}

        {/* 极性涂装：负极 */}
        {isLeftPositive ? (
          <path
            d={`M ${layout.baseW / 2} ${-layout.baseH / 2} L 12 L 12 ${layout.baseH / 2} L ${layout.baseW / 2} ${layout.baseH / 2} Z`}
            fill={SCENE_COLORS_CIRCUIT.batteryNeg}
          />
        ) : (
          <path
            d={`M ${-layout.baseW / 2} ${-layout.baseH / 2} L -12 L -12 ${layout.baseH / 2} L ${-layout.baseW / 2} ${layout.baseH / 2} Z`}
            fill={SCENE_COLORS_CIRCUIT.batteryNeg}
          />
        )}

        {/* 突出电极头部 */}
        {isLeftPositive ? (
          <rect
            x={-layout.baseW / 2 - 4}
            y={-6}
            width={4}
            height={12}
            rx={1}
            fill={colors.neutral[300]}
            stroke={colors.neutral[800]}
            strokeWidth={1.2}
          />
        ) : (
          <rect
            x={layout.baseW / 2}
            y={-6}
            width={4}
            height={12}
            rx={1}
            fill={colors.neutral[300]}
            stroke={colors.neutral[800]}
            strokeWidth={1.2}
          />
        )}

        {/* 极性文字 */}
        <text
          x={isLeftPositive ? -21 * (width / 60) : 21 * (width / 60)}
          y={4}
          fill={colors.neutral.white}
          fontSize={FONT_BASE.battery.polarity * (Math.min(width, height) / 30)}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          +
        </text>
        <text
          x={isLeftPositive ? 21 * (width / 60) : -21 * (width / 60)}
          y={3}
          fill={colors.neutral.white}
          fontSize={FONT_BASE.battery.polarity * (Math.min(width, height) / 30)}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          -
        </text>

        {/* 电压标签文字 */}
        <text
          x={0}
          y={4}
          fill={colors.neutral[600]}
          fontSize={FONT_BASE.battery.label * (Math.min(width, height) / 30)}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          {label ?? `${voltage > 0 ? voltage.toFixed(1) : '1.5'}V`}
        </text>
      </g>
    )
  }

  // 3. 渲染：标准原理图符号
  const isLeftPositive = polarity === 'left-positive'
  const longLineX = isLeftPositive ? -5 : 5
  const shortLineX = isLeftPositive ? 5 : -5

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      {/* 引出线 */}
      <line x1={-20} y1={0} x2={longLineX} y2={0} stroke={c.wire} strokeWidth={2} />
      <line x1={shortLineX} y1={0} x2={20} y2={0} stroke={c.wire} strokeWidth={2} />

      {/* 正极：长细线 */}
      <line x1={longLineX} y1={-15} x2={longLineX} y2={15} stroke={c.batteryPos} strokeWidth={1.5} />
      
      {/* 负极：短粗线 */}
      <line x1={shortLineX} y1={-8} x2={shortLineX} y2={8} stroke={c.batteryNeg} strokeWidth={4} />

      {/* 文本标注 */}
      <text
        x={0}
        y={-20}
        fill={c.wire}
        fontSize={FONT_BASE.symbol.label}
        fontWeight="bold"
        textAnchor="middle"
        style={{ userSelect: 'none' }}
      >
        {label ?? `${voltage.toFixed(1)} V`}
      </text>
    </g>
  )
}

export default DCSource
