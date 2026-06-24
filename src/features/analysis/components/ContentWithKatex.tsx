import React from 'react'
import { KatexFormula } from '@/components/UI/KatexFormula'

export const ContentWithKatex = React.memo(function ContentWithKatex({ content }: { content: string }) {
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