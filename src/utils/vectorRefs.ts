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
