import { VECTOR_VISUAL_WEIGHT, type VectorType } from '../theme/physics/vectorStyle';

/**
 * 计算矢量箭头的像素长度。
 *
 * 映射规则（基准有效时）：
 * `length = min(mag / refMagnitude, 1) · maxLength · weight[type]`
 *
 * ⚠️ 这里**不再**对有效基准下的结果做 minLength 兜底。
 * 旧实现的 `Math.max(minLength, …)` 有两个致命副作用：
 * 1. 把 [0, minLength] 整段量值压成同一个长度，映射不再单调 —— 抛体到最高点时
 *    v_y 只剩浮点残差（≈1e-16），却被画成和 v_x 同量级的 14px 实心箭头，
 *    画面上就是一条明确的物理错误结论；
 * 2. 长度不再能读出比例关系，矢量三角形在 V 字形附近无法闭合。
 *
 * 小箭头仍然"像箭头"的问题不在长度侧解决，而由 VectorArrow 的几何量
 * （头部长度/宽度、线宽）按长度等比缩放来保证，见 utils/arrowGeometry.ts。
 *
 * 只有两种退化情形才回退到 minLength —— 此时没有比例可言，只能给一个可见占位：
 * - `refMagnitude <= 0`：基准未配置，属于 SceneConfig 配置错误，附带 console.warn；
 * - `mag <= 0`：零矢量或负量值。VectorArrow 对零矢量直接不渲染，
 *   但另有若干调用方（标签定位、拖拽锚点）依赖返回值非零，故保留占位。
 */
export function calculateVectorPixelLength(
  mag: number,
  type: VectorType,
  maxLength: number,
  refMagnitude: number,
  minLength = 14,
): number {
  if (mag <= 0 || refMagnitude <= 0) {
    if (refMagnitude <= 0) {
      console.warn(
        `[vectorLength] "${type}" 的 refMagnitude 未配置或为 0，已回退到 minLength。请检查 SceneConfig.refMagnitudes。`,
      );
    }
    return minLength;
  }
  const weight = VECTOR_VISUAL_WEIGHT[type] ?? 1.0;
  const ratio = Math.min(mag / refMagnitude, 1.0);
  return Math.min(ratio * maxLength * weight, maxLength);
}
