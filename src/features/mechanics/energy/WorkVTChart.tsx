import { useMemo } from 'react'
import { VT_CHART_COLORS, CHART_COLORS, PHYSICS_COLORS, STROKE, DASH, OPACITY, CANVAS_COLORS } from '@/theme/physics'
import type { WorkKinematics } from '@/physics/work'

const VT_LAYOUT = {
  topPaddingRatio: 0.08,
  bottomPaddingRatio: 0.12,
  leftPaddingRatio: 0.10,
  rightPaddingRatio: 0.06,
} as const

interface WorkVTChartProps {
  canvasSize: { width: number; height: number }
  font: (size: number) => number
  kinematics: WorkKinematics
  currentTime: number
  maxAnimTime: number
}

export function WorkVTChart({
  canvasSize,
  font,
  kinematics,
  currentTime,
  maxAnimTime,
}: WorkVTChartProps) {
  const { a, v_max, t_total } = kinematics

  const layout = useMemo(() => {
    const top = canvasSize.height * VT_LAYOUT.topPaddingRatio
    const bottom = canvasSize.height * VT_LAYOUT.bottomPaddingRatio
    const left = canvasSize.width * VT_LAYOUT.leftPaddingRatio
    const right = canvasSize.width * VT_LAYOUT.rightPaddingRatio
    return {
      top,
      bottom,
      left,
      right,
      chartW: canvasSize.width - left - right,
      chartH: canvasSize.height - top - bottom,
    }
  }, [canvasSize.width, canvasSize.height])

  const VT_AXIS = { vMax: 65 } as const

  const tMax = isFinite(t_total) ? t_total * 1.15 : 10
  const vMax = VT_AXIS.vMax

  const toX = (t: number) => layout.left + (t / tMax) * layout.chartW
  const toY = (v: number) => layout.top + layout.chartH - (v / vMax) * layout.chartH

  const progress = Math.min(currentTime / maxAnimTime, 1)
  const currentT = isFinite(t_total) ? progress * progress * t_total : 0

  const linePath = useMemo(() => {
    if (!isFinite(t_total)) return `M ${toX(0)} ${toY(0)}`
    return `M ${toX(0)} ${toY(0)} L ${toX(t_total)} ${toY(v_max)}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t_total, v_max, a, layout])

  return (
    <g>
      {/* 坐标轴 */}
      <line x1={layout.left} y1={layout.top} x2={layout.left} y2={layout.top + layout.chartH}
        stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold} />
      <line x1={layout.left} y1={layout.top + layout.chartH}
        x2={layout.left + layout.chartW} y2={layout.top + layout.chartH}
        stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.axisBold} />

      {/* X 轴刻度 */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = (i / 5) * tMax
        const x = toX(t)
        return (
          <g key={`xt-${i}`}>
            <line x1={x} y1={layout.top + layout.chartH} x2={x} y2={layout.top + layout.chartH + 4}
              stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={x} y={layout.top + layout.chartH + font(10) + 4}
              fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="middle">
              {t.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left + layout.chartW / 2} y={layout.top + layout.chartH + font(14)}
        fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle">
        t (s)
      </text>

      {/* Y 轴刻度 */}
      {Array.from({ length: 6 }, (_, i) => {
        const v = (i / 5) * vMax
        const y = toY(v)
        return (
          <g key={`yt-${i}`}>
            <line x1={layout.left - 4} y1={y} x2={layout.left} y2={y}
              stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={layout.left - font(10) - 2} y={y + font(3)}
              fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="end">
              {v.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left - font(18)} y={layout.top + layout.chartH / 2}
        fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle"
        transform={`rotate(-90, ${layout.left - font(18)}, ${layout.top + layout.chartH / 2})`}>
        v (m/s)
      </text>

      {/* 网格线 */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = toX((i / 5) * tMax)
        return (
          <line key={`gx-${i}`} x1={x} y1={layout.top} x2={x} y2={layout.top + layout.chartH}
            stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        )
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const y = toY((i / 5) * vMax)
        return (
          <line key={`gy-${i}`} x1={layout.left} y1={y} x2={layout.left + layout.chartW} y2={y}
            stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        )
      })}

      {/* v-t 曲线（恒加速 = 直线，调参数时斜率立即变化） */}
      {isFinite(t_total) && (
        <path d={linePath} fill="none" stroke={VT_CHART_COLORS.velocityCurve}
          strokeWidth={STROKE.vectorMain} strokeLinecap="round" />
      )}

      {/* 当前时刻游标 */}
      <g>
        <line x1={toX(Math.max(0, currentT))} y1={layout.top + layout.chartH}
          x2={toX(Math.max(0, currentT))} y2={toY(a * Math.max(0, currentT))}
          stroke={VT_CHART_COLORS.velocityCurve} strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.guide.join(',')} opacity={OPACITY.guide} />
        <circle cx={toX(Math.max(0, currentT))} cy={toY(a * Math.max(0, currentT))} r={font(4)}
          fill={VT_CHART_COLORS.velocityCurve} stroke={CANVAS_COLORS.grid} strokeWidth={1.5} />
      </g>

      {/* 图例 */}
      <g transform={`translate(${layout.left + layout.chartW - font(80)}, ${layout.top + font(8)})`}>
        <text fontSize={font(9)} fill={CHART_COLORS.labelText} fontWeight="bold">
          v(t) = at
        </text>
        <text y={font(12)} fontSize={font(8)} fill={PHYSICS_COLORS.labelTextLight}>
          a = {a.toFixed(2)} m/s²
        </text>
      </g>
    </g>
  )
}
