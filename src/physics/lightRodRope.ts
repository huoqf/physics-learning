/**
 * src/physics/lightRodRope.ts
 * 轻杆/绳连接体物理计算模块 — 包含刚性约束与柔性绳拓扑的轨迹积分
 */

export interface LRRModelState {
  /** 时间 (s) */
  t: number
  /** 约束类型: 0=刚性轻杆, 1=柔性轻绳 */
  mode: number
  /** A球角位移 (rad)，以水平向右为 0，顺时针向下为正 */
  thetaA: number
  /** B球角位移 (rad)，以水平向右为 0，顺时针向下为正 */
  thetaB: number
  /** A球角速度 (rad/s) */
  wA: number
  /** B球角速度 (rad/s) */
  wB: number
  /** A球线速度大小 (m/s) */
  vA: number
  /** B球线速度大小 (m/s) */
  vB: number
  /** A球角加速度 (rad/s²) */
  alphaA: number
  /** B球角加速度 (rad/s²) */
  alphaB: number
  /** A球重力势能 (J)，以最低点(theta=pi/2)为 0 势能面 */
  EpA: number
  /** B球重力势能 (J)，以最低点(theta=pi/2)为 0 势能面 */
  EpB: number
  /** A球动能 (J) */
  EkA: number
  /** B球动能 (J) */
  EkB: number
  /** A球总机械能 (J) */
  EA: number
  /** B球总机械能 (J) */
  EB: number
  /** 系统总机械能 (J) */
  Etot: number
  /** 杆/绳对 A球的作用力矢量 (N)，物理坐标 x->, y-向上 */
  F_A: { x: number; y: number }
  /** 杆/绳对 B球的作用力矢量 (N)，物理坐标 x->, y-向上 */
  F_B: { x: number; y: number }
  /** 能量传输功率 (W) (从A向B为正，柔性绳下为0) */
  powerB: number
}

/**
 * 预计算双球连接体系统的运动轨迹（数值积分）。
 *
 * @param m1 - A球质量 (kg)
 * @param m2 - B球质量 (kg)
 * @param L - 杆/绳总长度 (m)
 * @param g - 重力加速度 (m/s²)
 * @param mode - 约束类型：0=刚性轻杆，1=柔性轻绳
 * @param tMax - 最大模拟时间 (s)，默认 15
 * @param dt - 时间步长 (s)，默认 0.02
 * @returns 轨迹点数组，按时间升序排列
 */
