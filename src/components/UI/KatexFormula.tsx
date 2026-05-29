import React, { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface KatexFormulaProps {
  formula: string
  block?: boolean
  className?: string
}

export const KatexFormula: React.FC<KatexFormulaProps> = ({
  formula,
  block = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          throwOnError: false,
          displayMode: block,
        })
      } catch (error) {
        console.error('KaTeX rendering error:', error)
        containerRef.current.textContent = formula
      }
    }
  }, [formula, block])

  const baseClass = block
    ? 'my-4 p-3 bg-primary-50 rounded-md overflow-x-auto'
    : 'inline-block align-middle mx-1'

  return (
    <div
      ref={containerRef}
      className={`${baseClass} ${className}`}
    />
  )
}
