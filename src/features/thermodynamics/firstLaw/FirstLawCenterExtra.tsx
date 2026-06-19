import { useMemo } from 'react'
import { useCanvasSize } from '@/utils'
import { useAnimationStore } from '@/stores'
import { useShallow } from 'zustand/react/shallow'
import { CANVAS_PRESETS } from '@/theme/spacing'
import { PV_CHART_COLORS, CHART_COLORS } from '@/theme/physics'
import { STROKE, FONT } from '@/theme/physics/canvasStyle'

const N_DEFAULT = 1
const R = 8.314
const T_LOW = 300
const T_HIGH = 600
const P_LOW = 1e5
const P_HIGH = 2e5
const V_LOW = N_DEFAULT * R * T_LOW / P_HIGH  // 等容线左
const V_HIGH = N_DEFAULT * R * T_HIGH / P_LOW  // 等容线右

// 四步循环的四个角点 (P, V)
const CORNERS = [
  { P: P_LOW,  V: V_LOW,  label: 'A' },
  { P: P_LOW,  V: V_HIGH, label: 'B' },
  { P: P_HIGH, V: V_HIGH, label: 'C' },
  { P: P_HIGH, V: V_LOW,  label: 'D' },
]

const STEP_LABELS = [
  '① 等压膨胀 → 吸热做功',
  '② 等容升压 → 吸热',
  '③ 等压压缩 → 放热',
  '④ 等容降压 → 放热',
]

const STEP_COLORS = [
  PV_CHART_COLORS.isobar,
  PV_CHART_COLORS.isochor,
  PV_CHART_COLORS.isobar,
  PV_CHART_COLORS.isochor,
]

