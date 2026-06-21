import { useChartContext } from './ChartContext'
import { CHART_COLORS, REFERENCE_MAP, STROKE, DASH, FONT } from '@/theme/physics'
import type { ChartReferenceVariant } from '@/theme/physics'

interface ChartTangentProps {
  point: { x: number; y: number }
  slope: number
  extent?: number
  label?: string
  variant?: ChartReferenceVariant
  showSecant?: boolean
  secantPoint?: { x: number; y: number }
  toSvgX?: (v: number) => number
  toSvgY?: (v: number) => number
  font?: (v: number) => number
}

export function ChartTangent({
  point,
  slope,
  extent = 1,
  label,
  variant = 'tangent',
  showSecant = false,
  secantPoint,
  toSvgX: toSvgXProp,
  toSvgY: toSvgYProp,
  font: fontProp,
}: ChartTangentProps) {
  const ctx = useChartContext()
  const toSvgX = toSvgXProp ?? ctx?.toSvgX
  const toSvgY = toSvgYProp ?? ctx?.toSvgY
  const fontFn = fontProp ?? ctx?.font

  if (!toSvgX || !toSvgY || !fontFn) return null

  const lineColor = REFERENCE_MAP[variant]

  const tanX1 = toSvgX(point.x - extent)
  const tanY1 = toSvgY(point.y - slope * extent)
  const tanX2 = toSvgX(point.x + extent)
  const tanY2 = toSvgY(point.y + slope * extent)

  return (
    <g>
      {/* 切线 */}
      <line
        x1={tanX1} y1={tanY1}
        x2={tanX2} y2={tanY2}
        stroke={lineColor}
        strokeWidth={STROKE.tangent}
        opacity={0.7}
      />

      {/* 切点 */}
      <circle
        cx={toSvgX(point.x)}
        cy={toSvgY(point.y)}
        r={fontFn(FONT.small) * 0.3}
        fill={lineColor}
      />

      {/* 标签 */}
      {label && (
        <text
          x={tanX2 + fontFn(FONT.small) * 0.4}
          y={tanY2 - fontFn(FONT.small) * 0.3}
          fontSize={fontFn(FONT.small)}
          fill={lineColor}
          fontWeight="bold"
        >
          {label}
        </text>
      )}

      {/* 割线 */}
      {showSecant && secantPoint && (
        <>
          <line
            x1={toSvgX(point.x)} y1={toSvgY(point.y)}
            x2={toSvgX(secantPoint.x)} y2={toSvgY(secantPoint.y)}
            stroke={CHART_COLORS.reference}
            strokeWidth={STROKE.chartRef}
            strokeDasharray={DASH.guide.join(' ')}
          />
        </>
      )}
    </g>
  )
}
