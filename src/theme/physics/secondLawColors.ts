/**
 * src/theme/physics/secondLawColors.ts
 * 热力学第二定律动画专用颜色 token。
 *
 * ═══════════════════════════════════════════════════════════════════
 *  不复用 THERMO_COLORS（温度/压强/体积），
 *  本模块按教学 spec 独立定义：粒子颜色、容器、警告、无序度曲线。
 *  不修改共享 token，避免影响其他模块。
 * ═══════════════════════════════════════════════════════════════════
 */

export const SECOND_LAW_COLORS = {
  hotParticle:     '#EF4444', // 高温粒子 — red-500
  coldParticle:    '#3B82F6', // 低温粒子 — blue-500
  warmParticle:    '#A855F7', // 中温粒子 — purple-500
  containerWall:   '#475569', // 容器壁 — slate-600
  containerFill:   '#F8FAFC', // 容器内部填充 — slate-50
  partition:       '#94A3B8', // 隔板 — neutral-400
  vacuum:          '#0F172A', // 真空区背景 — slate-900
  warningBg:       '#FEF3C7', // 逆向警告背景 — amber-100
  warningBorder:   '#F59E0B', // 逆向警告边框 — amber-500
  warningText:     '#92400E', // 逆向警告文字 — amber-800
  entropyLine:     '#7C3AED', // 无序度曲线 — violet-600
  entropyFill:     '#DDD6FE', // 无序度填充 — violet-200
  equilibriumLabel:'#10B981', // 平衡态标注 — emerald-500
  hotZone:         '#FEE2E2', // 高温区背景 — red-100
  coldZone:        '#DBEAFE', // 低温区背景 — blue-100
} as const

export type SecondLawColorKey = keyof typeof SECOND_LAW_COLORS
