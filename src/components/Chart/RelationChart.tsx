import { useMemo } from 'react'
import { BasePhysicsChart } from './BasePhysicsChart'
import { useChartContext } from './ChartContext'
import { interpolateY } from './interpolation'
import {
  PHYSICS_COLORS,
  CHART_COLORS,
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

function RCContent({
  points,
  additionalSeries,
  cursorX,
  cursorLabel,
  cursorVariant,
  markers,
  series,
  color,
  strokeWidth,
  mainLabel,
  underlay,
  children,
}: RelationChartProps) {
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

  if (!ctx) return null
  const { toSvgX, toSvgY, plotOrigin, plotSize, font } = ctx
  const cursorColor = REFERENCE_MAP[cursorVariant ?? 'highlight']

  return (
    <g>
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

      {/* 标记点 / 参考线（底层参考） */}
      {markers?.map((m, i) => {
        const mColor = m.color ?? CHART_COLORS.equilibrium
        // 推断 axis：未指定时按 x/y 齐全度判断
        const axis: 'vertical' | 'horizontal' | 'point' =
          m.axis ?? (m.x != null && m.y != null ? 'point' : m.x != null ? 'vertical' : 'horizontal')

        if (axis === 'vertical' && m.x != null) {
          const mx = toSvgX(m.x)
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
              {/* X 轴外短刻度 */}
              <line
                x1={mx} y1={plotOrigin.y + plotSize.height}
                x2={mx} y2={plotOrigin.y + plotSize.height + 6}
                stroke={mColor} strokeWidth={STROKE.tick}
              />
              {m.label && (
                <text
                  x={mx}
                  y={plotOrigin.y + plotSize.height + font(FONT.small) + 6}
                  fontSize={font(FONT.small)}
                  fill={mColor}
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
          return (
            <g key={`marker-${i}`}>
              <circle
                cx={mx} cy={my} r={3.5}
                fill={mColor} stroke={CHART_COLORS.highlight} strokeWidth={1.2}
              />
              {m.label && (
                <text
                  x={mx + 6}
                  y={my - 6}
                  fontSize={font(FONT.small)}
                  fill={mColor}
                  textAnchor="start"
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

      {/* 主曲线（画在辅助线上方，确保实线不被遮盖） */}
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
                {cursorLabel && (() => {
                  const txt = cursorLabel(cp.x, cp.y)
                  if (txt == null) return null
                  return (
                    <text
                      x={toSvgX(cursorX) + font(FONT.small) * 0.6}
                      y={cy - font(FONT.small) * 0.4}
                      fontSize={font(FONT.small)}
                      fill={cp.color}
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
    >
      <RCContent
        points={points}
        additionalSeries={additionalSeries}
        cursorX={cursorX}
        cursorLabel={cursorLabel}
        cursorVariant={cursorVariant}
        markers={markers}
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
