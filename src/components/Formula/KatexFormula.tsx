import React, { useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface KatexFormulaProps {
  formula: string
  mode?: 'inline' | 'block'
  className?: string
  /**
   * 外层标签。默认 `div`；行内公式嵌在 `<p>` / `<span>` 里时必须传 `span`，
   * 否则产生 `<p><div>` 这类非法嵌套（React 客户端渲染不会自动纠正）。
   */
  as?: 'div' | 'span'
}

export const KatexFormula: React.FC<KatexFormulaProps> = ({
  formula,
  mode = 'inline',
  className = '',
  as = 'div',
}) => {
  const containerRef = useRef<HTMLElement>(null)

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

  return React.createElement(as, {
    ref: containerRef,
    className: `${baseClass} ${className}`,
  })
}
