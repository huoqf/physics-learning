/**
 * src/theme/physics/spectrum.ts
 * 可见光「频率 → 颜色」映射 —— 光谱配色的唯一落点。
 *
 * 为什么放在 theme：这是渲染关注点（给光子/光线上色），不是物理计算。
 * 2026-11 之前它在 `src/physics/photoelectric.ts:frequencyToColor()` 里，
 * 直接返回 7 个 hex 字面量，物理层因此持有颜色（违反「颜色必须走 TOKENS」）。
 * 现在改用 `OPTICS_COLORS.wavelength*` 七个光谱 token，取值与原先逐个相同，
 * 视觉零变化；改光谱配色只需改 `colors.ts` 一处。
 */
import { OPTICS_COLORS } from './colors'

/**
 * 光频率 → 可见光颜色（按教材七色划分）。
 *
 * 映射关系：
 * - ν < 4.5 (红外): 红
 * - 4.5 ≤ ν < 5.0 (红~橙): 橙
 * - 5.0 ≤ ν < 5.5 (黄~绿): 黄
 * - 5.5 ≤ ν < 6.0 (绿~蓝): 绿
 * - 6.0 ≤ ν < 6.5 (蓝~靛): 蓝
 * - 6.5 ≤ ν < 7.0 (靛~紫): 靛
 * - ν ≥ 7.0 (紫外): 紫
 *
 * @param nu 频率 (×10¹⁴ Hz)
 * @returns hex 颜色字符串（取自 OPTICS_COLORS.wavelength*）
 */
export function frequencyToColor(nu: number): string {
  if (nu < 4.5) return OPTICS_COLORS.wavelengthRed
  if (nu < 5.0) return OPTICS_COLORS.wavelengthOrange
  if (nu < 5.5) return OPTICS_COLORS.wavelengthYellow
  if (nu < 6.0) return OPTICS_COLORS.wavelengthGreen
  if (nu < 6.5) return OPTICS_COLORS.wavelengthBlue
  if (nu < 7.0) return OPTICS_COLORS.wavelengthIndigo
  return OPTICS_COLORS.wavelengthViolet
}
