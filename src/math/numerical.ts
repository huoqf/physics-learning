/**
 * 数值方法工具函数
 * 提供确定性数值求解方法，用于无解析解的物理仿真
 */

/**
 * Runge-Kutta 4阶方法单步求解
 * @param f 导数函数 f(t, y) [s, m, m/s, 等]
 * @param t 当前时间 [s]
 * @param y 当前状态向量 [m, m/s, rad, 等]
 * @param h 步长 [s]
 * @returns 下一步状态向量 [m, m/s, rad, 等]
 */
export function rk4Step(
  f: (t: number, y: number[]) => number[],
  t: number,
  y: number[],
  h: number
): number[] {
  const k1 = f(t, y);
  const k2 = f(t + h / 2, y.map((yi, i) => yi + h / 2 * k1[i]));
  const k3 = f(t + h / 2, y.map((yi, i) => yi + h / 2 * k2[i]));
  const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));

  return y.map((yi, i) => yi + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * 数值钳制
 * @param v 输入值 [任意单位]
 * @param min 最小值 [与v同单位]
 * @param max 最大值 [与v同单位]
 * @returns 钳制后的值 [与v同单位]
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * 线性插值
 * @param a 起始值 [任意单位]
 * @param b 结束值 [与a同单位]
 * @param t 插值系数 [无量纲，0-1]
 * @returns 插值结果 [与a同单位]
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

