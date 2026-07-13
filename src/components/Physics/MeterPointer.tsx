import React from 'react'
import { duration, easing } from '@/theme/motion'

/**
 * MeterPointer — 仪表指针通用组件
 *
 * 统一 DialMeter 和 Galvanometer 的指针渲染逻辑：
 * - 带阻尼的 CSS 过渡动画
 * - 指针投影阴影
 * - 可选的尖端装饰（如小红圈）
 *
 * @example
 * ```tsx
 * <MeterPointer angle={-30} length={21} color={themeColor} />
 * <MeterPointer angle={15} length={52} color={needleColor} tipRadius={2.2} />
 * ```
 */
export interface MeterPointerProps {
  /** 指针旋转角度（deg），0° 指向上方（-Y 轴） */
  angle: number
  /** 指针长度（px） */
  length: number
  /** 指针颜色 */
  color: string
  /** 指针宽度，默认 1.8 */
  strokeWidth?: number
  /** 阴影偏移 X，默认 0.8 */
  shadowDx?: number
  /** 阴影偏移 Y，默认 0.8 */
  shadowDy?: number
  /** 阴影颜色，默认 'rgba(15, 23, 42, 0.2)' */
  shadowColor?: string
  /** 指针尾端 Y 偏移（从旋转中心向下延伸），默认 0 */
  tailOffset?: number
  /** 尖端装饰圆半径，不传则不渲染尖端 */
  tipRadius?: number
  /** 过渡时长 ms，默认 duration.normal (200) */
  transitionMs?: number
  /** 过渡缓动函数，默认 easing.decelerate */
  transitionEasing?: string
}

export const MeterPointer: React.FC<MeterPointerProps> = ({
  angle,
  length,
  color,
  strokeWidth = 1.8,
  shadowDx = 0.8,
  shadowDy = 0.8,
  shadowColor = 'rgba(15, 23, 42, 0.2)',
  tailOffset = 0,
  tipRadius,
  transitionMs,
  transitionEasing,
}) => {
  const tMs = transitionMs ?? duration.normal
  const tEasing = transitionEasing ?? easing.decelerate

  return (
    <g
      transform={`rotate(${angle})`}
      style={{
        transition: `transform ${tMs}ms ${tEasing}`,
        transformOrigin: '0px 0px',
      }}
    >
      {/* 指针投影 */}
      <line
        x1={shadowDx}
        y1={shadowDy + tailOffset}
        x2={shadowDx}
        y2={shadowDy - length}
        stroke={shadowColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 指针杆 */}
      <line
        x1={0}
        y1={tailOffset}
        x2={0}
        y2={-length}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* 尖端装饰 */}
      {tipRadius != null && tipRadius > 0 && (
        <circle cx={0} cy={-length} r={tipRadius} fill={color} />
      )}
    </g>
  )
}
