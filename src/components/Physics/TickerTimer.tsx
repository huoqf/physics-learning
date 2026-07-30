import React from 'react'
import { SCENE_COLORS, CANVAS_COLORS, withAlpha } from '@/theme/physics'

export interface TickerTimerProps {
  /** 计时器外壳中心/左上角 X 坐标 */
  x: number
  /** 计时器外壳中心/左上角 Y 坐标 */
  y: number
  /** 计时器类型：electromagnetic (电磁打点计时器) | spark (电火花打点计时器) */
  type?: 'electromagnetic' | 'spark'
  /** 是否处于工作打点振动状态 */
  isVibrating?: boolean
  /** 频率标注 (Hz, 默认 50Hz) */
  frequency?: number
  /** 缩放比例 */
  scale?: number
  /** 字体族 */
  fontFamily?: string
}

/**
 * 高中物理力学实验 - 打点计时器组件 (TickerTimer)
 * 具备电磁式/电火花式外观，包含限位槽、线圈铁芯、振针与工作电火花闪烁指示
 */
export const TickerTimer: React.FC<TickerTimerProps> = ({
  x,
  y,
  type = 'electromagnetic',
  isVibrating = false,
  frequency = 50,
  scale = 1,
  fontFamily = 'sans-serif',
}) => {
  const { timerBody, timerVibrator, tapeDotActive } = SCENE_COLORS.mechanicsApparatus

  // 基础外观规格
  const bodyWidth = 90
  const bodyHeight = 60

  return (
    <g
      className="ticker-timer"
      transform={`translate(${x}, ${y}) scale(${scale})`}
    >
      {/* 主体阴影 */}
      <rect
        x={-bodyWidth / 2 + 3}
        y={-bodyHeight / 2 + 3}
        width={bodyWidth}
        height={bodyHeight}
        rx={6}
        fill={withAlpha(CANVAS_COLORS.labelText, 0.15)}
      />

      {/* 计时器主体外壳 */}
      <rect
        x={-bodyWidth / 2}
        y={-bodyHeight / 2}
        width={bodyWidth}
        height={bodyHeight}
        rx={6}
        fill={timerBody}
        stroke={CANVAS_COLORS.strokeDark}
        strokeWidth={1.5}
      />

      {/* 电磁打点计时器细节 */}
      {type === 'electromagnetic' ? (
        <g className="electromagnetic-details">
          {/* 双电磁线圈 */}
          <rect x={-28} y={-20} width={16} height={24} rx={3} fill="#B8860B" stroke="#8B4513" strokeWidth={1} />
          <rect x={12} y={-20} width={16} height={24} rx={3} fill="#B8860B" stroke="#8B4513" strokeWidth={1} />
          <line x1={-20} y1={-20} x2={-20} y2={4} stroke="#4A5568" strokeWidth={4} />
          <line x1={20} y1={-20} x2={20} y2={4} stroke="#4A5568" strokeWidth={4} />

          {/* 振动片/振针 */}
          <line
            x1={-35}
            y1={-5}
            x2={10}
            y2={isVibrating ? -7 : -5}
            stroke={timerVibrator}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {/* 振针磁头 */}
          <circle cx={0} cy={isVibrating ? 12 : 10} r={2} fill={timerDotColor(isVibrating, tapeDotActive)} />
        </g>
      ) : (
        /* 电火花打点计时器细节 */
        <g className="spark-details">
          {/* 高压脉冲放电座 */}
          <rect x={-20} y={-22} width={40} height={20} rx={2} fill="#334155" stroke="#1E293B" />
          {/* 墨粉纸盘槽 */}
          <circle cx={0} cy={0} r={14} fill="#64748B" stroke="#334155" strokeWidth={1} />
          <circle cx={0} cy={0} r={8} fill="#0F172A" />
          {/* 放电火花/工作指示灯 */}
          {isVibrating && (
            <path
              d="M-3 -4 L2 -1 L-1 2 L4 5"
              fill="none"
              stroke="#F59E0B"
              strokeWidth={1.5}
            />
          )}
        </g>
      )}

      {/* 纸带穿过限位槽 (穿过本体中部的水平凹槽) */}
      <rect
        x={-bodyWidth / 2 - 4}
        y={8}
        width={bodyWidth + 8}
        height={8}
        fill={withAlpha('#000000', 0.25)}
        stroke="#1E293B"
        strokeWidth={0.8}
      />

      {/* 工作状态 LED 提示灯 */}
      <circle
        cx={bodyWidth / 2 - 10}
        cy={-bodyHeight / 2 + 10}
        r={3}
        fill={isVibrating ? '#22C55E' : '#94A3B8'}
      />

      {/* 刻印文字频率标识 "50Hz" */}
      <text
        x={-bodyWidth / 2 + 8}
        y={bodyHeight / 2 - 8}
        fill={CANVAS_COLORS.labelTextLight}
        fontSize={9}
        fontWeight="bold"
        fontFamily={fontFamily}
      >
        {type === 'spark' ? 'Spark' : 'EM'} {frequency}Hz
      </text>
    </g>
  )
}

function timerDotColor(isVibrating: boolean, activeColor: string): string {
  return isVibrating ? activeColor : '#475569'
}
