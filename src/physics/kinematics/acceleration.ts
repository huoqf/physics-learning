/**
 * 双物体加速度对比计算（基础版）。
 * 飞机A做匀速运动（a=0），跑车B从静止做匀加速运动。
 * @param vA - 飞机A恒定速度 (m/s)
 * @param aB - 跑车B加速度 (m/s²)
 * @param deltaT - 观测时间微元 (s)
 * @param t - 当前时刻 (s)
 * @returns 双物体各物理量及核心结论
 */
export function calculateDualObjectComparison(
  vA: number,
  aB: number,
  deltaT: number,
  t: number
): {
  /** 飞机当前速度 (m/s) */
  vA: number
  /** 跑车当前速度 (m/s) */
  vB: number
  /** 飞机速度变化量 (m/s)，恒为0 */
  deltaVA: number
  /** 跑车速度变化量 (m/s) */
  deltaVB: number
  /** 飞机加速度 (m/s²)，恒为0 */
  aA: number
  /** 跑车加速度 (m/s²) */
  aB: number
  /** 飞机位移 (m) */
  sA: number
  /** 跑车位移 (m) */
  sB: number
  /** 核心结论文字 */
  conclusion: string
} {
  const vB = aB * t
  const deltaVA = 0
  const deltaVB = aB * deltaT
  const aA = 0
  const sA = vA * t
  const sB = 0.5 * aB * t * t

  let conclusion: string
  if (t === 0) {
    conclusion = '点击播放，观察速度与加速度的区别'
  } else if (vA > vB) {
    conclusion = `v_A > v_B，但 a_A < a_B`
  } else {
    conclusion = `v_B 已超过 v_A！加速度的"延迟回报"显现`
  }

  return { vA, vB, deltaVA, deltaVB, aA, aB, sA, sB, conclusion }
}

/**
 * 变加速直线运动计算（进阶版）。
 * 加速度随时间线性减小：a(t) = a₀ - k·t
 * v(t) = v₀ + a₀·t - ½·k·t²
 * s(t) = v₀·t + ½·a₀·t² - (1/6)·k·t³
 * @param v0 - 初速度 (m/s)
 * @param a0 - 初始加速度 (m/s²)
 * @param k - 加速度衰减率 (m/s³)，正值表示加速度在减小
 * @param t - 当前时刻 (s)
 * @returns 速度、位移、当前加速度
 */
export function calculateVariableAccelerationMotion(
  v0: number,
  a0: number,
  k: number,
  t: number
): {
  /** 当前速度 (m/s) */
  v: number
  /** 位移 (m) */
  s: number
  /** 当前加速度 (m/s²) */
  a: number
} {
  const a = a0 - k * t
  const v = v0 + a0 * t - 0.5 * k * t * t
  const s = v0 * t + 0.5 * a0 * t * t - (k * t * t * t) / 6
  return { v, s, a }
}

/**
 * 警车追击问题分段运动计算（进阶版）。
 *
 * 情境：前方轿车A以恒定速度 vA 匀速行驶，后方警车B在反应时间 t0 后启动，
 * 以加速度 aB 匀加速至最高时速 vMax，之后匀速巡航追击。
 *
 * 轿车位置：x_A(t) = vA * t
 * 警车位置：
 *   - 反应期 (t < t0)：x_B(t) = 0
 *   - 加速期 (t0 <= t < t1)：x_B(t) = 0.5 * aB * (t - t0)^2
 *   - 巡航期 (t >= t1)：x_B(t) = x_B(t1) + vMax * (t - t1)
 * 其中 t1 = t0 + vMax / aB 为满速时刻。
 *
 * @param vA 轿车速度 (m/s)
 * @param deltaX0 初始车距 (m)，轿车在警车前方
 * @param t0 反应时间 (s)
 * @param aB 警车加速度 (m/s²)
 * @param vMax 警车最高时速 (m/s)
 * @param time 当前时刻 (s)
 * @returns 追击状态
 */
