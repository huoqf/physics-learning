import { VECTOR_VISUAL_WEIGHT, type VectorType } from '../theme/physics/vectorStyle';

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
  return Math.max(minLength, Math.min(ratio * maxLength * weight, maxLength));
}
