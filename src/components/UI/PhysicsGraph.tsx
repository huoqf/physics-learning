import React, { useMemo } from 'react'
import { CHART_COLORS } from '@/theme/physics'

interface DataPoint {
  x: number
  y: number
}

interface CurveData {
  label: string
  data: DataPoint[]
  color: string
  strokeWidth?: number
}

export interface AreaFillConfig {
  curveIndex: number
  color: string
  opacity?: number
  toY?: number
}

interface PhysicsGraphProps {
  curves: CurveData[]
  xLabel?: string
  yLabel?: string
  width?: number
  height?: number
  padding?: number
  showGrid?: boolean
  xDomain?: [number, number]
  yDomain?: [number, number]
  currentTime?: number
  areaFill?: AreaFillConfig
}

export const PhysicsGraph: React.FC<PhysicsGraphProps> = ({
  curves,
  xLabel = 'x',
  yLabel = 'y',
  width = 400,
  height = 300,
  padding = 40,
  showGrid = true,
  xDomain,
  yDomain,
  currentTime,
  areaFill,
}) => {
  const graphWidth = width - 2 * padding
  const graphHeight = height - 2 * padding

  const { xRange, yRange, xTicks, yTicks, scaledCurves } = useMemo(() => {
    let minX = xDomain ? xDomain[0] : Infinity
    let maxX = xDomain ? xDomain[1] : -Infinity
    let minY = yDomain ? yDomain[0] : Infinity
    let maxY = yDomain ? yDomain[1] : -Infinity

    curves.forEach((curve) => {
      curve.data.forEach((point) => {
        minX = Math.min(minX, point.x)
        maxX = Math.max(maxX, point.x)
        minY = Math.min(minY, point.y)
        maxY = Math.max(maxY, point.y)
      })
    })

    const xPadding = (maxX - minX) * 0.1 || 1
    const yPadding = (maxY - minY) * 0.1 || 1
    minX -= xPadding
    maxX += xPadding
    minY = Math.min(0, minY - yPadding)
    maxY += yPadding

    const xScale = graphWidth / (maxX - minX)
    const yScale = graphHeight / (maxY - minY)

    const xTickCount = 5
    const xTickStep = (maxX - minX) / xTickCount
    const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) =>
      parseFloat((minX + i * xTickStep).toFixed(2))
    )

    const yTickCount = 5
    const yTickStep = (maxY - minY) / yTickCount
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
      parseFloat((minY + i * yTickStep).toFixed(2))
    )

    const scaledCurves = curves.map((curve) => ({
      ...curve,
      points: curve.data.map((point) => ({
        x: padding + (point.x - minX) * xScale,
        y: padding + graphHeight - (point.y - minY) * yScale,
      })),
    }))

    return {
      xRange: [minX, maxX],
      yRange: [minY, maxY],
      xTicks,
      yTicks,
      scaledCurves,
    }
  }, [curves, xDomain, yDomain, graphWidth, graphHeight, padding])

  const pathStr = (points: DataPoint[]) =>
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : ''

  return (
    <svg width={width} height={height} className="bg-white">
      {showGrid && (
        <g>
          {xTicks.map((tick, i) => {
            const x = padding + ((tick - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth
            return (
              <line
                key={`grid-x-${i}`}
                x1={x}
                y1={padding}
                x2={x}
                y2={padding + graphHeight}
                stroke={CHART_COLORS.gridLine}
                strokeWidth={1}
              />
            )
          })}
          {yTicks.map((tick, i) => {
            const y = padding + graphHeight - ((tick - yRange[0]) / (yRange[1] - yRange[0])) * graphHeight
            return (
              <line
                key={`grid-y-${i}`}
                x1={padding}
                y1={y}
                x2={padding + graphWidth}
                y2={y}
                stroke={CHART_COLORS.gridLine}
                strokeWidth={1}
              />
            )
          })}
        </g>
      )}

      <line
        x1={padding}
        y1={padding + graphHeight}
        x2={padding + graphWidth}
        y2={padding + graphHeight}
        stroke={CHART_COLORS.axisLine}
        strokeWidth={2}
      />
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={padding + graphHeight}
        stroke={CHART_COLORS.axisLine}
        strokeWidth={2}
      />

      {xTicks.map((tick, i) => {
        const x = padding + ((tick - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth
        return (
          <g key={`x-tick-${i}`}>
            <line
              x1={x}
              y1={padding + graphHeight}
              x2={x}
              y2={padding + graphHeight + 5}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={1}
            />
            <text
              x={x}
              y={padding + graphHeight + 18}
              textAnchor="middle"
              fontSize="11"
              fill={CHART_COLORS.labelText}
            >
              {tick}
            </text>
          </g>
        )
      })}

      {yTicks.map((tick, i) => {
        const y = padding + graphHeight - ((tick - yRange[0]) / (yRange[1] - yRange[0])) * graphHeight
        return (
          <g key={`y-tick-${i}`}>
            <line
              x1={padding - 5}
              y1={y}
              x2={padding}
              y2={y}
              stroke={CHART_COLORS.axisLine}
              strokeWidth={1}
            />
            <text
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill={CHART_COLORS.labelText}
            >
              {tick}
            </text>
          </g>
        )
      })}

      {/* 面积填充 */}
      {areaFill && (() => {
        const curve = scaledCurves[areaFill.curveIndex]
        if (!curve || curve.points.length < 2) return null
        const toYValue = areaFill.toY ?? 0
        const toYScaled = padding + graphHeight - ((toYValue - yRange[0]) / (yRange[1] - yRange[0])) * graphHeight
        const firstPoint = curve.points[0]
        const lastPoint = curve.points[curve.points.length - 1]
        const areaPathD = `${pathStr(curve.points)} L ${lastPoint.x} ${toYScaled} L ${firstPoint.x} ${toYScaled} Z`
        return (
          <path
            d={areaPathD}
            fill={areaFill.color}
            opacity={areaFill.opacity ?? 0.2}
          />
        )
      })()}

      {scaledCurves.map((curve, curveIndex) => (
        <g key={`curve-${curveIndex}`}>
          <path
            d={pathStr(curve.points)}
            fill="none"
            stroke={curve.color || CHART_COLORS.primary}
            strokeWidth={curve.strokeWidth || 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {currentTime !== undefined && curve.points.length > 0 && (
            <circle
              cx={
                padding +
                ((currentTime - xRange[0]) / (xRange[1] - xRange[0])) * graphWidth
              }
              cy={
                padding +
                graphHeight -
                ((curve.points[Math.min(Math.floor(((currentTime - xRange[0]) / (xRange[1] - xRange[0])) * curve.points.length), curve.points.length - 1)]?.y || 0) -
                  yRange[0]
                ) *
                (graphHeight / (yRange[1] - yRange[0]))
              }
              r={5}
              fill={curve.color || CHART_COLORS.primary}
            />
          )}
        </g>
      ))}

      <text
        x={padding + graphWidth / 2}
        y={height - 5}
        textAnchor="middle"
        fontSize="12"
        fill={CHART_COLORS.labelText}
        fontWeight="medium"
      >
        {xLabel}
      </text>
      <text
        x={10}
        y={padding + graphHeight / 2}
        textAnchor="middle"
        fontSize="12"
        fill={CHART_COLORS.labelText}
        fontWeight="medium"
        transform={`rotate(-90, 10, ${padding + graphHeight / 2})`}
      >
        {yLabel}
      </text>

      {curves.length > 1 && (
        <g transform={`translate(${width - 100}, ${padding})`}>
          {curves.map((curve, i) => (
            <g key={`legend-${i}`} transform={`translate(0, ${i * 20})`}>
              <line
                x1={0}
                y1={0}
                x2={20}
                y2={0}
                stroke={curve.color || CHART_COLORS.primary}
                strokeWidth={2}
              />
              <text x={25} y={4} fontSize="11" fill={CHART_COLORS.labelText}>
                {curve.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

export default PhysicsGraph
