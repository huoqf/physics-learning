import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'

type ParamImportance = 'core' | 'advanced' | 'display'
type ParamMarkVariant = 'zero' | 'critical' | 'recommended'

interface ParamMark {
  value: number
  label?: string
  variant?: ParamMarkVariant
}

interface ParamConfig {
  key: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  group?: string
  description?: string
  marks?: ParamMark[]
  importance?: ParamImportance
  resetOnChange?: boolean
}

interface ParamControlProps {
  params: ParamConfig[]
  onParamChange: (key: string, value: number) => void
  onReset?: () => void
  disabled?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const getStepDigits = (step: number) => {
  if (!Number.isFinite(step) || step <= 0) return 1
  const stepText = step.toString()
  if (stepText.includes('e-')) {
    const [, exp] = stepText.split('e-')
    return Number.parseInt(exp, 10)
  }
  return stepText.includes('.') ? stepText.split('.')[1].length : 0
}

const formatByStep = (value: number, step = 0.1) => {
  const digits = Math.min(4, getStepDigits(step))
  return value.toFixed(digits)
}

const snapToStep = (value: number, param: ParamConfig) => {
  const step = param.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) return value
  const snapped = param.min + Math.round((value - param.min) / step) * step
  const digits = Math.min(6, getStepDigits(step))
  return Number(clamp(snapped, param.min, param.max).toFixed(digits))
}

const importanceClass: Record<ParamImportance | 'default', string> = {
  core: 'border-primary-100 bg-primary-50/30',
  advanced: 'border-amber-100 bg-amber-50/30',
  display: 'border-sky-100 bg-sky-50/30',
  default: 'border-neutral-100 bg-neutral-50/60',
}

const importanceLabel: Record<ParamImportance, string> = {
  core: '核心',
  advanced: '进阶',
  display: '显示',
}

const markClass: Record<ParamMarkVariant, string> = {
  zero: 'bg-neutral-400/70 text-neutral-400',
  critical: 'bg-danger-500/80 text-danger-600',
  recommended: 'bg-primary-500/80 text-primary-600',
}

function getMarkPercentage(markValue: number, param: ParamConfig) {
  if (param.max === param.min) return 0
  return clamp(((markValue - param.min) / (param.max - param.min)) * 100, 0, 100)
}

function buildMarks(param: ParamConfig): Array<ParamMark & { auto?: boolean }> {
  const marks: Array<ParamMark & { auto?: boolean }> = (param.marks ?? [])
    .filter((mark) => Number.isFinite(mark.value) && mark.value >= param.min && mark.value <= param.max)
    .map((mark) => ({ ...mark }))

  const hasZero = param.min < 0 && param.max > 0
  const hasExplicitZero = marks.some((mark) => Math.abs(mark.value) < 1e-9)
  if (hasZero && !hasExplicitZero) {
    marks.push({ value: 0, label: `0${param.unit ?? ''}`, variant: 'zero', auto: true })
  }

  return marks.sort((a, b) => a.value - b.value)
}

