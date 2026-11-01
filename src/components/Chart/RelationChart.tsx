import { useMemo, useId } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { interpolateY } from './interpolation'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
  CANVAS_COLORS,
  SERIES_MAP,
  REFERENCE_MAP,
  STROKE,
  DASH,
  FONT,
} from '@/theme/physics'
import type { ChartSeriesVariant, ChartReferenceVariant } from '@/theme/physics'

/**
 * 通用关系图 (Y = f(X))。
 *
 * 与 *-TimeChart 系列的区别：
 * - 时间图：`points` 随 currentTime 动态增长 → 需要 `domainPoints` 解耦绘制 vs 定标
 * - 关系图：`points` 一开始就是整段静态曲线 → 直接用 `points` 定标即稳定，无需 domainPoints
 *
 * 典型用途：F-r、E-r、Ep-r、1/u-1/v、v-r、T-r、F-V 等任意 Y=f(X) 函数图像
 *
 * 设计要点：
 * - `cursorX`：当前 X 值，自动在 points 中线性插值出 y 并画十字标 + 圆点
 * - `markers`：特殊点 / 参考线（y 省略时画整条 vertical 虚线）
 * - `additionalSeries`：多曲线（同坐标系），与 VelocityTimeChart 的 API 完全对齐
 * - `showZeroLine`：当 Y 可正可负时显示零基准虚线
 *
 * ⚠️ **使用前提（重要）**：
 * `RelationChart` 假设 `points` 表示**整条完整曲线**，与坐标轴定标用的是同一份数据。
 * 这适用于：物理函数图像（一次性算出整段曲线静态展示）、对比图等场景。
 *
 * **不适用于「随时间逐步揭示」场景**。如果调用方按某个进度变量截断 `points`，
 * 自动 `yDomain` 会随之扩张，重现 `VelocityTimeChart` 早期那种「曲线被时间拉斜」
 * 的视觉错觉（见 commit bbd1108）。
 *
 * 此类需求的两种解法：
 *   1. 推荐：调用方传完整 `points`，自己控制可见部分（如用 SVG `<clipPath>` 或
 *      过滤渲染），坐标轴定标与可见性解耦。
 *   2. 后续如需求强烈，可仿照 *-TimeChart 加 `domainPoints` 字段，
 *      让定标使用完整轨迹、绘制使用截断轨迹。
 */

export interface RelationDataSeries {
  /** 数据点序列（物理坐标） */
  points: { x: number; y: number }[]
  /** 系列标签（图例显示） */
  label?: string
  /** 曲线颜色变体 */
  series?: ChartSeriesVariant
  /** 自定义颜色（覆盖 series 映射） */
  color?: string
  /** 线宽，默认 2 */
  strokeWidth?: number
  /** 虚线模式，例如 [4, 4] */
  strokeDasharray?: number[]
}

export interface RelationMarker {
  /**
   * 标记类型：
   * - `'vertical'`（默认）：以 `x` 定位的垂直参考线 / 单点
   * - `'horizontal'`：以 `y` 定位的水平参考线 / 单点
   * - `'point'`：必须同时给 `x` 和 `y`，画一个标记点（不画十字线）
   *
   * 等价规则：当 axis 未给出时，按 `x` / `y` 是否齐全自动推断：
   * - 只给 `x` → `vertical`
   * - 只给 `y` → `horizontal`
   * - 同时给 `x` 和 `y` → `point`
   */
  axis?: 'vertical' | 'horizontal' | 'point'
  /** X 坐标（vertical / point 用） */
  x?: number
  /** Y 坐标（horizontal / point 用） */
  y?: number
  /** 标签文本 */
  label?: string
  /** 颜色，默认 equilibrium 色 */
  color?: string
  /**
   * 点标记（axis: 'point'）的标签方位，默认 `'top-right'`（点右上方）。
   *
   * 默认值对"下降曲线"和"位于曲线末端的点"都安全，但对**上升直线的中间点**不安全：
   * 右上方正是直线的延伸方向，文字会被整条画上去的曲线穿过。
   * 上升直线的中间点用 `'bottom-right'`（右下是直线下侧的空白区）；
   * 点贴近 Y 轴时不要用左侧（`'top-left' / 'bottom-left'`），那会挤到坐标轴上。
   */
  labelSide?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** 垂直或水平参考线标签位置：'top' (绘图区顶部内侧) | 'bottom' (默认，坐标轴下方刻度区) */
  position?: 'top' | 'bottom'
}