export default function FirstLawCenterExtra() {
  const { time } = useAnimationStore(
    useShallow((s) => ({ time: s.time })),
  )

  const [containerRef, canvasSize] = useCanvasSize(CANVAS_PRESETS.wide)
  const { width, height, font } = canvasSize

  // 当前步骤（周期 30s，每步 7.5s）
  const cycleTime = time % 30
  const stepIndex = Math.min(3, Math.floor(cycleTime / 7.5))
  const stepProgress = (cycleTime % 7.5) / 7.5

  // 在当前步骤内插值状态点
  const currentState = useMemo(() => {
    const from = CORNERS[stepIndex]
    const to = CORNERS[(stepIndex + 1) % 4]
    return {
      P: from.P + (to.P - from.P) * stepProgress,
      V: from.V + (to.V - from.V) * stepProgress,
    }
  }, [stepIndex, stepProgress])

  const margin = { left: 60, right: 30, top: 50, bottom: 50 }
  const plotX = margin.left
  const plotY = margin.top
  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom

  const vMin = V_LOW * 0.6
  const vMax = V_HIGH * 1.4
  const pMin = P_LOW * 0.6
  const pMax = P_HIGH * 1.4

  const toPlotX = (v: number) => plotX + ((v - vMin) / (vMax - vMin)) * plotW
  const toPlotY = (p: number) => plotY + plotH - ((p - pMin) / (pMax - pMin)) * plotH

  // 循环路径
  const cyclePathD = CORNERS
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${toPlotX(c.V).toFixed(1)},${toPlotY(c.P).toFixed(1)}`)
    .join(' ') + ' Z'

  return (
    <div ref={containerRef} className="w-full h-full bg-white">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* 标题 */}
        <text
          x={plotX}
          y={plotY - 28}
          fontSize={font(14)}
          fontWeight="bold"
          fill={CHART_COLORS.titleText}
          fontFamily={FONT.family}
        >
          热机循环 P-V 图（进阶模式）
        </text>

        {/* 当前步骤标注 */}
        <text
          x={plotX + plotW}
          y={plotY - 28}
          fontSize={font(12)}
          fill={STEP_COLORS[stepIndex]}
          textAnchor="end"
          fontWeight="bold"
          fontFamily={FONT.family}
        >
          {STEP_LABELS[stepIndex]}
        </text>

        {/* 网格线 */}
        {Array.from({ length: 7 }).map((_, i) => {
          const gy = plotY + (plotH * i) / 6
          return (
            <line key={`gy-${i}`} x1={plotX} y1={gy} x2={plotX + plotW} y2={gy}
              stroke={CHART_COLORS.gridLine} strokeWidth={0.5} />
          )
        })}
        {Array.from({ length: 9 }).map((_, i) => {
          const gx = plotX + (plotW * i) / 8
          return (
            <line key={`gx-${i}`} x1={gx} y1={plotY} x2={gx} y2={plotY + plotH}
              stroke={CHART_COLORS.gridLine} strokeWidth={0.5} />
          )
        })}

        {/* 坐标轴 */}
        <line x1={plotX} y1={plotY + plotH} x2={plotX + plotW} y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine} strokeWidth={1.2} />
        <line x1={plotX} y1={plotY} x2={plotX} y2={plotY + plotH}
          stroke={CHART_COLORS.axisLine} strokeWidth={1.2} />

        {/* 循环路径 */}
        <path d={cyclePathD} fill="none" stroke={CHART_COLORS.primary}
          strokeWidth={STROKE.chartMain + 0.5} />

        {/* 四条过程线分色高亮 */}
        {CORNERS.map((_, i) => {
          const from = CORNERS[i]
          const to = CORNERS[(i + 1) % 4]
          return (
            <line
              key={`seg-${i}`}
              x1={toPlotX(from.V)} y1={toPlotY(from.P)}
              x2={toPlotX(to.V)} y2={toPlotY(to.P)}
              stroke={STEP_COLORS[i]}
              strokeWidth={i === stepIndex ? STROKE.chartMain + 2 : 1}
              opacity={i === stepIndex ? 1 : 0.3}
            />
          )
        })}

        {/* 角点标注 */}
        {CORNERS.map((c, i) => {
          const cx = toPlotX(c.V)
          const cy = toPlotY(c.P)
          return (
            <g key={`corner-${i}`}>
              <circle cx={cx} cy={cy} r={5}
                fill={PV_CHART_COLORS.statePointFill}
                stroke={PV_CHART_COLORS.statePoint} strokeWidth={1.5} />
              <text
                x={cx + 8} y={cy - 8}
                fontSize={font(11)}
                fill={CHART_COLORS.labelText}
                fontFamily={FONT.family}
                fontWeight="bold"
              >
                {c.label}
              </text>
            </g>
          )
        })}

        {/* 当前状态点 */}
        <circle
          cx={toPlotX(currentState.V)}
          cy={toPlotY(currentState.P)}
          r={7}
          fill={STEP_COLORS[stepIndex]}
          stroke="#fff"
          strokeWidth={2}
        />

        {/* 过程箭头方向 */}
        {CORNERS.map((_, i) => {
          const from = CORNERS[i]
          const to = CORNERS[(i + 1) % 4]
          const mx = (toPlotX(from.V) + toPlotX(to.V)) / 2
          const my = (toPlotY(from.P) + toPlotY(to.P)) / 2
          const angle = Math.atan2(
            toPlotY(to.P) - toPlotY(from.P),
            toPlotX(to.V) - toPlotX(from.V),
          )
          return (
            <g key={`arrow-${i}`} transform={`translate(${mx},${my}) rotate(${angle * 180 / Math.PI})`}>
              <polygon
                points="0,-4 8,0 0,4"
                fill={PV_CHART_COLORS.processArrow}
                opacity={i === stepIndex ? 1 : 0.3}
              />
            </g>
          )
        })}

        {/* X 轴刻度 */}
        {Array.from({ length: 6 }, (_, i) => {
          const val = vMin + ((vMax - vMin) * i) / 5
          const x = toPlotX(val)
          return (
            <g key={`xt-${i}`}>
              <line x1={x} y1={plotY + plotH} x2={x} y2={plotY + plotH + 4}
                stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={x} y={plotY + plotH + FONT.small + 8} fontSize={font(9)}
                fill={CHART_COLORS.tickLabel} textAnchor="middle" fontFamily={FONT.family}>
                {val.toExponential(1)}
              </text>
            </g>
          )
        })}

        {/* Y 轴刻度 */}
        {[pMin, (pMin + pMax) / 2, pMax].map((val, i) => {
          const y = toPlotY(val)
          return (
            <g key={`yt-${i}`}>
              <line x1={plotX - 4} y1={y} x2={plotX} y2={y}
                stroke={CHART_COLORS.tickMark} strokeWidth={0.8} />
              <text x={plotX - 8} y={y + 3} fontSize={font(9)}
                fill={CHART_COLORS.tickLabel} textAnchor="end" fontFamily={FONT.family}>
                {val > 1000 ? (val / 1000).toFixed(0) + 'k' : val.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* 轴标签 */}
        <text x={plotX + plotW - 4} y={plotY + plotH + FONT.small + 8}
          fontSize={font(12)} fill={CHART_COLORS.labelText} textAnchor="end"
          fontWeight="bold" fontFamily={FONT.family}>
          V (m³)
        </text>
        <text x={plotX - 8} y={plotY - 8}
          fontSize={font(12)} fill={CHART_COLORS.labelText} textAnchor="end"
          fontWeight="bold" fontFamily={FONT.family}>
          P (Pa)
        </text>
      </svg>
    </div>
  )
}
