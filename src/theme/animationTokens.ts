/**
 * src/theme/animationTokens.ts
 * 动画组件专用设计 token — 字体、阴影、面板、图表内边距
 *
 * 使用方式：
 *   import { ANIM_FONT, ANIM_SHADOW, ANIM_PANEL, CHART_PAD } from '@/theme/animationTokens'
 *
 * 这些是"设计基准值"，组件中应通过 useCanvasSize().font() / .px() 缩放后使用。
 */

// ─── 字体基准尺寸（设计稿 700px 宽度下的值）─────────────────────────────────
export const ANIM_FONT = {
  xs:   8,   // 刻度标签、图例
  sm:   10,  // 坐标轴标签、小注释
  md:   12,  // 普通标注
  lg:   14,  // 标题、强调文字
} as const

// ─── 阴影与滤镜 ──────────────────────────────────────────────────────────
export const ANIM_SHADOW = {
  /** 卡片投影 */
  card: '0 4px 12px rgba(0,0,0,0.12)',
  /** SVG 元素发光 */
  glow: (color: string, r = 3) => `drop-shadow(0 0 ${r}px ${color})`,
} as const

// ─── 面板 / 卡片 ─────────────────────────────────────────────────────────
export const ANIM_PANEL = {
  radius:   6,
  padding:  8,
  strokeWidth: 1,
} as const

// ─── 图表内边距（vt / yt 图表共用）───────────────────────────────────────
export interface ChartPadding {
  left: number
  right: number
  top: number
  bottom: number
}

/** 标准 v-t / y-t 图表内边距 — 用于 Projectile / ObliqueThrow / Circular / Centripetal / Momentum */
export const CHART_PAD: ChartPadding = { left: 40, right: 15, top: 22, bottom: 25 }

/** 自由落体图表内边距 — 用于 FreeFall / FreeFallDrip */
export const CHART_PAD_FREEFALL: ChartPadding = { left: 50, right: 40, top: 35, bottom: 40 }

/** 竖直上抛图表内边距 — 用于 VerticalThrow */
export const CHART_PAD_VERT: ChartPadding = { left: 45, right: 30, top: 30, bottom: 35 }
