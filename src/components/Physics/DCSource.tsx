import React from 'react'
import { SCENE_COLORS } from '@/theme/physics'

export interface DCSourceProps {
  /** 中心 x 坐标 */
  x?: number
  /** 中心 y 坐标 */
  y?: number
  /** 电压值 */
  voltage?: number
  /** 电源类型: 'instrument' (数字稳压电源) | 'battery' (干电池) | 'symbol' (电路原理图符号) */
  type?: 'instrument' | 'battery' | 'symbol'
  /** 自定义宽度 */
  width?: number
  /** 自定义高度 */
  height?: number
  /** 自定义标签（默认：'DC SOURCE' 或 '1.5V' 等） */
  label?: string
  /** 极性朝向：'left-positive' (正极在左) | 'right-positive' (正极在右) */
  polarity?: 'left-positive' | 'right-positive'
  /** 是否禁用/不工作 */
  disabled?: boolean
  /** 类名 */
  className?: string
}

export const DCSource: React.FC<DCSourceProps> = ({
  x = 0,
  y = 0,
  voltage = 0,
  type = 'instrument',
  width,
  height,
  label,
  polarity = 'left-positive',
  disabled = false,
  className = '',
}) => {
  const c = SCENE_COLORS.circuit

  // 1. 渲染：数显直流稳压电源
  if (type === 'instrument') {
    const baseW = 80
    const baseH = 80
    const w = width ?? baseW
    const h = height ?? baseH
    const scale = Math.min(w / baseW, h / baseH)

    const isLeftPositive = polarity === 'left-positive'
    const posTerminalX = isLeftPositive ? -22 : 22
    const negTerminalX = isLeftPositive ? 22 : -22

    return (
      <g
        transform={`translate(${x}, ${y}) scale(${scale})`}
        className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        <defs>
          {/* 金属质感外壳渐变 */}
          <linearGradient id="dc-source-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
        </defs>

        {/* 3D 阴影 */}
        <rect
          x={-40 + 2}
          y={-40 + 3}
          width={80}
          height={80}
          rx={8}
          fill="rgba(15, 23, 42, 0.15)"
          filter="blur(2px)"
        />

        {/* 外壳 */}
        <rect
          x={-40}
          y={-40}
          width={80}
          height={80}
          rx={8}
          fill="url(#dc-source-metallic)"
          stroke="#0f172a"
          strokeWidth={1.5}
        />

        {/* LED 数显屏 */}
        <rect
          x={-28}
          y={-28}
          width={56}
          height={24}
          rx={4}
          fill="#090d16"
          stroke="#334155"
          strokeWidth={1}
        />

        {/* 电压示数 */}
        <text
          x={0}
          y={-11}
          fill="#22C55E"
          fontSize={14}
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
          y={8}
          fill="#94a3b8"
          fontSize={7}
          fontWeight="bold"
          textAnchor="middle"
          letterSpacing={0.5}
          style={{ userSelect: 'none' }}
        >
          {label ?? 'DC SOURCE'}
        </text>

        {/* 正极接线柱 (+) */}
        <circle cx={posTerminalX} cy={22} r={6.5} fill={c.batteryPos} stroke="#7f1d1d" strokeWidth={1} />
        <circle cx={posTerminalX} cy={22} r={2.5} fill="#b91c1c" />
        <text x={posTerminalX} y={11} fill={c.batteryPos} fontSize={9} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          +
        </text>

        {/* 负极接线柱 (-) */}
        <circle cx={negTerminalX} cy={22} r={6.5} fill={c.batteryNeg} stroke="#0f172a" strokeWidth={1} />
        <circle cx={negTerminalX} cy={22} r={2.5} fill="#020617" />
        <text x={negTerminalX} y={11} fill="#94A3B8" fontSize={9} fontWeight="bold" textAnchor="middle" style={{ userSelect: 'none' }}>
          -
        </text>
      </g>
    )
  }

  // 2. 渲染：拟物经典干电池
  if (type === 'battery') {
    const baseW = 60
    const baseH = 30
    const w = width ?? baseW
    const h = height ?? baseH
    const scale = Math.min(w / baseW, h / baseH)

    const isLeftPositive = polarity === 'left-positive'
    
    // 正负极分界坐标：正极占前部分，负极占后部分
    return (
      <g
        transform={`translate(${x}, ${y}) scale(${scale})`}
        className={`${className} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        {/* 电池阴影 */}
        <rect
          x={-30 + 1.5}
          y={-15 + 2}
          width={60}
          height={30}
          rx={4}
          fill="rgba(15, 23, 42, 0.12)"
          filter="blur(1.5px)"
        />

        {/* 电池主体 */}
        <rect
          x={-30}
          y={-15}
          width={60}
          height={30}
          rx={4}
          fill={c.batteryBody}
          stroke="#1F2937"
          strokeWidth={1.5}
        />

        {/* 极性涂装：正极 */}
        {isLeftPositive ? (
          <path
            d="M -30 -15 L -12 -15 A 4 4 0 0 1 -12 15 L -30 15 Z"
            fill={c.batteryPos}
          />
        ) : (
          <path
            d="M 30 -15 L 12 -15 A 4 4 0 0 0 12 15 L 30 15 Z"
            fill={c.batteryPos}
          />
        )}

        {/* 极性涂装：负极 */}
        {isLeftPositive ? (
          <path
            d="M 30 -15 L 12 -15 A 4 4 0 0 0 12 15 L 30 15 Z"
            fill={c.batteryNeg}
          />
        ) : (
          <path
            d="M -30 -15 L -12 -15 A 4 4 0 0 1 -12 15 L -30 15 Z"
            fill={c.batteryNeg}
          />
        )}

        {/* 突出电极头部 */}
        {isLeftPositive ? (
          <rect
            x={-34}
            y={-6}
            width={4}
            height={12}
            rx={1}
            fill="#D1D5DB"
            stroke="#1F2937"
            strokeWidth={1.2}
          />
        ) : (
          <rect
            x={30}
            y={-6}
            width={4}
            height={12}
            rx={1}
            fill="#D1D5DB"
            stroke="#1F2937"
            strokeWidth={1.2}
          />
        )}

        {/* 极性文字 */}
        <text
          x={isLeftPositive ? -21 : 21}
          y={4}
          fill="#FFFFFF"
          fontSize={11}
          fontWeight="bold"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          +
        </text>
        <text
          x={isLeftPositive ? 21 : -21}
          y={3}
          fill="#FFFFFF"
          fontSize={11}
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
          fill="#4B5563"
          fontSize={7}
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
        fontSize={10}
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
