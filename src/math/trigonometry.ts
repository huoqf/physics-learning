/**
 * 三角函数工具函数
 * 提供角度与弧度转换，以及基于角度的三角函数
 *
 * @category M4 — 数学工具（预留，当前无消费方；M4 天体/波动等场景会用到 sinDeg/cosDeg）
 */

/**
 * 角度转弧度
 * @param deg 角度 [°]
 * @returns 弧度 [rad]
 */
export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

/**
 * 弧度转角度
 * @param rad 弧度 [rad]
 * @returns 角度 [°]
 */
export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

/**
 * 基于角度的正弦函数
 * @param deg 角度 [°]
 * @returns 正弦值 [无量纲]
 */
export function sinDeg(deg: number): number {
  return Math.sin(degToRad(deg));
}

/**
 * 基于角度的余弦函数
 * @param deg 角度 [°]
 * @returns 余弦值 [无量纲]
 */
export function cosDeg(deg: number): number {
  return Math.cos(degToRad(deg));
}

/**
 * 基于角度的正切函数
 * @param deg 角度 [°]，不能为 90° + k*180°
 * @returns 正切值 [无量纲]
 */
export function tanDeg(deg: number): number {
  return Math.tan(degToRad(deg));
}

