import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  /** 运行时取值的内联样式（用于颜色 token 等无法编译期静态化的值） */
  style?: React.CSSProperties
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = false,
  style,
}) => {
  return (
    <div
      style={style}
      className={[
        'bg-white rounded-xl shadow-sm border border-neutral-100',
        hoverable && 'transition-all duration-fast ease-standard hover:shadow-lg',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
