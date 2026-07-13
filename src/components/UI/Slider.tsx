/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import type { FontScaler } from '@/theme/fontScaler'

// ── 精度工具（从 ParamControl 迁移） ──

/** 计算 step 的实际小数位数，支持科学计数法 */
const getStepDigits = (step: number): number => {
  if (!Number.isFinite(step) || step <= 0) return 1
  const text = step.toString()
  if (text.includes('e-')) {
    const [, exp] = text.split('e-')
    return Number.parseInt(exp, 10)
  }
  return text.includes('.') ? text.split('.')[1].length : 0
}

/** 按 step 精度格式化数值，最多保留 4 位小数 */
const formatByStep = (value: number, step: number): string => {
  const digits = Math.min(4, getStepDigits(step))
  return value.toFixed(digits)
}

// ── Props ──

interface SliderProps {
  /** 当前值 */
  value: number
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 步长，默认 0.1 */
  step?: number
  /** 数值单位（显示在值后面） */
  unit?: string
  /** 滑块标签（显示在左上方） */
  label?: string
  /** 值变化回调 */
  onChange: (value: number) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 最小值标签（滑块下方左侧） */
  minLabel?: string
  /** 最大值标签（滑块下方右侧） */
  maxLabel?: string
  /** 中间值标签（滑块下方中间） */
  midLabel?: string
  /** 自定义值格式化函数，覆盖内置精度逻辑 */
  formatValue?: (v: number) => string
  /** 描述文本（灰色小字） */
  description?: string
  /** 填充锚点（填充从此值开始），默认 0。超出 [min, max] 时退化为最近边界 */
  fillAnchor?: number
  /** ARIA 标签，用于屏幕阅读器 */
  ariaLabel?: string
  /** ARIA 值文本，包含物理量名称和单位，例如 "电流，0.05 A" */
  ariaValueText?: string
  /** 字体缩放函数 */
  font?: FontScaler
}

/**
 * Slider 滑块组件
 *
 * 通用数值范围选择控件，支持：
 * - step 感知的精度格式化（含科学计数法）
 * - 零点穿越填充（fillAnchor）
 * - ARIA 无障碍属性
 */
export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 0.1,
  unit = '',
  label,
  onChange,
  disabled = false,
  minLabel,
  maxLabel,
  midLabel,
  formatValue,
  description,
  fillAnchor = 0,
  ariaLabel,
  ariaValueText,
}) => {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.1
  const percentage = ((value - min) / (max - min)) * 100

  // 精度格式化
  const displayValue = formatValue ? formatValue(value) : formatByStep(value, safeStep)

  // 零点穿越填充计算
  const anchor = Math.max(min, Math.min(max, fillAnchor))
  const anchorPct = ((anchor - min) / (max - min)) * 100
  const fillLeft = Math.min(percentage, anchorPct)
  const fillWidth = Math.abs(percentage - anchorPct)

  return (
    <div className={['w-full', disabled && 'opacity-40 pointer-events-none'].filter(Boolean).join(' ')}>
      {(label || unit) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
          <span className="text-sm font-mono text-neutral-600">
            {displayValue}
            {unit && <span className="ml-1 text-neutral-500">{unit}</span>}
          </span>
        </div>
      )}
      {description && (
        <div className="text-right text-ui-base text-neutral-400 -mt-1 mb-2">{description}</div>
      )}
      <div className="relative h-2 bg-neutral-200 rounded-full flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={safeStep}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="peer absolute -inset-y-2 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
          aria-label={ariaLabel ?? label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={ariaValueText ?? `${displayValue}${unit ? ` ${unit}` : ''}`}
        />
        <div
          className="absolute top-0 h-full bg-primary-500 rounded-full pointer-events-none transition-all duration-fast ease-standard peer-hover:bg-primary-600"
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-sm pointer-events-none transition-all duration-fast ease-standard peer-hover:scale-115 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 peer-focus-visible:ring-offset-1 peer-active:scale-95"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      {(minLabel || maxLabel) && (
        <div className="relative flex justify-between text-ui-base text-neutral-400 mt-0.5">
          <span>{minLabel}</span>
          {midLabel && (
            <span className="absolute left-1/2 -translate-x-1/2">{midLabel}</span>
          )}
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  )
}

// ── 导出精度工具供外部使用 ──
export { getStepDigits, formatByStep }
