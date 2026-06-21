import { useMemo } from 'react'
import { PHYSICS_COLORS, CHART_COLORS, STROKE, DASH, OPACITY, withAlpha, CANVAS_COLORS } from '@/theme/physics'
import { computeWorkFSeries } from '@/physics/work'

const FS_LAYOUT = {
  topPaddingRatio: 0.08,
  bottomPaddingRatio: 0.12,
  leftPaddingRatio: 0.10,
  rightPaddingRatio: 0.06,
} as const

interface WorkFSChartProps {
  canvasSize: { width: number; height: number }
  font: (size: number) => number
  F: number
  angleDeg: number
  m: number
  mu: number
  g: number
  sTarget: number
  currentS: number
  mode: 0 | 1
}

export function WorkFSChart({
  canvasSize,
  font,
  F,
  angleDeg,
  m,
  mu,
  g,
  sTarget,
  currentS,
  mode,
}: WorkFSChartProps) {
  const angleRad = (angleDeg * Math.PI) / 180
  const Fx = F * Math.cos(angleRad)

  const layout = useMemo(() => {
    const top = canvasSize.height * FS_LAYOUT.topPaddingRatio
    const bottom = canvasSize.height * FS_LAYOUT.bottomPaddingRatio
    const left = canvasSize.width * FS_LAYOUT.leftPaddingRatio
    const right = canvasSize.width * FS_LAYOUT.rightPaddingRatio
    return {
      top,
      bottom,
      left,
      right,
      chartW: canvasSize.width - left - right,
      chartH: canvasSize.height - top - bottom,
    }
  }, [canvasSize.width, canvasSize.height])

  const fsSeries = useMemo(
    () => computeWorkFSeries(F, angleDeg, m, mu, g, sTarget),
    [F, angleDeg, m, mu, g, sTarget]
  )

  const FS_AXIS = { sMax: 20, fMax: 50 } as const

  const sMax = FS_AXIS.sMax
  const fMax = FS_AXIS.fMax

  const toX = (s: number) => layout.left + (s / sMax) * layout.chartW
  const toY = (f: number) => layout.top + layout.chartH - (f / fMax) * layout.chartH

  if (mode === 0) {
    return (
      <BasicFSCanvas
        layout={layout}
        font={font}
        Fx={Fx}
        sMax={sMax}
        fMax={fMax}
        currentS={currentS}
        toX={toX}
        toY={toY}
      />
    )
  }

  return (
    <AdvancedFSCanvas
      layout={layout}
      font={font}
      sMax={sMax}
      fMax={fMax}
      currentS={currentS}
      toX={toX}
      toY={toY}
      fsSeries={fsSeries}
    />
  )
}

// ─── 基础模式：单线 Fx 水平线 + 面积阴影 ─────────────────────────────

