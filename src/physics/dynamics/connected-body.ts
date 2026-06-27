/**
 * 连接体问题静态张力范围（仅静止态有意义）
 *
 * 静止时张力由静摩擦分配决定，不唯一。取值范围受两物体最大静摩擦力约束：
 *   T_min = max(0, F - f₂_max)   —— m₂ 即将滑动时绳的最小拉力
 *   T_max = min(f₁_max, F)       —— m₁ 即将滑动时绳的最大拉力
 */
export interface StaticTensionRange {
  /** 张力下界 (N) */
  min: number
  /** 张力上界 (N) */
  max: number
}

/**
 * 连接体问题计算结果
 */
export interface ConnectedBodyResult {
  /** 系统是否发生共同运动 */
  isMoving: boolean
  /** 系统加速度 (m/s²)，静止时为 0 */
  a: number
  /** 绳/弹簧内力张力 (N)，运动时为精确值，静止时为 0（展示值） */
  T: number
  /** UI 展示用张力 (N)，与 T 相同，语义上强调"展示值" */
  displayTension: number
  /** m₁ 实际摩擦力 (N)，仅运动时有意义，静止时为 null */
  f1: number | null
  /** m₂ 实际摩擦力 (N)，仅运动时有意义，静止时为 null */
  f2: number | null
  /** m₁ 最大静摩擦力 (N) */
  f1Max: number
  /** m₂ 最大静摩擦力 (N) */
  f2Max: number
  /** 系统总最大静摩擦力 (N) */
  totalFrictionMax: number
  /** 静止态张力取值范围，运动时为 null */
  staticTensionRange: StaticTensionRange | null
}

/**
 * 计算水平面上连接体问题的运动状态与内力
 *
 * 物理模型：两个物体 m₁、m₂ 通过轻绳/弹簧连接，置于同一粗糙水平面上，
 * 水平外力 F 作用于 m₂ 右侧，两物体摩擦系数相同（均为 μ）。
 *
 * 运动时（F > μ(m₁+m₂)g）：
 *   加速度 a = [F - μ(m₁+m₂)g] / (m₁+m₂)
 *   张力 T = m₁F / (m₁+m₂)（与 μ 无关，高中秒杀结论）
 *
 * 静止时（F ≤ μ(m₁+m₂)g）：
 *   张力不唯一，取值范围由两物体最大静摩擦力约束。
 *   为教学展示简洁，displayTension 返回 0，但 staticTensionRange 提供完整范围。
 *
 * @param m1 物体1质量 (kg)，必须 > 0
 * @param m2 物体2质量 (kg)，必须 > 0
 * @param F  水平外拉力 (N)，作用于 m₂ 右侧，必须 ≥ 0
 * @param mu 动摩擦因数（两物体相同），必须 ≥ 0
 * @param g  重力加速度 (m/s²)，通常取 9.8
 * @returns 连接体运动状态与内力
 *
 * @category M1
 */
export function calculateConnectedBody(
  m1: number,
  m2: number,
  F: number,
  mu: number,
  g: number
): ConnectedBodyResult {
  const f1Max = mu * m1 * g
  const f2Max = mu * m2 * g
  const totalFrictionMax = f1Max + f2Max
  const isMoving = F > totalFrictionMax

  if (!isMoving) {
    const staticTensionMin = Math.max(0, F - f2Max)
    const staticTensionMax = Math.min(f1Max, F)

    return {
      isMoving: false,
      a: 0,
      T: 0,
      displayTension: 0,
      f1: null,
      f2: null,
      f1Max,
      f2Max,
      totalFrictionMax,
      staticTensionRange: { min: staticTensionMin, max: staticTensionMax },
    }
  }

  const totalMass = m1 + m2
  const a = (F - totalFrictionMax) / totalMass
  const T = (m1 * F) / totalMass

  return {
    isMoving: true,
    a,
    T,
    displayTension: T,
    f1: f1Max,
    f2: f2Max,
    f1Max,
    f2Max,
    totalFrictionMax,
    staticTensionRange: null,
  }
}

/**
 * 连接体问题时间线状态
 */
export interface ConnectedBodyTimelineResult {
  /** 当前时刻加速度 (m/s²) */
  a: number
  /** 当前时刻速度 (m/s) */
  v: number
  /** 当前时刻位移 (m) */
  s: number
  /** 当前时刻张力 (N) */
  T: number
  /** 系统是否在运动 */
  isMoving: boolean
}

/**
 * 计算连接体问题在给定时刻的运动状态
 *
 * 基于匀变速直线运动公式：
 *   v = a·t
 *   s = ½·a·t²
 *
 * 若系统未启动（F ≤ μ(m₁+m₂)g），则 a = v = s = 0。
 *
 * @param m1 物体1质量 (kg)
 * @param m2 物体2质量 (kg)
 * @param F  水平外拉力 (N)
 * @param mu 动摩擦因数
 * @param g  重力加速度 (m/s²)
 * @param t  时间 (s)，必须 ≥ 0
 * @returns 给定时刻的运动状态
 *
 * @category M1
 */
export function calculateConnectedBodyTimeline(
  m1: number,
  m2: number,
  F: number,
  mu: number,
  g: number,
  t: number
): ConnectedBodyTimelineResult {
  const { isMoving, a, T } = calculateConnectedBody(m1, m2, F, mu, g)

  if (!isMoving || t <= 0) {
    return { a: 0, v: 0, s: 0, T: 0, isMoving: false }
  }

  const v = a * t
  const s = 0.5 * a * t * t

  return { a, v, s, T, isMoving: true }
}
