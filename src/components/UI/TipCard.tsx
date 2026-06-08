import React from 'react'

type TipCardVariant = 'info' | 'primary' | 'warning'

interface TipCardProps {
  children: React.ReactNode
  variant?: TipCardVariant
  className?: string
}

const variantStyles: Record<TipCardVariant, string> = {
  primary:
    'bg-primary-50/50 border-primary-100 text-primary-700',
  info:
    'bg-neutral-50 border-neutral-200 text-neutral-600',
  warning:
    'bg-amber-50/50 border-amber-200 text-amber-700',
}

export const TipCard: React.FC<TipCardProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  return (
    <div
      className={[
        'p-3 rounded-lg border text-[11px] leading-relaxed',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