export function calculatePoliceChase(
  vA: number,
  deltaX0: number,
  t0: number,
  aB: number,
  vMax: number,
  time: number
): {
  /** 当前阶段 */
  phase: 'reaction' | 'accelerating' | 'cruising'
  /** 轿车位置 (m) */
  xA: number
  /** 警车位置 (m) */
  xB: number
  /** 轿车速度 (m/s) */
  vA: number
  /** 警车速度 (m/s) */
  vB: number
  /** 警车当前加速度 (m/s²) */
  aB_current: number
  /** 实际车距 (m) */
  deltaX: number
  /** 位移差 S_A - S_B (m) */
  deltaS: number
  /** 共速临界时刻 (s) */
  tEqual: number
  /** 满速临界时刻 (s) */
  t1: number
  /** 相遇时刻 (s)，null 表示未相遇 */
  tMeet: number | null
  /** 当前是否处于最大间距时刻 */
  isMaxGap: boolean
} {
  const t1 = t0 + vMax / aB

  // 计算轿车状态
  const xA = vA * time

  // 计算警车状态（分段）
  let xB: number
  let vB: number
  let aB_current: number
  let phase: 'reaction' | 'accelerating' | 'cruising'

  if (time < t0) {
    phase = 'reaction'
    xB = 0
    vB = 0
    aB_current = 0
  } else if (time < t1) {
    phase = 'accelerating'
    const dt = time - t0
    xB = 0.5 * aB * dt * dt
    vB = aB * dt
    aB_current = aB
  } else {
    phase = 'cruising'
    const xB_t1 = 0.5 * aB * (t1 - t0) * (t1 - t0)
    xB = xB_t1 + vMax * (time - t1)
    vB = vMax
    aB_current = 0
  }

  // 实际车距（轿车在前方，所以是 deltaX0 + xA - xB）
  const deltaX = deltaX0 + xA - xB

  // 位移差
  const deltaS = xA - xB

  // 共速时刻：vA = aB * (t - t0) => t = t0 + vA / aB
  const tEqual = t0 + vA / aB

  // 判断是否处于最大间距时刻（共速时刻，且警车仍在加速期）
  const isMaxGap = Math.abs(time - tEqual) < 0.05 && time >= t0 && time < t1

  // 计算相遇时刻：解 deltaX0 + vA * t = xB(t)
  let tMeet: number | null = null

  // 在加速期相遇：deltaX0 + vA*t = 0.5*aB*(t-t0)^2
  // 整理：0.5*aB*t^2 - (aB*t0 + vA)*t + (0.5*aB*t0^2 - deltaX0) = 0
  const a_quad = 0.5 * aB
  const b_quad = -(aB * t0 + vA)
  const c_quad = 0.5 * aB * t0 * t0 - deltaX0
  const discriminant = b_quad * b_quad - 4 * a_quad * c_quad

  if (discriminant >= 0) {
    const sqrtDisc = Math.sqrt(discriminant)
    const t1_root = (-b_quad + sqrtDisc) / (2 * a_quad)
    const t2_root = (-b_quad - sqrtDisc) / (2 * a_quad)

    // 取在加速期内且大于0的根
    const validRoots = [t1_root, t2_root].filter(
      (r) => r > 0 && r >= t0 && r < t1
    )
    if (validRoots.length > 0) {
      tMeet = Math.min(...validRoots)
    }
  }

  // 如果在加速期未相遇，检查巡航期
  if (tMeet === null) {
    const xB_t1 = 0.5 * aB * (t1 - t0) * (t1 - t0)
    // 巡航期：deltaX0 + vA*t = xB_t1 + vMax*(t - t1)
    // 整理：(vA - vMax)*t = xB_t1 - vMax*t1 - deltaX0
    if (Math.abs(vA - vMax) > 1e-9) {
      const t_cruise = (xB_t1 - vMax * t1 - deltaX0) / (vA - vMax)
      if (t_cruise >= t1) {
        tMeet = t_cruise
      }
    }
  }

  return {
    phase,
    xA,
    xB,
    vA,
    vB,
    aB_current,
    deltaX,
    deltaS,
    tEqual,
    t1,
    tMeet,
    isMaxGap,
  }
}

/**
 * 根据纬度计算重力加速度（Somigliana 近似）
 * @param latitude 纬度 φ (°)
 * @returns g (m/s²)
 */
export function calcGByLatitude(latitude: number): number {
  const phi = (latitude * Math.PI) / 180
  return 9.780327 * (1 + 0.0053024 * Math.sin(phi) * Math.sin(phi) - 0.0000058 * Math.sin(2 * phi) * Math.sin(2 * phi))
}

/**
 * 根据海拔修正重力加速度
 * @param g0 海平面重力加速度 (m/s²)
 * @param altitude 海拔高度 (km)
 * @returns 修正后 g (m/s²)
 */
export function calcGByAltitude(g0: number, altitude: number): number {
  const EARTH_RADIUS_KM = 6371
  return g0 * (EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitude)) ** 2
}
