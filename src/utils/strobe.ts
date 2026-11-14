/**
 * 频闪采样工具（等时间间隔残影采样）
 */

export const STROBE_INTERVAL_OPTIONS = [0.05, 0.1, 0.2, 0.5] as const

/**
 * 计算 `[0, currentTime]` 区间内按固定时间间隔 `interval` 采样的时间戳序列。
 *
 * - 始终包含 `0` 时刻，随后为 `interval, 2 * interval, ...`；
 * - 若超过 `maxSamples` 个，仅保留最近（靠近 currentTime）的若干个或均匀抽样，避免 DOM 过载；
 *   默认保留最近 `maxSamples` 个以突出临近运动规律（如末段加速/减速间隔对比）。
 */
export function computeStrobeTimes(
  currentTime: number,
  interval: number,
  maxSamples = 12,
): number[] {
  if (!Number.isFinite(currentTime) || !Number.isFinite(interval) || interval <= 0 || currentTime <= 0) {
    return []
  }
  const safeInterval = Math.max(0.01, interval)
  const count = Math.floor((currentTime + 1e-9) / safeInterval)
  const times: number[] = []
  const startIdx = Math.max(0, count - maxSamples + 1)
  for (let i = startIdx; i <= count; i++) {
    const t = Math.round(i * safeInterval * 1000) / 1000
    if (t <= currentTime + 1e-9) {
      times.push(t)
    }
  }
  return times
}
