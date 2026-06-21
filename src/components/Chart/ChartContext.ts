import { createContext, useContext } from 'react'

export interface ChartContextValue {
  toSvgX: (physX: number) => number
  toSvgY: (physY: number) => number
  plotOrigin: { x: number; y: number }
  plotSize: { width: number; height: number }
  font: (v: number) => number
  px: (v: number) => number
}

export const ChartContext = createContext<ChartContextValue | null>(null)

export function useChartContext(): ChartContextValue | null {
  return useContext(ChartContext)
}
