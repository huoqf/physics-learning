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
}) => {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className={['w-full', disabled && 'opacity-40 pointer-events-none'].join(' ')}>
      {(label || unit) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
          <span className="text-sm font-mono text-neutral-600">
            {value.toFixed(step < 1 ? 1 : 0)}
            {unit && <span className="ml-1 text-neutral-500">{unit}</span>}
          </span>
        </div>
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
    </div>
  )
}
