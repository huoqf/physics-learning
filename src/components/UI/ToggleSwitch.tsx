import React from 'react'

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
        className={[
          'w-9 h-5 rounded-full relative shrink-0 transition-all duration-fast ease-standard active:scale-[0.95]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
          checked ? 'bg-primary-600' : 'bg-neutral-300 hover:bg-neutral-400/80',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        ].filter(Boolean).join(' ')}
      >
        <span
          className={[
            'w-3.5 h-3.5 rounded-full bg-white shadow-md absolute top-[3px] transition-all duration-fast ease-standard',
            checked ? 'left-[19px] scale-[1.05]' : 'left-[3px]',
          ].filter(Boolean).join(' ')}
        />
      </button>
    </div>
  )
}
