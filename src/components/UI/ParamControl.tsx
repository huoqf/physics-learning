import React, { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

interface ParamConfig {
  key: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
}

interface ParamControlProps {
  params: ParamConfig[]
  onParamChange: (key: string, value: number) => void
  onReset?: () => void
  disabled?: boolean
}

export const ParamControl: React.FC<ParamControlProps> = ({
  params,
  onParamChange,
  onReset,
  disabled = false,
}) => {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const newValues: Record<string, string> = {}
    params.forEach((p) => {
      newValues[p.key] = p.value.toString()
    })
    setLocalValues(newValues)
  }, [params])

  const handleInputChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleInputBlur = (key: string, param: ParamConfig) => {
    const numValue = parseFloat(localValues[key])
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(param.min, Math.min(param.max, numValue))
      onParamChange(key, clampedValue)
      setLocalValues((prev) => ({ ...prev, [key]: clampedValue.toString() }))
    } else {
      setLocalValues((prev) => ({ ...prev, [key]: param.value.toString() }))
    }
  }

  const handleSliderChange = (key: string, value: number, param: ParamConfig) => {
    const clampedValue = Math.max(param.min, Math.min(param.max, value))
    onParamChange(key, clampedValue)
    setLocalValues((prev) => ({ ...prev, [key]: clampedValue.toString() }))
  }

  const handleKeyDown = (e: React.KeyboardEvent, key: string, param: ParamConfig) => {
    if (e.key === 'Enter') {
      handleInputBlur(key, param)
    }
  }

  return (
    <div
      className={[
        'bg-white rounded-lg shadow-sm border border-neutral-200 p-4',
        disabled && 'opacity-40 pointer-events-none',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-neutral-800">参数设置</h3>
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-neutral-600 hover:text-primary-600 active:scale-[0.97] transition-all duration-instant ease-decelerate"
          >
            <RotateCcw className="w-3 h-3" />
            批量重置
          </button>
        )}
      </div>

      <div className="space-y-4">
        {params.map((param) => {
          const percentage =
            ((parseFloat(localValues[param.key] || '0') - param.min) /
              (param.max - param.min)) *
            100

          return (
            <div key={param.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-700">
                  {param.label}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={localValues[param.key] || ''}
                    onChange={(e) => handleInputChange(param.key, e.target.value)}
                    onBlur={() => handleInputBlur(param.key, param)}
                    onKeyDown={(e) => handleKeyDown(e, param.key, param)}
                    min={param.min}
                    max={param.max}
                    step={param.step || 0.1}
                    disabled={disabled}
                    className="w-20 px-2 py-1 text-sm text-right font-mono border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {param.unit && (
                    <span className="text-xs text-neutral-500 min-w-[20px]">
                      {param.unit}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative h-2 bg-neutral-200 rounded-full flex items-center">
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step || 0.1}
                  value={parseFloat(localValues[param.key] || '0')}
                  onChange={(e) =>
                    handleSliderChange(param.key, parseFloat(e.target.value), param)
                  }
                  disabled={disabled}
                  className="peer absolute -inset-y-2 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
                />
                <div
                  className="absolute left-0 top-0 h-full bg-primary-500 rounded-full pointer-events-none transition-all duration-fast ease-standard peer-hover:bg-primary-600"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-sm pointer-events-none transition-all duration-fast ease-standard peer-hover:scale-115 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 peer-focus-visible:ring-offset-1 peer-active:scale-95"
                  style={{
                    left: `calc(${percentage}% - 8px)`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-neutral-500">
                <span>
                  {param.min}
                  {param.unit}
                </span>
                <span>
                  {param.max}
                  {param.unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