export function precomputeLightRodRopeTrajectory(
  m1: number,
  m2: number,
  L: number,
  g: number,
  mode: number, // 0=杆, 1=绳
  tMax: number = 15,
  dt: number = 0.02
): LRRModelState[] {
  const points: LRRModelState[] = []

  let thetaA = 0.0 // 水平静止释放
  let thetaB = 0.0
  let wA = 0.0
  let wB = 0.0

  let t = 0.0
  const subSteps = 100
  const subDt = dt / subSteps

  // B球最低点的总机械能作为参考面零点
  // 刚性杆初始机械能 (水平释放)：
  // EpA0 = m1 * g * (L/2)，EpB0 = m2 * g * L。动能为 0

  while (t <= tMax + dt * 0.5) {
    const curT = Math.min(t, tMax)

    // 计算当前物理量
    let epA = 0
    let epB = 0
    let ekA = 0
    let ekB = 0
    let alphaA = 0
    let alphaB = 0
    let F_Ax = 0, F_Ay = 0
    let F_Bx = 0, F_By = 0
    let powerB = 0

    if (mode === 0) {
      // 刚性轻杆连接
      const theta = thetaA // 刚性连接，A/B 角度相等
      const w = wA
      
      // 转动定律 alpha
      alphaA = (2 * (m1 + 2 * m2) * g * Math.cos(theta)) / ((m1 + 4 * m2) * L)
      alphaB = alphaA

      // 两球的物理高度（向上为正，最低点为负。为了势能为正，以最低点为零：hA = L/2 * (1 - sin(theta))）
      // 当theta = pi/2 (最低点)时，sin(theta) = 1 => Ep = 0
      epA = m1 * g * (L / 2) * (1 - Math.sin(theta))
      epB = m2 * g * L * (1 - Math.sin(theta))

      // 速度大小
      const vA_val = (L / 2) * w
      const vB_val = L * w

      ekA = 0.5 * m1 * vA_val * vA_val
      ekB = 0.5 * m2 * vB_val * vB_val

      // 杆对 B 的受力
      // 径向向心力 F_Br - m2*g*sin(theta) = m2 * L * w^2 => F_Br = m2*g*sin(theta) + m2*L*w^2
      // 切向力 F_Bt + m2*g*cos(theta) = m2 * L * alpha => F_Bt = m2*g*cos(theta) * (m1 / (m1 + 4*m2))
      const F_Br = m2 * g * Math.sin(theta) + m2 * L * w * w
      const F_Bt = (m2 * g * Math.cos(theta) * m1) / (m1 + 4 * m2)

      // 杆对 A 的受力 (利用牛二定律：F_Ar - m1*g*sin(theta) = m1 * L/2 * w^2 => F_Ar = m1*g*sin(theta) + m1*L/2*w^2)
      // 切向：F_At + m1*g*cos(theta) = m1 * L/2 * alpha => F_At = -m1*g*cos(theta) * (2*m2 / (m1 + 4*m2))
      const F_Ar = m1 * g * Math.sin(theta) + m1 * (L / 2) * w * w
      const F_At = (-m1 * g * Math.cos(theta) * 2 * m2) / (m1 + 4 * m2)

      // 转换成 Cartesian 坐标系 (物理坐标系：x向右, y向上)
      // 径向单位向量 r_hat = (cos(theta), -sin(theta))
      // 切向单位向量 t_hat = (-sin(theta), -cos(theta))，指向运动方向
      // 杆作用力是拉力，方向指向中心即 -r_hat，和切向力
      F_Bx = -F_Br * Math.cos(theta) - F_Bt * Math.sin(theta)
      F_By = F_Br * Math.sin(theta) - F_Bt * Math.cos(theta)

      F_Ax = -F_Ar * Math.cos(theta) - F_At * Math.sin(theta)
      F_Ay = F_Ar * Math.sin(theta) - F_At * Math.cos(theta)

      // 能量传输功率 P_B = F_Bt * vB_val = F_Bt * L * w
      powerB = F_Bt * L * w
    } else {
      // 柔性轻绳连接
      // A球独立单摆
      alphaA = (2 * g * Math.cos(thetaA)) / L
      epA = m1 * g * (L / 2) * (1 - Math.sin(thetaA))
      const vA_val = (L / 2) * wA
      ekA = 0.5 * m1 * vA_val * vA_val

      // A球绳子拉力 (径向，无切向力)
      const F_Ar = m1 * g * Math.sin(thetaA) + m1 * (L / 2) * wA * wA
      F_Ax = -F_Ar * Math.cos(thetaA)
      F_Ay = F_Ar * Math.sin(thetaA)

      // B球独立单摆
      alphaB = (g * Math.cos(thetaB)) / L
      epB = m2 * g * L * (1 - Math.sin(thetaB))
      const vB_val = L * wB
      ekB = 0.5 * m2 * vB_val * vB_val

      // B球绳子拉力 (径向，无切向力)
      const F_Br = m2 * g * Math.sin(thetaB) + m2 * L * wB * wB
      F_Bx = -F_Br * Math.cos(thetaB)
      F_By = F_Br * Math.sin(thetaB)

      powerB = 0
    }

    const EA = ekA + epA
    const EB = ekB + epB

    points.push({
      t: curT,
      mode,
      thetaA,
      thetaB,
      wA,
      wB,
      vA: (L / 2) * Math.abs(wA),
      vB: L * Math.abs(wB),
      alphaA,
      alphaB,
      EpA: epA,
      EpB: epB,
      EkA: ekA,
      EkB: ekB,
      EA,
      EB,
      Etot: EA + EB, // 强制系统总能量绝对守恒
      F_A: { x: F_Ax, y: F_Ay },
      F_B: { x: F_Bx, y: F_By },
      powerB,
    })

    // 子步数值积分 (Euler-Cromer)
    for (let step = 0; step < subSteps; step++) {
      if (mode === 0) {
        // 刚性杆
        const curTheta = thetaA
        const curAlpha = (2 * (m1 + 2 * m2) * g * Math.cos(curTheta)) / ((m1 + 4 * m2) * L)
        wA = wA + curAlpha * subDt
        thetaA = thetaA + wA * subDt
        thetaB = thetaA
        wB = wA
      } else {
        // 柔性绳，各自独立
        const curAlphaA = (2 * g * Math.cos(thetaA)) / L
        wA = wA + curAlphaA * subDt
        thetaA = thetaA + wA * subDt

        const curAlphaB = (g * Math.cos(thetaB)) / L
        wB = wB + curAlphaB * subDt
        thetaB = thetaB + wB * subDt
      }
    }

    t += dt
  }

  return points
}

