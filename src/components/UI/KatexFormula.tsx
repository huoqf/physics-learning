import React, { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface KatexFormulaProps {
  formula: string
  mode?: 'inline' | 'block'
  className?: string
}

export const KatexFormula: React.FC<KatexFormulaProps> = ({
  formula,
  mode = 'inline',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          throwOnError: false,
          displayMode: mode === 'block',
        })
      } catch {
        containerRef.current.textContent = formula
      }
    }
  }, [formula, mode])

  const isBlock = mode === 'block'

  const baseClass = isBlock
    ? 'my-4 px-4 py-3 bg-primary-50 rounded-sm overflow-x-auto'
    : 'inline-block align-middle mx-1 my-0.5'

  return (
    <div
      ref={containerRef}
      className={`${baseClass} ${className}`}
    />
  )
}
