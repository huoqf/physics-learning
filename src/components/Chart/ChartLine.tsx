import { useMemo } from 'react'
import { useChartContext } from './ChartContext'
import { SERIES_MAP } from '@/theme/physics'
import type { ChartSeriesVariant } from '@/theme/physics'

interface ChartLineProps {
  /** 数据点序列（物理坐标） */
  points: { x: number; y: number }[]
  /** X 轴截断范围 [min, max]，超出部分不绘制 */
  xRange?: [number, number]
  /** 曲线颜色变体 */
  series?: ChartSeriesVariant
  /** 自定义颜色（覆盖 series） */
  color?: string
  /** 线条粗细，默认 2 */
  strokeWidth?: number
  /** 虚线样式，不传为实线 */
  dash?: number[]
  /** 不透明度，默认 1 */
  opacity?: number
}

/**
 * ChartLine 图表折线插件
 *
 * 在 BasePhysicsChart 内部渲染一条折线，是最基础的图表插件。
 * 支持按 xRange 截断、颜色变体、虚线等。
 */
export function ChartLine({
  points,
  xRange,
  series = 'primary',
  color,
  strokeWidth = 2,
  dash,
  opacity = 1,
}: ChartLineProps) {
  const ctx = useChartContext()
  const toSvgX = ctx?.toSvgX
  const toSvgY = ctx?.toSvgY

  const lineColor = color ?? SERIES_MAP[series]

  const pathD = useMemo(() => {
    if (!toSvgX || !toSvgY || points.length < 2) return ''

    const filtered = xRange
      ? points.filter((p) => p.x >= xRange[0] - 1e-9 && p.x <= xRange[1] + 1e-9)
      : points

    if (filtered.length < 2) return ''

    return (
      'M ' +
      filtered.map((p) => `${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`).join(' L ')
    )
  }, [points, xRange, toSvgX, toSvgY])

  if (!ctx || !pathD) return null

  return (
    <path
      d={pathD}
      fill="none"
      stroke={lineColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash?.join(',')}
      opacity={opacity}
    />
  )
}
