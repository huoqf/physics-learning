/**
 * 三角函数工具
 * 封装角度/弧度转换及常用三角计算，避免业务代码中直接混用 deg/rad。
 *
 * @category M4 — 数学工具
 */

/**
 * 角度转弧度
 * @param deg 角度 [°]
 * @returns 弧度 [rad]
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 弧度转角度
 * @param rad 弧度 [rad]
 * @returns 角度 [°]
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 角度正弦
 * @param deg 角度 [°]
 * @returns 正弦值 [无量纲]
 */
export function sinDeg(deg: number): number {
  return Math.sin(degToRad(deg));
}

/**
 * 角度余弦
 * @param deg 角度 [°]
 * @returns 余弦值 [无量纲]
 */
export function cosDeg(deg: number): number {
  return Math.cos(degToRad(deg));
}

/**
 * 角度正切
 * @param deg 角度 [°]
 * @returns 正切值 [无量纲]
 */
export function tanDeg(deg: number): number {
  return Math.tan(degToRad(deg));
}
