import React from 'react'
import { duration, easing } from '@/theme/motion'

interface OptionButtonProps {
  label: string
  selected?: boolean
  disabled?: boolean
  variant?: 'default' | 'preset' | 'danger' | 'ghost'
  onClick: () => void
  description?: string
  className?: string
}

const variantStyles = {
  default: {
    selected: 'bg-primary-50 text-primary-700 border border-primary-600',
    unselected:
      'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50',
  },
  preset: {
    selected: 'bg-primary-50 text-primary-700 border border-primary-600',
    unselected:
      'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300',
  },
  danger: {
    selected: 'bg-danger-100 text-danger-700 border border-danger-500',
    unselected:
      'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50',
  },
  ghost: {
    selected: 'bg-primary-50 text-primary-700',
    unselected: 'bg-transparent text-neutral-600 hover:bg-neutral-50',
  },
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected = false,
  disabled = false,
  variant = 'default',
  onClick,
  description,
  className = '',
}) => {
  const isPreset = variant === 'preset'
  const paddingX = isPreset ? 'px-2.5' : 'px-3'
  const widthClass = isPreset ? 'w-full text-left' : ''

  const stateStyle = selected
    ? variantStyles[variant].selected
    : variantStyles[variant].unselected

  const disabledStyle = disabled ? 'opacity-40 cursor-not-allowed' : ''

  const transitionStyle = `duration-[${duration.fast}ms] ease-[${easing.standard}]`

  const baseClasses = [
    'py-2 text-xs rounded-md font-medium transition-all active:scale-[0.97]',
    paddingX,
    widthClass,
    stateStyle,
    disabledStyle,
    transitionStyle,
  ]
    .filter(Boolean)
    .join(' ')

  const hasDescription = isPreset && description

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${className}`.trim()}
      style={{
        transitionDuration: `${duration.fast}ms`,
        transitionTimingFunction: easing.standard,
      }}
    >
      {hasDescription ? (
        <span className="flex justify-between items-center w-full">
          <span>{label}</span>
          <span className="font-mono text-ui-sm text-neutral-400">
            {description}
          </span>
        </span>
      ) : (
        label
      )}
    </button>
  )
}
