/**
 * src/theme/physics/emOscillationColors.ts
 * 电磁振荡与电磁波动画专用颜色 token。
 *
 * ═══════════════════════════════════════════════════════════════════
 *  不复用 EM_COLORS（electricField=黄 / magneticField=蓝），
 *  本模块按教学 spec 独立定义：
 *    电场能 Ee = 琥珀（与电场同色系，保持直觉一致）
 *    磁场能 Em = 靛蓝（与磁场同色系）
 *    总量 E总   = 石墨灰（恒定基准线）
 *  不修改共享 token，避免影响其他模块。
 * ═══════════════════════════════════════════════════════════════════
 */

export const EM_OSCILLATION_COLORS = {
  // ── 能量（EnergyBars / 曲线） ──
  electricEnergy:  '#D97706', // 电场能 Ee — amber-600（与电场黄同族，深度加深以适配柱状）
  magneticEnergy:  '#4338CA', // 磁场能 Em — indigo-700（与磁场蓝同族，深度加深）
  totalEnergy:     '#475569', // 总能量 E总 — slate-600（守恒基准）
  dampingEnvelope: '#94A3B8', // 阻尼振荡衰减包络 — slate-400（定性示意，弱化）

  // ── 电荷与电流（q(t)/i(t) 曲线） ──
  charge:          '#0284C7', // 电荷量 q — sky-600（与电容色同族）
  current:         '#DC2626', // 回路电流 i — red-600（与电流色一致，沿用教材习惯）

  // ── 电磁波（E、B 矢量与传播） ──
  eFieldWave:      '#D97706', // 电场矢量 E — amber-600
  bFieldWave:      '#4338CA', // 磁场矢量 B — indigo-700
  propagation:     '#64748B', // 传播方向 — neutral-500

  // ── 电磁波谱色带（按谱段，波长由长到短） ──
  bandRadio:       '#B45309', // 无线电波 — amber-700
  bandMicrowave:   '#C2410C', // 微波 — orange-700
  bandInfrared:    '#DC2626', // 红外线 — red-600
  bandVisible:     '#16A34A', // 可见光 — green-600（对数轴色带用单色定位，彩虹见 VISIBLE_SPECTRUM_COLORS）
  bandUltraviolet: '#7C3AED', // 紫外线 — violet-600
  bandXRay:        '#4F46E5', // X 射线 — indigo-600
  bandGamma:       '#0F172A', // γ 射线 — slate-900（穿透力最强，用最深色）
} as const

/**
 * 可见光七色（按波长递减：红 → 紫）。
 *
 * 为什么单独定义、且不铺在画布色带上：
 * 对数横轴上可见光只占 12.7 px（720 px 的 1.8%），把七色渐变铺进色带等于把它压成
 * 一条模糊色线，物理意图落空。故彩虹落在「等宽谱段卡片」上（卡片宽约 100 px），
 * 画布色带只承担"对数轴定位"，用 bandVisible 单色。
 *
 * 注释中的波长为各色光的代表性读数，非严格边界。
 */
export const VISIBLE_SPECTRUM_COLORS = [
  '#EF4444', // 红 ~700 nm
  '#F97316', // 橙 ~610 nm
  '#EAB308', // 黄 ~580 nm
  '#10B981', // 绿 ~530 nm
  '#06B6D4', // 青 ~490 nm
  '#3B82F6', // 蓝 ~460 nm
  '#8B5CF6', // 紫 ~400 nm
] as const

export type EmOscillationColorKey = keyof typeof EM_OSCILLATION_COLORS
