import React, { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { getStepDigits, formatByStep } from './Slider'

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

const snapToStep = (value: number, param: ParamConfig) => {
  const step = param.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) return value
  const snapped = param.min + Math.round((value - param.min) / step) * step
  const digits = Math.min(6, getStepDigits(step))
  return Number(clamp(snapped, param.min, param.max).toFixed(digits))
}

const importanceLabel: Record<ParamImportance, string> = {
  core: '核心',
  advanced: '进阶',
  display: '显示',
}

const importanceBadgeClass: Record<ParamImportance, string> = {
  core: 'bg-primary-50 text-primary-700 border-primary-200/60',
  advanced: 'bg-amber-50 text-amber-700 border-amber-200/60',
  display: 'bg-sky-50 text-sky-700 border-sky-200/60',
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

  const inputWidth = useMemo(() => {
    const maxLen = params.reduce((acc, p) => {
      const step = p.step ?? 0.1
      const len = Math.max(
        formatByStep(p.min, step).length,
        formatByStep(p.max, step).length
      )
      return Math.max(acc, len)
    }, 3)
    // 设定安全的最小字符宽度（6.5ch），并为边距与浏览器默认微调框预留足够宽度
    return `${Math.max(6.5, maxLen + 2.5)}ch`
  }, [params])

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

    return (
      <div key={param.key} className="space-y-2.5 pb-4 border-b border-neutral-100 last:border-0 last:pb-0">
        <div className="flex items-start justify-between gap-2">
          <label className="min-w-0 text-xs font-semibold text-neutral-700 leading-6" htmlFor={`param-${param.key}`}>
            <span className="inline-flex items-center gap-1.5">
              <span>{param.label}{param.unit ? ` (${param.unit})` : ''}</span>
              {param.importance && (
                <span className={['rounded-full px-1.5 py-0.5 text-ui-sm font-bold border', importanceBadgeClass[param.importance]].join(' ')}>
                  {importanceLabel[param.importance]}
                </span>
              )}
            </span>
            {param.description && (
              <span className="mt-0.5 block text-ui-base font-normal leading-relaxed text-neutral-400">
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
              style={{ width: inputWidth }}
              className="px-2 py-1 text-sm text-right font-mono bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`${param.label}数值`}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-ui-base text-neutral-400 font-mono w-8 text-right shrink-0">
            {formatByStep(param.min, step)}
          </span>
          <div className="relative flex-1 h-2 bg-neutral-200 rounded-full flex items-center">
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
          <span className="text-ui-base text-neutral-400 font-mono w-8 text-left shrink-0">
            {formatByStep(param.max, step)}
          </span>
        </div>

        {marks.some((mark) => mark.label) && (
          <div className="relative h-4 text-ui-sm font-semibold w-full" style={{ paddingLeft: '44px', paddingRight: '44px' }}>
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
        <h3 className="text-sm font-semibold text-neutral-800">参数设置</h3>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-md text-neutral-400 hover:text-primary-700 hover:bg-primary-50 active:scale-[0.97] transition-all duration-instant ease-decelerate"
            aria-label="恢复默认参数"
          >
            <RotateCcw className="w-4 h-4" />
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
