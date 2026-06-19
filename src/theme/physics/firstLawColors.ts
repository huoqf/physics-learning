/**
 * src/theme/physics/firstLawColors.ts
 * 热力学第一定律动画专用颜色 token。
 *
 * ═══════════════════════════════════════════════════════════════════
 *  不复用 ENERGY_COLORS（work=绿, internalEnergy=红），
 *  本模块按教学 spec 独立定义：W=橙, Q=红, ΔU=紫。
 *  不修改共享 token，避免影响其他模块。
 * ═══════════════════════════════════════════════════════════════════
 */

export const FIRST_LAW_COLORS = {
  work:           '#F97316', // 做功 W — 暖橙 (Orange-500)
  heat:           '#EF4444', // 吸热 Q — 警示红 (Red-500)
  heatRelease:    '#0891B2', // 放热 Q− — 冷青 (Cyan-600)
  internalEnergy: '#8B5CF6', // 内能 ΔU — 紫 (Violet-500)
  internalGlow:   '#7C3AED', // 内能背景光效 — violet-600
  adiabaticWall:  '#6D28D9', // 绝热壁虚线 — violet-700
} as const

export type FirstLawColorKey = keyof typeof FIRST_LAW_COLORS
