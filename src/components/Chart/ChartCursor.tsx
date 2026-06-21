import { useChartContext } from './ChartContext'
import { CHART_COLORS, REFERENCE_MAP, SERIES_MAP, STROKE, DASH, FONT } from '@/theme/physics'
import type { ChartReferenceVariant, ChartSeriesVariant } from '@/theme/physics'

interface ChartCursorPoint {
  y: number
  label: string
  series?: ChartSeriesVariant
}

interface ChartCursorProps {
  x: number
  dataPoints: ChartCursorPoint[]
  formatValue?: (v: number) => string
  crosshairVariant?: ChartReferenceVariant
  showLabels?: boolean
  toSvgX?: (v: number) => number
  toSvgY?: (v: number) => number
  plotOrigin?: { x: number; y: number }
  plotSize?: { width: number; height: number }
  font?: (v: number) => number
}

export function ChartCursor({
  x,
  dataPoints,
  formatValue = (v) => v.toFixed(2),
  crosshairVariant = 'default',
  showLabels = true,
  toSvgX: toSvgXProp,
  toSvgY: toSvgYProp,
  plotOrigin: plotOriginProp,
  plotSize: plotSizeProp,
  font: fontProp,
}: ChartCursorProps) {
  const ctx = useChartContext()
  const toSvgX = toSvgXProp ?? ctx?.toSvgX
  const toSvgY = toSvgYProp ?? ctx?.toSvgY
  const plotOrigin = plotOriginProp ?? ctx?.plotOrigin
  const plotSize = plotSizeProp ?? ctx?.plotSize
  const fontFn = fontProp ?? ctx?.font

  if (!toSvgX || !toSvgY || !plotOrigin || !plotSize || !fontFn) {
    return null
  }

  const cursorX = toSvgX(x)
  const lineColor = REFERENCE_MAP[crosshairVariant]

  return (
    <g>
      <line
        x1={cursorX} y1={plotOrigin.y}
        x2={cursorX} y2={plotOrigin.y + plotSize.height}
        stroke={lineColor}
        strokeWidth={STROKE.chartRef}
        strokeDasharray={DASH.tangent.join(' ')}
      />

      {dataPoints.map((pt, idx) => {
        const py = toSvgY(pt.y)
        const color = pt.series ? SERIES_MAP[pt.series] : CHART_COLORS.primary
        return (
          <g key={`cursor-${idx}`}>
            <circle cx={cursorX} cy={py} r={fontFn(FONT.small) * 0.4} fill={color} opacity={0.3} />
            <circle cx={cursorX} cy={py} r={fontFn(FONT.small) * 0.25} fill={color} stroke={CHART_COLORS.highlight} strokeWidth={1.5} />
            {showLabels && (
              <text
                x={cursorX + fontFn(FONT.small) * 0.6}
                y={py - fontFn(FONT.small) * 0.4}
                fontSize={fontFn(FONT.small)}
                fill={color}
                fontWeight="bold"
              >
                {pt.label}={formatValue(pt.y)}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
