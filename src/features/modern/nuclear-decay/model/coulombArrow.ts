/**
 * 两质子间库仑斥力箭头的「显示量级」：F ∝ 1/r²，并封顶 10 防止近距离爆掉画面。
 * 这是画面用的合成量级（不是牛顿值），因此箭头的 refMagnitude 必须与它同源校准。
 */
export function coulombArrowMag(dist: number): number {
  if (!(dist > 0)) return 10
  return Math.min(10, 1.2 / (dist * dist))
}

/**
 * 量程峰值取「两质子近乎相切」（r = 1）时的量级：
 * 再近时两者在图上也已重叠，箭头长度不再有教学意义。
 */
export const COULOMB_REF_PEAK = coulombArrowMag(1)