/**
 * 线性插值器取得指定时刻的状态。
 *
 * @param points - 预计算的轨迹点数组（按时间升序）
 * @param t - 目标时间 (s)
 * @returns 该时刻的插值状态，包含角度、角速度、能量、作用力等
 */
export function getLRRStateAtTime(
  points: LRRModelState[],
  t: number
): LRRModelState {
  if (points.length === 0) {
    return {
      t: 0, mode: 0, thetaA: 0, thetaB: 0, wA: 0, wB: 0, vA: 0, vB: 0,
      alphaA: 0, alphaB: 0, EpA: 0, EpB: 0, EkA: 0, EkB: 0, EA: 0, EB: 0, Etot: 0,
      F_A: { x: 0, y: 0 }, F_B: { x: 0, y: 0 }, powerB: 0
    }
  }
  if (t <= points[0].t) return { ...points[0] }
  if (t >= points[points.length - 1].t) return { ...points[points.length - 1] }

  let lo = 0
  let hi = points.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].t <= t) lo = mid
    else hi = mid
  }

  const p0 = points[lo]
  const p1 = points[hi]
  const ratio = (t - p0.t) / (p1.t - p0.t)

  return {
    t,
    mode: p0.mode,
    thetaA: p0.thetaA + (p1.thetaA - p0.thetaA) * ratio,
    thetaB: p0.thetaB + (p1.thetaB - p0.thetaB) * ratio,
    wA: p0.wA + (p1.wA - p0.wA) * ratio,
    wB: p0.wB + (p1.wB - p0.wB) * ratio,
    vA: p0.vA + (p1.vA - p0.vA) * ratio,
    vB: p0.vB + (p1.vB - p0.vB) * ratio,
    alphaA: p0.alphaA + (p1.alphaA - p0.alphaA) * ratio,
    alphaB: p0.alphaB + (p1.alphaB - p0.alphaB) * ratio,
    EpA: p0.EpA + (p1.EpA - p0.EpA) * ratio,
    EpB: p0.EpB + (p1.EpB - p0.EpB) * ratio,
    EkA: p0.EkA + (p1.EkA - p0.EkA) * ratio,
    EkB: p0.EkB + (p1.EkB - p0.EkB) * ratio,
    EA: p0.EA + (p1.EA - p0.EA) * ratio,
    EB: p0.EB + (p1.EB - p0.EB) * ratio,
    Etot: p0.Etot + (p1.Etot - p0.Etot) * ratio,
    F_A: {
      x: p0.F_A.x + (p1.F_A.x - p0.F_A.x) * ratio,
      y: p0.F_A.y + (p1.F_A.y - p0.F_A.y) * ratio,
    },
    F_B: {
      x: p0.F_B.x + (p1.F_B.x - p0.F_B.x) * ratio,
      y: p0.F_B.y + (p1.F_B.y - p0.F_B.y) * ratio,
    },
    powerB: p0.powerB + (p1.powerB - p0.powerB) * ratio,
  }
}
