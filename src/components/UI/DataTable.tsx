import React from 'react'
import { CHART_COLORS } from '@/theme/physics'

export interface DataRecord {
  [key: string]: number | string
}

interface ColumnDef {
  key: string
  label: string
  unit?: string
  highlight?: boolean
}

interface DataTableProps {
  columns: ColumnDef[]
  records: DataRecord[]
  maxRows?: number
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  records,
  maxRows = 8,
}) => {
  const displayRecords = records.slice(0, maxRows)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-neutral-100">
            <th className="p-1.5 text-left font-semibold text-neutral-700 border border-neutral-200 w-8">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className="p-1.5 text-left font-semibold text-neutral-700 border border-neutral-200 whitespace-nowrap"
              >
                {col.label}
                {col.unit && (
                  <span className="ml-0.5 text-neutral-500 font-normal">
                    ({col.unit})
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRecords.map((record, index) => (
            <tr
              key={index}
              className="hover:bg-neutral-50 transition-colors"
            >
              <td className="p-1.5 text-neutral-500 border border-neutral-200 font-medium text-center">
                {index + 1}
              </td>
              {columns.map((col) => {
                const value = record[col.key]
                const isNum = typeof value === 'number'
                return (
                  <td
                    key={col.key}
                    className="p-1.5 font-mono border border-neutral-200"
                    style={{
                      color: col.highlight
                        ? CHART_COLORS.primary
                        : undefined,
                      fontWeight: col.highlight ? 600 : 400,
                    }}
                  >
                    {isNum ? (value as number).toFixed(2) : value}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > maxRows && (
        <p className="text-xs text-neutral-400 mt-1 text-right">
          显示前 {maxRows} 行，共 {records.length} 行
        </p>
      )}
    </div>
  )
}

export default DataTable
