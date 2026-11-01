import { useChartContext } from './ChartContext'
import { CHART_COLORS, REFERENCE_MAP, SERIES_MAP, STROKE, DASH, FONT } from '@/theme/physics'
import type { ChartReferenceVariant, ChartSeriesVariant } from '@/theme/physics'

interface ChartCursorPoint {
  y: number
  label: string
  series?: ChartSeriesVariant
}

interface ChartCursorProps {
  x: number
  dataPoints: ChartCursorPoint[]
  formatValue?: (v: number) => string
  crosshairVariant?: ChartReferenceVariant
  showLabels?: boolean
  toSvgX?: (v: number) => number
  toSvgY?: (v: number) => number
  plotOrigin?: { x: number; y: number }
  plotSize?: { width: number; height: number }
  font?: (v: number) => number
}

/**
 * 各 series 的基础垂直偏移乘数（正值 = 向下，负值 = 向上）。
 * 这是"默认站位"，只负责让多系列一开始就别挤在一起；真正的防叠字靠下面
 * `resolveLabelOffsets` 的实测错开——站位的取值本身不承担避让责任。
 */
const SERIES_VSHIFT_MAP: Record<string, number> = {
  primary: 0,
  warm: 1.4,
  success: -1.4,
  secondary: 0.7,
  accent: -0.7,
}

/** 一行标签占几倍小字号（字号 11 时 14.3px，接近文字行高） */
const LABEL_LINE_RATIO = 1.3

/** 标签纵向夹在绘图区内：越界会被标题带 / 坐标轴压住，或直接被 svg 裁掉 */
const clampLabelY = (y: number, top: number, bottom: number) => Math.min(Math.max(y, top), bottom)

/**
 * 让同一游标上的多个标签互相错开：按顺序放置，只要与已放好的标签纵向不足一行，
 * 就贴到那一行下面，而不是死磕 series 站位。
 *
 * 【为什么不能只靠 series 站位】原来 secondary/accent 用 ±0.7 倍小字号，比文字行高
 * （约 1.27 倍）还小，两个系列数值相同时必然叠字——实测 `anim-free-fall` 在 t=0
 * 时 v 与羽毛都是 0，两个标签只差 7.7px、垂直重叠 6px。但把站位整体拉大到整行又会
 * 把本来不重叠的标签推进别的内容里（`anim-momentum-conservation` 的附加系列标签
 * 因此撞上右上的图例「A球」）。所以分两步：站位只做粗排，实测重叠才下推一行。
 *
 * 数值不相撞时偏移与旧实现完全一致，保证既有画面的观感不变。
 */
function resolveLabelOffsets(
  pys: number[],
  seriesSlots: Array<string | undefined>,
  smallFont: number,
): number[] {
  const lineH = smallFont * LABEL_LINE_RATIO
  const placed: number[] = []
  return pys.map((py, idx) => {
    let y = py + (SERIES_VSHIFT_MAP[seriesSlots[idx] ?? ''] ?? 0) * smallFont
    // 与已放置的标签逐行下推，最多推 4 行，防止病态参数下无限循环
    for (let guard = 0; guard < 4; guard++) {
      const hit = placed.find((q) => Math.abs(q - y) < lineH)
      if (hit === undefined) break
      y = hit + lineH
    }
    placed.push(y)
    return y - py
  })
}

export function ChartCursor({
  x,
  dataPoints,
  formatValue = (v) => v.toFixed(2),
  crosshairVariant = 'default',
  showLabels = true,
  toSvgX: toSvgXProp,
  toSvgY: toSvgYProp,
  plotOrigin: plotOriginProp,
  plotSize: plotSizeProp,
  font: fontProp,
}: ChartCursorProps) {
  const ctx = useChartContext()
  const toSvgX = toSvgXProp ?? ctx?.toSvgX
  const toSvgY = toSvgYProp ?? ctx?.toSvgY
  const plotOrigin = plotOriginProp ?? ctx?.plotOrigin
  const plotSize = plotSizeProp ?? ctx?.plotSize
  const fontFn = fontProp ?? ctx?.font

  if (!toSvgX || !toSvgY || !plotOrigin || !plotSize || !fontFn) {
    return null
  }

  const cursorX = toSvgX(x)
  const lineColor = REFERENCE_MAP[crosshairVariant]
  const smallFont = fontFn(FONT.small)

  // ── 左边界渐进偏移：游标靠近左边缘时，标签向右推移避免与 Y 轴刻度重叠 ──
  const edgeZone = plotSize.width * 0.1
  const maxEdgeOffset = smallFont * 2.5
  const distFromLeft = cursorX - plotOrigin.x
  const edgeOffset = distFromLeft < edgeZone
    ? maxEdgeOffset * (1 - distFromLeft / edgeZone)
    : 0

  /**
   * 每个点的标签偏移（相对各自的数据点）。
   * 先按 series 站位粗排，再实测错开——同一点上多个系列数值相同是常态而非偶然
   * （所有曲线都从 t=0 的同一起点出发），只靠站位挡不住。
   */
  const labelOffsets = resolveLabelOffsets(
    dataPoints.map((pt) => toSvgY(pt.y)),
    dataPoints.map((pt) => pt.series),
    smallFont,
  )

  /** 标签基线的上下界：上不越过绘图区上沿（那里是图表标题），下不越过底边 */
  const labelTop = plotOrigin.y + smallFont * 0.95
  const labelBottom = plotOrigin.y + plotSize.height - smallFont * 0.25

  return (
    <g>
      <line
        x1={cursorX} y1={plotOrigin.y}
        x2={cursorX} y2={plotOrigin.y + plotSize.height}
        stroke={lineColor}
        strokeWidth={STROKE.chartRef}
        strokeDasharray={DASH.tangent.join(' ')}
      />

      {dataPoints.map((pt, idx) => {
        const py = toSvgY(pt.y)
        const color = pt.series ? SERIES_MAP[pt.series] : CHART_COLORS.primary
        const labelY = clampLabelY(py + (labelOffsets[idx] ?? 0), labelTop, labelBottom)
        return (
          <g key={`cursor-${idx}`}>
            <circle cx={cursorX} cy={py} r={smallFont * 0.4} fill={color} opacity={0.3} />
            <circle cx={cursorX} cy={py} r={smallFont * 0.25} fill={color} stroke={CHART_COLORS.highlight} strokeWidth={1.5} />
            {showLabels && (
              <text
                x={cursorX + smallFont * 0.6 + edgeOffset}
                y={labelY}
                fontSize={smallFont}
                fill={color}
                fontWeight="bold"
              >
                {pt.label}={formatValue(pt.y)}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
