import React from 'react'
import { KatexFormula } from '@/components/UI'

export const ContentWithKatex = React.memo(function ContentWithKatex({ content }: { content: string }) {
  if (!content) return null
  const hasDollar = content.includes('$')
  if (!hasDollar) {
    // 如果没有 $ 包裹，但含有 LaTeX 典型特征（如 \ , _ , ^），则直接当作 KaTeX 公式处理
    const isLatex = /\\[a-zA-Z]+|[_^{}]/.test(content)
    if (isLatex) {
      return <KatexFormula formula={content} mode="inline" />
    }
    return <span className="whitespace-pre-wrap">{content}</span>
  }

  const segments = content.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.startsWith('$$') && seg.endsWith('$$')) {
          const formula = seg.slice(2, -2).trim()
          return <KatexFormula key={i} formula={formula} mode="block" />
        }
        if (seg.startsWith('$') && seg.endsWith('$')) {
          const formula = seg.slice(1, -1).trim()
          return <KatexFormula key={i} formula={formula} mode="inline" />
        }
        return (
          <span key={i} className="whitespace-pre-wrap">{seg}</span>
        )
      })}
    </>
  )
})