/**
 * src/physics/work.ts
 * 恒力做功物理计算 — 纯函数，无副作用
 *
 * 物理模型：水平面上质量为 m 的滑块受斜向拉力 F（与水平方向夹角 θ），
 * 沿水平方向发生位移 s。
 *
 * 核心公式：
 *   W_F = F·s·cosθ           （拉力做功）
 *   F_N = mg − F·sinθ        （支持力，θ<90° 时减小）
 *   f   = μ·F_N              （滑动摩擦力）
 *   W_f = −f·s               （摩擦力做功，恒为负）
 *   W_net = W_F + W_f        （合力做功）
 *
 * 脱地临界条件：F·sinθ ≥ mg → F_N = 0, f = 0
 */

/**
 * 计算恒力做功（基础模式，无摩擦力）
 *
 * @param F 拉力大小 (N)，必须 ≥ 0
 * @param s 位移大小 (m)，必须 ≥ 0
 * @param angleDeg 拉力与水平位移方向的夹角 (°)，范围 [0, 180]
 * @returns W 拉力做功 (J)，Fx 水平分力 (N)，Fy 竖直分力 (N)
 */
export function calculateWorkBasic(
  F: number,
  s: number,
  angleDeg: number
): {
  /** 拉力做功 (J) */
  W: number
  /** 水平分力 Fx = F·cosθ (N) */
  Fx: number
  /** 竖直分力 Fy = F·sinθ (N)，向上为正 */
  Fy: number
} {
  const angleRad = (angleDeg * Math.PI) / 180
  const Fx = F * Math.cos(angleRad)
  const Fy = F * Math.sin(angleRad)
  const W = Fx * s
  return { W, Fx, Fy }
}

/**
 * 做功类型判定
 */
export type WorkType = 'positive' | 'negative' | 'zero'

/**
 * 根据夹角判定做功类型
 *
 * @param angleDeg 拉力与位移方向的夹角 (°)
 * @returns 做功类型
 */
export function classifyWorkType(angleDeg: number): WorkType {
  if (angleDeg < 90) return 'positive'
  if (angleDeg > 90) return 'negative'
  return 'zero'
}

/**
 * 计算恒力做功（进阶模式，含摩擦力与脱地判定）
 *
 * 物理模型：水平面上滑块受斜向拉力 F，考虑摩擦力耦合。
 * - θ < 90° 时（斜向上拉）：F_y 向上，支持力减小，摩擦力减小
 * - θ > 90° 时（斜向下推）：F_y 向下，支持力增大，摩擦力增大
 * - θ = 90° 时（竖直拉/推）：F_x = 0，拉力不做功
 *
 * @param F 拉力大小 (N)，必须 ≥ 0
 * @param s 位移大小 (m)，必须 ≥ 0
 * @param angleDeg 拉力与水平位移方向的夹角 (°)，范围 [0, 180]
 * @param m 滑块质量 (kg)，必须 > 0
 * @param mu 动摩擦因数，必须 ≥ 0
 * @param g 重力加速度 (m/s²)，正值
 * @returns 各物理量计算结果
 */
export function calculateWorkAdvanced(
  F: number,
  s: number,
  angleDeg: number,
  m: number,
  mu: number,
  g: number
): {
  /** 拉力做功 W_F (J) */
  W_F: number
  /** 摩擦力做功 W_f (J)，恒 ≤ 0 */
  W_f: number
  /** 合力做功 W_net (J) */
  W_net: number
  /** 水平分力 Fx (N) */
  Fx: number
  /** 竖直分力 Fy (N)，向上为正 */
  Fy: number
  /** 支持力 F_N (N)，脱地时为 0 */
  F_N: number
  /** 滑动摩擦力 f (N)，脱地时为 0 */
  f: number
  /** 重力 mg (N) */
  weight: number
  /** 是否脱地 */
  isLiftedOff: boolean
  /** 做功类型 */
  workType: WorkType
} {
  const angleRad = (angleDeg * Math.PI) / 180
  const Fx = F * Math.cos(angleRad)
  const Fy = F * Math.sin(angleRad)
  const weight = m * g

  // 脱地判定：F·sinθ ≥ mg 时，滑块脱离地面
  const isLiftedOff = Fy >= weight

  // 支持力与摩擦力
  const F_N = isLiftedOff ? 0 : Math.max(0, weight - Fy)
  const f = isLiftedOff ? 0 : mu * F_N

  // 做功计算
  const W_F = Fx * s
  const W_f = f > 0 ? -f * s : 0
  const W_net = W_F + W_f

  const workType = classifyWorkType(angleDeg)

  return {
    W_F,
    W_f,
    W_net,
    Fx,
    Fy,
    F_N,
    f,
    weight,
    isLiftedOff,
    workType,
  }
}

/**
 * 计算脱地临界拉力
 *
 * 当 F·sinθ = mg 时，滑块恰好脱离地面。
 * 临界拉力 F_crit = mg / sinθ
 *
 * @param m 滑块质量 (kg)
 * @param angleDeg 拉力与水平方向的夹角 (°)，范围 (0, 180]
 * @param g 重力加速度 (m/s²)
 * @returns 临界拉力 (N)，θ=0° 时返回 Infinity
 */
export function calculateLiftOffForce(
  m: number,
  angleDeg: number,
  g: number
): number {
  const angleRad = (angleDeg * Math.PI) / 180
  const sinTheta = Math.sin(angleRad)
  if (sinTheta <= 0) return Infinity
  return (m * g) / sinTheta
}
