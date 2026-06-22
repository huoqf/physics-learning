import { useChartContext } from './ChartContext'
import { PHYSICS_COLORS, REFERENCE_MAP, STROKE, DASH, FONT } from '@/theme/physics'
import type { ChartReferenceVariant } from '@/theme/physics'

interface ChartPoint {
  x: number
  y: number
}

export interface ChartSecantProps {
  /** 起点 P（物理坐标） */
  point: ChartPoint
  /** 终点 Q（物理坐标） */
  secantPoint: ChartPoint
  /** 割线标签，通常为 k_割 / ā / v̄ */
  label?: string
  /** 参考线颜色变体；未传 color 时生效 */
  variant?: ChartReferenceVariant
  /** 直接指定割线颜色（优先于 variant） */
  color?: string
  /** 斜率三角形颜色 */
  triangleColor?: string
  /** 是否绘制斜率三角形（Δx/Δt 或 Δv/Δt） */
  showTriangle?: boolean
  /** 是否绘制端点小圆 */
  showEndpoints?: boolean
  /** 水平边标签，如 Δt */
  dxLabel?: string
  /** 竖直边标签，如 Δx / Δv */
  dyLabel?: string
  strokeWidth?: number
  strokeDasharray?: string
  lineOpacity?: number
  triangleOpacity?: number
  endpointRadius?: number
  toSvgX?: (v: number) => number
  toSvgY?: (v: number) => number
  font?: (v: number) => number
}

/**
 * ChartSecant — 割线 + 斜率直角三角形插件。
 *
 * 与 ChartTangent 平行设计：默认从 ChartContext 获取坐标变换；
 * 对尚未完全迁移到 BasePhysicsChart 的 legacy SVG，也可显式传入
 * toSvgX / toSvgY / font 复用同一插件。
 */
export function ChartSecant({
  point,
  secantPoint,
  label,
  variant = 'default',
  color,
  triangleColor = PHYSICS_COLORS.deltaHighlight,
  showTriangle = true,
  showEndpoints = false,
  dxLabel,
  dyLabel,
  strokeWidth = STROKE.chartRef,
  strokeDasharray = DASH.guide.join(' '),
  lineOpacity = 0.85,
  triangleOpacity = 0.12,
  endpointRadius,
  toSvgX: toSvgXProp,
  toSvgY: toSvgYProp,
  font: fontProp,
}: ChartSecantProps) {
  const ctx = useChartContext()
  const toSvgX = toSvgXProp ?? ctx?.toSvgX
  const toSvgY = toSvgYProp ?? ctx?.toSvgY
  const fontFn = fontProp ?? ctx?.font

  if (!toSvgX || !toSvgY || !fontFn) return null

  const x0 = toSvgX(point.x)
  const y0 = toSvgY(point.y)
  const x1 = toSvgX(secantPoint.x)
  const y1 = toSvgY(secantPoint.y)

  if (![x0, y0, x1, y1].every(Number.isFinite)) return null

  const lineColor = color ?? REFERENCE_MAP[variant]
  const radius = endpointRadius ?? fontFn(FONT.small) * 0.25
  const midX = (x0 + x1) / 2
  const midY = (y0 + y1) / 2
  const textSize = fontFn(FONT.small)
  const labelDy = y1 >= y0 ? textSize * 1.1 : -textSize * 0.6

  return (
    <g>
      {showTriangle && (
        <g>
          <polygon
            points={`${x0},${y0} ${x1},${y0} ${x1},${y1}`}
            fill={triangleColor}
            opacity={triangleOpacity}
          />
          <line
            x1={x0} y1={y0}
            x2={x1} y2={y0}
            stroke={triangleColor}
            strokeWidth={strokeWidth * 0.75}
            opacity={0.7}
          />
          <line
            x1={x1} y1={y0}
            x2={x1} y2={y1}
            stroke={triangleColor}
            strokeWidth={strokeWidth * 0.75}
            opacity={0.7}
          />
          {dxLabel && Math.abs(x1 - x0) > textSize * 1.2 && (
            <text
              x={(x0 + x1) / 2}
              y={y0 + textSize * 1.15}
              fontSize={textSize}
              fill={triangleColor}
              textAnchor="middle"
              fontWeight="bold"
            >
              {dxLabel}
            </text>
          )}
          {dyLabel && Math.abs(y1 - y0) > textSize * 1.2 && (
            <text
              x={x1 + textSize * 0.45}
              y={(y0 + y1) / 2}
              fontSize={textSize}
              fill={triangleColor}
              dominantBaseline="middle"
              fontWeight="bold"
            >
              {dyLabel}
            </text>
          )}
        </g>
      )}

      <line
        x1={x0} y1={y0}
        x2={x1} y2={y1}
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        opacity={lineOpacity}
      />

      {showEndpoints && (
        <g>
          <circle cx={x0} cy={y0} r={radius} fill={lineColor} opacity={0.9} />
          <circle cx={x1} cy={y1} r={radius} fill={lineColor} opacity={0.9} />
        </g>
      )}

      {label && (
        <text
          x={midX + textSize * 0.45}
          y={midY + labelDy}
          fontSize={textSize}
          fill={lineColor}
          fontWeight="bold"
        >
          {label}
        </text>
      )}
    </g>
  )
}
