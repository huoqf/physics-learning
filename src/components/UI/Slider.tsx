import React from 'react'

/**
 * Slider 滑块组件 Props 接口。
 * 用于数值范围选择，支持自定义标签、单位和格式化显示。
 */
interface SliderProps {
  /**
   * 当前滑块值。
   */
  value: number
  /**
   * 滑块最小值。
   */
  min: number
  /**
   * 滑块最大值。
   */
  max: number
  /**
   * 滑块步长。
   * @default 0.1
   */
  step?: number
  /**
   * 数值单位（显示在值后面）。
   * @default ''
   */
  unit?: string
  /**
   * 滑块标签（显示在左上方）。
   */
  label?: string
  /**
   * 值变化时的回调函数。
   */
  onChange: (value: number) => void
  /**
   * 是否禁用滑块。
   * @default false
   */
  disabled?: boolean
  /**
   * 最小值标签（显示在滑块下方左侧）。
   */
  minLabel?: string
  /**
   * 最大值标签（显示在滑块下方右侧）。
   */
  maxLabel?: string
  /**
   * 中间值标签（显示在滑块下方中间）。
   */
  midLabel?: string
  /**
   * 自定义值格式化函数。
   * 用于控制值的显示格式，如保留小数位数。
   */
  formatValue?: (v: number) => string
  /**
   * 描述文本（显示在滑块下方右侧，灰色小字）。
   */
  description?: string
}

/**
 * Slider 滑块组件
 *
 * 【设计意图】
 * 1. 提供直观的数值范围选择交互，适用于物理模拟参数调整。
 * 2. 支持自定义标签、单位和格式化显示，满足不同场景需求。
 * 3. 内置禁用状态和响应式设计，在移动端也能良好使用。
 * 4. 可自定义步长和显示格式，适应不同精度要求的参数调整。
 *
 * @example
 * ```tsx
 * // 基础滑块
 * <Slider
 *   value={50}
 *   min={0}
 *   max={100}
 *   onChange={(v) => console.log(v)}
 * />
 *
 * // 带标签和单位的滑块
 * <Slider
 *   value={2.5}
 *   min={0}
 *   max={10}
 *   step={0.1}
 *   unit="m/s"
 *   label="初速度"
 *   onChange={(v) => setVelocity(v)}
 * />
 *
 * // 带自定义格式化的滑块
 * <Slider
 *   value={0.5}
 *   min={0}
 *   max={1}
 *   step={0.01}
 *   label="摩擦系数"
 *   formatValue={(v) => `${(v * 100).toFixed(0)}%`}
 *   onChange={(v) => setFriction(v)}
 * />
 * ```
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
}) => {
  const percentage = ((value - min) / (max - min)) * 100

  const displayValue = formatValue ? formatValue(value) : value.toFixed(step < 1 ? 1 : 0)

  return (
    <div className={['w-full', disabled && 'opacity-40 pointer-events-none'].join(' ')}>
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
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="peer absolute -inset-y-2 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute left-0 top-0 h-full bg-primary-500 rounded-full pointer-events-none transition-all duration-150 peer-hover:bg-primary-600"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-sm pointer-events-none transition-all duration-150 peer-hover:scale-115 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 peer-focus-visible:ring-offset-1 peer-active:scale-95"
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
