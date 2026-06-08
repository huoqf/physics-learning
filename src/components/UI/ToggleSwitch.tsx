import React from 'react'
import { duration, easing } from '@/theme/motion'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  className,
}) => {
  const transitionStyle = {
    transitionDuration: `${duration.fast}ms`,
    transitionTimingFunction: easing.standard,
  }

  return (
    <div className={['flex items-center gap-2', className].filter(Boolean).join(' ')}>
      {label && (
        <span className="text-xs font-semibold text-neutral-600 select-none">{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={transitionStyle}
        className={[
          'w-9 h-5 rounded-full relative shrink-0 transition-all active:scale-[0.97]',
          checked ? 'bg-primary-600' : 'bg-neutral-300',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          style={transitionStyle}
          className={[
            'w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all',
            checked ? 'left-[18px]' : 'left-[3px]',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
