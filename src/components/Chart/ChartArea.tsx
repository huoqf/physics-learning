import { useMemo } from 'react'
import { useChartContext } from './ChartContext'
import { AREA_FILL_MAP, AREA_INTENSITY_MAP } from '@/theme/physics'
import type { ChartAreaVariant, ChartAreaIntensity } from '@/theme/physics'

interface ChartAreaProps {
  points: { x: number; y: number }[]
  xRange?: [number, number]
  baseline?: number
  variant?: ChartAreaVariant
  intensity?: ChartAreaIntensity
  stroke?: string
  strokeWidth?: number
}

export function ChartArea({
  points,
  xRange,
  baseline = 0,
  variant = 'default',
  intensity = 'normal',
  stroke,
  strokeWidth = 0.5,
}: ChartAreaProps) {
  const ctx = useChartContext()
  if (!ctx) return null
  const { toSvgX, toSvgY } = ctx

  const fillColor = AREA_FILL_MAP[variant]
  const fillOpacity = AREA_INTENSITY_MAP[intensity]

  const pathD = useMemo(() => {
    if (points.length < 2) return ''

    const filtered = xRange
      ? points.filter((p) => p.x >= xRange[0] - 1e-9 && p.x <= xRange[1] + 1e-9)
      : points

    if (filtered.length < 2) return ''

    let d = `M ${toSvgX(filtered[0].x).toFixed(2)},${toSvgY(baseline).toFixed(2)}`
    for (const p of filtered) {
      d += ` L ${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`
    }
    d += ` L ${toSvgX(filtered[filtered.length - 1].x).toFixed(2)},${toSvgY(baseline).toFixed(2)} Z`
    return d
  }, [points, xRange, baseline, toSvgX, toSvgY])

  if (!pathD) return null

  return (
    <path
      d={pathD}
      fill={fillColor}
      fillOpacity={fillOpacity}
      stroke={stroke ?? fillColor}
      strokeWidth={strokeWidth}
    />
  )
}