function BasicFSCanvas({
  layout,
  font,
  Fx,
  sMax,
  fMax,
  currentS,
  toX,
  toY,
}: {
  layout: { left: number; top: number; chartW: number; chartH: number }
  font: (size: number) => number
  Fx: number
  sMax: number
  fMax: number
  currentS: number
  toX: (s: number) => number
  toY: (f: number) => number
}) {
  const yFx = toY(Math.max(0, Fx))

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
        const s = (i / 5) * sMax
        return (
          <g key={`xs-${i}`}>
            <line x1={toX(s)} y1={layout.top + layout.chartH} x2={toX(s)} y2={layout.top + layout.chartH + 4}
              stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={toX(s)} y={layout.top + layout.chartH + font(10) + 4}
              fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="middle">
              {s.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left + layout.chartW / 2} y={layout.top + layout.chartH + font(14)}
        fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle">
        s (m)
      </text>

      {/* Y 轴刻度 */}
      {Array.from({ length: 6 }, (_, i) => {
        const f = (i / 5) * fMax
        return (
          <g key={`yf-${i}`}>
            <line x1={layout.left - 4} y1={toY(f)} x2={layout.left} y2={toY(f)}
              stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={layout.left - font(10) - 2} y={toY(f) + font(3)}
              fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="end">
              {f.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left - font(18)} y={layout.top + layout.chartH / 2}
        fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle"
        transform={`rotate(-90, ${layout.left - font(18)}, ${layout.top + layout.chartH / 2})`}>
        F (N)
      </text>

      {/* 理论总功面积（浅色参照，始终可见） */}
      {Fx > 0 && (
        <rect
          x={toX(0)}
          y={yFx}
          width={toX(sMax) - toX(0)}
          height={toY(0) - yFx}
          fill={withAlpha(PHYSICS_COLORS.work, 0.06)}
          stroke="none"
        />
      )}

      {/* 已做功面积（深色实际，随 currentS 增长） */}
      {Fx > 0 && currentS > 0 && (
        <rect
          x={toX(0)}
          y={yFx}
          width={toX(currentS) - toX(0)}
          height={toY(0) - yFx}
          fill={withAlpha(PHYSICS_COLORS.work, 0.2)}
          stroke="none"
        />
      )}

      {/* Fx 水平线 */}
      <line x1={toX(0)} y1={yFx} x2={toX(sMax)} y2={yFx}
        stroke={PHYSICS_COLORS.appliedForce} strokeWidth={STROKE.vectorMain} />

      {/* 当前 s 游标 */}
      <g>
        <line x1={toX(currentS)} y1={layout.top + layout.chartH}
          x2={toX(currentS)} y2={yFx}
          stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.guide.join(',')} opacity={OPACITY.guide} />
        <circle cx={toX(currentS)} cy={yFx} r={font(4)}
          fill={PHYSICS_COLORS.appliedForce} stroke={CANVAS_COLORS.grid} strokeWidth={1.5} />
      </g>

      {/* 标注 */}
      <text x={toX(sMax * 0.7)} y={yFx - font(8)}
        fontSize={font(9)} fill={PHYSICS_COLORS.appliedForce} fontWeight="bold">
        Fx = {Fx.toFixed(2)} N
      </text>
      <text x={toX(sMax * 0.4)} y={layout.top + layout.chartH * 0.5}
        fontSize={font(10)} fill={PHYSICS_COLORS.work} fontWeight="bold" opacity={0.7}>
        面积 = Fx·s = W
      </text>
    </g>
  )
}

// ─── 进阶模式：多线复合 F-s + 面积阴影 ─────────────────────────────

function AdvancedFSCanvas({
  layout,
  font,
  sMax,
  fMax,
  currentS,
  toX,
  toY,
  fsSeries,
}: {
  layout: { left: number; top: number; chartW: number; chartH: number }
  font: (size: number) => number
  sMax: number
  fMax: number
  currentS: number
  toX: (s: number) => number
  toY: (f: number) => number
  fsSeries: Array<{ s: number; WF: number; Wf_abs: number; Wnet: number }>
}) {
  const cutIdx = fsSeries.findIndex((p) => p.s > currentS)
  const visibleSeries = cutIdx === -1 ? fsSeries : fsSeries.slice(0, Math.max(2, cutIdx + 1))

  const wfPath = visibleSeries.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.s)} ${toY(p.WF)}`
  ).join(' ')

  const wfAreaPath = visibleSeries.length > 1
    ? `M ${toX(visibleSeries[0].s)} ${toY(0)} ` +
      visibleSeries.map((p) => `L ${toX(p.s)} ${toY(p.WF)}`).join(' ') +
      ` L ${toX(visibleSeries[visibleSeries.length - 1].s)} ${toY(0)} Z`
    : ''

  const wfPathFull = fsSeries.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.s)} ${toY(p.WF)}`
  ).join(' ')

  const wfaPath = visibleSeries.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.s)} ${toY(p.Wf_abs)}`
  ).join(' ')

  const wfaAreaPath = visibleSeries.length > 1
    ? `M ${toX(visibleSeries[0].s)} ${toY(0)} ` +
      visibleSeries.map((p) => `L ${toX(p.s)} ${toY(p.Wf_abs)}`).join(' ') +
      ` L ${toX(visibleSeries[visibleSeries.length - 1].s)} ${toY(0)} Z`
    : ''

  const wfaPathFull = fsSeries.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.s)} ${toY(p.Wf_abs)}`
  ).join(' ')

  const wnetPathFull = fsSeries.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p.s)} ${toY(p.Wnet)}`
  ).join(' ')

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
        const s = (i / 5) * sMax
        return (
          <g key={`xs-${i}`}>
            <line x1={toX(s)} y1={layout.top + layout.chartH} x2={toX(s)} y2={layout.top + layout.chartH + 4}
              stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={toX(s)} y={layout.top + layout.chartH + font(10) + 4}
              fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="middle">
              {s.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left + layout.chartW / 2} y={layout.top + layout.chartH + font(14)}
        fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle">
        s (m)
      </text>

      {/* Y 轴刻度 */}
      {Array.from({ length: 6 }, (_, i) => {
        const f = (i / 5) * fMax
        return (
          <g key={`yf-${i}`}>
            <line x1={layout.left - 4} y1={toY(f)} x2={layout.left} y2={toY(f)}
              stroke={CHART_COLORS.tickMark} strokeWidth={STROKE.tick} />
            <text x={layout.left - font(10) - 2} y={toY(f) + font(3)}
              fontSize={font(9)} fill={CHART_COLORS.tickLabel} textAnchor="end">
              {f.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left - font(18)} y={layout.top + layout.chartH / 2}
        fontSize={font(10)} fill={CHART_COLORS.labelText} textAnchor="middle"
        transform={`rotate(-90, ${layout.left - font(18)}, ${layout.top + layout.chartH / 2})`}>
        W / |f|·s (J)
      </text>

      {/* 网格线 */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = toX((i / 5) * sMax)
        return (
          <line key={`gx-${i}`} x1={x} y1={layout.top} x2={x} y2={layout.top + layout.chartH}
            stroke={CHART_COLORS.gridLine} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        )
      })}

      {/* WF 面积阴影（绿色） */}
      {wfAreaPath && (
        <path d={wfAreaPath} fill={withAlpha(PHYSICS_COLORS.work, 0.12)} stroke="none" />
      )}

      {/* |Wf| 面积阴影（棕色） */}
      {wfaAreaPath && (
        <path d={wfaAreaPath} fill={withAlpha(PHYSICS_COLORS.friction, 0.12)} stroke="none" />
      )}

      {/* WF 完整曲线（灰色参考线） */}
      <path d={wfPathFull} fill="none" stroke={CHART_COLORS.reference}
        strokeWidth={STROKE.vectorThin} strokeDasharray={DASH.guide.join(',')} />

      {/* |Wf| 完整曲线（灰色参考线） */}
      <path d={wfaPathFull} fill="none" stroke={CHART_COLORS.reference}
        strokeWidth={STROKE.vectorThin} strokeDasharray={DASH.guide.join(',')} />

      {/* WF 实际曲线（绿色实线） */}
      <path d={wfPath} fill="none" stroke={PHYSICS_COLORS.work}
        strokeWidth={STROKE.vectorMain} strokeLinecap="round" />

      {/* |Wf| 实际曲线（棕色实线） */}
      <path d={wfaPath} fill="none" stroke={PHYSICS_COLORS.friction}
        strokeWidth={STROKE.vectorMain} strokeLinecap="round" />

      {/* Wnet 曲线（橙色虚线） */}
      <path d={wnetPathFull} fill="none" stroke={PHYSICS_COLORS.forceNet}
        strokeWidth={STROKE.vectorMain} strokeDasharray={DASH.boundary.join(',')} />

      {/* 当前 s 游标 */}
      <line x1={toX(currentS)} y1={layout.top + layout.chartH}
        x2={toX(currentS)} y2={layout.top}
        stroke={CHART_COLORS.axisLine} strokeWidth={STROKE.vectorThin}
        strokeDasharray={DASH.guide.join(',')} opacity={OPACITY.guide} />

      {/* 图例 */}
      <g transform={`translate(${layout.left + layout.chartW - font(90)}, ${layout.top + font(6)})`}>
        <line x1={0} y1={font(4)} x2={font(16)} y2={font(4)}
          stroke={PHYSICS_COLORS.work} strokeWidth={STROKE.vectorMain} />
        <text x={font(20)} y={font(7)} fontSize={font(9)} fill={PHYSICS_COLORS.work} fontWeight="bold">
          WF (正功)
        </text>
        <line x1={0} y1={font(18)} x2={font(16)} y2={font(18)}
          stroke={PHYSICS_COLORS.friction} strokeWidth={STROKE.vectorMain} />
        <text x={font(20)} y={font(21)} fontSize={font(9)} fill={PHYSICS_COLORS.friction} fontWeight="bold">
          |Wf| (摩擦)
        </text>
        <line x1={0} y1={font(32)} x2={font(16)} y2={font(32)}
          stroke={PHYSICS_COLORS.forceNet} strokeWidth={STROKE.vectorMain}
          strokeDasharray={DASH.boundary.join(',')} />
        <text x={font(20)} y={font(35)} fontSize={font(9)} fill={PHYSICS_COLORS.forceNet} fontWeight="bold">
          Wnet (合功)
        </text>
      </g>
    </g>
  )
}
