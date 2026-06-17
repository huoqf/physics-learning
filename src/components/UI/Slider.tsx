import React from 'react'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  label?: string
  onChange: (value: number) => void
  disabled?: boolean
  minLabel?: string
  maxLabel?: string
  midLabel?: string
  formatValue?: (v: number) => string
  description?: string
}

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
        <div className="text-right text-[10px] text-neutral-400 -mt-1 mb-2">{description}</div>
      )}
      <div className="relative h-2 bg-neutral-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-primary-500 rounded-full transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-sm transition-all duration-150"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      {(minLabel || maxLabel) && (
        <div className="relative flex justify-between text-[10px] text-neutral-400 mt-0.5">
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
