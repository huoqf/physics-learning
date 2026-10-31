/**
 * src/theme/spacing.ts
 * 间距比例尺 — 4px 基准，与 Tailwind 默认 spacing 对齐
 *
 * 用法边界（铁律 1-1 的执行口径，2026-10 明确）：
 * - **组件样式**：直接用 Tailwind 比例尺类（`p-3` ⇄ 本表 `3: '12px'` ⇄ 12px）。
 *   类名与比例尺同源，不算"绕过 theme"；本表就是该比例尺的数值投影。
 * - **取字面值的场景**：SVG 属性 (`cx={12}`)、Canvas 绘制、`ResizeObserver` 计算、
 *   质检脚本，从本表或下方语义 token（`PANEL` / `SEGMENTED` / `LEFT_PANEL_GEOMETRY`）取。
 * - **禁止**：在组件里写 `style={{ padding: 12 }}`、`padding: '12px'` 之类的裸值——
 *   这类写法既不受 Tailwind 约束，也不会被比例尺变更带着走。
 */
export const spacing = {
  px:  '1px',
  0:   '0px',
  0.5: '2px',
  1:   '4px',   // 图标与文字间距，公式内间距
  2:   '8px',   // 同组元素间距
  3:   '12px',  // 卡片内边距（紧凑）
  4:   '16px',  // 卡片内边距（标准）
  5:   '20px',
  6:   '24px',  // 区块间距
  8:   '32px',  // 章节间距
  10:  '40px',
  12:  '48px',  // 页面级大间距、底部控制栏高度
  14:  '56px',  // 顶部栏高度
  16:  '64px',
  20:  '80px',
  24:  '96px',
} as const

// ─── 响应式断点 ──────────────────────────────────────────────────────────
export const BREAKPOINT = {
  mobile:   1024,  // < 1024: 移动端（右侧下移，左侧抽屉）
  tablet:   1280,  // 1024–1279: 平板（左侧抽屉）
  desktop:  1440,  // ≥ 1440: 标准桌面
} as const

// ─── 面板宽度配置（按断点分级）────────────────────────────────────────────
export const PANEL = {
  left: {
    standard: 280,  // ≥1440px
    compact:   240,  // 1280–1439px
    min:       200,
    max:       320,
  },
  right: {
    standard: 320,  // ≥1440px
    compact:   280,  // 1280–1439px / 1024–1279px
    min:       240,
    max:       360,
  },
} as const

// ─── 固定布局尺寸（三屏联动）────────────────────────────────────────────
export const LAYOUT = {
  topBarHeight:     56,  // px
  bottomBarHeight:  48,  // px
  leftPanelWidth:   PANEL.left.standard,  // 向后兼容，标准宽度
  rightPanelWidth:  PANEL.right.standard,  // 向后兼容，标准宽度
  canvasMinWidth:   400, // px 中间 Canvas 最小宽度
  responsiveBreak:  BREAKPOINT.mobile,     // 向后兼容，折叠侧边栏的断点
} as const

// ─── 左屏几何链路（分段器宽度预算的唯一来源）──────────────────────────────
/**
 * 左屏内边距的 Tailwind 类名 —— **唯一真源**，组件直接引用这里的字符串。
 *
 * 为什么是类名而不是像素数：真正决定渲染宽度的是组件里的类；如果主题里存 12px、
 * 组件里写 `p-4`，两者就会静默分叉（历史故障：脚本按旧值 229px 判定，静态守卫全绿、
 * 页面全部折行）。把类名做成常量后，改内边距必须改这里，宽度预算自动跟着重算。
 *
 * 类名写在 .ts 里同样能被 Tailwind v4 的内容扫描识别（`@import "tailwindcss"` 自动扫描 src/）。
 */
export const LEFT_PANEL_PADDING = {
  panel: 'p-3',           // LeftPanel 根容器
  section: 'p-3',         // LeftPanelSection 常态
  sectionCompact: 'p-2',  // LeftPanelSection compact（纯滑块区）
  track: 'p-0.5',         // SegmentedControl 轨道
} as const

/** Tailwind 间距比例尺换算（4px 基准）：`p-3` → 12px、`p-0.5` → 2px */
const padPx = (cls: string) => Number(cls.slice(2)) * 4

