/**
 * src/theme/physics/canvasStyle.ts
 * Canvas / SVG 绘制规范 — 线宽、透明度、字体、箭头、虚线、SVG 属性等非颜色属性
 *
 * ═══════════════════════════════════════════════════════════════════
 *  使用原则
 *  1. 所有绘制参数从此文件取，禁止魔法数字
 *  2. 单位均为逻辑像素（CSS px / SVG 用户单位），DPR 缩放由初始化层处理
 *  3. SVG_ATTR 提供"ready-to-spread"属性对象，可直接展开到 JSX/SVG 元素上
 *  4. STROKE / OPACITY / ARROW / OBJECT / FONT / DASH 与原 CANVAS_STYLE 完全兼容
 *
 *  ─── SVG 优先说明（当前项目主要使用 SVG）───────────────────────────────────
 *  SVG_ATTR  : 常用 SVG 属性预设（可直接 {...SVG_ATTR.vector} 展开到 <line/path>）
 *  SVG_MARKER: SVG <marker> 元素规范（箭头、点、十字）
 *  SVG_FILTER: SVG <filter> 发光/阴影效果参数
 *  SVG_ANIM  : SVG / CSS 动画时长与缓动（物理动画专用）
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── 线宽 (Stroke Width) ─────────────────────────────────────────────────────
export const STROKE = {
  // 矢量箭头（铁律：vectorMain = vectorSub × 1.5）
  vectorMain:       3,    // 主矢量（合力、速度）
  vectorSub:        2,    // 分量矢量
  vectorThin:       1.5,  // 细矢量（辅助示意）

  // 物体轮廓
  objectLine:       2,    // 物体/器材轮廓
  objectThin:       1.5,  // 薄壁/细轮廓

  // 坐标系
  axis:             1.5,  // 坐标轴
  axisBold:         2,    // 主轴（x=0 / y=0 加粗）
  grid:             1,    // 网格线
  tick:             1,    // 刻度线
  tickBold:         1.5,  // 主刻度线

  // 轨迹与辅助
  trackHistory:     1.5,  // 历史轨迹（配合 OPACITY.trackHistory = 0.4）
  reference:        1,    // 参考线、辅助线（配合 dashed）
  guide:            0.75, // 导引线（更细）
  annotation:       1,    // 标注线段

  // 图表曲线
  chartMain:        2.5,  // 图表主曲线
  chartSub:         1.5,  // 图表辅助曲线
  chartRef:         1,    // 图表参考线（dashed）

  // 装饰性
  hatch:            1,    // 斜线阴影（地面/墙面）
  groundLine:       3,    // 地面线/轨道线（视觉醒目，非矢量）
  trackLine:        3,    // 运动轨道线（圆轨道等）

  // 场线
  fieldLine:        1.5,  // 电场线/磁场线
  fieldLineThin:    1,    // 细场线

  // 切线
  tangent:          1.5,  // 切线
};

// ─── 透明度 (Opacity) ────────────────────────────────────────────────────────
export const OPACITY = {
  vectorSub:        0.7,  // 分量矢量
  vectorThin:       0.5,  // 细矢量
  trackHistory:     0.4,  // 历史轨迹
  grid:             0.3,  // 场景网格线
  gridChart:        0.15, // 图表网格线（比场景更轻，避免混淆主曲线）
  reference:        0.5,  // 参考线
  guide:            0.4,  // 导引线
  annotation:       0.8,  // 标注
  hatch:            0.15, // 斜线填充
  glow:             0.6,  // 发光效果
  shadow:           0.2,  // 阴影
};

// ─── 箭头规格 (Arrow) ────────────────────────────────────────────────────────
export const ARROW = {
  // markerEnd URL 引用（需在 SVG 中定义 <marker>）
  main:             '#arrow-main',
  sub:              '#arrow-sub',
  thin:             '#arrow-thin',
};

// ─── 物体尺寸 (Object Size) ─────────────────────────────────────────────────
export const OBJECT = {
  block:            40,   // 物块默认宽高
  ball:             20,   // 小球半径
  minRadius:        3,    // 最小半径
  pointMassRadius:  6,    // 质点半径
  spring:           80,   // 弹簧自然长度
  plane:            200,  // 斜面宽度
  ground:           400,  // 地面长度
};

// ─── 字体 (Font) ─────────────────────────────────────────────────────────────
export const FONT = {
  family:           "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  label:            14,   // 物理量标签
  labelSize:        14,   // 别名
  labelBold:        16,   // 加粗标签
  labelWeight:      '600', // 标签字体粗细
  axis:             12,   // 坐标轴标注
  axisSize:         12,   // 别名
  title:            18,   // 图内标题
  annotation:       12,   // 注释
  formula:          16,   // 公式
  formulaSize:      16,   // 别名
  large:            24,   // 大字体（强调）
  small:            10,   // 小字体
  smallSize:        10,   // 别名
  subtickSize:      11,   // 副刻度标签（图表次级刻度）
  bodySize:         13,   // 正文字体
};

// ─── 虚线 (Dash Pattern) ────────────────────────────────────────────────────
export const DASH = {
  reference:        [6, 4],   // 参考线
  guide:            [4, 4],   // 导引线
  projection:       [3, 3],   // 投影线
  boundary:         [8, 4],   // 边界线
  trackHistory:     [2, 2],   // 轨迹点线
  hatch:            [4, 2],   // 斜线（备用）
  axis:             [6, 4],   // 坐标轴虚线（别名）
  tangent:          [4, 4],   // 切线
};

// ─── 电场线/磁场线 ──────────────────────────────────────────────────────────
export const FIELD_LINE = {
  density:          12,     // 电场线数量
  length:           150,    // 单条线最大长度
  spacing:          15,     // 等势线间距
  arrowEvery:       30,     // 每隔多少像素画箭头
};

// ─── 层叠顺序 (Z-index for SVG elements) ────────────────────────────────────
export const LAYER_Z = {
  grid:             1,
  trackHistory:     2,
  object:           3,
  vectorSub:        4,
  vectorMain:       5,
  annotation:       6,
  label:            7,
};

// ─── SVG 属性预设 (可直接展开到 JSX) ────────────────────────────────────────
export const SVG_ATTR = {
  vector: {
    strokeLinecap:  'round' as const,
    strokeLinejoin: 'round' as const,
    fill:           'none',
  },
  vectorMain: {
    strokeLinecap:  'round' as const,
    strokeLinejoin: 'round' as const,
    fill:           'none',
    strokeWidth:    STROKE.vectorMain,
  },
  vectorSub: {
    strokeLinecap:  'round' as const,
    strokeLinejoin: 'round' as const,
    fill:           'none',
    strokeWidth:    STROKE.vectorSub,
    opacity:        OPACITY.vectorSub,
  },
  vectorThin: {
    strokeLinecap:  'round' as const,
    strokeLinejoin: 'round' as const,
    fill:           'none',
    strokeWidth:    STROKE.vectorThin,
    opacity:        OPACITY.vectorThin,
  },
  grid: {
    stroke:         'currentColor',
    strokeWidth:    STROKE.grid,
    opacity:        OPACITY.grid,
  },
  axis: {
    stroke:         'currentColor',
    strokeWidth:    STROKE.axis,
  },
  trackHistory: {
    stroke:         'currentColor',
    strokeWidth:    STROKE.trackHistory,
    opacity:        OPACITY.trackHistory,
    strokeDasharray: DASH.trackHistory.join(' '),
  },
  object: {
    stroke:         'currentColor',
    strokeWidth:    STROKE.objectLine,
    fill:           'none',
  },
  annotation: {
    stroke:         'currentColor',
    strokeWidth:    STROKE.annotation,
    opacity:        OPACITY.annotation,
  },
};

// ─── SVG Marker 定义 ────────────────────────────────────────────────────────
export const SVG_MARKER = {
  main: {
    id:             'arrow-main',
    markerWidth:    10,
    markerHeight:   7,
    refX:           9,
    refY:           3.5,
    orient:         'auto',
    content: 'M0,0 L10,3.5 L0,7 Z',
  },
  sub: {
    id:             'arrow-sub',
    markerWidth:    8,
    markerHeight:   6,
    refX:           7,
    refY:           3,
    orient:         'auto',
    content: 'M0,0 L8,3 L0,6 Z',
  },
  thin: {
    id:             'arrow-thin',
    markerWidth:    6,
    markerHeight:   5,
    refX:           5,
    refY:           2.5,
    orient:         'auto',
    content: 'M0,0 L6,2.5 L0,5 Z',
  },
};

// ─── SVG Filter 发光/阴影 ───────────────────────────────────────────────────
export const SVG_FILTER = {
  glow: {
    id:             'glow',
    stdDeviation:   3,
    floodOpacity:   OPACITY.glow,
  },
  shadow: {
    id:             'shadow',
    dx:             2,
    dy:             4,
    stdDeviation:   3,
    floodOpacity:   OPACITY.shadow,
  },
};

// ─── SVG / CSS 动画时长与缓动 ───────────────────────────────────────────────
export const SVG_ANIM = {
  // 物理动画基础时长（ms）
  fast:             200,
  normal:           400,
  slow:             800,
  // 缓动函数
  easeInOut:        'ease-in-out',
  easeOut:          'ease-out',
  linear:           'linear',
};

// ─── 开普勒动画专用配置 ─────────────────────────────────────────────────
export const KEPLER_CONFIG = {
  // 轨道缩放：基准值 + 自适应因子范围
  scaleBase: 32,
  scaleMinFactor: 0.8,
  scaleMaxFactor: 1.2,
  // 参考画布尺寸（用于计算自适应因子）
  referenceWidth: 650,
  referenceHeight: 450,
  // 面积扫过时间比例（教学演示参数）
  sweepTimeRatio: 0.12,
} as const;

// ─── 矢量显示配置（按物理量类型）──────────────────────────────────────
/** @deprecated 旧方案遗留，新 lesson 请使用 vectorStyle.ts + VectorArrow 组件。仅保留用于未迁移的 lesson 文件。 */
export const VECTOR_DISPLAY = {
  velocity: {
    scaleBase: 18,
    minLength: 12,
    maxLengthRatio: 0.18, // 相对于画布短边的最大比例
  },
  force: {
    scaleBase: 140,
    minLength: 12,
    maxLengthRatio: 0.2,
  },
} as const;

