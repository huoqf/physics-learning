import { CHART_COLORS, CANVAS_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'
import { VELOCITY_SELECTOR_PHYSICS, type VelocitySelectorChartData, type VelocitySelectorChartGeometry } from '../model/velocitySelectorModel'

export function VelocitySelectorChart({
  chartData,
  chartGeometry,
  chartCurvePath,
  currentVelocity,
  glowId,
  font,
}: {
  chartData: VelocitySelectorChartData
  chartGeometry: VelocitySelectorChartGeometry
  chartCurvePath: string
  currentVelocity: number
  glowId: string
  font: (v: number) => number
}) {
  const { width, height, xOffset, yOffset, toChartX, toChartY } = chartGeometry
  const plateHalfGap = VELOCITY_SELECTOR_PHYSICS.plateGap / 2

  if (!chartCurvePath) return null

  return (
    <g>
      <rect
        x={xOffset - 10}
        y={yOffset - 15}
        width={width + 30}
        height={height + 25}
        fill={colors.neutral[50]}
        rx={6}
        stroke={colors.neutral[200]}
        strokeWidth="1.2"
      />
      <text
        x={xOffset + width / 2}
        y={yOffset - 4}
        fontSize={font(11)}
        fill={colors.neutral[600]}
        fontWeight="bold"
        textAnchor="middle"
      >
        穿出位移与速度关系 y - v 图像
      </text>

      <line
        x1={xOffset}
        y1={toChartY(0)}
        x2={xOffset + width + 10}
        y2={toChartY(0)}
        stroke={CANVAS_COLORS.axis}
        strokeWidth="1.2"
      />
      <polygon
        points={`${xOffset + width + 10},${toChartY(0) - 3.5} ${xOffset + width + 16},${toChartY(0)} ${xOffset + width + 10},${toChartY(0) + 3.5}`}
        fill={CANVAS_COLORS.axis}
      />
      <text
        x={xOffset + width + 16}
        y={toChartY(0) + 12}
        fontSize={font(9)}
        fill={colors.neutral[500]}
        fontWeight="bold"
        textAnchor="middle"
      >
        v
      </text>

      <line
        x1={xOffset}
        y1={yOffset + height}
        x2={xOffset}
        y2={yOffset - 5}
        stroke={CANVAS_COLORS.axis}
        strokeWidth="1.2"
      />
      <polygon
        points={`${xOffset - 3.5},${yOffset - 5} ${xOffset},${yOffset - 11} ${xOffset + 3.5},${yOffset - 5}`}
        fill={CANVAS_COLORS.axis}
      />
      <text
        x={xOffset - 8}
        y={yOffset - 4}
        fontSize={font(9)}
        fill={colors.neutral[500]}
        fontWeight="bold"
      >
        y
      </text>

      <text x={xOffset - 8} y={toChartY(0) + 3} fontSize={font(9)} fill={colors.neutral[400]}>
        0
      </text>

      <line
        x1={xOffset}
        y1={toChartY(plateHalfGap)}
        x2={xOffset + width}
        y2={toChartY(plateHalfGap)}
        stroke={colors.neutral[300]}
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <line
        x1={xOffset}
        y1={toChartY(-plateHalfGap)}
        x2={xOffset + width}
        y2={toChartY(-plateHalfGap)}
        stroke={colors.neutral[300]}
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <text x={xOffset + width + 4} y={toChartY(plateHalfGap) + 3} fontSize={font(8)} fill={colors.neutral[400]}>
        +d/2
      </text>
      <text x={xOffset + width + 4} y={toChartY(-plateHalfGap) + 3} fontSize={font(8)} fill={colors.neutral[400]}>
        -d/2
      </text>

      <path
        d={chartCurvePath}
        fill="none"
        stroke={PHYSICS_COLORS.velocity}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />

      {chartData.vFilter > 1.0 && chartData.vFilter < 25.0 && (
        <g>
          <circle cx={toChartX(chartData.vFilter)} cy={toChartY(0)} r="3.5" fill={PHYSICS_COLORS.magneticField} />
          <line
            x1={toChartX(chartData.vFilter)}
            y1={yOffset}
            x2={toChartX(chartData.vFilter)}
            y2={yOffset + height}
            stroke={PHYSICS_COLORS.magneticField}
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.5"
          />
          <text
            x={toChartX(chartData.vFilter)}
            y={yOffset + height - 4}
            fontSize={font(8)}
            fill={PHYSICS_COLORS.magneticField}
            fontWeight="bold"
            textAnchor="middle"
          >
            v_滤 = {chartData.vFilter.toFixed(1)}
          </text>
        </g>
      )}

      {currentVelocity >= 1.0 && currentVelocity <= 25.0 && (
        <circle
          cx={toChartX(currentVelocity)}
          cy={toChartY(chartData.currentY)}
          r="4.5"
          fill={CHART_COLORS.highlight}
          stroke={colors.neutral.white}
          strokeWidth="1.5"
          filter={`url(#glow-${glowId})`}
        />
      )}
    </g>
  )
}
