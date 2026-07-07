interface PageLayoutProps {
  children: React.ReactNode
  maxWidth?: string
  padding?: boolean
  className?: string
}

export function PageLayout({
  children,
  maxWidth = '5xl',
  padding = true,
  className,
}: PageLayoutProps) {
  const maxClass = maxWidth.startsWith('max-w-')
    ? maxWidth
    : /^\d+$/.test(maxWidth)
      ? `max-w-${maxWidth}`
      : `max-w-[${maxWidth}]`

  return (
    <div className={`${maxClass} mx-auto${padding ? ' px-6 py-6' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}