// ─── 画中画图表配置（全比例驱动）────────────────────────────────────────
export const INSET_CHART = {
  widthRatio: 0.28,      // 宽度占画布宽度的比例
  heightRatio: 0.27,     // 高度占画布高度的比例
  minWidth: 120,         // 最小宽度
  minHeight: 80,         // 最小高度
  maxWidthRatio: 0.36,   // 最大宽度比例
  maxHeightRatio: 0.34,  // 最大高度比例
  paddingRatio: 0.03,    // 边距占画布宽度的比例
} as const;

// ─── 网格配置（自适应）────────────────────────────────────────────────
export const GRID_DISPLAY = {
  spacingBase: 50,
  minSpacing: 30,
  maxSpacing: 80,
} as const;

// ─── 图表布局配置（BasePhysicsChart 使用）──────────────────────────────────
export const CHART_LAYOUT = {
  // 默认尺寸（useCanvasSize 初始值）
  defaultWidth:   700,
  defaultHeight:  400,
  miniWidth:      300,
  miniHeight:     130,

  // 内边距（基准值，由 px() 缩放）
  marginLeft:     48,
  marginRight:    20,
  marginTop:      22,
  marginBottom:   22,

  // mini 模式内边距（更紧凑）
  miniMarginLeft:   36,
  miniMarginRight:  12,
  miniMarginTop:    16,
  miniMarginBottom: 16,

  // 网格密度
  gridCountX:     5,
  gridCountY:     4,
  miniGridCountX: 4,
  miniGridCountY: 3,

  // 信息密度降级阈值
  compactWidth:   250,
  compactHeight:  140,
  minWidth:       150,
  minHeight:      80,

  // 降级后最小网格数
  minGridX:       2,
  minGridY:       2,
  compactGridX:   3,
  compactGridY:   3,
} as const;

