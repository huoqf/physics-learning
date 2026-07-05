import { useMemo, useCallback, type ReactNode } from 'react';
import { ChartContext, type ChartContextValue } from './ChartContext';
import { CHART_COLORS, CHART_LAYOUT, FONT, STROKE, DASH } from '@/theme/physics';
import { useCanvasSize, smartFormat } from '@/utils';

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

/**
 * BasePhysicsChart 基础物理图表组件 Props 接口。
 * 所有物理图表的基础设施，提供坐标系、网格、刻度等通用功能。
 */
export interface BasePhysicsChartProps {
  /**
   * X 轴物理坐标范围 [min, max]。
   */
  xDomain: [number, number];
  /**
   * Y 轴物理坐标范围 [min, max]。
   */
  yDomain: [number, number];
  /**
   * X 轴标签文本。
   */
  xLabel: string;
  /**
   * Y 轴标签文本。
   */
  yLabel: string;
  /**
   * 图表标题（显示在图表上方）。
   */
  title?: string;
  /**
   * 图表变体。
   * - 'standard': 标准尺寸图表
   * - 'mini': 迷你尺寸图表，适用于嵌入式展示
   * @default 'standard'
   */
  variant?: 'standard' | 'mini';
  /**
   * 初始尺寸（用于响应式图表）。
   * 不传则使用主题中的默认尺寸。
   */
  initialSize?: { width: number; height: number };
  /**
   * 固定尺寸模式：直接指定图表像素宽高，跳过 useCanvasSize DOM 测量。
   * 用于嵌入主 SVG（无需 foreignObject）等场景。传入后返回纯 <g> 而非 <div>+<svg>。
   */
  fixedSize?: { width: number; height: number };
  /**
   * 网格线数量配置。
   * 不传则使用主题中的默认值。
   */
  gridCount?: { x?: number; y?: number };
  /**
   * X 轴刻度格式化函数。
   * 不传则使用智能格式化（自动选择科学计数法或小数位）。
   */
  formatX?: (v: number) => string;
  /**
   * Y 轴刻度格式化函数。
   * 不传则使用智能格式化（自动选择科学计数法或小数位）。
   */
  formatY?: (v: number) => string;
  /**
   * y 轴基准线位置（物理坐标），默认为 yDomain[0]。
   * 设为 0 可实现双向 Y 轴（正负值都有显示）。
   */
  yBaseline?: number;
  /**
   * 是否显示网格线。
   * @default true
   */
  showGrid?: boolean;
  /**
   * 第二 Y 轴物理坐标范围 [min, max]（双 Y 轴支持）。
   */
  yDomain2?: [number, number];
  /**
   * 第二 Y 轴标签文本。
   */
  yLabel2?: string;
  /**
   * 第二 Y 轴刻度格式化函数。
   */
  formatY2?: (v: number) => string;
  /**
   * 第二 y 轴基准线位置（物理坐标），默认为 yDomain2[0]。
   */
  yBaseline2?: number;
  /**
   * 子元素（图表插件内容，如曲线、面积、游标等）。
   */
  children?: ReactNode;
  /**
   * 额外的 CSS 类名。
   */
  className?: string;
}

/**
 * BasePhysicsChart 基础物理图表组件
 *
 * 【设计意图】
 * 1. 提供所有物理图表的基础设施：坐标系、网格、刻度、标签等。
 * 2. 支持响应式和固定尺寸两种模式，适应不同使用场景。
 * 3. 通过 ChartContext 向子组件传递坐标转换函数，实现插件化架构。
 * 4. 支持自定义格式化函数、网格数量、基准线等，满足个性化需求。
 *
 * @example
 * ```tsx
 * // 基础图表
 * <BasePhysicsChart
 *   xDomain={[0, 10]}
 *   yDomain={[0, 100]}
 *   xLabel="t (s)"
 *   yLabel="v (m/s)"
 *   title="速度-时间图像"
 * />
 *
 * // 带子组件的图表
 * <BasePhysicsChart
 *   xDomain={[0, 10]}
 *   yDomain={[-5, 5]}
 *   xLabel="t (s)"
 *   yLabel="a (m/s²)"
 *   yBaseline={0}
 * >
 *   <ChartLine points={data} />
 *   <ChartCursor x={currentTime} />
 * </BasePhysicsChart>
 * ```
 */