export const ParamControl: React.FC<ParamControlProps> = ({
  params,
  onParamChange,
  onReset,
  disabled = false,
}) => {
  const [localValues, setLocalValues] = useState<Record<string, string>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const skipBlurCommitKey = useRef<string | null>(null)

  const paramsSignature = useMemo(
    () => params.map((p) => `${p.key}:${p.value}:${p.min}:${p.max}:${p.step ?? 0.1}:${p.unit ?? ''}:${p.group ?? ''}`).join('|'),
    [params]
  )

  const groupedParams = useMemo(() => {
    const groups: Array<{ label: string; params: ParamConfig[] }> = []
    const indexByGroup = new Map<string, number>()

    params.forEach((param) => {
      const groupLabel = param.group ?? '核心参数'
      const existingIndex = indexByGroup.get(groupLabel)
      if (existingIndex == null) {
        indexByGroup.set(groupLabel, groups.length)
        groups.push({ label: groupLabel, params: [param] })
      } else {
        groups[existingIndex].params.push(param)
      }
    })

    return groups
  }, [params])

  const showGroupTitle = groupedParams.length > 1 || params.some((param) => Boolean(param.group))

  useEffect(() => {
    setLocalValues((prev) => {
      const newValues: Record<string, string> = {}
      params.forEach((p) => {
        newValues[p.key] = editingKey === p.key && prev[p.key] != null
          ? prev[p.key]
          : formatByStep(p.value, p.step ?? 0.1)
      })
      return newValues
    })
  }, [params, paramsSignature, editingKey])

  const handleInputChange = (key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
  }

  const commitValue = (key: string, param: ParamConfig) => {
    const rawValue = localValues[key]
    const numValue = Number.parseFloat(rawValue)
    if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
      const normalizedValue = snapToStep(numValue, param)
      onParamChange(key, normalizedValue)
      setLocalValues((prev) => ({ ...prev, [key]: formatByStep(normalizedValue, param.step ?? 0.1) }))
    } else {
      setLocalValues((prev) => ({ ...prev, [key]: formatByStep(param.value, param.step ?? 0.1) }))
    }
    setEditingKey(null)
  }

  const handleSliderChange = (key: string, value: number, param: ParamConfig) => {
    const normalizedValue = snapToStep(value, param)
    onParamChange(key, normalizedValue)
    setLocalValues((prev) => ({ ...prev, [key]: formatByStep(normalizedValue, param.step ?? 0.1) }))
  }

  const handleInputBlur = (key: string, param: ParamConfig) => {
    if (skipBlurCommitKey.current === key) {
      skipBlurCommitKey.current = null
      return
    }
    commitValue(key, param)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, key: string, param: ParamConfig) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitValue(key, param)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      skipBlurCommitKey.current = key
      setLocalValues((prev) => ({ ...prev, [key]: formatByStep(param.value, param.step ?? 0.1) }))
      setEditingKey(null)
      e.currentTarget.blur()
    }
  }

  const renderParam = (param: ParamConfig) => {
    const step = param.step ?? 0.1
    const parsedValue = Number.parseFloat(localValues[param.key])
    const safeValue = Number.isFinite(parsedValue) ? clamp(parsedValue, param.min, param.max) : param.value
    const percentage = clamp(((safeValue - param.min) / (param.max - param.min)) * 100, 0, 100)
    const marks = buildMarks(param)
    const zeroMark = marks.find((mark) => Math.abs(mark.value) < 1e-9)
    const zeroPercentage = zeroMark ? getMarkPercentage(zeroMark.value, param) : 0
    const hasZeroMark = Boolean(zeroMark)
    const fillLeft = hasZeroMark ? Math.min(percentage, zeroPercentage) : 0
    const fillWidth = hasZeroMark ? Math.abs(percentage - zeroPercentage) : percentage
    const cardClass = importanceClass[param.importance ?? 'default']

    return (
      <div key={param.key} className={['rounded-lg border p-3 space-y-2.5', cardClass].join(' ')}>
        <div className="flex items-start justify-between gap-2">
          <label className="min-w-0 text-xs font-semibold text-neutral-700 leading-6" htmlFor={`param-${param.key}`}>
            <span className="inline-flex items-center gap-1.5">
              <span>{param.label}</span>
              {param.importance && (
                <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-ui-sm font-bold text-neutral-400 border border-neutral-200/70">
                  {importanceLabel[param.importance]}
                </span>
              )}
            </span>
            {param.description && (
              <span className="mt-1 block text-ui-base font-normal leading-relaxed text-neutral-400">
                {param.description}
              </span>
            )}
          </label>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              id={`param-${param.key}`}
              type="number"
              value={localValues[param.key] ?? ''}
              onFocus={() => setEditingKey(param.key)}
              onChange={(e) => handleInputChange(param.key, e.target.value)}
              onBlur={() => handleInputBlur(param.key, param)}
              onKeyDown={(e) => handleKeyDown(e, param.key, param)}
              min={param.min}
              max={param.max}
              step={step}
              disabled={disabled}
              className="w-20 px-2 py-1 text-sm text-right font-mono bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`${param.label}数值`}
            />
            {param.unit && (
              <span className="text-xs text-neutral-500 min-w-[20px]">
                {param.unit}
              </span>
            )}
          </div>
        </div>

        <div className="relative h-2 bg-neutral-200 rounded-full flex items-center">
          {marks.map((mark) => {
            const markVariant = mark.variant ?? 'recommended'
            return (
              <div
                key={`${param.key}-${mark.value}-${mark.label ?? ''}`}
                className={['absolute top-1/2 -translate-y-1/2 w-px h-3.5 pointer-events-none z-[1]', markClass[markVariant].split(' ')[0]].join(' ')}
                style={{ left: `${getMarkPercentage(mark.value, param)}%` }}
                aria-hidden="true"
              />
            )
          })}
          <input
            type="range"
            min={param.min}
            max={param.max}
            step={step}
            value={safeValue}
            onChange={(e) =>
              handleSliderChange(param.key, Number.parseFloat(e.target.value), param)
            }
            disabled={disabled}
            className="peer absolute -inset-y-2 left-0 w-full h-6 opacity-0 cursor-pointer z-10"
            aria-label={`${param.label}滑块`}
          />
          <div
            className="absolute top-0 h-full bg-primary-500 rounded-full pointer-events-none transition-all duration-fast ease-standard peer-hover:bg-primary-600"
            style={{
              left: `${fillLeft}%`,
              width: `${fillWidth}%`,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow-sm pointer-events-none transition-all duration-fast ease-standard peer-hover:scale-115 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-300 peer-focus-visible:ring-offset-1 peer-active:scale-95"
            style={{
              left: `calc(${percentage}% - 8px)`,
            }}
          />
        </div>

        <div className="flex justify-between text-ui-base text-neutral-500 font-mono">
          <span>
            {formatByStep(param.min, step)}
            {param.unit}
          </span>
          <span>
            {formatByStep(param.max, step)}
            {param.unit}
          </span>
        </div>

        {marks.some((mark) => mark.label) && (
          <div className="relative h-4 text-ui-sm font-semibold">
            {marks.filter((mark) => mark.label).map((mark) => {
              const markVariant = mark.variant ?? 'recommended'
              const [, textClass] = markClass[markVariant].split(' ')
              return (
                <span
                  key={`${param.key}-label-${mark.value}-${mark.label}`}
                  className={['absolute top-0 -translate-x-1/2 whitespace-nowrap', textClass].join(' ')}
                  style={{ left: `${getMarkPercentage(mark.value, param)}%` }}
                >
                  {mark.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={[
        'bg-white rounded-xl shadow-sm border border-neutral-200 p-4',
        disabled && 'opacity-40 pointer-events-none',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">参数设置</h3>
          <p className="text-ui-base text-neutral-400 mt-0.5">拖动滑块或直接输入精确值</p>
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-neutral-500 hover:text-primary-700 hover:bg-primary-50 active:scale-[0.97] transition-all duration-instant ease-decelerate"
            aria-label="恢复默认参数"
          >
            <RotateCcw className="w-3 h-3" />
            恢复默认
          </button>
        )}
      </div>

      <div className="space-y-4">
        {groupedParams.map((group) => (
          <div key={group.label} className="space-y-3">
            {showGroupTitle && (
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                <span className="h-px flex-1 bg-neutral-200" />
                <span>{group.label}</span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>
            )}
            {group.params.map(renderParam)}
          </div>
        ))}
      </div>
    </div>
  )
}
