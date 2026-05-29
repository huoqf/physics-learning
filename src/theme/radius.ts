/**
 * src/theme/radius.ts
 * 圆角规范 — 与 Tailwind rounded-* 对齐
 */
export const radius = {
  none:  '0px',
  sm:    '4px',   // 标签、角标、代码块、inline badge
  base:  '6px',   // 输入框、小控件、滑块、KaTeX 公式背景
  md:    '8px',   // 按钮（默认）
  lg:    '10px',  // 侧边栏列表项、chip
  xl:    '12px',  // 卡片（标准）、面板
  '2xl': '16px',  // 大卡片、Modal、抽屉
  '3xl': '24px',  // 特大容器（少用）
  full:  '9999px',// 圆形按钮、头像、进度条端点、pill标签
} as const

export type RadiusKey = keyof typeof radius