export function BasePhysicsChart({
  xDomain,
  yDomain,
  xLabel,
  yLabel,
  title,
  variant = 'standard',
  initialSize,
  fixedSize,
  gridCount,
  formatX,
  formatY,
  yBaseline,
  showGrid = true,
  children,
  className = '',
  yDomain2,
  yLabel2,
  formatY2,
  yBaseline2,
}: BasePhysicsChartProps) {
  const isMini = variant === 'mini';
  const initW = initialSize?.width ?? (isMini ? CHART_LAYOUT.miniWidth : CHART_LAYOUT.defaultWidth);
  const initH =
    initialSize?.height ?? (isMini ? CHART_LAYOUT.miniHeight : CHART_LAYOUT.defaultHeight);

  const [containerRef, autoSize] = useCanvasSize({ width: initW, height: initH });

  const useFixed = fixedSize != null;
  const width = useFixed ? fixedSize.width : autoSize.width;
  const height = useFixed ? fixedSize.height : autoSize.height;
  const px = useMemo(() => (useFixed ? (v: number) => v : autoSize.px), [useFixed, autoSize.px]);
  const font = useMemo(
    () => (useFixed ? (v: number) => clamp(v, 7, 16) : autoSize.font),
    [useFixed, autoSize.font]
  );

  const isCompactHeight = height < 220;
  const marginTopVal = isCompactHeight
    ? 16
    : isMini
      ? CHART_LAYOUT.miniMarginTop
      : CHART_LAYOUT.marginTop;
  const marginBottomVal = isCompactHeight
    ? 38
    : isMini
      ? CHART_LAYOUT.miniMarginBottom
      : CHART_LAYOUT.marginBottom;

  // ── 动态 margin：确保窄屏下标签不重叠、不截断 ──
  const axisFontSize = font(isMini ? FONT.small : FONT.axis);
  const rawLeft = px(isMini ? CHART_LAYOUT.miniMarginLeft : CHART_LAYOUT.marginLeft);
  const rawBottom = px(marginBottomVal);
  // 左侧：Y 轴刻度文字(textAnchor="end") + Y 轴旋转标签所需空间
  const autoLeft = Math.max(rawLeft, axisFontSize * 3.2 + px(5) + 4 + font(isMini ? 12 : 18));
  // 底部：X 轴刻度文字高度 + X 轴标签高度 + 间距
  const autoBottom = Math.max(rawBottom, axisFontSize + px(12) + px(6));

  const margin = {
    left: autoLeft,
    right: yDomain2
      ? Math.max(autoLeft, px(isMini ? CHART_LAYOUT.miniMarginLeft : CHART_LAYOUT.marginLeft))
      : px(isMini ? CHART_LAYOUT.miniMarginRight : CHART_LAYOUT.marginRight),
    top: px(marginTopVal),
    bottom: autoBottom,
  };

  const plotW = Math.max(10, width - margin.left - margin.right);
  const plotH = Math.max(10, height - margin.top - margin.bottom);

  const xRange = Math.max(Number.EPSILON, xDomain[1] - xDomain[0]);
  const yRange = Math.max(Number.EPSILON, yDomain[1] - yDomain[0]);

  const xScale = plotW / xRange;
  const yScale = plotH / yRange;

  const toSvgX = useCallback(
    (physX: number) => margin.left + (physX - xDomain[0]) * xScale,
    [margin.left, xDomain, xScale]
  );

  const baseline = yBaseline ?? yDomain[0];
  const baselineY = margin.top + plotH - (baseline - yDomain[0]) * yScale;
  const toSvgY = useCallback(
    (physY: number) => baselineY - (physY - baseline) * yScale,
    [baselineY, baseline, yScale]
  );

  const yRange2 = yDomain2 ? Math.max(Number.EPSILON, yDomain2[1] - yDomain2[0]) : 0;
  const yScale2 = yDomain2 ? plotH / yRange2 : 0;
  const baseline2 = yBaseline2 ?? (yDomain2 ? yDomain2[0] : 0);
  const baselineY2 = yDomain2 ? margin.top + plotH - (baseline2 - yDomain2[0]) * yScale2 : 0;
  const toSvgY2 = useMemo(
    () => (yDomain2 ? (physY2: number) => baselineY2 - (physY2 - baseline2) * yScale2 : undefined),
    [yDomain2, baselineY2, baseline2, yScale2]
  );

  const adaptiveGrid = useMemo(() => {
    const baseX = gridCount?.x ?? (isMini ? CHART_LAYOUT.miniGridCountX : CHART_LAYOUT.gridCountX);
    const baseY = gridCount?.y ?? (isMini ? CHART_LAYOUT.miniGridCountY : CHART_LAYOUT.gridCountY);
    const tiny = plotW < px(CHART_LAYOUT.minWidth) || plotH < px(CHART_LAYOUT.minHeight);
    const compact = plotW < px(CHART_LAYOUT.compactWidth) || plotH < px(CHART_LAYOUT.compactHeight);
    if (tiny) return { x: CHART_LAYOUT.minGridX, y: CHART_LAYOUT.minGridY };
    if (compact) return { x: CHART_LAYOUT.compactGridX, y: CHART_LAYOUT.compactGridY };
    return { x: baseX, y: baseY };
  }, [gridCount, plotW, plotH, isMini, px]);

  const tickFormatX = formatX ?? smartFormat;
  const tickFormatY = formatY ?? smartFormat;
  const tickFormatY2 = formatY2 ?? smartFormat;

  const effectiveGrid = useMemo(() => {
    const fontSize = font(isMini ? FONT.small : FONT.axis);
    let gx = adaptiveGrid.x;
    let gy = adaptiveGrid.y;

    const ySpacing = plotH / gy;
    const yMinRequired = fontSize * 1.6;
    if (ySpacing < yMinRequired) {
      gy = Math.max(2, Math.floor(plotH / yMinRequired));
    }

    const maxLabelW = Array.from({ length: gx + 1 }, (_, i) => {
      const val = xDomain[0] + (xRange * i) / gx;
      return tickFormatX(val).length * fontSize * 0.6;
    }).reduce((a, b) => Math.max(a, b), 0);
    const xSpacing = plotW / gx;
    if (xSpacing < maxLabelW + 4) {
      gx = Math.max(2, Math.floor(plotW / (maxLabelW + 4)));
    }

    return { x: gx, y: gy };
  }, [adaptiveGrid, plotW, plotH, font, isMini, xDomain, xRange, tickFormatX]);

  const ctx: ChartContextValue = useMemo(
    () => ({
      toSvgX,
      toSvgY,
      toSvgY2,
      plotOrigin: { x: margin.left, y: margin.top },
      plotSize: { width: plotW, height: plotH },
      font,
      px,
    }),
    [toSvgX, toSvgY, toSvgY2, margin.left, margin.top, plotW, plotH, font, px]
  );

  const chartContent = (
    <>
      {/* 标题 */}
      {title && (
        <text
          x={margin.left}
          y={margin.top - px(isMini ? 5 : 7)}
          fontSize={font(isMini ? FONT.small : FONT.axis)}
          fill={CHART_COLORS.titleText}
          fontWeight='bold'
        >
          {title}
        </text>
      )}

      {/* Y 轴网格线 */}
      {showGrid &&
        Array.from({ length: effectiveGrid.y + 1 }, (_, idx) => {
          const gridY = margin.top + (plotH * idx) / effectiveGrid.y;
          return (
            <line
              key={`grid-y-${idx}`}
              x1={margin.left}
              y1={gridY}
              x2={margin.left + plotW}
              y2={gridY}
              stroke={CHART_COLORS.gridLine}
              strokeWidth={STROKE.guide}
              strokeDasharray={DASH.guide.join(',')}
            />
          );
        })}

      {/* X 轴网格线 */}
      {showGrid &&
        Array.from({ length: effectiveGrid.x + 1 }, (_, idx) => {
          const gridX = margin.left + (plotW * idx) / effectiveGrid.x;
          return (
            <line
              key={`grid-x-${idx}`}
              x1={gridX}
              y1={margin.top}
              x2={gridX}
              y2={margin.top + plotH}
              stroke={CHART_COLORS.gridLine}
              strokeWidth={STROKE.guide}
              strokeDasharray={DASH.guide.join(',')}
            />
          );
        })}

      {/* 坐标轴线 */}
      <line
        x1={margin.left}
        y1={baselineY}
        x2={margin.left + plotW}
        y2={baselineY}
        stroke={CHART_COLORS.axisLine}
        strokeWidth={STROKE.axisBold}
      />
      <line
        x1={margin.left}
        y1={margin.top}
        x2={margin.left}
        y2={margin.top + plotH}
        stroke={CHART_COLORS.axisLine}
        strokeWidth={STROKE.axisBold}
      />

      {/* 零刻度虚线（仅当 baseline 不在绘图区底部时显示） */}
      {baseline !== yDomain[0] && (
        <line
          x1={margin.left}
          y1={toSvgY(0)}
          x2={margin.left + plotW}
          y2={toSvgY(0)}
          stroke={CHART_COLORS.zeroline}
          strokeWidth={STROKE.reference}
          strokeDasharray={DASH.reference.join(',')}
        />
      )}

      {/* X 轴刻度 */}
      {Array.from({ length: effectiveGrid.x + 1 }, (_, i) => {
        const val = xDomain[0] + (xRange * i) / effectiveGrid.x;
        const x = toSvgX(val);
        return (
          <g key={`xval-${i}`}>
            <line
              x1={x}
              y1={margin.top + plotH}
              x2={x}
              y2={margin.top + plotH - px(isMini ? 3 : 4)}
              stroke={CHART_COLORS.tickMark}
              strokeWidth={STROKE.tick}
            />
            <text
              x={x}
              y={margin.top + plotH + font(isMini ? FONT.small : FONT.axis) + px(3)}
              fontSize={font(isMini ? FONT.small : FONT.axis)}
              fill={CHART_COLORS.tickLabel}
              textAnchor='middle'
              fontFamily='monospace'
            >
              {tickFormatX(val)}
            </text>
          </g>
        );
      })}

      {/* Y 轴刻度 */}
      {Array.from({ length: effectiveGrid.y + 1 }, (_, i) => {
        const val = yDomain[0] + (yRange * i) / effectiveGrid.y;
        const y = toSvgY(val);
        return (
          <g key={`yval-${i}`}>
            <line
              x1={margin.left - px(isMini ? 2 : 3)}
              y1={y}
              x2={margin.left}
              y2={y}
              stroke={CHART_COLORS.tickMark}
              strokeWidth={STROKE.tick}
            />
            <text
              x={margin.left - px(isMini ? 4 : 5)}
              y={y + font(isMini ? FONT.small : FONT.axis) * 0.35}
              fontSize={font(isMini ? FONT.small : FONT.axis)}
              fill={CHART_COLORS.tickLabel}
              textAnchor='end'
              fontFamily='monospace'
            >
              {tickFormatY(val)}
            </text>
          </g>
        );
      })}

      {/* X 轴标签 */}
      <text
        x={margin.left + plotW / 2}
        y={margin.top + plotH + font(isMini ? FONT.small : FONT.axis) + px(isMini ? 8 : 12)}
        fontSize={font(isMini ? FONT.small : FONT.axis)}
        fill={CHART_COLORS.labelText}
        textAnchor='middle'
        fontWeight='bold'
      >
        {xLabel}
      </text>

      {/* Y 轴标签 */}
      <text
        x={margin.left - font(isMini ? 12 : 18)}
        y={margin.top + plotH / 2}
        fontSize={font(isMini ? FONT.small : FONT.axis)}
        fill={CHART_COLORS.labelText}
        textAnchor='middle'
        fontWeight='bold'
        transform={`rotate(-90, ${margin.left - font(isMini ? 12 : 18)}, ${margin.top + plotH / 2})`}
      >
        {yLabel}
      </text>

      {/* 第二 Y 轴线 */}
      {yDomain2 && (
        <line
          x1={margin.left + plotW}
          y1={margin.top}
          x2={margin.left + plotW}
          y2={margin.top + plotH}
          stroke={CHART_COLORS.axisLine}
          strokeWidth={STROKE.axisBold}
        />
      )}

      {/* 第二 Y 轴刻度 */}
      {yDomain2 &&
        Array.from({ length: effectiveGrid.y + 1 }, (_, i) => {
          const val = yDomain2[0] + (yRange2 * i) / effectiveGrid.y;
          const y = toSvgY2 ? toSvgY2(val) : 0;
          return (
            <g key={`y2val-${i}`}>
              <line
                x1={margin.left + plotW}
                y1={y}
                x2={margin.left + plotW + px(isMini ? 2 : 3)}
                y2={y}
                stroke={CHART_COLORS.tickMark}
                strokeWidth={STROKE.tick}
              />
              <text
                x={margin.left + plotW + px(isMini ? 4 : 5)}
                y={y + font(isMini ? FONT.small : FONT.axis) * 0.35}
                fontSize={font(isMini ? FONT.small : FONT.axis)}
                fill={CHART_COLORS.tickLabel}
                textAnchor='start'
                fontFamily='monospace'
              >
                {tickFormatY2(val)}
              </text>
            </g>
          );
        })}

      {/* 第二 Y 轴标签 */}
      {yDomain2 && yLabel2 && (
        <text
          x={margin.left + plotW + font(isMini ? 12 : 18)}
          y={margin.top + plotH / 2}
          fontSize={font(isMini ? FONT.small : FONT.axis)}
          fill={CHART_COLORS.labelText}
          textAnchor='middle'
          fontWeight='bold'
          transform={`rotate(90, ${margin.left + plotW + font(isMini ? 12 : 18)}, ${margin.top + plotH / 2})`}
        >
          {yLabel2}
        </text>
      )}

      {/* 插槽内容 */}
      {children}
    </>
  );

  if (useFixed) {
    return <ChartContext.Provider value={ctx}>{chartContent}</ChartContext.Provider>;
  }

  return (
    <ChartContext.Provider value={ctx}>
      <div ref={containerRef} className={`w-full h-full min-h-0 ${className}`}>
        <svg width={width} height={height} className='w-full h-full select-none'>
          {chartContent}
        </svg>
      </div>
    </ChartContext.Provider>
  );
}
