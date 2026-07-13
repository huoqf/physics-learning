/**
 * snap — 力学交互磁吸工具函数
 *
 * 提供角度和力大小的磁吸逻辑，用于拖拽交互时自动对齐到常见值。
 * 纯函数，无副作用，可直接在 useVectorDrag 或业务页面中调用。
 */

/** 常见角度预设（度），覆盖 0°~360° 的常用物理角度 */
export const SNAP_ANGLES = [
  0, 30, 45, 60, 90,
  120, 150, 180, 210, 225,
  240, 270, 300, 315, 330,
] as const

/**
 * 角度磁吸：将原始角度吸附到最近的预设角度
 *
 * @param angle   原始角度（度，任意范围）
 * @param threshold 吸附阈值（度），默认 2.5°
 * @returns 吸附后的角度；若超出阈值则返回原始角度
 */
export function snapAngle(angle: number, threshold = 2.5): number {
  // 规范化到 [0, 360)
  const normalized = ((angle % 360) + 360) % 360
  for (const snap of SNAP_ANGLES) {
    if (Math.abs(normalized - snap) < threshold) {
      return snap
    }
  }
  // 特殊处理 0°/360° 环绕：接近 360° 等价于接近 0°
  if (Math.abs(normalized - 360) < threshold) {
    return 0
  }
  return angle
}

/**
 * 力大小磁吸：将原始值吸附到最近的步进值
 *
 * @param value     原始力大小
 * @param step      步进（默认 0.5 N）
 * @param threshold 吸附阈值，默认 0.15 N
 * @returns 吸附后的值；若超出阈值则返回原始值
 */
export function snapForce(value: number, step = 0.5, threshold = 0.15): number {
  const rounded = Math.round(value / step) * step
  if (Math.abs(value - rounded) < threshold) {
    // 避免 -0 的情况
    return rounded === 0 ? 0 : rounded
  }
  return value
}

/**
 * 角度归一化到 [0, 360)
 */
export function normalizeAngle360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * 角度归一化到 [0, 180]（最小夹角）
 */
export function normalizeAngle180(deg: number): number {
  const a = normalizeAngle360(deg)
  return a > 180 ? 360 - a : a
}
