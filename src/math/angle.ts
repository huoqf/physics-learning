/**
 * 角度数学工具。
 */

/**
 * 把角度（度）归一化到 (-180, 180]。
 */
export function normalizeAngleDeg(deg: number): number {
  let a = deg % 360
  if (a > 180) a -= 360
  else if (a <= -180) a += 360
  return a
}

/**
 * 沿最短路径把 `current` 向 `target`（度）逼近一帧。
 * 用于 2D 骨骼手的旋转、握拳/张开动画的平滑过渡。
 *
 * @param current  当前角度（度）
 * @param target   目标角度（度）
 * @param speed    插值速度 0~1，越大越快（默认 0.18）
 */
export function lerpAngleDeg(current: number, target: number, speed = 0.18): number {
  const diff = normalizeAngleDeg(target - current)
  return current + diff * speed
}
