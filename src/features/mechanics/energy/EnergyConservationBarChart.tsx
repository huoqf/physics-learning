import { PHYSICS_COLORS, ENERGY_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'
import { colors } from '@/theme/colors'

interface EnergyConservationBarChartProps {
  mode: number
  wallX: number
  vpVisibleH: number
  state: { Ek: number; Q: number }
  Ep_adj: number
  Etot_adj: number
  barEk_H: number
  barEp_H: number
  barQ_H: number
  barTot_H: number
  font: (n: number) => number
}

export function EnergyConservationBarChart({
  mode,
  wallX,
  vpVisibleH,
  state,
  Ep_adj,
  Etot_adj,
  barEk_H,
  barEp_H,
  barQ_H,
  barTot_H,
  font,
}: EnergyConservationBarChartProps) {
  const panelWidth = mode === 0 ? 90 : 115
  const panelX = wallX - (mode === 0 ? 90 : 115)

  return (
    <g transform={`translate(${panelX}, ${vpVisibleH * 0.55})`}>
      {/* 半透明白底毛玻璃 */}
      <rect width={panelWidth} height={105} rx={6} fill={SCENE_COLORS.labels.glassPanelBg} stroke={colors.neutral[200]} strokeWidth={0.8} />

      {/* 柱状图坐标系，基准线 y=0 移至 70 */}
      <g transform="translate(0, 70)">
        {/* 基准零线 */}
        <line x1={8} y1={0} x2={mode === 0 ? 82 : 107} y2={0} stroke={CANVAS_COLORS.grid} strokeWidth={0.8} />

        {/* 柱 1：动能 Ek (青色) */}
        <rect
          x={mode === 0 ? 12 : 10}
          y={-barEk_H}
          width={14}
          height={Math.max(barEk_H, 0.1)}
          fill={PHYSICS_COLORS.kineticEnergy}
          opacity={0.85}
          rx={0.5}
        />
        <text
          x={mode === 0 ? 19 : 17}
          y={-barEk_H - 4}
          fontSize={font(7.5)}
          fill={PHYSICS_COLORS.kineticEnergy}
          textAnchor="middle"
          fontWeight="bold"
        >
          {state.Ek.toFixed(1)}
        </text>
        <text
          x={mode === 0 ? 19 : 17}
          y={22}
          fontSize={font(7.5)}
          fill={PHYSICS_COLORS.kineticEnergy}
          textAnchor="middle"
          fontWeight="semibold"
        >
          Ek
        </text>

        {/* 柱 2：重力势能 Ep (紫色) */}
        <rect
          x={mode === 0 ? 38 : 35}
          y={barEp_H >= 0 ? -barEp_H : 0}
          width={14}
          height={Math.max(Math.abs(barEp_H), 0.1)}
          fill={PHYSICS_COLORS.potentialEnergy}
          opacity={0.85}
          rx={0.5}
        />
        <text
          x={mode === 0 ? 45 : 42}
          y={barEp_H >= 0 ? -barEp_H - 4 : Math.abs(barEp_H) + 10}
          fontSize={font(7.5)}
          fill={PHYSICS_COLORS.potentialEnergy}
          textAnchor="middle"
          fontWeight="bold"
        >
          {Ep_adj.toFixed(1)}
        </text>
        <text
          x={mode === 0 ? 45 : 42}
          y={22}
          fontSize={font(7.5)}
          fill={PHYSICS_COLORS.potentialEnergy}
          textAnchor="middle"
          fontWeight="semibold"
        >
          Ep
        </text>

        {/* 柱 3 (仅在 mode === 1 时显示)：内能 Q (红色) */}
        {mode === 1 && (
          <>
            <rect
              x={60}
              y={-barQ_H}
              width={14}
              height={Math.max(barQ_H, 0.1)}
              fill={ENERGY_COLORS.internalEnergy}
              opacity={0.85}
              rx={0.5}
            />
            <text
              x={67}
              y={-barQ_H - 4}
              fontSize={font(7.5)}
              fill={ENERGY_COLORS.internalEnergy}
              textAnchor="middle"
              fontWeight="bold"
            >
              {state.Q.toFixed(1)}
            </text>
            <text
              x={67}
              y={22}
              fontSize={font(7.5)}
              fill={ENERGY_COLORS.internalEnergy}
              textAnchor="middle"
              fontWeight="semibold"
            >
              Q
            </text>
          </>
        )}

        {/* 柱 4 (对于 mode === 0 是第 3 柱，对于 mode === 1 是第 4 柱)：总能量 E (灰色) */}
        <rect
          x={mode === 0 ? 64 : 85}
          y={barTot_H >= 0 ? -barTot_H : 0}
          width={14}
          height={Math.max(Math.abs(barTot_H), 0.1)}
          fill={colors.neutral[500]}
          opacity={0.85}
          rx={0.5}
        />
        <text
          x={mode === 0 ? 71 : 92}
          y={barTot_H >= 0 ? -barTot_H - 4 : Math.abs(barTot_H) + 10}
          fontSize={font(7.5)}
          fill={colors.neutral[600]}
          textAnchor="middle"
          fontWeight="bold"
        >
          {Etot_adj.toFixed(1)}
        </text>
        <text
          x={mode === 0 ? 71 : 92}
          y={22}
          fontSize={font(7.5)}
          fill={colors.neutral[600]}
          textAnchor="middle"
          fontWeight="semibold"
        >
          {mode === 0 ? 'E机' : 'E总'}
        </text>
      </g>
    </g>
  )
}