/**
 * 左屏几何链路数值（由 `LEFT_PANEL_PADDING` 换算，勿手写像素）。
 *
 * 分段器能放文字宽 = `PANEL.left.X` − 2 ×(`panelPad` + `sectionPad` + `sectionBorder`
 * + `trackPad`) − `subpixel`（宽屏 225 / 窄屏 185）。
 *
 * `scripts/check-control-meta.mjs` 用同一规则从类名现算，并断言三个组件确实引用了
 * `LEFT_PANEL_PADDING`，所以"改类名不改预算"这条路已被封死。
 * `npm run check:control-meta -- --print-widths` 可打印当前宽度预算表。
 */
export const LEFT_PANEL_GEOMETRY = {
  panelPad: padPx(LEFT_PANEL_PADDING.panel),
  sectionPad: padPx(LEFT_PANEL_PADDING.section),
  trackPad: padPx(LEFT_PANEL_PADDING.track),
  sectionBorder: 1,  // LeftPanelSection `border`
  subpixel: 1,       // 三栏 flex 均分后左屏实测比标称窄 1px（亚像素舍入）
} as const

// ─── 分段器（SegmentedControl）几何约束 ────────────────────────────────────
/**
 * 左屏分段器的单格宽度约束，是 §2.6.6 判定的唯一真源。
 *
 * `minCell` 取 72px = 6 个汉字（12px/字）：物理术语如「同加速连接体」（5 字）、
 * 「分子撞击」（4 字）、「遏止电压」（4 字）都能单行放下，再窄就要折行。
 * 低于此值时 `SegmentedControl.fitColumns()` 会把 3 列降到 2 列
 * （240px 窄屏下 3 列单格仅 60.3px），宁可多占一行。
 *
 * `gapPx` 对应轨道上的 `gap-0.5` / `p-0.5`；改 Tailwind 类必须同步改这里。
 *
 * ⚠️ `scripts/check-control-meta.mjs` 无法 import TS，改为在运行时正则读取本常量
 * 并与脚本内副本比对，不一致即 CI 失败——不要只改一处。
 */
export const SEGMENTED = {
  minCell: 72,
  gapPx: 2,
} as const

// ─── 动画画布预设尺寸（useCanvasSize 回退值）────────────────────────────────
// 按动画在中屏的布局区域选型，非内容形状。
// 基准：1440px 标准桌面下中屏宽≈840px、可用高≈650px（扣除顶栏/控制条）
export const CANVAS_PRESETS = {
  /**
   * full — 动画独占中屏全区域
   * 840×650，AR≈1.29:1，对齐 1440px 桌面中屏实际尺寸
   * 适用：单一物理场景，无图表分区
   */
  full:   { width: 840, height: 650 },
  /**
   * splitV — 上下分区时动画/图表各占半高
   * 840×325，AR≈2.58:1（full 高度的一半，宽度对齐中屏实际宽度）
   * 适用：中屏上下各放一个区块（如上方图表 + 下方场景）
   */
  splitV: { width: 840, height: 325 },
  /**
   * splitH — 左右分区时动画占左侧
   * 420×650，AR≈0.65:1（full 宽度的一半，高度不变）
   * 适用：中屏左右并列（如左侧场景 + 右侧图表面板）
   */
  splitH: { width: 420, height: 650 },
  /**
   * square — 圆周/旋转对称场景
   * 650×650，1:1，适合圆形轨迹/向心力等旋转演示
   */
  square: { width: 650, height: 650 },
} as const

// ─── 内容密度上限 ────────────────────────────────────────────────────────
export const DENSITY = {
  canvasMaxElements: 7,  // Canvas 同时可见元素上限
  canvasMaxLabels:   5,  // Canvas 内文字标注上限
  leftPanelMaxParams:5,  // 左侧面板最多参数数量
  rightPanelMaxRows: 8,  // 右侧看板最多物理量行数
  gaokaoMaxTips:     3,  // 高考要点卡片最多条数
  gaokaoTipMaxChars: 30, // 每条要点最多字符数
  stepMaxOpen:       2,  // AnalysisPage 同时展开步骤数
  wrongCardSummary:  60, // 错题卡片摘要最多字符数
  knowledgeNodeTitle:12, // 知识点链路节点标题最多字符数
} as const
