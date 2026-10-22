/**
 * 平抛运动的「频闪打点」模型 — 纯函数（无 React / DOM 依赖）。
 *
 * 频闪照片是高考力学实验的常客：每隔固定时间 T 拍一次，把运动体的位置叠印在同一张底片上。
 * 对平抛运动，一张照片能同时读出三条结论：
 *   1. 水平方向：相邻两点的水平间距始终是 Δx = v₀T → 水平方向匀速
 *   2. 竖直方向：第一段 Δy₁ = ½gT²，之后按 1 : 3 : 5 : … 递增 → 竖直方向匀加速（初速为零）
 *   3. 逐差：相邻两段竖直间距之差恒为 gT² → 可反推当地重力加速度
 *
 * 三条结论都写在同一份采样数据上，中屏打点、右屏读数、公式卡共用本模块。
 */

export interface StrobeMark {
  /** 第几个打点（从 0 开始，k = 0 就是抛出瞬间） */
  k: number
  /** 打点时刻 (s) */
  t: number
  /** 水平位移 (m) */
  x: number
  /** 下落高度 (m)，取正值 */
  y: number
  /** 与上一个打点之间的竖直间距 (m)；k = 0 时为 null */
  dyPrev: number | null
}

export interface ProjectileStrobeData {
  /** 打点周期 T (s) */
  period: number
  /** 已打出的点（只包含 t ≤ uptoT 的点） */
  marks: StrobeMark[]
  /** 水平间距 Δx = v₀T (m) */
  dx: number
  /** 第一段竖直间距 Δy₁ = ½gT² (m) */
  firstDy: number
  /** 逐差 ΔΔy = gT² (m)，相邻两段竖直间距之差，恒定 */
  diffOfDy: number
  /** 竖直间距的归一化比例（以第一段为 1）：1 : 3 : 5 : … */
  ratios: number[]
}

/**
 * 计算平抛运动的频闪打点数据。
 *
 * 模型假设：忽略空气阻力（否则竖直方向不再是 ½gt²，Δy = gT² 的结论不成立）。
 *
 * @param v0x 水平初速度 (m/s)
 * @param g 重力加速度 (m/s²)
 * @param period 频闪周期 T (s)
 * @param uptoT 已播放到的时刻 (s)，只输出该时刻及之前的打点
 */
export function computeProjectileStrobe(
  v0x: number,
  g: number,
  period: number,
  uptoT: number,
): ProjectileStrobeData {
  const safePeriod = Math.max(period, 1e-6)
  const safeV0 = Math.max(v0x, 0)
  const safeG = Math.max(g, 0)
  const end = Math.max(uptoT, 0)
  // 1e-9 容差：接地瞬间 t = groundTime 恰好是 T 的整数倍时，不能漏掉最后一帧
  const count = Math.floor(end / safePeriod + 1e-9)

  const marks: StrobeMark[] = []
  let prevY = 0
  for (let k = 0; k <= count; k++) {
    const t = k * safePeriod
    const x = safeV0 * t
    const y = 0.5 * safeG * t * t
    marks.push({
      k,
      t,
      x,
      y,
      dyPrev: k === 0 ? null : y - prevY,
    })
    prevY = y
  }

  const firstDy = 0.5 * safeG * safePeriod * safePeriod
  const ratios: number[] = []
  if (firstDy > 1e-12) {
    for (let k = 1; k <= Math.min(count, 5); k++) {
      // Δy_k = ½gT²(2k−1) → 归一化后就是 1, 3, 5, …
      ratios.push((2 * k - 1))
    }
  }

  return {
    period: safePeriod,
    marks,
    dx: safeV0 * safePeriod,
    firstDy,
    diffOfDy: safeG * safePeriod * safePeriod,
    ratios,
  }
}
