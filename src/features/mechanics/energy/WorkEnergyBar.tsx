import { useMemo } from 'react'
import { PHYSICS_COLORS, SCENE_COLORS, CANVAS_COLORS } from '@/theme/physics'

const ENERGY_BAR_LAYOUT = {
  maxBarHeightRatio: 0.55,
  barWidthRatio: 0.06,
  barGapRatio: 0.03,
  panelPaddingRatio: 0.04,
} as const

interface WorkEnergyBarProps {
  canvasSize: { width: number; height: number }
  font: (size: number) => number
  energyBars: { WF: number; Wf_abs: number; Ek: number }
  maxWorkRef: number
}

export function WorkEnergyBar({ canvasSize, font, energyBars, maxWorkRef }: WorkEnergyBarProps) {
  const { WF, Wf_abs, Ek } = energyBars

  const layout = useMemo(() => {
    const panelW = canvasSize.width * 0.35
    const panelH = canvasSize.height * 0.7
    const panelX = canvasSize.width * 0.5 - panelW / 2
    const panelY = canvasSize.height * 0.15
    const barW = canvasSize.width * ENERGY_BAR_LAYOUT.barWidthRatio
    const barGap = canvasSize.width * ENERGY_BAR_LAYOUT.barGapRatio
    const maxBarH = panelH * ENERGY_BAR_LAYOUT.maxBarHeightRatio
    const baseY = panelY + panelH * 0.75
    const panelPadding = panelW * ENERGY_BAR_LAYOUT.panelPaddingRatio
    return { panelX, panelY, panelW, panelH, barW, barGap, maxBarH, baseY, panelPadding }
  }, [canvasSize.width, canvasSize.height])

  const maxVal = maxWorkRef > 0 ? maxWorkRef : 1

  const bars = useMemo(() => [
    { label: 'WF', value: WF, color: PHYSICS_COLORS.work },
    { label: '|Wf|', value: Wf_abs, color: PHYSICS_COLORS.friction },
    { label: 'Ek', value: Ek, color: PHYSICS_COLORS.kineticEnergy },
  ], [WF, Wf_abs, Ek])

  return (
    <g>
      {/* 面板背景 */}
      <rect
        x={layout.panelX}
        y={layout.panelY}
        width={layout.panelW}
        height={layout.panelH}
        rx={6}
        fill={SCENE_COLORS.labels.glassPanelBg}
        stroke={CANVAS_COLORS.grid}
        strokeWidth={0.8}
      />

      {/* 面板标题 */}
      <text
        x={layout.panelX + layout.panelW / 2}
        y={layout.panelY + font(14)}
        fontSize={font(10)}
        fill={PHYSICS_COLORS.labelText}
        fontWeight="bold"
        textAnchor="middle"
      >
        能量看板
      </text>

      {/* 底线 */}
      <line
        x1={layout.panelX + layout.panelPadding}
        y1={layout.baseY}
        x2={layout.panelX + layout.panelW - layout.panelPadding}
        y2={layout.baseY}
        stroke={CANVAS_COLORS.trackHistory}
        strokeWidth={0.8}
      />

      {/* 三根柱子 */}
      {bars.map((bar, i) => {
        const barH = maxVal > 0 ? (bar.value / maxVal) * layout.maxBarH : 0
        const x = layout.panelX + layout.panelW / 2
          - (bars.length * (layout.barW + layout.barGap) - layout.barGap) / 2
          + i * (layout.barW + layout.barGap)

        return (
          <g key={bar.label}>
            {/* 柱体 */}
            <rect
              x={x}
              y={layout.baseY - barH}
              width={layout.barW}
              height={Math.max(0, barH)}
              fill={bar.color}
              opacity={0.85}
              rx={1}
            />

            {/* 数值 */}
            <text
              x={x + layout.barW / 2}
              y={layout.baseY - barH - font(4)}
              fontSize={font(8.5)}
              fill={bar.color}
              textAnchor="middle"
              fontWeight="bold"
            >
              {bar.value.toFixed(1)}J
            </text>

            {/* 标签 */}
            <text
              x={x + layout.barW / 2}
              y={layout.baseY + font(12)}
              fontSize={font(9)}
              fill={bar.color}
              textAnchor="middle"
              fontWeight="semibold"
            >
              {bar.label}
            </text>
          </g>
        )
      })}

      {/* 等号与公式 */}
      <text
        x={layout.panelX + layout.panelW / 2}
        y={layout.baseY + font(28)}
        fontSize={font(10)}
        fill={PHYSICS_COLORS.labelTextLight}
        textAnchor="middle"
        fontWeight="bold"
      >
        WF − |Wf| = Ek
      </text>
    </g>
  )
}
