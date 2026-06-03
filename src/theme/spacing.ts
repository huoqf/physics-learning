/**
 * src/theme/spacing.ts
 * 间距比例尺 — 4px 基准，与 Tailwind 默认 spacing 对齐
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
