import { useMemo } from 'react'
import { PHYSICS_COLORS, CHART_COLORS, STROKE, DASH, OPACITY, withAlpha, CANVAS_COLORS } from '@/theme/physics'
import { computeWorkFSeries } from '@/physics/work'

/**
 * 功页面专用 F-s / W-s 教学图。
 *
 * 该组件不直接迁入 RelationChart，也暂不抽 ForceDisplacementChart：
 * - 基础/进阶双模式与 WorkAnimation 教学流程强绑定；
 * - 包含做功面积、动态揭示、当前位移游标、完整理论参考线与业务注释；
 * - 当前阶段只复用公共图表语义（domain/scale、reference/current、cursor/area token），
 *   不复用公共图表组件，避免污染 RelationChart 的通用 Y=f(X) 语义。
 */

const FS_LAYOUT = {
  topPaddingRatio: 0.08,
  bottomPaddingRatio: 0.12,
  leftPaddingRatio: 0.10,
  rightPaddingRatio: 0.06,
} as const

const WORK_FS_DOMAIN = {
  /** 保留原先 0~20m 的默认观察窗口；sTarget 超出时自动扩展 */
  minSMax: 20,
  /** Y 轴自动定标留白，与公共图表的 15% padding 规则保持一致 */
  yPaddingRatio: 0.15,
} as const

const WORK_FS_STYLE = {
  axisColor: CHART_COLORS.axisLine,
  gridColor: CHART_COLORS.gridLine,
  tickColor: CHART_COLORS.tickMark,
  tickLabelColor: CHART_COLORS.tickLabel,
  axisLabelColor: CHART_COLORS.labelText,
  referenceLineColor: CHART_COLORS.reference,
  cursorColor: CHART_COLORS.axisLine,
  cursorOpacity: OPACITY.guide,
  baselineColor: CHART_COLORS.zeroline,
  forceLineColor: PHYSICS_COLORS.appliedForce,
  workLineColor: PHYSICS_COLORS.work,
  frictionLineColor: PHYSICS_COLORS.friction,
  netWorkLineColor: PHYSICS_COLORS.forceNet,
  workAreaColor: withAlpha(PHYSICS_COLORS.work, 0.2),
  workReferenceAreaColor: withAlpha(PHYSICS_COLORS.work, 0.06),
  frictionAreaColor: withAlpha(PHYSICS_COLORS.friction, 0.12),
  advancedWorkAreaColor: withAlpha(PHYSICS_COLORS.work, 0.12),
} as const

type WorkFSeriesPoint = { s: number; WF: number; Wf_abs: number; Wnet: number }
type WorkFSLayout = { left: number; top: number; chartW: number; chartH: number }
type WorkFSDomain = { s: [number, number]; y: [number, number] }
type WorkFSScale = {
  toX: (s: number) => number
  toY: (y: number) => number
}

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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function computeLayout(canvasSize: { width: number; height: number }): WorkFSLayout {
  const top = canvasSize.height * FS_LAYOUT.topPaddingRatio
  const bottom = canvasSize.height * FS_LAYOUT.bottomPaddingRatio
  const left = canvasSize.width * FS_LAYOUT.leftPaddingRatio
  const right = canvasSize.width * FS_LAYOUT.rightPaddingRatio
  return {
    top,
    left,
    chartW: canvasSize.width - left - right,
    chartH: canvasSize.height - top - bottom,
  }
}

function computeDomain({
  mode,
  sTarget,
  Fx,
  fsSeries,
}: {
  mode: 0 | 1
  sTarget: number
  Fx: number
  fsSeries: WorkFSeriesPoint[]
}): WorkFSDomain {
  const sMax = Math.max(WORK_FS_DOMAIN.minSMax, sTarget)
  const yValues = mode === 0
    ? [Fx]
    : fsSeries.flatMap((p) => [p.WF, p.Wf_abs, p.Wnet])

  const rawMin = Math.min(0, ...yValues)
  const rawMax = Math.max(0, ...yValues)
  const span = rawMax - rawMin || 1
  const pad = span * WORK_FS_DOMAIN.yPaddingRatio

  return {
    s: [0, sMax],
    y: [rawMin - pad, rawMax + pad],
  }
}

