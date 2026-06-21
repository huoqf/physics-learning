/**
 * 图表插值工具（纯函数）。
 *
 * 独立于组件文件，避免 react-refresh/only-export-components 规则告警，
 * 并方便在不引入 React/JSX 依赖的情况下单独测试。
 */

/**
 * 在已按 x 升序排列的 points 中线性插值 y。
 * - 空数组：返回 null
 * - 单点：返回该点 y
 * - x 落在范围外：返回最近端点 y（不外推）
 * - 范围内：二分定位后线性插值
 */
export function interpolateY(points: { x: number; y: number }[], x: number): number | null {
  if (points.length === 0) return null
  if (points.length === 1) return points[0].y
  if (x <= points[0].x) return points[0].y
  if (x >= points[points.length - 1].x) return points[points.length - 1].y
  // 二分查找包含 x 的区间 [points[lo], points[hi]]
  let lo = 0
  let hi = points.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].x <= x) lo = mid
    else hi = mid
  }
  const p0 = points[lo]
  const p1 = points[hi]
  const t = (x - p0.x) / (p1.x - p0.x || 1)
  return p0.y + t * (p1.y - p0.y)
}
