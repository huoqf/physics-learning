import { PHYSICS_COLORS, SCENE_COLORS, CHART_COLORS, withAlpha } from '@/theme/physics'
import { colors } from '@/theme/colors'

interface WeightlessnessChartProps {
  layout: {
    isWide: boolean
    chartWidth: number
    chartX: number
    aMin: number
    aMax: number
    margin: { left: number; right: number; top: number; bottom: number }
    plotH: number
    toChartX: (valA: number) => number
    toChartY: (valN: number) => number
    fs: number
    sfs: number
    currentA: number
    currentN: number
  }
  m: number
  g: number
}

export function WeightlessnessChart({ layout, m, g }: WeightlessnessChartProps) {
  const {
    isWide, chartWidth, chartX, aMin, aMax,
    margin, plotH, toChartX, toChartY,
    fs, sfs, currentA, currentN
  } = layout

  if (!isWide) return null

  return (
    <g>
      {/* 图表外边框 */}
      <rect
        x={chartX}
        y={margin.top - 15}
        width={chartWidth}
        height={plotH + 45}
        fill="none"
        stroke={PHYSICS_COLORS.grid}
        strokeWidth={0.8}
        rx={6}
        opacity={0.3}
      />

      {/* 图表标题 */}
      <text
        x={chartX + 15}
        y={margin.top - 2}
        fontSize={fs + 1}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
      >
        视重与加速度关系 (N - a 图)
      </text>

      {/* 超重区与失重区背景填充 */}
      {/* 失重区 a ∈ [-12, 0) */}
      <rect
        x={toChartX(aMin)}
        y={margin.top}
        width={toChartX(0) - toChartX(aMin)}
        height={plotH}
        fill={PHYSICS_COLORS.velocity}
        opacity={0.03}
      />
      {/* 超重区 a ∈ (0, 12] */}
      <rect
        x={toChartX(0)}
        y={margin.top}
        width={toChartX(aMax) - toChartX(0)}
        height={plotH}
        fill={PHYSICS_COLORS.acceleration}
        opacity={0.03}
      />

      {/* 分区文字说明 */}
      <text
        x={toChartX(-6)}
        y={margin.top + 16}
        fontSize={sfs}
        fill={PHYSICS_COLORS.velocity}
        textAnchor="middle"
        fontWeight="semibold"
        opacity={0.85}
      >
        失重区 (a &lt; 0)
      </text>
      <text
        x={toChartX(6)}
        y={margin.top + 16}
        fontSize={sfs}
        fill={PHYSICS_COLORS.acceleration}
        textAnchor="middle"
        fontWeight="semibold"
        opacity={0.85}
      >
        超重区 (a &gt; 0)
      </text>

      {/* 网格线 */}
      {[0.25, 0.5, 0.75].map((ratio, idx) => {
        const gridY = margin.top + plotH * ratio
        return (
          <line
            key={`cg-y-${idx}`}
            x1={toChartX(aMin)}
            y1={gridY}
            x2={toChartX(aMax)}
            y2={gridY}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={0.5}
            strokeDasharray="2,2"
            opacity={0.3}
          />
        )
      })}
      {[-10, -5, 5, 10].map((valA) => {
        const gridX = toChartX(valA)
        return (
          <line
            key={`cg-x-${valA}`}
            x1={gridX}
            y1={margin.top}
            x2={gridX}
            y2={margin.top + plotH}
            stroke={PHYSICS_COLORS.grid}
            strokeWidth={0.5}
            strokeDasharray="2,2"
            opacity={0.3}
          />
        )
      })}

      {/* 坐标轴线 */}
      {/* N 轴 */}
      <line
        x1={toChartX(0)}
        y1={margin.top}
        x2={toChartX(0)}
        y2={margin.top + plotH + 5}
        stroke={PHYSICS_COLORS.labelText}
        strokeWidth={1}
      />
      {/* a 轴 */}
      <line
        x1={toChartX(aMin) - 5}
        y1={toChartY(0)}
        x2={toChartX(aMax)}
        y2={toChartY(0)}
        stroke={PHYSICS_COLORS.labelText}
        strokeWidth={1}
      />

      {/* 坐标轴标签 */}
      <text
        x={toChartX(aMax) - 6}
        y={toChartY(0) + sfs + 14}
        fontSize={sfs}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="end"
      >
        a (m/s²)
      </text>
      <text
        x={toChartX(0) - 6}
        y={margin.top}
        fontSize={sfs}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="end"
      >
        N (N)
      </text>

      {/* 完全失重线 a = -g */}
      <line
        x1={toChartX(-g)}
        y1={margin.top}
        x2={toChartX(-g)}
        y2={toChartY(0)}
        stroke={CHART_COLORS.reference}
        strokeWidth={0.8}
        strokeDasharray="3,3"
        opacity={0.6}
      />
      <text
        x={toChartX(-g)}
        y={margin.top + plotH - 6}
        fontSize={sfs - 1}
        fill={CHART_COLORS.reference}
        textAnchor="middle"
        fontWeight="bold"
      >
        完全失重 (a = -g)
      </text>

      {/* 实重参考线 N = mg */}
      <line
        x1={toChartX(aMin)}
        y1={toChartY(m * g)}
        x2={toChartX(aMax)}
        y2={toChartY(m * g)}
        stroke={PHYSICS_COLORS.gravity}
        strokeWidth={0.8}
        strokeDasharray="3,3"
        opacity={0.6}
      />
      <text
        x={toChartX(aMin) + 6}
        y={toChartY(m * g) - 4}
        fontSize={sfs - 1}
        fill={PHYSICS_COLORS.gravity}
        fontWeight="bold"
      >
        实重 G = mg
      </text>

      {/* 横轴 a 刻度 */}
      {[-10, -5, 0, 5, 10].map((valA) => {
        const xPos = toChartX(valA)
        return (
          <g key={`clabel-x-${valA}`}>
            <line
              x1={xPos}
              y1={toChartY(0)}
              x2={xPos}
              y2={toChartY(0) + 3}
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={0.8}
            />
            <text
              x={xPos}
              y={toChartY(0) + sfs + 5}
              fontSize={sfs - 0.5}
              fill={PHYSICS_COLORS.labelTextLight}
              textAnchor="middle"
              fontFamily="monospace"
            >
              {valA}
            </text>
          </g>
        )
      })}

      {/* 纵轴 N 刻度 */}
      {[m * g, m * 10, m * 20].map((valN, idx) => {
        const yPos = toChartY(valN)
        const labelText = idx === 0 ? `mg (${(m * g).toFixed(0)})` : `${valN.toFixed(0)}`
        return (
          <g key={`clabel-y-${idx}`}>
            <line
              x1={toChartX(0) - 3}
              y1={yPos}
              x2={toChartX(0)}
              y2={yPos}
              stroke={PHYSICS_COLORS.labelText}
              strokeWidth={0.8}
            />
            <text
              x={toChartX(0) - 5}
              y={yPos + sfs * 0.35}
              fontSize={sfs - 0.5}
              fill={PHYSICS_COLORS.labelTextLight}
              textAnchor="end"
              fontFamily="monospace"
            >
              {labelText}
            </text>
          </g>
        )
      })}

      {/* N - a 关系折线 */}
      <polyline
        points={`${toChartX(aMin)},${toChartY(0)} ${toChartX(-g)},${toChartY(0)} ${toChartX(aMax)},${toChartY(m * (g + aMax))}`}
        fill="none"
        stroke={PHYSICS_COLORS.normalForce}
        strokeWidth={2}
      />

      {/* 动态定位线与游标点 */}
      <g>
        <line
          x1={toChartX(currentA)}
          y1={toChartY(currentN)}
          x2={toChartX(currentA)}
          y2={toChartY(0)}
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth={0.8}
          strokeDasharray="2,2"
          opacity={0.6}
        />
        <line
          x1={toChartX(aMin)}
          y1={toChartY(currentN)}
          x2={toChartX(currentA)}
          y2={toChartY(currentN)}
          stroke={PHYSICS_COLORS.labelTextLight}
          strokeWidth={0.8}
          strokeDasharray="2,2"
          opacity={0.6}
        />
        <circle
          cx={toChartX(currentA)}
          cy={toChartY(currentN)}
          r={5.5}
          fill={PHYSICS_COLORS.normalForce}
          opacity={0.25}
        />
        <circle
          cx={toChartX(currentA)}
          cy={toChartY(currentN)}
          r={3}
          fill={PHYSICS_COLORS.normalForce}
          stroke="white"
          strokeWidth={0.8}
        />
      </g>

      {/* 悬浮数值面板 */}
      <g transform={`translate(${toChartX(currentA) + 12}, ${toChartY(currentN) - 30})`}>
        <g transform={toChartX(currentA) > chartX + chartWidth * 0.65 ? 'translate(-115, 0)' : ''}>
          <rect
            width={100}
            height={40}
            fill="white"
            stroke={PHYSICS_COLORS.normalForce}
            strokeWidth={0.8}
            rx={3}
            opacity={0.92}
            filter={`drop-shadow(0 2px 4px ${withAlpha(SCENE_COLORS.materials.structStrokeDark, 0.1)})`}
          />
          <text x={8} y={14} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
            a = {currentA.toFixed(1)} m/s²
          </text>
          <text x={8} y={28} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.normalForce} fontWeight="bold">
            N = {currentN.toFixed(0)} N
          </text>
        </g>
      </g>

      {/* 公式与状态标注框 */}
      <g transform={`translate(${chartX + 18}, ${margin.top + plotH - 52})`}>
        <rect
          width={150}
          height={38}
          fill={colors.neutral[50]}
          stroke={PHYSICS_COLORS.grid}
          strokeWidth={0.6}
          rx={3}
          opacity={0.8}
        />
        <text x={10} y={14} fontSize={sfs - 0.5} fill={PHYSICS_COLORS.labelText} fontWeight="bold">
          公式: N = m(g + a)
        </text>
        <text x={10} y={26} fontSize={sfs - 1} fill={PHYSICS_COLORS.labelTextLight}>
          状态: {currentN > m * g + 0.1 ? '超重 (N > G)' : currentN < 0.1 ? '完全失重 (N = 0)' : currentN < m * g - 0.1 ? '失重 (N < G)' : '正常'}
        </text>
      </g>
    </g>
  )
}
