/**
 * 图表数据插值工具函数。
 *
 * 用于预计算时间序列数据的帧间截断与线性插值，
 * 避免在各动画页面中重复相同的图表数据处理逻辑。
 */

/** 时间序列数据点（含时间 t 和数值 v） */
export interface TimeSeriesPoint {
  t: number
  v: number
}

/**
 * 截断并插值生成当前时间刻度以前的数据点。
 *
 * 遍历预计算的域点数组，将时间轴截断到 currentTime，
 * 并在截断点处进行线性插值以获得平滑的动画效果。
 *
 * @param domainPoints - 预计算的域点数组（按 t 升序排列）
 * @param currentTime - 当前播放时间
 * @returns 截断并插值后的数据点数组
 */
export function getPointsUpToTime(
  domainPoints: TimeSeriesPoint[],
  currentTime: number,
): TimeSeriesPoint[] {
  if (domainPoints.length === 0) return []

  const result: TimeSeriesPoint[] = []

  for (let i = 0; i < domainPoints.length; i++) {
    const pt = domainPoints[i]

    if (pt.t < currentTime) {
      result.push(pt)
    } else {
      if (i > 0) {
        const prev = domainPoints[i - 1]
        const ratio = (currentTime - prev.t) / (pt.t - prev.t)
        const interpolatedV = prev.v + ratio * (pt.v - prev.v)
        result.push({ t: currentTime, v: interpolatedV })
      } else {
        result.push({ t: currentTime, v: pt.v })
      }
      break
    }
  }

  const lastPt = domainPoints[domainPoints.length - 1]
  if (currentTime >= lastPt.t) {
    if (result.length < domainPoints.length) {
      result.push(lastPt)
    }
    if (currentTime > lastPt.t) {
      result.push({ t: currentTime, v: lastPt.v })
    }
  }

  return result
}
