import { VECTOR_VISUAL_WEIGHT, type VectorType } from '../theme/physics/vectorStyle'

/** 主矢量与其分量的 refMagnitude 配比结果 */
export interface VectorRefPair {
  /** 主矢量（合速度）的 refMagnitude */
  main: number
  /** 分量（vₓ / v_y）的 refMagnitude，两者共用同一值 */
  component: number
}

/**
 * 为「合速度 + 其正交分量」成对分配 refMagnitude。
 *
 * 为什么必须成对分配：箭头像素长度 = min(|v| / ref, 1) · maxLen · weight，
 * 而分量与合矢量的 weight 不同（velocityX/Y = 0.8，velocity = 1.0）。三种配法各有问题：
 *   1. 只配合矢量：分量拿到 ref = 0，被 calculateVectorPixelLength 回退成恒定 minLength，
 *      画面上 vₓ 与 v_y 全程等长 —— 等于在说「两个分速度都不变」；
 *   2. 两者配同一 ref：分量被权重额外压短 20%，两个分量的长度和短于合速度，矢量三角形接不上；
 *   3. 只按分量峰值配：当两个分量接近时 |v| 会超过 ref 撞上 min(…, 1) 截断，三角形在末段又裂开。
 *
 * 故取 ref_component / ref_main = weight_component / weight_main，使两者共用同一「像素/量纲」比例
 * （三角形精确闭合），并把 ref 抬到 ≥ 全程峰值，避免 ratio 被截断。
 *
 * @param peakSpeed     合矢量全程最大量值（如落地瞬间的 |v|）
 * @param peakComponent 各分量全程最大量值中的较大者（如 vₓ 与落地 |v_y| 的较大者）
 */
export function resolveVelocityRefs(
  peakSpeed: number,
  peakComponent: number,
  mainType: VectorType = 'velocity',
  componentType: VectorType = 'velocityX',
): VectorRefPair {
  const weightMain = VECTOR_VISUAL_WEIGHT[mainType] ?? 1
  const weightComponent = VECTOR_VISUAL_WEIGHT[componentType] ?? 1
  const weightRatio = weightMain > 0 ? weightComponent / weightMain : 1

  const candidates = [peakComponent, peakSpeed * weightRatio].filter((v) => Number.isFinite(v))
  // 兜底 0.1：防止工况退化（如 v₀=0）时 ref=0 触发 minLength 回退与告警
  const component = Math.max(...candidates, 0.1)

  return { main: component / weightRatio, component }
}

/**
 * 校准目标：页面参数取到量程边界时，该类型最大箭头占满
 * `maxVectorLength · weight` 的 90%，留 10% 余量。
 *
 * 为什么不取 100%：`min(mag/ref, 1)` 一旦截断，不同幅值的箭头会被压成同一长度，
 * 比例信息再次丢失 —— 等于又制造一次「全等长」的错误。
 */
export const REF_PEAK_FILL = 0.9

/**
 * 由「该类型在全量程上的物理峰值」反推 refMagnitude。
 *
 * 使峰值箭头长度 = REF_PEAK_FILL · maxVectorLength · weight：
 *   len = (peak / ref) · maxLen · weight = REF_PEAK_FILL · maxLen · weight  ⇒  ref = peak / REF_PEAK_FILL
 *
 * peaks 与渲染量值必须来自同一套换算（同源），否则峰值本身也是错的。
 *
 * @param peak 该矢量类型在页面参数域内的最大量值（与传给 VectorArrow 的 vector 同单位）
 */
export function refFromPeak(peak: number): number {
  // 退化工况（如质量为 0）峰值可能为 0：给一个极小正数，避免触发 ref=0 的告警回退；
  // 此时量值本身也是 0，VectorArrow 直接不渲染，不会画出错误箭头。
  if (!Number.isFinite(peak) || peak <= 0) return 1e-9
  return peak / REF_PEAK_FILL
}

/** 参数滑杆量程：key → [最小值, 最大值] */
export type ParamBounds = Record<string, readonly [number, number]>

/**
 * 「单滑杆极值扫描」求峰值：从基准参数出发，每次只把一个滑杆推到量程一端，
 * 取所有采样（含基准点）中的最大量值。
 *
 * 为什么不用「所有滑杆同时取端点」的角点：
 * 1. 多个滑杆相乘/取平方的页面（如 F_安 = B²L²v/R）在角点会给出比默认帧大 1~2 个
 *    数量级的峰值——`cutting-emf` 的角点是默认帧的 160 倍，据此反推的 ref 会把默认帧
 *    的箭头压成 0.6px 的亚像素点；
 * 2. 同一角点还要求「B、L 都取最大、R 取最小」，学生几乎不会同时做到。
 *
 * 单滑杆扫描对应真实的操作方式（一次只调一个滑杆），峰值与默认帧同量级：
 * 默认帧保持可读，任一滑杆推到量程端点时箭头也仍能长到接近满量程。
 *
 * @param evaluate 由参数向量求矢量量值的函数（必须复用页面自己的物理函数，不能另写一套公式）
 * @param base     基准参数（通常是当前参数或页面默认参数）
 * @param bounds   参与扫描的滑杆量程；只放「真正驱动该物理量」的滑杆
 */
export function peakOverRays(
  evaluate: (p: Record<string, number>) => number,
  base: Record<string, number>,
  bounds: ParamBounds,
): number {
  const sanitize = (v: number) => (Number.isFinite(v) ? Math.abs(v) : 0)
  let peak = sanitize(evaluate(base))
  for (const [key, [lo, hi]] of Object.entries(bounds)) {
    for (const value of [lo, hi]) {
      const m = sanitize(evaluate({ ...base, [key]: value }))
      if (m > peak) peak = m
    }
  }
  return peak
}

/**
 * 第二种校准模式：传给 VectorArrow 的 `vector` 本身就是**世界坐标长度**（不是物理量）。
 *
 * 典型例子：热学缸内压力的箭头用 `vector={{ x: 0, y: arrowLength }}`，
 * 而 `arrowLength` 同时又用于定位箭头起点（`pistonY - arrowLength`）——
 * 它已经在世界坐标里，不是牛顿、也不该再按「峰值归一化」。
 * 此时正确的 ref 是让箭头像素长度 **恰好等于** 这段世界长度经 sceneScale 换算后的像素长度：
 *
 *   len = (L / ref) · maxLen · w  应当等于  L · scale
 *   ⇒ ref = maxLen · w / scale
 *
 * 这样箭头尖端才会精确落在它本应指向的位置（如活塞底面），而不是固定几十像素漂浮。
 *
 * @param maxVectorLength 该场景的 maxVectorLength（与渲染时同一个值）
 * @param scale           该方向的 sceneScale（scaleY / scaleX）
 * @param type            矢量类型（取出 weight）
 */
export function refFromWorldUnit(
  maxVectorLength: number,
  scale: number,
  type: VectorType,
): number {
  const weight = VECTOR_VISUAL_WEIGHT[type] ?? 1
  if (!Number.isFinite(maxVectorLength) || maxVectorLength <= 0) return 1e-9
  if (!Number.isFinite(scale) || scale <= 0 || weight <= 0) return 1e-9
  return (maxVectorLength * weight) / scale
}
