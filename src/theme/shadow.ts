/**
 * src/theme/shadow.ts
 * 阴影规范 — 使用 cool dark rgba(15,23,42,...) 而非纯黑，与冷色主系协调
 * 15,23,42 = neutral-900 (#0F172A) 的 RGB 分量
 */
export const shadow = {
  none: 'none',

  // 轻微浮起，控件默认态
  xs: '0 1px 2px rgba(15,23,42,0.06)',

  // 列表项 hover
  sm: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',

  // 卡片默认
  md: '0 4px 6px rgba(15,23,42,0.07), 0 2px 4px rgba(15,23,42,0.06)',

  // 卡片 hover、强调卡片
  lg: '0 10px 15px rgba(15,23,42,0.08), 0 4px 6px rgba(15,23,42,0.05)',

  // Modal、抽屉、浮层
  xl: '0 20px 25px rgba(15,23,42,0.10), 0 8px 10px rgba(15,23,42,0.06)',

  // 超大浮层（少用）
  '2xl': '0 25px 50px rgba(15,23,42,0.15)',

  // 输入框凹陷感
  inner: 'inset 0 2px 4px rgba(15,23,42,0.06)',

  // 已掌握状态光晕（success-500）
  masteredGlow: '0 0 0 2px #10B981',

  // 当前步骤知识节点高亮（primary-400）
  focusGlow: '0 0 0 2px #60A5FA',

  // 按钮 focus 可访问性环
  focusRing: '0 0 0 2px #ffffff, 0 0 0 4px #3B82F6',
} as const

export type ShadowKey = keyof typeof shadow
