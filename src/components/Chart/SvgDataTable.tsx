/**
 * SvgDataTable — SVG 内嵌频闪数据表
 *
 * 用于在 Canvas/SVG 内部渲染数据表格（数据值 3–6 字符，不会溢出列宽）。
 *
 * @example
 * ```tsx
 * <SvgDataTable
 *   x={dataX} y={vtChartTop}
 *   width={dataWidth}
 *   title="频闪数据记录表"
 *   data={flashData}
 *   columns={[
 *     { key: 't', label: 't(s)', width: 0.15, format: (r) => r.t.toFixed(1) },
 *     { key: 'v', label: 'v(m/s)', width: 0.25, format: (r) => r.v.toFixed(2) },
 *     { key: 'y', label: 'y(m)', width: 0.25, format: (r) => r.y.toFixed(3) },
 *     { key: 'dy', label: 'Δy(m)', width: 0.23,
 *       format: (r, i, all) => i > 0 ? (r.y - all[i - 1].y).toFixed(3) : '-' },
 *   ]}
 * />
 * ```
 */
import {
  CHART_COLORS,
  FONT,
  STROKE,
} from '@/theme/physics'
import { getVisibleRows } from '@/utils/scrollingTable'

const BASE_TITLE_H = 18
const BASE_HEADER_H = 18
const BASE_ROW_H = 16
const BASE_GAP = 4

export interface SvgDataTableColumn<T> {
  key: string
  label: string
  width: number
  format: (row: T, index: number, allRows: T[]) => string
}

export interface SvgDataTableProps<T> {
  x: number
  y: number
  width: number
  title?: string
  data: T[]
  columns: SvgDataTableColumn<T>[]
  /** 最大可见行数（默认根据高度自动计算） */
  maxRows?: number
  /** 行高（默认 16px） */
  rowHeight?: number
  /** 缩放因子，必须传入 vp.scale */
  scale?: number
}

export function SvgDataTable<T>({
  x, y, width,
  title,
  data,
  columns,
  maxRows,
  rowHeight,
  scale = 1,
}: SvgDataTableProps<T>) {
  const titleH = BASE_TITLE_H * scale
  const headerH = BASE_HEADER_H * scale
  const rowH = (rowHeight ?? BASE_ROW_H) * scale
  const gap = BASE_GAP * scale

  const headerTop = titleH + (title ? 6 * scale : 0)
  const headerLineY = headerTop + headerH + 2 * scale
  const maxVisible = maxRows ?? Math.max(1, data.length)
  const { visibleRows, highlightIndex } = getVisibleRows(data, maxVisible)

  // 动态内容高度：无空白的紧凑背景
  const actualH = headerLineY + rowH + visibleRows.length * rowH + gap

  /** 累计列偏移，返回 [colX, colWidth] */
  function getColLayout(colIndex: number): [number, number] {
    let cx = 0
    for (let i = 0; i < colIndex; i++) cx += columns[i].width
    return [cx * width, columns[colIndex].width * width]
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 表格背景：动态高度，不残留空白 */}
      <rect width={width} height={actualH}
        fill="white" stroke={CHART_COLORS.gridLine} rx={4} />

      {/* 标题 */}
      {title && (
        <text x={width / 2} y={titleH} fontSize={FONT.axis}
          fill={CHART_COLORS.titleText} textAnchor="middle" fontWeight="bold">
          {title}
        </text>
      )}

      {/* 表头背景 */}
      <rect y={headerTop} width={width} height={headerH}
        fill={CHART_COLORS.gridLine} opacity={0.15} />

      {/* 表头分隔线 */}
      <line x1={0} y1={headerLineY} x2={width} y2={headerLineY}
        stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.chartMain} />

      {/* 列标题 */}
      {columns.map((col, ci) => {
        const [colX, colW] = getColLayout(ci)
        return (
          <text key={col.key} x={colX + colW / 2} y={headerTop + headerH - 5 * scale}
            fontSize={FONT.small} fill={CHART_COLORS.labelText}
            textAnchor="middle" fontWeight="bold">
            {col.label}
          </text>
        )
      })}

      {/* 数据行 */}
      {visibleRows.map((row, ri) => {
        // 首行从 headerLineY + rowH 开始，分隔线在行末尾
        const rowY = headerLineY + rowH + ri * rowH
        const isCurrent = ri === highlightIndex

        return (
          <g key={`row-${ri}`}>
            {/* 当前行高亮背景：与行等宽等高 */}
            {isCurrent && (
              <rect x={0} y={rowY - rowH + gap} width={width} height={rowH}
                fill={CHART_COLORS.gridLine} opacity={0.25} />
            )}

            {columns.map((col, ci) => {
              const [colX, colW] = getColLayout(ci)
              const value = col.format(row, data.length - visibleRows.length + ri, data)

              return (
                <text key={col.key}
                  x={colX + colW / 2} y={rowY}
                  fontSize={FONT.small} fontFamily="monospace"
                  textAnchor="middle"
                  fill={CHART_COLORS.labelText}
                  fontWeight={isCurrent ? 'bold' : 'normal'}>
                  {value}
                </text>
              )
            })}

            {/* 行分隔线：在行底部 */}
            <line x1={0} y1={rowY + gap} x2={width} y2={rowY + gap}
              stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.chartRef} />
          </g>
        )
      })}
    </g>
  )
}