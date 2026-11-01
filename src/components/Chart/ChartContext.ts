import { createContext, useContext } from 'react'

export interface ChartContextValue {
  toSvgX: (physX: number) => number
  toSvgY: (physY: number) => number
  toSvgY2?: (physY2: number) => number
  plotOrigin: { x: number; y: number }
  plotSize: { width: number; height: number }
  font: (v: number) => number
  px: (v: number) => number
  /**
   * 绘图区下方「标注行」的基线 y（第 `row` 行，从 0 开始）。
   *
   * 刻度行下面原本只有一行 X 轴标题，参考线/特殊点标注无处可放——它们会被挤进
   * 刻度行，与同位置的刻度文字必然撞在一起（`anim-inclined-plane` 的
   * `θc = 16.7°` 压住刻度 `18.0` 就是这么来的）。父图表按 `extraBottomRows`
   * 预留行数后，子组件用这个函数拿到"第几行该画在哪个 y"。
   */
  annotationY?: (row: number) => number
}

export const ChartContext = createContext<ChartContextValue | null>(null)

export function useChartContext(): ChartContextValue | null {
  return useContext(ChartContext)
}
