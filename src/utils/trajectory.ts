/**
 * 通用轨迹插值工具函数。
 *
 * 用于平抛、斜抛等预计算轨迹的帧间插值，
 * 避免在 physicsQuantities 各模块中重复相同的插值逻辑。
 */

/** 通用轨迹点（含 t/x/y/vx/vy/v/ax/ay） */
export interface TrajectoryPoint {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  v: number
  ax: number
  ay: number
}

/**
 * 在预计算轨迹点数组中，按时间进行线性插值。
 *
 * @param points - 预计算的轨迹点（按 t 升序排列）
 * @param time - 当前时间
 * @returns 插值后的轨迹点；若 time ≤ 0 返回首点，若超出范围返回末点
 */
export function interpolateTrajectoryPoint<T extends TrajectoryPoint>(
  points: T[],
  time: number,
): T {
  const first = points[0]
  if (!first || time <= 0 || points.length < 2) return first

  const last = points[points.length - 1]
  if (time >= last.t) return last

  // 计算时间步长与索引
  const dt = points[1].t - points[0].t || 0.01
  const idx = Math.floor(time / dt)
  const p1 = points[Math.min(idx, points.length - 1)]
  const p2 = points[Math.min(idx + 1, points.length - 1)]

  if (!p1 || !p2 || p1.t === p2.t) return p1

  const frac = (time - p1.t) / (p2.t - p1.t)

  // 线性插值所有数值字段
  return {
    ...p1,
    t: time,
    x: p1.x + (p2.x - p1.x) * frac,
    y: p1.y + (p2.y - p1.y) * frac,
    vx: p1.vx + (p2.vx - p1.vx) * frac,
    vy: p1.vy + (p2.vy - p1.vy) * frac,
    v: p1.v + (p2.v - p1.v) * frac,
    ax: p1.ax + (p2.ax - p1.ax) * frac,
    ay: p1.ay + (p2.ay - p1.ay) * frac,
  } as T
}
