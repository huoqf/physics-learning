import React from 'react'

interface ThreePanelProps {
  left?: React.ReactNode
  center: React.ReactNode
  right?: React.ReactNode
  className?: string
}

export const ThreePanel: React.FC<ThreePanelProps> = ({
  left,
  center,
  right,
  className = '',
}) => {
  return (
    <div className={`flex h-full ${className}`}>
      {left && (
        <div className="w-[280px] flex-shrink-0 bg-neutral-50 border-r border-neutral-200 overflow-y-auto">
          {left}
        </div>
      )}
      <div className="flex-1 bg-white overflow-hidden min-w-[400px]">
        {center}
      </div>
      {right && (
        <div className="w-[320px] flex-shrink-0 bg-neutral-50 border-l border-neutral-200 overflow-y-auto">
          {right}
        </div>
      )}
    </div>
  )
}
