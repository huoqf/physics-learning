/**
 * src/physics/momentumConservation.ts
 * 动量守恒定律（Law of Conservation of Momentum）纯物理计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m, m/s, N, s, J）
 */

// ─── 基础模式：两球碰撞 ──────────────────────────────────────────────────

/**
 * 计算完全非弹性碰撞后速度（两球碰后粘合）
 * v' = (m1·v1 + m2·v2) / (m1 + m2)
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球碰前速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球碰前速度 (m/s)
 * @returns v_after 碰后共同速度 (m/s)
 */
export function perfectlyInelasticCollision(
  m1: number, v1: number, m2: number, v2: number
): number {
  return (m1 * v1 + m2 * v2) / (m1 + m2)
}

/**
 * 计算碰撞前系统总动量
 * p_total = m1·v1 + m2·v2
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球速度 (m/s)
 * @returns p_total 系统总动量 (kg·m/s)
 */
export function calculateSystemMomentum(
  m1: number, v1: number, m2: number, v2: number
): number {
  return m1 * v1 + m2 * v2
}

// ─── 进阶模式：滑块-木板模型 ──────────────────────────────────────────────

/**
 * 计算滑块-木板系统的共同速度
 * v_共 = m·v0 / (m + M)
 *
 * @param m 滑块质量 (kg)
 * @param v0 滑块初速度 (m/s)
 * @param M 木板质量 (kg)
 * @returns v_common 共同速度 (m/s)
 */
export function calculateCommonVelocity(m: number, v0: number, M: number): number {
  return (m * v0) / (m + M)
}

/**
 * 计算达到共速的时间
 * t = M·v_共 / (μ·m·g)
 *
 * @param M 木板质量 (kg)
 * @param vCommon 共同速度 (m/s)
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns t 共速时间 (s)
 */
export function calculateCommonVelocityTime(
  M: number, vCommon: number, mu: number, m: number, g: number = 9.8
): number {
  const frictionForce = mu * m * g
  if (frictionForce <= 0) return Infinity
  return (M * vCommon) / frictionForce
}

/**
 * 计算滑块位移；传入 m/M 时自动在共速后转为共同匀速
 * x1 = v0·t - 0.5·μ·g·t²
 *
 * @param v0 滑块初速度 (m/s)
 * @param mu 动摩擦因数
 * @param t 时间 (s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns x1 滑块位移 (m)
 */
export function calculateSliderDisplacement(
  v0: number, mu: number, t: number, g: number = 9.8, m?: number, M?: number
): number {
  if (m === undefined || M === undefined || mu <= 0) {
    return v0 * t - 0.5 * mu * g * t * t
  }
  const vCommon = calculateCommonVelocity(m, v0, M)
  const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g)
  if (t <= tCommon) return v0 * t - 0.5 * mu * g * t * t
  const xCommon = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
  return xCommon + vCommon * (t - tCommon)
}

/**
 * 计算木板位移；传入 v0 时自动在共速后转为共同匀速
 * x2 = 0.5·(μ·m·g/M)·t²
 *
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param M 木板质量 (kg)
 * @param t 时间 (s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns x2 木板位移 (m)
 */
export function calculateBoardDisplacement(
  mu: number, m: number, M: number, t: number, g: number = 9.8, v0?: number
): number {
  const aBoard = (mu * m * g) / M
  if (v0 === undefined || mu <= 0) return 0.5 * aBoard * t * t
  const vCommon = calculateCommonVelocity(m, v0, M)
  const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g)
  if (t <= tCommon) return 0.5 * aBoard * t * t
  const xCommon = 0.5 * aBoard * tCommon * tCommon
  return xCommon + vCommon * (t - tCommon)
}

/**
 * 计算滑块在时刻 t 的速度；传入 m/M 时共速后保持 v_共
 * v_slider = v0 - μ·g·t
 *
 * @param v0 滑块初速度 (m/s)
 * @param mu 动摩擦因数
 * @param t 时间 (s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns v_slider 滑块速度 (m/s)
 */
export function calculateSliderVelocity(
  v0: number, mu: number, t: number, g: number = 9.8, m?: number, M?: number
): number {
  if (m === undefined || M === undefined || mu <= 0) {
    return Math.max(v0 - mu * g * t, 0)
  }
  const vCommon = calculateCommonVelocity(m, v0, M)
  const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g)
  return t <= tCommon ? v0 - mu * g * t : vCommon
}

/**
 * 计算木板在时刻 t 的速度
 * v_board = (μ·m·g/M)·t
 * 达到共速后保持 v_共 不变
 *
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param M 木板质量 (kg)
 * @param t 时间 (s)
 * @param v0 滑块初速度 (m/s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns v_board 木板速度 (m/s)
 */
export function calculateBoardVelocity(
  mu: number, m: number, M: number, t: number, v0: number, g: number = 9.8
): number {
  const aBoard = (mu * m * g) / M
  const vCommon = calculateCommonVelocity(m, v0, M)
  return Math.min(aBoard * t, vCommon)
}

/**
 * 计算相对位移（滑块相对木板的位移）
 * Δx = x1 - x2
 *
 * @param x1 滑块位移 (m)
 * @param x2 木板位移 (m)
 * @returns delta_x 相对位移 (m)
 */
export function calculateRelativeDisplacement(x1: number, x2: number): number {
  return x1 - x2
}

/**
 * 计算摩擦生热
 * Q = μ·m·g·Δx
 *
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param delta_x 相对位移 (m)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns Q 摩擦生热 (J)
 */
export function calculateFrictionHeat(
  mu: number, m: number, delta_x: number, g: number = 9.8
): number {
  return mu * m * g * delta_x
}

/**
 * 判断滑块是否会从木板右端掉落
 * Δx > L 时滑块掉落
 *
 * @param delta_x 相对位移 (m)
 * @param L 木板长度 (m)
 * @returns willFall 是否掉落
 */
export function willSliderFallOff(delta_x: number, L: number): boolean {
  return delta_x > L
}
