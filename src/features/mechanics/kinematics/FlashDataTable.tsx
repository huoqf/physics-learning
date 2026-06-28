import { useCanvasSize } from '@/utils'
import { useMemo } from 'react'

/**
 * 频闪数据表 (支持鼠标悬停三屏联动)
 */
export function FlashDataTable({
  flashPoints, a, T, hoveredFlashIdx, setHoveredFlashIdx,
}: {
  flashPoints: { time: number; velocity: number; displacement: number }[]
  a: number; T: number
  hoveredFlashIdx: number | null
  setHoveredFlashIdx: (idx: number | null) => void
}) {
  const [containerRef, canvasSize] = useCanvasSize({ width: 400, height: 300 })
  const { font } = canvasSize
  const rows = flashPoints.slice(-8)
  const lastIndex = flashPoints.length - 1

  const deltaValues = useMemo(() => {
    const deltas: number[] = []
    for (let i = 1; i < flashPoints.length; i++) {
      deltas.push(flashPoints[i].displacement - flashPoints[i - 1].displacement)
    }
    return deltas
  }, [flashPoints])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col p-3 overflow-auto">
      <p className="text-xs font-bold text-neutral-700 mb-2">频闪数据记录表</p>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="py-1 px-0.5 text-left font-semibold text-neutral-600">t(s)</th>
            <th className="py-1 px-0.5 text-right font-semibold text-neutral-600">v(m/s)</th>
            <th className="py-1 px-0.5 text-right font-semibold text-neutral-600">x(m)</th>
            <th className="py-1 px-0.5 text-right font-semibold text-neutral-600">Δx_k(m)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const globalIndex = flashPoints.length - rows.length + i
            const isCurrent = globalIndex === lastIndex
            const isHovered = hoveredFlashIdx === globalIndex
            const dx = deltaValues[globalIndex]
            return (
              <tr
                key={i}
                onMouseEnter={() => globalIndex > 0 && setHoveredFlashIdx(globalIndex)}
                onMouseLeave={() => setHoveredFlashIdx(null)}
                className={`border-b border-neutral-100 transition-all cursor-pointer ${
                  isHovered ? 'bg-amber-50' : (isCurrent ? 'bg-blue-50' : 'hover:bg-slate-50')
                }`}
              >
                <td className={`py-1 px-0.5 font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.time.toFixed(1)}</td>
                <td className={`py-1 px-0.5 text-right font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.velocity.toFixed(2)}</td>
                <td className={`py-1 px-0.5 text-right font-mono ${isCurrent ? 'font-bold text-blue-700' : 'text-neutral-600'}`}>{row.displacement.toFixed(2)}</td>
                <td className={`py-1 px-0.5 text-right font-mono font-bold ${isHovered ? 'text-amber-600' : 'text-neutral-500'}`}>
                  {dx !== undefined ? dx.toFixed(2) : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* 逐差法验证 */}
      {deltaValues.length >= 2 && (
        <div className="mt-auto pt-2 border-t border-neutral-100 font-semibold">
          <p style={{ fontSize: font(9) }} className="text-neutral-400 mb-0.5">理论计算验证</p>
          <p className="text-xs font-mono text-neutral-700">
            相邻位移差 aT² = <span className="font-bold text-red-600">{(a * T * T).toFixed(3)}</span> m
          </p>
        </div>
      )}
    </div>
  )
}