import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
}) => {
  return (
    <div
      className={[
        'bg-white rounded-xl shadow-md border border-neutral-200',
        hoverable && 'transition-all duration-200 hover:shadow-lg',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
