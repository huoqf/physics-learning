/**
 * ScrollDataTable — 频闪数据表（HTML 版）
 *
 * 全量渲染所有行，数据超出时 CSS overflow 滚动，支持鼠标悬停三屏联动。
 *
 * @example
 * ```tsx
 * <ScrollDataTable
 *   title="频闪数据记录表"
 *   data={flashPoints}
 *   columns={[
 *     { key: 't', label: 't(s)', width: 0.25, format: (r) => r.time.toFixed(1) },
 *     { key: 'v', label: 'v(m/s)', width: 0.25, format: (r) => r.velocity.toFixed(2) },
 *   ]}
 *   extra={<p>理论验证: aT² = ...</p>}
 * />
 * ```
 */
import { useEffect, useRef } from 'react'

export interface ScrollDataTableColumn<T> {
  key: string
  label: string
  /** 列宽（0-1，百分比） */
  width: number
  format: (row: T, index: number, allRows: T[]) => string
  /** 当前行高亮色（Tailwind 类，默认 text-blue-700） */
  currentColor?: string
  /** 普通行色（Tailwind 类，默认 text-neutral-600） */
  normalColor?: string
}

export interface ScrollDataTableProps<T> {
  title?: string
  data: T[]
  columns: ScrollDataTableColumn<T>[]
  /** 额外区域（如逐差法验证） */
  extra?: React.ReactNode
  hoveredIndex?: number | null
  onHover?: (index: number | null) => void
}

export function ScrollDataTable<T>({
  title,
  data,
  columns,
  extra,
  hoveredIndex,
  onHover,
}: ScrollDataTableProps<T>) {
  const currentRowRef = useRef<HTMLTableRowElement>(null)
  const highlightIndex = data.length - 1

  // 新数据到达时自动滚动到当前行
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [data.length])

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {title && (
        <p className="text-xs font-bold text-neutral-700 mb-2 shrink-0">{title}</p>
      )}

      {/* 固定表头 */}
      <table className="w-full text-xs table-fixed shrink-0">
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: `${col.width * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-neutral-300">
            {columns.map((col) => (
              <th key={col.key}
                className="py-1 px-0.5 text-left font-semibold text-neutral-600 overflow-hidden text-ellipsis whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
      </table>

      {/* 可滚动数据区 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={{ width: `${col.width * 100}%` }} />
            ))}
          </colgroup>
          <tbody>
            {data.map((row, globalIndex) => {
              const isCurrent = globalIndex === highlightIndex
              const isHovered = hoveredIndex === globalIndex

              return (
                <tr
                  key={globalIndex}
                  ref={isCurrent ? currentRowRef : undefined}
                  onMouseEnter={() => onHover?.(globalIndex)}
                  onMouseLeave={() => onHover?.(null)}
                  className={`border-b border-neutral-100 transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-amber-50'
                      : isCurrent
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  {columns.map((col) => {
                    const value = col.format(row, globalIndex, data)
                    const color = isCurrent
                      ? (col.currentColor ?? 'text-blue-700')
                      : (col.normalColor ?? 'text-neutral-600')

                    return (
                      <td
                        key={col.key}
                        className={`py-1 px-0.5 font-mono overflow-hidden text-ellipsis whitespace-nowrap ${
                          isHovered && col.key === 'dx' ? 'text-amber-600 font-bold' : ''
                        } ${isCurrent ? `font-bold ${color}` : color}`}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {extra && (
        <div className="shrink-0 pt-2 border-t border-neutral-100">
          {extra}
        </div>
      )}
    </div>
  )
}