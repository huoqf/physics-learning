import React, { createContext, useContext } from 'react'

export interface ChartTimeScrubValue {
  /** 将动画跳转到指定物理时刻并暂停定格 */
  scrubToTime: (t: number) => void
  /** 当前动画时间上限（秒） */
  maxTime: number
}

const ChartTimeScrubContext = createContext<ChartTimeScrubValue | null>(null)

export const ChartTimeScrubProvider: React.FC<{
  value: ChartTimeScrubValue
  children: React.ReactNode
}> = ({ value, children }) => (
  <ChartTimeScrubContext.Provider value={value}>
    {children}
  </ChartTimeScrubContext.Provider>
)

// eslint-disable-next-line react-refresh/only-export-components
export function useChartTimeScrub(): ChartTimeScrubValue | null {
  return useContext(ChartTimeScrubContext)
}
