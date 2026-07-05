import { useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PV_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics'
import { solveClapeyron, generateIsothermFamily } from '@/physics/clapeyron'

const N_DEFAULT = 1
const T_MAX = 600
const V_MIN = 1e-4
const V_MAX = 1e-2

const ISOTHERM_FAMILY_TEMPS = [250, 300, 350, 400, 450, 500]

export default function ClapeyronCenterExtra() {
  const { params } = useAnimationStore(
    useShallow((s) => ({ params: s.params })),
  )

  const T = params.T ?? 300
  const V = params.V ?? 5e-3

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.full, { presetCompensation: 1.2 })
  const { width, height, font } = canvasSize

  const P = solveClapeyron({ key: 'V', value: V }, { key: 'T', value: T }, 'P', N_DEFAULT)

  const isothermFamily = useMemo(
    () => generateIsothermFamily(ISOTHERM_FAMILY_TEMPS, N_DEFAULT, V_MIN, V_MAX, 80),
    [],
  )

  const currentIsothermPoints = useMemo(() => {
    const pts: { v: number; p: number }[] = []
    for (let i = 0; i <= 80; i++) {
      const v = V_MIN + ((V_MAX - V_MIN) * i) / 80
      const p = solveClapeyron({ key: 'V', value: v }, { key: 'T', value: T }, 'P', N_DEFAULT)
      pts.push({ v, p })
    }
    return pts
  }, [T])

  const margin = { left: 60, right: 30, top: 40, bottom: 50 }
  const plotX = margin.left
  const plotY = margin.top
  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom

  const xMin = V_MIN
  const xMax = V_MAX
  const yMin = 0
  const yMax = solveClapeyron({ key: 'V', value: V_MIN }, { key: 'T', value: T_MAX }, 'P', N_DEFAULT)

  const toPlotX = (v: number) => plotX + ((v - xMin) / (xMax - xMin || 1)) * plotW
  const toPlotY = (v: number) => plotY + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH

  const cx = toPlotX(V)
  const cy = toPlotY(P)

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* 图表标题 */}
        <text
          x={plotX}
          y={plotY - 12}
          fontSize={font(14)}
          fontWeight="bold"
          fill={CHART_COLORS.titleText}
          fontFamily={FONT.family}
        >
          P-V 图（等温线族）
        </text>

        {/* 网格线 */}
        {Array.from({ length: 7 }).map((_, i) => {
          const gy = plotY + (plotH * i) / 6
          return (
            <line
              key={`gy-${i}`}
              x1={plotX}
              y1={gy}
              x2={plotX + plotW}
              y2={gy}
              stroke={CHART_COLORS.gridLine}
              strokeWidth={0.5}
            />
          )
        })}
        {Array.from({ length: 9 }).map((_, i) => {
          const gx = plotX + (plotW * i) / 8
          return (
            <line
              key={`gx-${i}`}
              x1={gx}
              y1={plotY}
              x2={gx}
              y2={plotY + plotH}
              stroke={CHART_COLORS.gridLine}
              strokeWidth={0.5}
            />
          )
        })}

        {/* 坐标轴 */}
        <line
          x1={plotX}
          y1={plotY + plotH}
          x2={plotX + plotW}
          y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine}
          strokeWidth={1.2}
        />
        <line
          x1={plotX}
          y1={plotY}
          x2={plotX}
          y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine}
          strokeWidth={1.2}
        />

        {/* 等温线族背景 */}
        {isothermFamily.map((iso, idx) => {
          const pathD = iso.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPlotX(p.v).toFixed(1)},${toPlotY(p.p).toFixed(1)}`)
            .join(' ')
          const colorIdx = idx % PV_CHART_COLORS.isothermsGroup.length
          return (
            <g key={`iso-bg-${idx}`}>
              <path
                d={pathD}
                fill="none"
                stroke={PV_CHART_COLORS.isothermsGroup[colorIdx]}
                strokeWidth={1.2}
                opacity={0.5}
              />
              <text
                x={toPlotX(iso.points[0]?.v ?? V_MIN) + 4}
                y={toPlotY(iso.points[0]?.p ?? 0) - 6}
                fontSize={font(9)}
                fill={CHART_COLORS.tickLabel}
                fontFamily={FONT.family}
                opacity={0.7}
              >
                {iso.T}K
              </text>
            </g>
          )
        })}

        {/* 当前温度等温线（高亮） */}
        {currentIsothermPoints.length >= 2 && (
          <path
            d={currentIsothermPoints
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toPlotX(p.v).toFixed(1)},${toPlotY(p.p).toFixed(1)}`)
              .join(' ')}
            fill="none"
            stroke={PV_CHART_COLORS.isotherm}
            strokeWidth={STROKE.chartMain + 0.5}
          />
        )}

        {/* 当前状态点 */}
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={PV_CHART_COLORS.statePointFill}
          stroke={PV_CHART_COLORS.statePoint}
          strokeWidth={2}
        />

        {/* 状态点坐标标注 */}
        <text
          x={cx + 10}
          y={cy - 10}
          fontSize={font(10)}
          fill={CHART_COLORS.labelText}
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          ({(V * 1000).toFixed(1)}L, {P > 1000 ? (P / 1000).toFixed(1) + 'k' : P.toFixed(0)}Pa)
        </text>

        {/* PV/T 守恒标注 */}
        <rect
          x={plotX + plotW - 140}
          y={plotY + 8}
          width={136}
          height={28}
          fill="white"
          stroke={CHART_COLORS.gridLine}
          strokeWidth={0.8}
          rx={4}
          opacity={0.9}
        />
        <text
          x={plotX + plotW - 72}
          y={plotY + 26}
          fontSize={font(10)}
          fill={CHART_COLORS.labelText}
          textAnchor="middle"
          fontFamily={FONT.family}
          fontWeight="bold"
        >
          PV/T = {(P * V / T).toFixed(2)} J/K = const
        </text>

        {/* X 轴刻度 */}
        {Array.from({ length: 6 }, (_, i) => {
          const val = xMin + ((xMax - xMin) * i) / 5
          const x = toPlotX(val)
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={plotY + plotH} x2={x} y2={plotY + plotH + 4} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={x} y={plotY + plotH + FONT.small + 8} fontSize={font(10)} fill={CHART_COLORS.tickLabel} textAnchor="middle" fontFamily={FONT.family}>
                {val.toExponential(1)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[yMin, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map((val, i) => {
          const y = toPlotY(val)
          return (
            <g key={`yt-${i}`}>
              <line x1={plotX - 4} y1={y} x2={plotX} y2={y} stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={plotX - 8} y={y + 3} fontSize={font(10)} fill={CHART_COLORS.tickLabel} textAnchor="end" fontFamily={FONT.family}>
                {val > 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* 轴标签 */}
        <text
          x={plotX + plotW - 4}
          y={plotY + plotH + FONT.small + 8}
          fontSize={font(12)}
          fill={CHART_COLORS.labelText}
          textAnchor="end"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          V (m³)
        </text>
        <text
          x={plotX - 8}
          y={plotY - 8}
          fontSize={font(12)}
          fill={CHART_COLORS.labelText}
          textAnchor="end"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          P (Pa)
        </text>
      </svg>
    </div>
  )
}
