import React, { useMemo } from 'react'
import type { ControlMeta, ControlCondition } from '@/data/types'
import { OptionButton } from './OptionButton'
import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'
import { Slider } from './Slider'
import { TipCard } from './TipCard'
import { ToggleSwitch } from './ToggleSwitch'

interface ControlPanelProps {
  controls: ControlMeta[]
  params: Record<string, number>
  defaultParams?: Record<string, number>
  updateParam: (key: string, value: number) => void
  setParams: (params: Record<string, number>) => void
  resetAnimation: () => void
  restartAnimation: () => void
  setDirection?: (d: 1 | -1) => void
  toggleVectors?: () => void
  toggleTimeSlices?: () => void
  toggleDualObjects?: () => void
  storeStates?: Record<string, boolean>
  disabled?: boolean
}

function isControlVisible(control: ControlMeta, params: Record<string, number>) {
  if (control.showIf) {
    if (control.showIfValue != null) {
      if (params[control.showIf] !== control.showIfValue) return false
    } else if (!params[control.showIf]) {
      return false
    }
  }
  if (control.hideIf && control.hideIfValue != null) {
    if (params[control.hideIf] === control.hideIfValue) return false
  }
  return true
}

function defaultGroup(control: ControlMeta) {
  if (control.group) return control.group
  switch (control.type) {
    case 'segmented':
      return '模型选择'
    case 'toggle':
      return '显示辅助'
    case 'preset':
      return '快捷预设'
    case 'tip':
      return '教学提示'
    case 'action':
      return '操作'
    case 'storeToggle':
      return '显示辅助'
    case 'number':
    default:
      return '核心参数'
  }
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  controls,
  params,
  defaultParams = {},
  updateParam,
  setParams,
  resetAnimation,
  restartAnimation,
  setDirection,
  toggleVectors,
  toggleTimeSlices,
  toggleDualObjects,
  storeStates,
  disabled = false,
}) => {
  const groups = useMemo(() => {
    const visibleControls = controls.filter((control) => isControlVisible(control, params))
    const grouped: Array<{ label: string; controls: ControlMeta[] }> = []
    const indexByGroup = new Map<string, number>()

    visibleControls.forEach((control) => {
      const group = defaultGroup(control)
      const existingIndex = indexByGroup.get(group)
      if (existingIndex == null) {
        indexByGroup.set(group, grouped.length)
        grouped.push({ label: group, controls: [control] })
      } else {
        grouped[existingIndex].controls.push(control)
      }
    })

    return grouped
  }, [controls, params])

  if (groups.length === 0) return null

  const handleValueChange = (control: Extract<ControlMeta, { type: 'number' | 'segmented' }>, value: number) => {
    const changed = params[control.key] !== value
    updateParam(control.key, value)
    if (changed && control.resetOnChange) resetAnimation()
    applySideEffect(control)
  }

  const handleToggleChange = (control: Extract<ControlMeta, { type: 'toggle' }>, checked: boolean) => {
    const trueValue = control.trueValue ?? 1
    const falseValue = control.falseValue ?? 0
    const nextValue = checked ? trueValue : falseValue
    const changed = params[control.key] !== nextValue
    updateParam(control.key, nextValue)
    if (changed && control.resetOnChange) resetAnimation()
    applySideEffect(control)
  }

  const applySideEffect = (control: ControlCondition) => {
    const side = control.onChangeSideEffect
    if (!side) return
    if (side.resetParams) {
      side.resetParams.forEach((k) => {
        if (defaultParams[k] != null) updateParam(k, defaultParams[k])
      })
    }
    if (side.setParams) {
      Object.entries(side.setParams).forEach(([k, v]) => updateParam(k, v))
    }
  }

  const handlePresetApply = (control: Extract<ControlMeta, { type: 'preset' }>) => {
    const resolved = typeof control.params === 'function' ? control.params(params) : control.params
    setParams({ ...params, ...resolved })
    if (control.restartOnApply) restartAnimation()
    else if (control.resetOnApply !== false) resetAnimation()
  }

  const renderControl = (control: ControlMeta, index: number) => {
    switch (control.type) {
      case 'number': {
        const value = params[control.key] ?? control.min
        return (
          <div key={`${control.type}-${control.key}-${index}`}>
            <Slider
              label={control.label}
              value={value}
              min={control.min}
              max={control.max}
              step={control.step ?? 0.1}
              unit={control.unit ?? ''}
              description={control.description}
              onChange={(nextValue) => handleValueChange(control, nextValue)}
              disabled={disabled}
            />
          </div>
        )
      }
      case 'segmented':
        return (
          <SegmentedControl
            key={`${control.type}-${control.key}-${index}`}
            label={control.label}
            options={control.options}
            value={params[control.key] ?? control.options[0]?.value ?? 0}
            onChange={(nextValue) => handleValueChange(control, Number(nextValue))}
            disabled={disabled}
          />
        )
      case 'toggle':
        return (
          <div key={`${control.type}-${control.key}-${index}`} className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-neutral-600 select-none">{control.label}</span>
            <ToggleSwitch
              checked={(params[control.key] ?? control.falseValue ?? 0) === (control.trueValue ?? 1)}
              onChange={(checked) => handleToggleChange(control, checked)}
              disabled={disabled}
            />
          </div>
        )
      case 'preset':
        return (
          <OptionButton
            key={`${control.type}-${control.label}-${index}`}
            label={control.label}
            variant="preset"
            description={control.description}
            onClick={() => handlePresetApply(control)}
            disabled={disabled}
          />
        )
      case 'tip': {
        const resolvedContent = typeof control.content === 'function' ? control.content(params) : control.content
        return (
          <TipCard key={`${control.type}-${index}`} variant={control.variant ?? 'info'}>
            {control.title && <span className="font-semibold block mb-1">{control.title}</span>}
            <span>{resolvedContent}</span>
          </TipCard>
        )
      }
      case 'action':
        return (
          <Button
            key={`${control.type}-${control.label}-${index}`}
            variant={control.variant ?? 'secondary'}
            onClick={() => {
              switch (control.action) {
                case 'launch':
                case 'restart':
                  restartAnimation()
                  break
                case 'reset':
                  resetAnimation()
                  break
                case 'setDirection':
                  setDirection?.(control.directionValue ?? 1)
                  break
              }
            }}
            disabled={disabled}
          >
            {control.label}
          </Button>
        )
      case 'storeToggle': {
        const storeHandlers: Record<string, (() => void) | undefined> = {
          toggleVectors,
          toggleTimeSlices,
          toggleDualObjects,
        }
        const handler = storeHandlers[control.storeKey]
        return (
          <div key={`${control.type}-${control.storeKey}-${index}`} className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-neutral-600 select-none">{control.label}</span>
            <ToggleSwitch
              checked={storeStates?.[control.stateKey] ?? false}
              onChange={() => handler?.()}
              disabled={disabled || !handler}
            />
          </div>
        )
      }
      default:
        return null
    }
  }

  return (
    <>
      {groups.map((group, i) => (
        <div
          key={group.label}
          className={`flex flex-col gap-3${i > 0 ? ' border-t border-neutral-100 pt-3 mt-3' : ''}`}
        >
          {group.controls.map(renderControl)}
        </div>
      ))}
    </>
  )
}
