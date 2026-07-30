import React from 'react'
import { CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface TimerDisplayProps {
  /** 仪器左上角 X 坐标 */
  x: number
  /** 仪器左上角 Y 坐标 */
  y: number
  /** 测量显示时间数值 */
  timeMs: number
  /** 显示单位: 'ms' (毫秒) | 's' (秒) */
  unit?: 'ms' | 's'
  /** 默认显示小数位数 (默认 2 位) */
  precision?: number
  /** 计时通道标签 (如 "A", "B", "A-B") */
  channel?: string
  /** 标题 */
  title?: string
  /** 缩放比例 */
  scale?: number
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理力学实验 - 数字计时器显示屏 (TimerDisplay)
 * 经典数码管/LCD 数字显示仪表，用于光电门遮光时间 $\Delta t$ 精度展示
 */
export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  x,
  y,
  timeMs,
  unit = 'ms',
  precision = 2,
  channel = 'CH A',
  title = '数字毫秒计',
  scale = 1,
  fontFamily = 'monospace, sans-serif',
}) => {
  const width = 120
  const height = 70

  // 格式化时间文本
  const displayVal = unit === 's' ? (timeMs / 1000).toFixed(precision + 1) : timeMs.toFixed(precision)

  return (
    <g
      className="timer-display"
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* 仪表外壳阴影 */}
      <rect
        x={3}
        y={3}
        width={width}
        height={height}
        rx={5}
        fill={withAlpha(CANVAS_COLORS.labelText, 0.15)}
      />

      {/* 外壳主体 */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={5}
        fill="#334155"
        stroke="#1E293B"
        strokeWidth={1.5}
      />

      {/* 顶部标题区 */}
      <text
        x={8}
        y={14}
        fill="#94A3B8"
        fontSize={9}
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {title}
      </text>
      <text
        x={width - 8}
        y={14}
        fill="#38BDF8"
        fontSize={9}
        fontWeight="bold"
        fontFamily="sans-serif"
        textAnchor="end"
      >
        {channel}
      </text>

      {/* 数码管屏幕内框 */}
      <rect
        x={8}
        y={20}
        width={width - 16}
        height={32}
        rx={3}
        fill="#0F172A"
        stroke="#1E293B"
        strokeWidth={1}
      />

      {/* 数码管暗背景位 (拟真 888.88 浅影) */}
      <text
        x={width - 24}
        y={42}
        fill="#1E293B"
        fontSize={18}
        fontFamily={fontFamily}
        fontWeight="bold"
        textAnchor="end"
      >
        888.88
      </text>

      {/* 数码管实际数字 (高亮绿色/青色 LCD 字符) */}
      <text
        x={width - 24}
        y={42}
        fill="#22D3EE"
        fontSize={18}
        fontFamily={fontFamily}
        fontWeight="bold"
        textAnchor="end"
        style={{ letterSpacing: '1px' }}
      >
        {displayVal}
      </text>

      {/* 单位 */}
      <text
        x={width - 12}
        y={42}
        fill="#A5F3FC"
        fontSize={10}
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        {unit}
      </text>

      {/* 底部操控按键示意 */}
      <circle cx={20} cy={59} r={4} fill="#475569" stroke="#64748B" strokeWidth={0.8} />
      <text x={28} y={62} fill="#94A3B8" fontSize={7} fontFamily="sans-serif">
        RESET
      </text>

      <circle cx={70} cy={59} r={4} fill="#0284C7" stroke="#38BDF8" strokeWidth={0.8} />
      <text x={78} y={62} fill="#94A3B8" fontSize={7} fontFamily="sans-serif">
        HOLD
      </text>
    </g>
  )
}
