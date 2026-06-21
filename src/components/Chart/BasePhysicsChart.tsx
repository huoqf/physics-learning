import { useMemo, type ReactNode } from 'react'
import { ChartContext, type ChartContextValue } from './ChartContext'
import { CHART_COLORS, CHART_LAYOUT, FONT, STROKE, DASH, OPACITY } from '@/theme/physics'
import { useCanvasSize } from '@/utils'

export interface BasePhysicsChartProps {
  xDomain: [number, number]
  yDomain: [number, number]
  xLabel: string
  yLabel: string
  title?: string
  variant?: 'standard' | 'mini'
  initialSize?: { width: number; height: number }
  gridCount?: { x?: number; y?: number }
  formatX?: (v: number) => string
  formatY?: (v: number) => string
  /** y 轴基准线位置（物理坐标），默认为 yDomain[0]。设为 0 可实现双向 Y 轴 */
  yBaseline?: number
  children?: ReactNode
  className?: string
}

export function BasePhysicsChart({
  xDomain,
  yDomain,
  xLabel,
  yLabel,
  title,
  variant = 'standard',
  initialSize,
  gridCount,
  formatX,
  formatY,
  yBaseline,
  children,
  className = '',
}: BasePhysicsChartProps) {
  const isMini = variant === 'mini'
  const initW = initialSize?.width ?? (isMini ? CHART_LAYOUT.miniWidth : CHART_LAYOUT.defaultWidth)
  const initH = initialSize?.height ?? (isMini ? CHART_LAYOUT.miniHeight : CHART_LAYOUT.defaultHeight)

  const [containerRef, size] = useCanvasSize({ width: initW, height: initH })
  const { width, height, px, font } = size

  const margin = {
    left:   px(isMini ? CHART_LAYOUT.miniMarginLeft   : CHART_LAYOUT.marginLeft),
    right:  px(isMini ? CHART_LAYOUT.miniMarginRight  : CHART_LAYOUT.marginRight),
    top:    px(isMini ? CHART_LAYOUT.miniMarginTop    : CHART_LAYOUT.marginTop),
    bottom: px(isMini ? CHART_LAYOUT.miniMarginBottom : CHART_LAYOUT.marginBottom),
  }

  const plotW = Math.max(10, width - margin.left - margin.right)
  const plotH = Math.max(10, height - margin.top - margin.bottom)

  const xRange = Math.max(Number.EPSILON, xDomain[1] - xDomain[0])
  const yRange = Math.max(Number.EPSILON, yDomain[1] - yDomain[0])

  const xScale = plotW / xRange
  const yScale = plotH / yRange

  const toSvgX = (physX: number) => margin.left + (physX - xDomain[0]) * xScale

  const baseline = yBaseline ?? yDomain[0]
  const baselineY = margin.top + plotH - (baseline - yDomain[0]) * yScale
  const toSvgY = (physY: number) => baselineY - (physY - baseline) * yScale

  const adaptiveGrid = useMemo(() => {
    const baseX = gridCount?.x ?? (isMini ? CHART_LAYOUT.miniGridCountX : CHART_LAYOUT.gridCountX)
    const baseY = gridCount?.y ?? (isMini ? CHART_LAYOUT.miniGridCountY : CHART_LAYOUT.gridCountY)
    const tiny = plotW < px(CHART_LAYOUT.minWidth) || plotH < px(CHART_LAYOUT.minHeight)
    const compact = plotW < px(CHART_LAYOUT.compactWidth) || plotH < px(CHART_LAYOUT.compactHeight)
    if (tiny) return { x: CHART_LAYOUT.minGridX, y: CHART_LAYOUT.minGridY }
    if (compact) return { x: CHART_LAYOUT.compactGridX, y: CHART_LAYOUT.compactGridY }
    return { x: baseX, y: baseY }
  }, [gridCount, plotW, plotH, isMini])

  const tickFormatX = formatX ?? ((v: number) => v.toFixed(1))
  const tickFormatY = formatY ?? ((v: number) => v.toFixed(1))

  const ctx: ChartContextValue = useMemo(() => ({
    toSvgX, toSvgY,
    plotOrigin: { x: margin.left, y: margin.top },
    plotSize: { width: plotW, height: plotH },
    font, px,
  }), [toSvgX, toSvgY, margin.left, margin.top, plotW, plotH, font, px])

  return (
    <ChartContext.Provider value={ctx}>
      <div ref={containerRef} className={`w-full h-full min-h-0 ${className}`}>
        <svg width={width} height={height} className="w-full h-full select-none">
          {/* 标题 */}
          {title && (
            <text
              x={margin.left}
              y={margin.top - px(isMini ? 5 : 7)}
              fontSize={font(isMini ? FONT.small : FONT.axis)}
              fill={CHART_COLORS.titleText}
              fontWeight="bold"
            >
              {title}
            </text>
          )}

          {/* Y 轴网格线 */}
          {Array.from({ length: adaptiveGrid.y + 1 }, (_, idx) => {
            const gridY = margin.top + (plotH * idx) / adaptiveGrid.y
            return (
              <line
                key={`grid-y-${idx}`}
                x1={margin.left} y1={gridY}
                x2={margin.left + plotW} y2={gridY}
                stroke={CHART_COLORS.gridLine}
                strokeWidth={STROKE.grid}
                strokeDasharray={DASH.guide.join(',')}
                opacity={OPACITY.gridChart}
              />
            )
          })}

          {/* X 轴网格线 */}
          {Array.from({ length: adaptiveGrid.x + 1 }, (_, idx) => {
            const gridX = margin.left + (plotW * idx) / adaptiveGrid.x
            return (
              <line
                key={`grid-x-${idx}`}
                x1={gridX} y1={margin.top}
                x2={gridX} y2={margin.top + plotH}
                stroke={CHART_COLORS.gridLine}
                strokeWidth={STROKE.grid}
                strokeDasharray={DASH.guide.join(',')}
                opacity={OPACITY.gridChart}
              />
            )
          })}

          {/* 坐标轴线 */}
          <line
            x1={margin.left} y1={baselineY}
            x2={margin.left + plotW} y2={baselineY}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold}
          />
          <line
            x1={margin.left} y1={margin.top}
            x2={margin.left} y2={margin.top + plotH}
            stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold}
          />

          {/* 零刻度虚线（仅当 baseline 不在绘图区底部时显示） */}
          {baseline !== yDomain[0] && (
            <line
              x1={margin.left} y1={toSvgY(0)}
              x2={margin.left + plotW} y2={toSvgY(0)}
              stroke={CHART_COLORS.zeroline}
              strokeWidth={STROKE.reference}
              strokeDasharray={DASH.reference.join(',')}
              opacity={0.4}
            />
          )}

          {/* X 轴刻度 */}
          {Array.from({ length: adaptiveGrid.x + 1 }, (_, i) => {
            const val = xDomain[0] + (xRange * i) / adaptiveGrid.x
            const x = toSvgX(val)
            return (
              <g key={`xval-${i}`}>
                <line
                  x1={x} y1={margin.top + plotH}
                  x2={x} y2={margin.top + px(isMini ? 3 : 4)}
                  stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick}
                />
                <text
                  x={x} y={margin.top + plotH + font(isMini ? FONT.small : FONT.axis) + px(3)}
                  fontSize={font(isMini ? FONT.small : FONT.axis)}
                  fill={CHART_COLORS.tickLabel}
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {tickFormatX(val)}
                </text>
              </g>
            )
          })}

          {/* Y 轴刻度 */}
          {Array.from({ length: adaptiveGrid.y + 1 }, (_, i) => {
            const val = yDomain[0] + (yRange * i) / adaptiveGrid.y
            const y = toSvgY(val)
            return (
              <g key={`yval-${i}`}>
                <line
                  x1={margin.left - px(isMini ? 2 : 3)} y1={y}
                  x2={margin.left} y2={y}
                  stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick}
                />
                <text
                  x={margin.left - px(isMini ? 4 : 5)}
                  y={y + font(isMini ? FONT.small : FONT.axis) * 0.35}
                  fontSize={font(isMini ? FONT.small : FONT.axis)}
                  fill={CHART_COLORS.tickLabel}
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {tickFormatY(val)}
                </text>
              </g>
            )
          })}

          {/* X 轴标签 */}
          <text
            x={margin.left + plotW / 2}
            y={margin.top + plotH + font(isMini ? FONT.small : FONT.axis) + px(isMini ? 8 : 12)}
            fontSize={font(isMini ? FONT.small : FONT.axis)}
            fill={CHART_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
          >
            {xLabel}
          </text>

          {/* Y 轴标签 */}
          <text
            x={margin.left - font(isMini ? 12 : 18)}
            y={margin.top + plotH / 2}
            fontSize={font(isMini ? FONT.small : FONT.axis)}
            fill={CHART_COLORS.labelText}
            textAnchor="middle"
            fontWeight="bold"
            transform={`rotate(-90, ${margin.left - font(isMini ? 12 : 18)}, ${margin.top + plotH / 2})`}
          >
            {yLabel}
          </text>

          {/* 插槽内容 */}
          {children}
        </svg>
      </div>
    </ChartContext.Provider>
  )
}
