import { useChartContext } from './ChartContext'
import { CHART_COLORS, REFERENCE_MAP, STROKE, DASH, FONT } from '@/theme/physics'
import type { ChartReferenceVariant } from '@/theme/physics'

interface ChartTangentProps {
  point: { x: number; y: number }
  slope: number
  extent?: number
  label?: string
  variant?: ChartReferenceVariant
  /** 直接指定切线颜色（优先于 variant） */
  color?: string
  /** 切线线宽 */
  strokeWidth?: number
  /** 切线透明度 */
  lineOpacity?: number
  /** 切线虚线配置；不传则为实线 */
  strokeDasharray?: string
  /** 是否绘制切点 */
  showPoint?: boolean
  /** 切点半径 */
  pointRadius?: number
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
  color,
  strokeWidth = STROKE.tangent,
  lineOpacity = 0.7,
  strokeDasharray,
  showPoint = true,
  pointRadius,
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

  const lineColor = color ?? REFERENCE_MAP[variant]

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
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        opacity={lineOpacity}
      />

      {/* 切点 */}
      {showPoint && (
        <circle
          cx={toSvgX(point.x)}
          cy={toSvgY(point.y)}
          r={pointRadius ?? fontFn(FONT.small) * 0.3}
          fill={lineColor}
        />
      )}

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
