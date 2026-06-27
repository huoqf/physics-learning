import { createRulerTicks as coreCreateRulerTicks, type TickMark } from '@/utils/ruler';

export type { TickMark };

/**
 * 自动计算尺子/坐标轴的所有刻度
 */
export function createRulerTicks(
  domain: [number, number],
  tickInterval: number,
  minorTicks: number = 0
): TickMark[] {
  return coreCreateRulerTicks(domain, tickInterval, minorTicks);
}