// ─── 统一导出（兼容原 CANVAS_STYLE 结构）────────────────────────────────────
export const CANVAS_STYLE = {
  STROKE,
  OPACITY,
  ARROW,
  OBJECT,
  FONT,
  DASH,
  FIELD_LINE,
  LAYER_Z,
  SVG_ATTR,
  SVG_MARKER,
  SVG_FILTER,
  SVG_ANIM,
  KEPLER_CONFIG,
  VECTOR_DISPLAY,
  INSET_CHART,
  GRID_DISPLAY,
  CHART_LAYOUT,
  // 小写别名（兼容旧代码）
  stroke: STROKE,
  opacity: OPACITY,
  arrow: ARROW,
  object: OBJECT,
  font: FONT,
  dash: DASH,
  fieldLine: FIELD_LINE,
  layerZ: LAYER_Z,
  svgAttr: SVG_ATTR,
  svgMarker: SVG_MARKER,
  svgFilter: SVG_FILTER,
  svgAnim: SVG_ANIM,
};

// ─── 类型导出 ───────────────────────────────────────────────────────────────
export type StrokeKey = keyof typeof STROKE;
export type OpacityKey = keyof typeof OPACITY;
export type ArrowKey = keyof typeof ARROW;
export type ObjectSizeKey = keyof typeof OBJECT;
export type FontKey = keyof typeof FONT;
export type DashKey = keyof typeof DASH;
