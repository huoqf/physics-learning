import type { FC } from 'react'

interface SegmentedControlOption {
  label: string
  value: number | string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: number | string
  onChange: (value: number | string) => void
  disabled?: boolean
  label?: string
  className?: string
}

export const SegmentedControl: FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  label,
  className = '',
}) => {
  // Tailwind 无法识别模板字符串中的动态类名，必须使用完整类名映射
  const colsMap: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }
  const colsClass = colsMap[options.length] ?? 'grid-cols-2'

  return (
    <div className={className}>
      {label && (
        <span className="mb-1 block text-xs font-semibold text-neutral-600">
          {label}
        </span>
      )}
      <div
        className={`grid ${colsClass} gap-1 p-1 bg-neutral-100 rounded-lg`}
      >
        {options.map((opt) => {
          const isActive = opt.value === value
          return (
            <button
              key={opt.value}
              onClick={() => {
                if (!disabled && !isActive) onChange(opt.value)
              }}
              disabled={disabled}
              className={[
                'py-1.5 text-xs font-semibold rounded-md transition-all duration-fast ease-standard active:scale-[0.98]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                isActive
                  ? 'bg-white text-primary-700 shadow-sm font-bold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50',
              ].filter(Boolean).join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
