import type { MarkerTier } from '../../theme/physics/vectorStyle';

/**
 * 生成箭头标记的唯一 ID。
 * @param tier - 标记尺寸等级（small/medium/large）
 * @param color - 标记颜色（十六进制）
 */
export function markerId(tier: MarkerTier, color: string): string {
  return `arrow-${tier}-${color.replace('#', '')}`;
}