function createScale(layout: WorkFSLayout, domain: WorkFSDomain): WorkFSScale {
  const [sMin, sMax] = domain.s
  const [yMin, yMax] = domain.y
  const sRange = Math.max(Number.EPSILON, sMax - sMin)
  const yRange = Math.max(Number.EPSILON, yMax - yMin)

  return {
    toX: (s: number) => layout.left + ((s - sMin) / sRange) * layout.chartW,
    toY: (y: number) => layout.top + layout.chartH - ((y - yMin) / yRange) * layout.chartH,
  }
}

function buildLinePath<T extends { s: number }>(
  points: T[],
  scale: WorkFSScale,
  getY: (p: T) => number,
): string {
  if (points.length < 2) return ''
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scale.toX(p.s).toFixed(2)} ${scale.toY(getY(p)).toFixed(2)}`)
    .join(' ')
}

function buildWorkAreaPath<T extends { s: number }>(
  points: T[],
  scale: WorkFSScale,
  getY: (p: T) => number,
): string {
  if (points.length < 2) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return [
    `M ${scale.toX(first.s).toFixed(2)} ${scale.toY(0).toFixed(2)}`,
    ...points.map((p) => `L ${scale.toX(p.s).toFixed(2)} ${scale.toY(getY(p)).toFixed(2)}`),
    `L ${scale.toX(last.s).toFixed(2)} ${scale.toY(0).toFixed(2)} Z`,
  ].join(' ')
}

function interpolateWorkPoint(a: WorkFSeriesPoint, b: WorkFSeriesPoint, s: number): WorkFSeriesPoint {
  const ratio = Math.abs(b.s - a.s) < 1e-9 ? 0 : (s - a.s) / (b.s - a.s)
  return {
    s,
    WF: a.WF + (b.WF - a.WF) * ratio,
    Wf_abs: a.Wf_abs + (b.Wf_abs - a.Wf_abs) * ratio,
    Wnet: a.Wnet + (b.Wnet - a.Wnet) * ratio,
  }
}

function getRevealedSeries(points: WorkFSeriesPoint[], currentS: number): WorkFSeriesPoint[] {
  if (points.length === 0) return []
  const minS = points[0].s
  const maxS = points[points.length - 1].s
  const s = clamp(currentS, minS, maxS)

  if (s <= minS + 1e-9) return [points[0]]
  const revealed = points.filter((p) => p.s <= s + 1e-9)
  const last = revealed[revealed.length - 1]
  if (Math.abs(last.s - s) < 1e-9) return revealed

  const next = points.find((p) => p.s > s)
  return next ? [...revealed, interpolateWorkPoint(last, next, s)] : revealed
}

function buildRectAreaGeometry({
  s0,
  s1,
  y,
  scale,
}: {
  s0: number
  s1: number
  y: number
  scale: WorkFSScale
}) {
  const x0 = scale.toX(s0)
  const x1 = scale.toX(s1)
  const y0 = scale.toY(0)
  const y1 = scale.toY(y)
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y0 - y1),
  }
}

function buildCursorGeometry({
  s,
  y,
  layout,
  scale,
  mode,
}: {
  s: number
  y: number
  layout: WorkFSLayout
  scale: WorkFSScale
  mode: 0 | 1
}) {
  const x = scale.toX(s)
  return {
    x,
    y: scale.toY(y),
    y1: mode === 0 ? scale.toY(0) : layout.top + layout.chartH,
    y2: mode === 0 ? scale.toY(y) : layout.top,
  }
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

  const layout = useMemo(() => computeLayout(canvasSize), [canvasSize])

  const fsSeries = useMemo(
    () => computeWorkFSeries(F, angleDeg, m, mu, g, sTarget),
    [F, angleDeg, m, mu, g, sTarget]
  )

  // domainPoints：完整理论数据，只用于稳定定标；renderPoints：由 currentS 截断的动态显示数据。
  const domain = useMemo(
    () => computeDomain({ mode, sTarget, Fx, fsSeries }),
    [mode, sTarget, Fx, fsSeries]
  )
  const scale = useMemo(() => createScale(layout, domain), [layout, domain])
  const clampedCurrentS = clamp(currentS, domain.s[0], domain.s[1])

  if (mode === 0) {
    return (
      <BasicFSCanvas
        layout={layout}
        font={font}
        Fx={Fx}
        domain={domain}
        currentS={clampedCurrentS}
        scale={scale}
      />
    )
  }

  return (
    <AdvancedFSCanvas
      layout={layout}
      font={font}
      domain={domain}
      currentS={clampedCurrentS}
      scale={scale}
      domainPoints={fsSeries}
    />
  )
}

function WorkFSAxes({
  layout,
  font,
  domain,
  scale,
  yLabel,
  showHorizontalGrid = true,
}: {
  layout: WorkFSLayout
  font: (size: number) => number
  domain: WorkFSDomain
  scale: WorkFSScale
  yLabel: string
  showHorizontalGrid?: boolean
}) {
  const xTicks = Array.from({ length: 6 }, (_, i) => domain.s[0] + ((domain.s[1] - domain.s[0]) * i) / 5)
  const yTicks = Array.from({ length: 6 }, (_, i) => domain.y[0] + ((domain.y[1] - domain.y[0]) * i) / 5)
  const baselineY = scale.toY(0)

  return (
    <g>
      {showHorizontalGrid && xTicks.map((s, i) => {
        const x = scale.toX(s)
        return (
          <line key={`gx-${i}`} x1={x} y1={layout.top} x2={x} y2={layout.top + layout.chartH}
            stroke={WORK_FS_STYLE.gridColor} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        )
      })}
      {showHorizontalGrid && yTicks.map((yVal, i) => {
        const y = scale.toY(yVal)
        return (
          <line key={`gy-${i}`} x1={layout.left} y1={y} x2={layout.left + layout.chartW} y2={y}
            stroke={WORK_FS_STYLE.gridColor} strokeWidth={STROKE.grid} strokeDasharray={DASH.guide.join(',')} />
        )
      })}

      {/* 坐标轴 */}
      <line x1={layout.left} y1={layout.top} x2={layout.left} y2={layout.top + layout.chartH}
        stroke={WORK_FS_STYLE.axisColor} strokeWidth={STROKE.axisBold} />
      <line x1={layout.left} y1={baselineY}
        x2={layout.left + layout.chartW} y2={baselineY}
        stroke={WORK_FS_STYLE.axisColor} strokeWidth={STROKE.axisBold} />

      {/* 零基准线：Y 轴跨 0 时辅助识别正/负功 */}
      {domain.y[0] < 0 && domain.y[1] > 0 && (
        <line x1={layout.left} y1={baselineY} x2={layout.left + layout.chartW} y2={baselineY}
          stroke={WORK_FS_STYLE.baselineColor} strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(',')} opacity={0.55} />
      )}

      {/* X 轴刻度 */}
      {xTicks.map((s, i) => {
        const x = scale.toX(s)
        return (
          <g key={`xs-${i}`}>
            <line x1={x} y1={baselineY} x2={x} y2={baselineY + 4}
              stroke={WORK_FS_STYLE.tickColor} strokeWidth={STROKE.tick} />
            <text x={x} y={layout.top + layout.chartH + font(10) + 4}
              fontSize={font(9)} fill={WORK_FS_STYLE.tickLabelColor} textAnchor="middle">
              {s.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left + layout.chartW / 2} y={layout.top + layout.chartH + font(14)}
        fontSize={font(10)} fill={WORK_FS_STYLE.axisLabelColor} textAnchor="middle">
        s (m)
      </text>

      {/* Y 轴刻度 */}
      {yTicks.map((yVal, i) => {
        const y = scale.toY(yVal)
        return (
          <g key={`yf-${i}`}>
            <line x1={layout.left - 4} y1={y} x2={layout.left} y2={y}
              stroke={WORK_FS_STYLE.tickColor} strokeWidth={STROKE.tick} />
            <text x={layout.left - font(10) - 2} y={y + font(3)}
              fontSize={font(9)} fill={WORK_FS_STYLE.tickLabelColor} textAnchor="end">
              {yVal.toFixed(1)}
            </text>
          </g>
        )
      })}
      <text x={layout.left - font(18)} y={layout.top + layout.chartH / 2}
        fontSize={font(10)} fill={WORK_FS_STYLE.axisLabelColor} textAnchor="middle"
        transform={`rotate(-90, ${layout.left - font(18)}, ${layout.top + layout.chartH / 2})`}>
        {yLabel}
      </text>
    </g>
  )
}

// ─── 基础模式：单线 Fx 水平线 + 面积阴影 ─────────────────────────────

function BasicFSCanvas({
  layout,
  font,
  Fx,
  domain,
  currentS,
  scale,
}: {
  layout: WorkFSLayout
  font: (size: number) => number
  Fx: number
  domain: WorkFSDomain
  currentS: number
  scale: WorkFSScale
}) {
  const yFx = scale.toY(Fx)
  const referenceArea = buildRectAreaGeometry({ s0: domain.s[0], s1: domain.s[1], y: Fx, scale })
  const revealedArea = buildRectAreaGeometry({ s0: domain.s[0], s1: currentS, y: Fx, scale })
  const cursor = buildCursorGeometry({ s: currentS, y: Fx, layout, scale, mode: 0 })

  return (
    <g>
      <WorkFSAxes layout={layout} font={font} domain={domain} scale={scale} yLabel="F (N)" />

      {/* 理论总功面积（浅色参照，始终可见） */}
      {Math.abs(Fx) > 1e-9 && (
        <rect {...referenceArea} fill={WORK_FS_STYLE.workReferenceAreaColor} stroke="none" />
      )}

      {/* 已做功面积（深色实际，随 currentS 增长） */}
      {Math.abs(Fx) > 1e-9 && currentS > domain.s[0] && (
        <rect {...revealedArea} fill={WORK_FS_STYLE.workAreaColor} stroke="none" />
      )}

      {/* Fx 完整理论参考线 */}
      <line x1={scale.toX(domain.s[0])} y1={yFx} x2={scale.toX(domain.s[1])} y2={yFx}
        stroke={WORK_FS_STYLE.referenceLineColor} strokeWidth={STROKE.vectorThin}
        strokeDasharray={DASH.guide.join(',')} opacity={0.45} />

      {/* Fx 当前已发生线段 */}
      {currentS > domain.s[0] && (
        <line x1={scale.toX(domain.s[0])} y1={yFx} x2={scale.toX(currentS)} y2={yFx}
          stroke={WORK_FS_STYLE.forceLineColor} strokeWidth={STROKE.vectorMain} strokeLinecap="round" />
      )}

      {/* 当前 s 游标 */}
      <g>
        <line x1={cursor.x} y1={cursor.y1} x2={cursor.x} y2={cursor.y2}
          stroke={WORK_FS_STYLE.cursorColor} strokeWidth={STROKE.vectorThin}
          strokeDasharray={DASH.guide.join(',')} opacity={WORK_FS_STYLE.cursorOpacity} />
        <circle cx={cursor.x} cy={cursor.y} r={font(4)}
          fill={WORK_FS_STYLE.forceLineColor} stroke={CANVAS_COLORS.grid} strokeWidth={1.5} />
      </g>

      {/* 标注 */}
      <text x={scale.toX(domain.s[0] + (domain.s[1] - domain.s[0]) * 0.7)} y={yFx - font(8)}
        fontSize={font(9)} fill={WORK_FS_STYLE.forceLineColor} fontWeight="bold">
        Fx = {Fx.toFixed(2)} N
      </text>
      <text x={scale.toX(domain.s[0] + (domain.s[1] - domain.s[0]) * 0.4)} y={layout.top + layout.chartH * 0.5}
        fontSize={font(10)} fill={WORK_FS_STYLE.workLineColor} fontWeight="bold" opacity={0.7}>
        面积 = Fx·s = W
      </text>
    </g>
  )
}

// ─── 进阶模式：多线复合 W-s + 面积阴影 ─────────────────────────────

function AdvancedFSCanvas({
  layout,
  font,
  domain,
  currentS,
  scale,
  domainPoints,
}: {
  layout: WorkFSLayout
  font: (size: number) => number
  domain: WorkFSDomain
  currentS: number
  scale: WorkFSScale
  domainPoints: WorkFSeriesPoint[]
}) {
  const renderPoints = getRevealedSeries(domainPoints, currentS)

  const wfPath = buildLinePath(renderPoints, scale, (p) => p.WF)
  const wfaPath = buildLinePath(renderPoints, scale, (p) => p.Wf_abs)
  const wfAreaPath = buildWorkAreaPath(renderPoints, scale, (p) => p.WF)
  const wfaAreaPath = buildWorkAreaPath(renderPoints, scale, (p) => p.Wf_abs)

  const wfPathFull = buildLinePath(domainPoints, scale, (p) => p.WF)
  const wfaPathFull = buildLinePath(domainPoints, scale, (p) => p.Wf_abs)
  const wnetPathFull = buildLinePath(domainPoints, scale, (p) => p.Wnet)
  const cursor = buildCursorGeometry({ s: currentS, y: 0, layout, scale, mode: 1 })

  return (
    <g>
      <WorkFSAxes layout={layout} font={font} domain={domain} scale={scale} yLabel="W / |f|·s (J)" />

      {/* WF 面积阴影（绿色，随 currentS 揭示） */}
      {wfAreaPath && (
        <path d={wfAreaPath} fill={WORK_FS_STYLE.advancedWorkAreaColor} stroke="none" />
      )}

      {/* |Wf| 面积阴影（棕色，随 currentS 揭示） */}
      {wfaAreaPath && (
        <path d={wfaAreaPath} fill={WORK_FS_STYLE.frictionAreaColor} stroke="none" />
      )}

      {/* WF / |Wf| 完整理论参考线 */}
      <path d={wfPathFull} fill="none" stroke={WORK_FS_STYLE.referenceLineColor}
        strokeWidth={STROKE.vectorThin} strokeDasharray={DASH.guide.join(',')} />
      <path d={wfaPathFull} fill="none" stroke={WORK_FS_STYLE.referenceLineColor}
        strokeWidth={STROKE.vectorThin} strokeDasharray={DASH.guide.join(',')} />

      {/* WF / |Wf| 当前已发生曲线 */}
      <path d={wfPath} fill="none" stroke={WORK_FS_STYLE.workLineColor}
        strokeWidth={STROKE.vectorMain} strokeLinecap="round" />
      <path d={wfaPath} fill="none" stroke={WORK_FS_STYLE.frictionLineColor}
        strokeWidth={STROKE.vectorMain} strokeLinecap="round" />

      {/* Wnet 完整曲线（橙色虚线，作为合功参考线） */}
      <path d={wnetPathFull} fill="none" stroke={WORK_FS_STYLE.netWorkLineColor}
        strokeWidth={STROKE.vectorMain} strokeDasharray={DASH.boundary.join(',')} />

      {/* 当前 s 游标 */}
      <line x1={cursor.x} y1={cursor.y1} x2={cursor.x} y2={cursor.y2}
        stroke={WORK_FS_STYLE.cursorColor} strokeWidth={STROKE.vectorThin}
        strokeDasharray={DASH.guide.join(',')} opacity={WORK_FS_STYLE.cursorOpacity} />

      {/* 图例 */}
      <g transform={`translate(${layout.left + layout.chartW - font(90)}, ${layout.top + font(6)})`}>
        <line x1={0} y1={font(4)} x2={font(16)} y2={font(4)}
          stroke={WORK_FS_STYLE.workLineColor} strokeWidth={STROKE.vectorMain} />
        <text x={font(20)} y={font(7)} fontSize={font(9)} fill={WORK_FS_STYLE.workLineColor} fontWeight="bold">
          WF (正功)
        </text>
        <line x1={0} y1={font(18)} x2={font(16)} y2={font(18)}
          stroke={WORK_FS_STYLE.frictionLineColor} strokeWidth={STROKE.vectorMain} />
        <text x={font(20)} y={font(21)} fontSize={font(9)} fill={WORK_FS_STYLE.frictionLineColor} fontWeight="bold">
          |Wf| (摩擦)
        </text>
        <line x1={0} y1={font(32)} x2={font(16)} y2={font(32)}
          stroke={WORK_FS_STYLE.netWorkLineColor} strokeWidth={STROKE.vectorMain}
          strokeDasharray={DASH.boundary.join(',')} />
        <text x={font(20)} y={font(35)} fontSize={font(9)} fill={WORK_FS_STYLE.netWorkLineColor} fontWeight="bold">
          Wnet (合功)
        </text>
      </g>
    </g>
  )
}
