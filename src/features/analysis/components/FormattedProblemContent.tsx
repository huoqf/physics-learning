import React from 'react'
import { ContentWithKatex } from './ContentWithKatex'

interface Props {
  content: string
  className?: string
}

interface TableBlock {
  type: 'table'
  headers: string[]
  rows: string[][]
}

interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

type ContentBlock = TableBlock | ParagraphBlock

function parseContentBlocks(raw: string): ContentBlock[] {
  const lines = raw.split('\n')
  const blocks: ContentBlock[] = []
  let tableLines: string[] = []

  const flushTable = () => {
    if (tableLines.length === 0) return
    const parseRow = (line: string) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())

    const isSeparator = (line: string) => /^\|?\s*:?-+:?\s*(\|?\s*:?-+:?\s*)+\|?$/.test(line.trim())

    if (tableLines.length >= 2) {
      const headers = parseRow(tableLines[0])
      const rowLines = tableLines.slice(1).filter((l) => !isSeparator(l))
      const rows = rowLines.map(parseRow)
      blocks.push({ type: 'table', headers, rows })
    } else {
      for (const line of tableLines) {
        blocks.push({ type: 'paragraph', text: line })
      }
    }
    tableLines = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')
    if (isTableLine) {
      tableLines.push(trimmed)
    } else {
      flushTable()
      blocks.push({ type: 'paragraph', text: line })
    }
  }
  flushTable()

  return blocks
}

/**
 * 格式化渲染题目题干与解析文本（自动识别段落与 Markdown 实验数据表格）
 */
export const FormattedProblemContent: React.FC<Props> = ({ content, className = '' }) => {
  const blocks = React.useMemo(() => parseContentBlocks(content), [content])

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        if (block.type === 'table') {
          return (
            <div key={idx} className="overflow-x-auto my-3 max-w-full">
              <table className="min-w-full border-collapse border border-neutral-300 text-sm bg-white rounded-lg overflow-hidden shadow-xs">
                <thead>
                  <tr className="bg-neutral-100/90 border-b border-neutral-300">
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="border border-neutral-300 px-3 py-2 font-semibold text-neutral-800 text-center whitespace-nowrap"
                      >
                        <ContentWithKatex content={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-neutral-50/70' : 'bg-white'}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border border-neutral-300 px-3 py-1.5 text-neutral-700 text-center whitespace-nowrap"
                        >
                          <ContentWithKatex content={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (!block.text.trim()) {
          return <div key={idx} className="h-1" />
        }
        return (
          <p key={idx} className="mb-2 last:mb-0">
            <ContentWithKatex content={block.text} />
          </p>
        )
      })}
    </div>
  )
}
