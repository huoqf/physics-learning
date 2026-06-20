/**
 * FaradayChartPanel.tsx — 法拉第电磁感应实时数据看板（Φ-t / E-t 双图表）
 *
 * 从 FaradayLaw.tsx 拆分：右侧图表区域渲染。
 */
import { PHYSICS_COLORS, CANVAS_STYLE, CHART_COLORS } from '@/theme/physics'
import type { FaradayChartPoint } from '@/physics/electromagnetism'

interface Props {
  mode: number
  chartPoints: FaradayChartPoint[]
  currentState: { x: number; phi: number; emf: number; B: number }
  dashLeft: number
  dashRight: number
  dashW: number
  H: number
  chartPadTop: number
  chartH: number
  yPhiMid: number
  yEmfMid: number
  chartHalfH: number
  phiMinVal: number
  phiMaxVal: number
  maxEmfVal: number
  emfIsZero: boolean
  toPhiY: (phi: number) => number
  yPhiZero: number
  toChartX: (t: number) => number
  toEmfY: (emf: number) => number
  phiPathD: string
  emfPathD: string
  indicatorX: number
  tNow: number
  font: (base: number) => number
}

export function FaradayChartPanel({
  mode,
  currentState,
  dashLeft,
  dashRight,
  dashW,
  yPhiMid,
  yEmfMid,
  chartHalfH,
  phiMinVal,
  phiMaxVal,
  toPhiY,
  yPhiZero,
  toChartX,
  toEmfY,
  phiPathD,
  emfPathD,
  indicatorX,
  emfIsZero,
  chartPadTop,
  font,
}: Props) {
  return (
    <g clipPath="url(#chartClip)">
      {/* 标题 */}
      <text x={dashLeft + dashW / 2} y={chartPadTop - 8} fontSize={CANVAS_STYLE.font.labelSize}
        fill={PHYSICS_COLORS.labelText} textAnchor="middle" fontWeight="bold">
        实时数据看板 (t = 0 ~ 10s)
      </text>

      {/* ── Φ-t 图 (磁通量) ── */}
      <g>
        {/* 网格背景 */}
        {[-1, -0.5, 0, 0.5, 1].map((ratio) => {
          const y = mode === 1
            ? toPhiY(phiMinVal + (phiMaxVal - phiMinVal) * (1 - (ratio + 1) / 2))
            : yPhiMid + ratio * chartHalfH
          return (
            <line key={`phigrid-${ratio}`} x1={dashLeft} y1={y} x2={dashRight} y2={y}
              stroke={CHART_COLORS.gridLine} strokeWidth="0.5"
              strokeDasharray={ratio === 0 ? undefined : '2,3'} />
          )
        })}
        {/* x 轴 */}
        <line x1={dashLeft} y1={yPhiZero} x2={dashRight} y2={yPhiZero}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.axis} />
        {/* y 轴 */}
        <line x1={dashLeft} y1={yPhiMid - chartHalfH - 4} x2={dashLeft} y2={yPhiMid + chartHalfH + 4}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.axis} />
        {/* 坐标轴标签 */}
        <text x={dashLeft} y={yPhiMid - chartHalfH - 6} fontSize={CANVAS_STYLE.font.axisSize}
          fill={PHYSICS_COLORS.magneticField} fontWeight="bold">
          Φ − t 图 (Wb)
        </text>
        {/* 曲线 */}
        <path d={phiPathD} fill="none" stroke={CHART_COLORS.primary}
          strokeWidth={CANVAS_STYLE.stroke.objectLine} strokeLinejoin="round" strokeLinecap="round" />
        {/* 焦点球与垂直红指示线 */}
        <line x1={indicatorX} y1={yPhiMid - chartHalfH} x2={indicatorX} y2={yPhiMid + chartHalfH}
          stroke={CHART_COLORS.reference} strokeWidth={CANVAS_STYLE.stroke.chartRef}
          strokeDasharray="4,3" />
        <circle cx={indicatorX} cy={toPhiY(currentState.phi)} r="4"
          fill={CHART_COLORS.primary} stroke="white" strokeWidth="1.5" />
        <text x={indicatorX + 6}
          y={Math.max(yPhiMid - chartHalfH + 10, Math.min(yPhiMid + chartHalfH - 4, toPhiY(currentState.phi) - 6))}
          fontSize={font(10)} fill={CHART_COLORS.primary} fontWeight="bold">
          Φ={currentState.phi.toFixed(3)} Wb
        </text>
        {/* Φ-t 图的 t 轴刻度数字 */}
        <g fontSize={font(9)} fill={CHART_COLORS.tickLabel}>
          {[0, 2.5, 5.0, 7.5, 10.0].map((tVal) => (
            <text key={`phitick-${tVal}`} x={toChartX(tVal)} y={yPhiMid + chartHalfH + 12} textAnchor="middle">
              {tVal.toFixed(1)}
            </text>
          ))}
        </g>
      </g>

      {/* ── E-t 图 (感应电动势) ── */}
      <g>
        {/* 网格背景 */}
        {[-1, -0.5, 0, 0.5, 1].map((ratio) => {
          const y = yEmfMid + ratio * chartHalfH
          return (
            <line key={`emfgrid-${ratio}`} x1={dashLeft} y1={y} x2={dashRight} y2={y}
              stroke={CHART_COLORS.gridLine} strokeWidth="0.5"
              strokeDasharray={ratio === 0 ? undefined : '2,3'} />
          )
        })}
        {/* 坐标轴 */}
        <line x1={dashLeft} y1={yEmfMid} x2={dashRight} y2={yEmfMid}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.axis} />
        <line x1={dashLeft} y1={yEmfMid - chartHalfH - 4} x2={dashLeft} y2={yEmfMid + chartHalfH + 4}
          stroke={CHART_COLORS.axisLine} strokeWidth={CANVAS_STYLE.stroke.axis} />
        {/* 坐标轴标签 */}
        <text x={dashLeft} y={yEmfMid - chartHalfH - 6} fontSize={CANVAS_STYLE.font.axisSize}
          fill={PHYSICS_COLORS.electricCurrent} fontWeight="bold">
          E − t 图 (V)
        </text>
        <text x={dashRight + 2} y={yEmfMid + 4} fontSize={font(9)} fill={CHART_COLORS.tickLabel}>
          t/s
        </text>
        {/* 曲线：k=0 时显示虚线+标注 */}
        {emfIsZero ? (
          <g>
            <line x1={dashLeft} y1={yEmfMid} x2={dashRight} y2={yEmfMid}
              stroke={CHART_COLORS.compareC} strokeWidth={CANVAS_STYLE.stroke.objectLine}
              strokeDasharray="6,4" opacity={0.7} />
            <text x={dashLeft + dashW / 2} y={yEmfMid - 8} fontSize={font(10)}
              fill={CHART_COLORS.compareC} textAnchor="middle" opacity={0.9}>
              E = 0（k = 0，磁场恒定，无感应电动势）
            </text>
          </g>
        ) : (
          <path d={emfPathD} fill="none" stroke={CHART_COLORS.compareC}
            strokeWidth={CANVAS_STYLE.stroke.objectLine} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {/* 焦点球与垂直指示线 */}
        <line x1={indicatorX} y1={yEmfMid - chartHalfH} x2={indicatorX} y2={yEmfMid + chartHalfH}
          stroke={CHART_COLORS.reference} strokeWidth={CANVAS_STYLE.stroke.chartRef}
          strokeDasharray="4,3" />
        <circle cx={indicatorX} cy={toEmfY(currentState.emf)} r="4"
          fill={CHART_COLORS.compareC} stroke="white" strokeWidth="1.5" />
        <text x={indicatorX + 6}
          y={Math.max(yEmfMid - chartHalfH + 10, Math.min(yEmfMid + chartHalfH - 4, toEmfY(currentState.emf) - 6))}
          fontSize={font(10)} fill={CHART_COLORS.compareC} fontWeight="bold">
          E={currentState.emf.toFixed(2)} V
        </text>

        {/* 时间轴刻度数字 */}
        <g fontSize={font(9)} fill={CHART_COLORS.tickLabel}>
          {[0, 2.5, 5.0, 7.5, 10.0].map((tVal) => (
            <text key={`tick-${tVal}`} x={toChartX(tVal)} y={yEmfMid + chartHalfH + 12} textAnchor="middle">
              {tVal.toFixed(1)}
            </text>
          ))}
        </g>
      </g>
    </g>
  )
}
