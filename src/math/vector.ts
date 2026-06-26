/**
 * 向量运算工具函数
 * 提供2D向量的基本运算功能，用于物理计算
 *
 * @category M4 — 数学工具（预留，当前无消费方；未来电磁/力学代码应迁移至此）
 */

export type Vector2 = { x: number; y: number };

/**
 * 向量加法
 * @param a 向量A [m/s, m/s², N, 等]
 * @param b 向量B [m/s, m/s², N, 等]
 * @returns 向量和 [m/s, m/s², N, 等]
 */
export function vectorAdd(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * 向量减法
 * @param a 被减向量 [m/s, m/s², N, 等]
 * @param b 减向量 [m/s, m/s², N, 等]
 * @returns 向量差 [m/s, m/s², N, 等]
 */
export function vectorSub(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * 向量标量乘法
 * @param v 向量 [m/s, m/s², N, 等]
 * @param s 标量系数 [无量纲]
 * @returns 缩放后的向量 [m/s, m/s², N, 等]
 */
export function vectorScale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s };
}

/**
 * 向量点积
 * @param a 向量A [m/s, m/s², N, 等]
 * @param b 向量B [m/s, m/s², N, 等]
 * @returns 点积结果 [m²/s², m²/s⁴, N², 等]
 */
export function vectorDot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * 向量模长
 * @param v 向量 [m/s, m/s², N, 等]
 * @returns 模长 [m/s, m/s², N, 等]
 */
export function vectorMagnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * 向量归一化
 * @param v 向量 [m/s, m/s², N, 等]
 * @returns 单位向量 [无量纲]
 */
export function vectorNormalize(v: Vector2): Vector2 {
  const mag = vectorMagnitude(v);
  if (mag === 0) {
    return { x: 0, y: 0 };
  }
  return vectorScale(v, 1 / mag);
}