export interface RelationChartProps {
  /** 主曲线数据点（物理坐标） */
  points: { x: number; y: number }[]
  /** 额外曲线（同坐标系叠加） */
  additionalSeries?: RelationDataSeries[]
  /** X 轴范围；不传则基于所有 series 自动计算 */
  xDomain?: [number, number]
  /** Y 轴范围；不传则基于所有 series 自动计算（含 0 基准 + 15% padding） */
  yDomain?: [number, number]
  /** X 轴标签 */
  xLabel: string
  /** Y 轴标签 */
  yLabel: string
  /** 标题 */
  title?: string
  /**
   * 当前 X 值；传入时自动在 points 中线性插值 y、画十字标 + 圆点 +（可选）数值标注。
   * 不传则不画游标。
   */
  cursorX?: number
  /** 游标标签格式化函数；返回 null 则只画圆点不画文本 */
  cursorLabel?: (x: number, y: number) => string | null
  /** 游标线颜色变体 */
  cursorVariant?: ChartReferenceVariant
  /** 是否显示 Y=0 虚线（当 yDomain 跨越 0 时建议开启） */
  showZeroLine?: boolean
  /** 是否显示网格 */
  showGrid?: boolean
  /** 特殊点 / 参考线标记 */
  markers?: RelationMarker[]
  /** 主曲线颜色变体 */
  series?: ChartSeriesVariant
  /** 主曲线自定义颜色（覆盖 series） */
  color?: string
  /** 主曲线线宽，默认 2 */
  strokeWidth?: number
  /** 主曲线的图例标签；若不传，则当 series 为 'primary' 时默认显示 '主' */
  mainLabel?: string
  /** 绘制在曲线下方的插件层（如面积填充） */
  underlay?: React.ReactNode
  /** 绘制在曲线上方的插件层（如微元切割、教学注释） */
  children?: React.ReactNode
  /**
   * 图表容器设计基准尺寸（透传给 BasePhysicsChart 的 initialSize）。
   * 当图表嵌入 foreignObject 等小容器时，传入实际容器尺寸可避免 useCanvasSize
   * 用默认 700×400 基准导致 scale 过小、字体被 clamp 到 7px。
   * 不传则用 BasePhysicsChart 默认值。
   */
  initialSize?: { width: number; height: number }
  /**
   * 固定尺寸模式：直接指定图表像素宽高，跳过 DOM 测量。
   * 用于嵌入主 SVG（无需 foreignObject）等场景。
   */
  fixedSize?: { width: number; height: number }
  /** 图表变体（standard / mini），透传给 BasePhysicsChart */
  variant?: 'standard' | 'mini'
  /** 额外 className */
  className?: string
  /**
   * 图区内横向拖拽回调：给出指针处的**物理 X 值**（换算已在图表内部按真实绘图区完成）。
   * 不传则图表不响应拖拽。
   */
  onScrubX?: (physX: number) => void
  /** 拖拽开始（指针按在绘图区内时触发） */
  onScrubStart?: () => void
  /** 拖拽结束 */
  onScrubEnd?: () => void
}

function buildPath(
  pts: { x: number; y: number }[],
  toSvgX: (v: number) => number,
  toSvgY: (v: number) => number,
): string {
  if (pts.length < 2) return ''
  return (
    'M ' +
    pts
      .map((p) => `${toSvgX(p.x).toFixed(2)},${toSvgY(p.y).toFixed(2)}`)
      .join(' L ')
  )
}

/**
 * 标签估算宽度（px）：拉丁字符 0.6em、CJK 1em。等宽估算够用，判"能不能放下/会不会咬合"
 * 不需要精确到像素，宁可多算一点。
 */
