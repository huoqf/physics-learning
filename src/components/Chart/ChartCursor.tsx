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

/**
 * 各 series 的固定垂直偏移乘数（正值 = 向下偏移，负值 = 向上偏移）。
 * 不随数值排序变化，避免动画帧间翻转抖动。
 */
const SERIES_VSHIFT_MAP: Record<string, number> = {
  primary: 0,
  warm: 1.4,
  success: -1.4,
  secondary: 0.7,
  accent: -0.7,
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
  const smallFont = fontFn(FONT.small)

  // ── 左边界渐进偏移：游标靠近左边缘时，标签向右推移避免与 Y 轴刻度重叠 ──
  const edgeZone = plotSize.width * 0.1
  const maxEdgeOffset = smallFont * 2.5
  const distFromLeft = cursorX - plotOrigin.x
  const edgeOffset = distFromLeft < edgeZone
    ? maxEdgeOffset * (1 - distFromLeft / edgeZone)
    : 0

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
        // 固定方向垂直偏移：按 series 确定，不随数值变化
        const vShift = (SERIES_VSHIFT_MAP[pt.series ?? ''] ?? 0) * smallFont
        return (
          <g key={`cursor-${idx}`}>
            <circle cx={cursorX} cy={py} r={smallFont * 0.4} fill={color} opacity={0.3} />
            <circle cx={cursorX} cy={py} r={smallFont * 0.25} fill={color} stroke={CHART_COLORS.highlight} strokeWidth={1.5} />
            {showLabels && (
              <text
                x={cursorX + smallFont * 0.6 + edgeOffset}
                y={py + vShift}
                fontSize={smallFont}
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
