import React from 'react'

type BadgeVariant = 'gaokao' | 'hard' | 'core' | 'basic' | 'extend'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  gaokao: 'pl-2 bg-accent-100 text-accent-700 border-l-4 border-accent-400',
  hard: 'bg-danger-100 text-danger-700',
  core: 'bg-primary-100 text-primary-700',
  basic: 'bg-neutral-100 text-neutral-600',
  extend: 'bg-secondary-100 text-secondary-700',
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'basic',
  className = '',
}) => {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-1 text-xs font-medium rounded-sm',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