function labelWidth(label: string, fontSize: number): number {
  return [...label].reduce(
    (w, ch) => w + (/[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(ch) ? fontSize : fontSize * 0.6),
    0,
  )
}

/**
 * 行规划只能在"还没有绘图区"的阶段跑，字号也只能按标称 11 估。
 * ⚠️ 一旦拿得到 `ctx.font(FONT.small)`（设计坐标系里的真实字号，可能 7~16），
 * 就必须改用真实字号重算——两处坐标空间不同，混用会漏判咬合。
 */
const EST_FONT = 11
const estimateLabelWidth = (label: string) => labelWidth(label, EST_FONT)

/** 估算绘图区宽度：只在行规划里当分母用 */
const EST_PLOT_W = 320
/** 标签窄于这个宽度就不值得独占一行——它塞得进相邻两根刻度之间 */
const MIN_ANNOTATION_W = 56

/**
 * 给 vertical 参考线标注分配行号。
 *
 * 【要解决的问题】底部只有"刻度行 + X 轴标题行"两行，参考线标注原先画在刻度行里，
 * 于是与同位置的刻度数字必然重叠：`anim-inclined-plane` 的 `θc = 16.7°` 压住刻度
 * `18.0`、`anim-nuclear-decay` 的 `强相互作用力平衡点 (r ≈ 0.8 fm)` 一条压住 2~3 根刻度。
 *
 * 【怎么分配】按标注在 X 域里的相对位置和估算宽度占一个横向区间，与已占用的区间
 * 相交就下沉一行。行数上限 3（再多会把 130px 高的 MiniChart 绘图区压没）。
 *
 * 返回 markerIndex → 行号；不在表里的 marker 仍按旧位置画（短标签如 `s`、`R`、`P额`
 * 塞得进刻度之间，不动它们，避免为了"看起来整齐"把 15px 绘图区从 46 张图里切掉）。
 */
function planMarkerRows(
  markers: RelationMarker[] | undefined,
  xDomain: [number, number],
): { rows: Map<number, number>; count: number } {
  const rows = new Map<number, number>()
  if (!markers?.length) return { rows, count: 0 }
  const span = xDomain[1] - xDomain[0] || 1
  const occupied: Array<Array<[number, number]>> = []
  let count = 0
  markers.forEach((m, i) => {
    const axis = m.axis ?? (m.x != null && m.y != null ? 'point' : m.x != null ? 'vertical' : 'horizontal')
    if (axis !== 'vertical' || m.x == null || !m.label) return
    const w = estimateLabelWidth(m.label)
    if (w < MIN_ANNOTATION_W) return
    const half = w / EST_PLOT_W / 2
    const center = (m.x - xDomain[0]) / span
    const lo = center - half
    const hi = center + half
    let row = 0
    while (row < 3 && (occupied[row] ?? []).some(([a, b]) => lo < b && hi > a)) row++
    if (row >= 3) return
    ;(occupied[row] ??= []).push([lo, hi])
    rows.set(i, row)
    count = Math.max(count, row + 1)
  })
  return { rows, count }
}

function RCContent({
  points,
  additionalSeries,
  cursorX,
  cursorLabel,
  cursorVariant,
  markers,
  markerRows,
  series,
  color,
  strokeWidth,
  mainLabel,
  underlay,
  children,
}: RelationChartProps & { markerRows?: Map<number, number> }) {
  const plotClipId = useId()
  const ctx = useChartContext()
  const mainColor = color ?? SERIES_MAP[series ?? 'primary']

  const mainPath = useMemo(() => {
    if (!ctx) return ''
    return buildPath(points, ctx.toSvgX, ctx.toSvgY)
  }, [ctx, points])

  const extraPaths = useMemo(() => {
    if (!ctx || !additionalSeries?.length) return []
    return additionalSeries.map((s) => ({
      d: buildPath(s.points, ctx.toSvgX, ctx.toSvgY),
      color: s.color ?? (s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement),
      strokeWidth: s.strokeWidth ?? 2,
      strokeDasharray: s.strokeDasharray,
      label: s.label,
    }))
  }, [ctx, additionalSeries])

  // 游标：对主曲线 + 额外曲线分别插值
  const cursorPoints = useMemo(() => {
    if (cursorX == null) return []
    const out: Array<{ x: number; y: number; color: string; label?: string }> = []
    const yMain = interpolateY(points, cursorX)
    if (yMain != null) out.push({ x: cursorX, y: yMain, color: mainColor })
    additionalSeries?.forEach((s) => {
      const y = interpolateY(s.points, cursorX)
      if (y != null) {
        out.push({
          x: cursorX,
          y,
          color: s.color ?? (s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement),
          label: s.label,
        })
      }
    })
    return out
  }, [cursorX, points, additionalSeries, mainColor])

  /**
   * point 型参考点的标签落位。
   *
   * 两处硬伤在这里修掉：
   *  ① **叠点**——实时状态点与参考点重合是常态（`anim-first-law` 在 t=0 时
   *    「初态 A (300K)」与「(1.00L, 100kPa)」落在同一像素上，标签直接对穿 47×9px）。
   *    与游标标签同一套规则：横向有交集且纵向不足一行就继续让行。
   *  ② **越界**——标签默认向右伸展，点靠近右沿时会压到右轴刻度上
   *    （`anim-experiment-bulb-va` 的测点标签压住右轴 `0.20`）。放不下就翻到点左侧。
   */
  const pointLabels = useMemo(() => {
    const out = new Map<number, { x: number; y: number; anchor: 'start' | 'end' }>()
    if (!ctx || !markers?.length) return out
    const small = ctx.font(FONT.small)
    /**
     * 让行间距。文字外框高度约 1.3 倍字号，判定"压字"的门槛是垂直重叠 ≥ 0.5 倍字号，
     * 所以基线间距必须大于 1.3 - 0.5 = 0.8 倍字号才算真正错开；取 1.5 倍留余量
     * （1.3 倍时实测仍有 9px 重叠——`anim-combined-fields` 的核素标签就是这么露的）。
     */
    const lineH = small * 1.5
    const rightEdge = ctx.plotOrigin.x + ctx.plotSize.width
    const bottomEdge = ctx.plotOrigin.y + ctx.plotSize.height - small * 0.2
    const placed: Array<{ left: number; right: number; y: number }> = []
    markers.forEach((m, i) => {
      const axis =
        m.axis ?? (m.x != null && m.y != null ? 'point' : m.x != null ? 'vertical' : 'horizontal')
      if (axis !== 'point' || m.x == null || m.y == null || !m.label) return
      const mx = ctx.toSvgX(m.x)
      const my = ctx.toSvgY(m.y)
      // 用设计坐标系里的真实字号算宽度：小图字号 7、大图 15，差一倍，按 11 硬估会漏判
      const w = labelWidth(m.label, small)
      const side = m.labelSide ?? 'top-right'
      const preferLeft = side.endsWith('left') || mx + 6 + w > rightEdge
      const anchor: 'start' | 'end' = preferLeft ? 'end' : 'start'
      const lx = mx + (preferLeft ? -6 : 6)
      /**
       * 判定咬合用**实际横向占位**（左/右边缘），不能用锚点位置。
       * `textAnchor` 一换，锚点没动而文字整体翻到另一侧——
       * `anim-combined-fields` 的 `α 粒子 (⁴He²⁺)` 正因为靠右沿被翻到左侧，
       * 锚点离邻居 173px 看着"很远"，实际左边缘已压到 `氘核 (²H⁺)` 上 7px。
       */
      const left = anchor === 'start' ? lx : lx - w
      const right = anchor === 'start' ? lx + w : lx
      let ly = side.startsWith('bottom') ? my + small + 2 : my - 6
      for (let guard = 0; guard < 3; guard++) {
        const hit = placed.find(
          (p) => Math.abs(p.y - ly) < lineH && left < p.right + 4 && right > p.left - 4,
        )
        if (!hit) break
        // 向下让行；已经顶到绘图区底边时改为向上——否则会被下面的夹取压回原位，等于没让
        const down = hit.y + lineH
        ly = down <= bottomEdge ? down : hit.y - lineH
      }
      ly = Math.min(ly, bottomEdge)
      placed.push({ left, right, y: ly })
      out.set(i, { x: lx, y: ly, anchor })
    })
    return out
  }, [ctx, markers])

  if (!ctx) return null
  const { toSvgX, toSvgY, plotOrigin, plotSize, font, annotationY } = ctx
  const cursorColor = REFERENCE_MAP[cursorVariant ?? 'highlight']

  return (
    <g>
      {/* 绘图盒裁剪边界（保护曲线永不溢出坐标轴绘图区） */}
      <defs>
        <clipPath id={plotClipId}>
          <rect
            x={plotOrigin.x}
            y={plotOrigin.y}
            width={plotSize.width}
            height={plotSize.height}
          />
        </clipPath>
      </defs>

      {/* 曲线内容区（受 clipPath 严格约束） */}
      <g clipPath={`url(#${plotClipId})`}>
        {/* 插件底层（面积/背景增强） */}
        {underlay}

        {/* 额外曲线（先画，主曲线压在上面） */}
        {extraPaths.map((p, i) =>
          p.d ? (
            <path
              key={`extra-${i}`}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              strokeDasharray={p.strokeDasharray?.join(' ')}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null,
        )}

        {/* 主曲线 */}
        {mainPath && (
          <path
            d={mainPath}
            fill="none"
            stroke={mainColor}
            strokeWidth={strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>

      {/* 标记点 / 参考线（底层参考） */}
      {markers?.map((m, i) => {
        const mColor = m.color ?? CHART_COLORS.equilibrium
        // 推断 axis：未指定时按 x/y 齐全度判断
        const axis: 'vertical' | 'horizontal' | 'point' =
          m.axis ?? (m.x != null && m.y != null ? 'point' : m.x != null ? 'vertical' : 'horizontal')

        if (axis === 'vertical' && m.x != null) {
          const mx = toSvgX(m.x)
          const isTop = m.position === 'top'
          /**
           * 标注落在哪一行：
           *  - `top` 由调用方显式指定，画在绘图区上沿内侧；
           *  - 排进 `planMarkerRows` 的，画在父图表预留的标注行（刻度行之下、X 轴标题之上）；
           *  - 其余（短标签）沿用旧位置，紧贴刻度行下方——它们塞得进刻度之间。
           */
          const annRow = markerRows?.get(i)
          const labelY = isTop
            ? plotOrigin.y + 14
            : annRow !== undefined && annotationY
              ? annotationY(annRow)
              : plotOrigin.y + plotSize.height + font(FONT.small) + 6
          return (
            <g key={`marker-${i}`}>
              <line
                x1={mx} y1={plotOrigin.y}
                x2={mx} y2={plotOrigin.y + plotSize.height}
                stroke={mColor}
                strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')}
                opacity={0.6}
              />
              {/* X 轴外短刻度 (仅在刻度行模式下渲染) */}
              {!isTop && (
                <line
                  x1={mx} y1={plotOrigin.y + plotSize.height}
                  x2={mx} y2={plotOrigin.y + plotSize.height + 6}
                  stroke={mColor} strokeWidth={STROKE.tick}
                />
              )}
              {m.label && (
                <text
                  x={mx}
                  y={labelY}
                  fontSize={font(FONT.small)}
                  fill={mColor}
                  stroke={CANVAS_COLORS.white}
                  strokeWidth={isTop ? 3 : 0}
                  strokeLinejoin="round"
                  paintOrder="stroke fill"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {m.label}
                </text>
              )}
            </g>
          )
        }

        if (axis === 'horizontal' && m.y != null) {
          const my = toSvgY(m.y)
          return (
            <g key={`marker-${i}`}>
              <line
                x1={plotOrigin.x} y1={my}
                x2={plotOrigin.x + plotSize.width} y2={my}
                stroke={mColor}
                strokeWidth={STROKE.reference}
                strokeDasharray={DASH.reference.join(' ')}
                opacity={0.6}
              />
              {m.label && (
                <text
                  x={plotOrigin.x + plotSize.width - 4}
                  y={my - 4}
                  fontSize={font(FONT.small)}
                  fill={mColor}
                  textAnchor="end"
                  fontWeight="bold"
                >
                  {m.label}
                </text>
              )}
            </g>
          )
        }

        // axis === 'point'：必须同时有 x 和 y
        if (axis === 'point' && m.x != null && m.y != null) {
          const mx = toSvgX(m.x)
          const my = toSvgY(m.y)
          const side = m.labelSide ?? 'top-right'
          // 落位由 pointLabels 统一算好（叠点让行 + 右沿翻边），这里只取结果
          const pos = pointLabels.get(i)
          const labelX = pos?.x ?? mx + (side.endsWith('left') ? -6 : 6)
          const labelY = pos?.y ?? (side.startsWith('bottom') ? my + font(FONT.small) + 2 : my - 6)
          const labelAnchor = pos?.anchor ?? (side.endsWith('left') ? 'end' : 'start')
          return (
            <g key={`marker-${i}`}>
              <circle
                cx={mx} cy={my} r={3.5}
                fill={mColor} stroke={CHART_COLORS.highlight} strokeWidth={1.2}
              />
              {m.label && (
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={font(FONT.small)}
                  fill={mColor}
                  textAnchor={labelAnchor}
                  fontWeight="bold"
                >
                  {m.label}
                </text>
              )}
            </g>
          )
        }

        return null
      })}

      {/* 游标辅助线（垂直 + 水平虚线，画在主曲线下方） */}
      {cursorX != null && cursorPoints.length > 0 && (
        <g>
          {/* 垂直参考线 */}
          <line
            x1={toSvgX(cursorX)} y1={plotOrigin.y}
            x2={toSvgX(cursorX)} y2={plotOrigin.y + plotSize.height}
            stroke={cursorColor}
            strokeWidth={STROKE.chartRef}
            strokeDasharray={DASH.tangent.join(' ')}
            opacity={0.65}
          />
          {/* 水平参考线（只对第一个点画） */}
          {cursorPoints[0] && (
            <line
              x1={plotOrigin.x} y1={toSvgY(cursorPoints[0].y)}
              x2={plotOrigin.x + plotSize.width} y2={toSvgY(cursorPoints[0].y)}
              stroke={cursorColor}
              strokeWidth={STROKE.chartRef}
              strokeDasharray={DASH.tangent.join(' ')}
              opacity={0.4}
            />
          )}
        </g>
      )}

      {/* 主曲线（画在辅助线上方，确保实线不被遮盖；带绘图盒裁剪） */}
      {mainPath && (
        <g clipPath={`url(#${plotClipId})`}>
          <path
            d={mainPath}
            fill="none"
            stroke={mainColor}
            strokeWidth={strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* 游标圆点 + 数值标签（画在主曲线上方） */}
      {cursorX != null && cursorPoints.length > 0 && (
        <g>
          {cursorPoints.map((cp, i) => {
            const cy = toSvgY(cp.y)
            return (
              <g key={`cursor-pt-${i}`}>
                <circle
                  cx={toSvgX(cursorX)} cy={cy} r={font(FONT.small) * 0.45}
                  fill={cp.color} stroke={CHART_COLORS.highlight} strokeWidth={1.5}
                />
                {(() => {
                  /**
                   * **只有主曲线画读数，附加系列只画点。**
                   *
                   * 【为什么】`cursorLabel` 是单个函数，签名只有 `(x, y)`，拿不到
                   * "这是第几条曲线"。原实现对每个游标点都调它，于是
                   * `anim-intermolecular-forces` 的 F_引 / F_斥 两条附加曲线被标成
                   * 「F_合=0.00」——三个同样的前缀叠在同一个点上，既压字又标错量。
                   * 若改用附加系列自己的 `label` 拼数值，又会拼出
                   * 「模拟实际核数 (剩余: 100个)=100.00」这种没有价值的重话。
                   * 读数本来就是"一个游标一个数"，附加曲线的数值请走右屏物理量区。
                   */
                  if (i !== 0 || !cursorLabel) return null
                  const txt = cursorLabel(cp.x, cp.y)
                  if (txt == null) return null
                  /**
                   * 标签默认贴在数据点右上角。但初值点（t=0）几乎都落在绘图区上沿，
                   * 这个位置正好钻进图表标题带——实测 `anim-nuclear-half-life` 的
                   * 游标标签与「放射性元素衰变规律 (N-t 理论与实际对比)」重叠 98×11px，
                   * 白描边把标题啃掉一块。故靠近上沿时翻到点的下方，并整体夹在绘图区内。
                   */
                  const small = font(FONT.small)
                  const topLimit = plotOrigin.y + small * 0.95
                  const bottomLimit = plotOrigin.y + plotSize.height - small * 0.2
                  const labelY = Math.min(
                    Math.max(cy - small * 0.4 < topLimit ? cy + small * 1.15 : cy - small * 0.4, topLimit),
                    bottomLimit,
                  )
                  return (
                    <text
                      x={toSvgX(cursorX) + small * 0.6}
                      y={labelY}
                      fontSize={small}
                      fill={cp.color}
                      stroke={CANVAS_COLORS.white}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      paintOrder="stroke fill"
                      fontWeight="bold"
                    >
                      {txt}
                    </text>
                  )
                })()}
              </g>
            )
          })}
        </g>
      )}

      {/* 图例（多系列时显示） */}
      {additionalSeries && additionalSeries.length > 0 && (
        <g>
          {/* 主系列 */}
          <line
            x1={plotOrigin.x + plotSize.width - 130} y1={plotOrigin.y + 10}
            x2={plotOrigin.x + plotSize.width - 115} y2={plotOrigin.y + 10}
            stroke={mainColor} strokeWidth={2}
          />
          <text
            x={plotOrigin.x + plotSize.width - 110} y={plotOrigin.y + 13}
            fontSize={font(FONT.small)} fill={PHYSICS_COLORS.labelText}
          >
            {mainLabel ?? ((series ?? 'primary') === 'primary' ? '主' : '')}
          </text>
          {/* 额外系列 */}
          {additionalSeries.map((s, i) => {
            const c = s.color ?? (s.series ? SERIES_MAP[s.series] : PHYSICS_COLORS.displacement)
            const baseY = plotOrigin.y + 10 + (i + 1) * 14
            return (
              <g key={`legend-${i}`}>
                <line
                  x1={plotOrigin.x + plotSize.width - 130} y1={baseY}
                  x2={plotOrigin.x + plotSize.width - 115} y2={baseY}
                  stroke={c} strokeWidth={s.strokeWidth ?? 2}
                  strokeDasharray={s.strokeDasharray?.join(' ')}
                />
                <text
                  x={plotOrigin.x + plotSize.width - 110} y={baseY + 3}
                  fontSize={font(FONT.small)} fill={PHYSICS_COLORS.labelText}
                >
                  {s.label ?? `${i + 2}`}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {/* 插件顶层（微元切割、教学注释等） */}
      {children}
    </g>
  )
}

export function RelationChart({
  points,
  additionalSeries,
  xDomain,
  yDomain,
  xLabel,
  yLabel,
  title,
  cursorX,
  cursorLabel = (_x, y) => y.toFixed(2),
  cursorVariant = 'highlight',
  showZeroLine,
  showGrid = true,
  markers,
  series = 'primary',
  color,
  strokeWidth,
  mainLabel,
  underlay,
  children,
  initialSize,
  fixedSize,
  variant,
  className = '',
  onScrubX,
  onScrubStart,
  onScrubEnd,
}: RelationChartProps) {
  const computedXDomain = useMemo((): [number, number] => {
    if (xDomain) return xDomain
    const xs: number[] = points.map((p) => p.x)
    additionalSeries?.forEach((s) => s.points.forEach((p) => xs.push(p.x)))
    if (xs.length === 0) return [0, 1]
    const lo = Math.min(...xs)
    const hi = Math.max(...xs)
    const pad = (hi - lo) * 0.02 || 0.5
    return [lo - pad, hi + pad]
  }, [points, additionalSeries, xDomain])

  const computedYDomain = useMemo((): [number, number] => {
    if (yDomain) return yDomain
    const ys: number[] = points.map((p) => p.y)
    additionalSeries?.forEach((s) => s.points.forEach((p) => ys.push(p.y)))
    if (ys.length === 0) return [-1, 1]
    const lo = Math.min(0, ...ys)
    const hi = Math.max(0, ...ys)
    const pad = (hi - lo) * 0.15 || 1
    return [lo - pad, hi + pad]
  }, [points, additionalSeries, yDomain])

  // 自动判断是否需要零线：Y 跨越 0 时默认开启
  const effectiveZeroLine = showZeroLine ?? (computedYDomain[0] < 0 && computedYDomain[1] > 0)

  // 参考线标注的行规划：必须在渲染 BasePhysicsChart 之前算好，底边留白要按行数扩
  const markerPlan = useMemo(
    () => planMarkerRows(markers, computedXDomain),
    [markers, computedXDomain],
  )

  return (
    <BasePhysicsChart
      xDomain={computedXDomain}
      yDomain={computedYDomain}
      xLabel={xLabel}
      yLabel={yLabel}
      title={title}
      variant={variant}
      fixedSize={fixedSize}
      yBaseline={effectiveZeroLine ? 0 : undefined}
      showGrid={showGrid}
      initialSize={initialSize}
      className={className}
      onScrubX={onScrubX}
      onScrubStart={onScrubStart}
      onScrubEnd={onScrubEnd}
      extraBottomRows={markerPlan.count}
    >
      <RCContent
        points={points}
        additionalSeries={additionalSeries}
        cursorX={cursorX}
        cursorLabel={cursorLabel}
        cursorVariant={cursorVariant}
        markers={markers}
        markerRows={markerPlan.rows}
        series={series}
        color={color}
        strokeWidth={strokeWidth}
        mainLabel={mainLabel}
        underlay={underlay}
        children={children}
        xLabel={xLabel}
        yLabel={yLabel}
      />
    </BasePhysicsChart>
  )
}
