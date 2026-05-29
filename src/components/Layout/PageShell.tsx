import React from 'react'

interface PageShellProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  title,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-neutral-50 flex flex-col ${className}`}>
      <header className="h-14 bg-primary-800 flex items-center px-6 flex-shrink-0">
        {title && <h1 className="text-white font-semibold text-lg">{title}</h1>}
      </header>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
