import { GRAVITY } from './constants'

/**
 * src/physics/kineticEnergy.ts
 * 动能定理物理计算 — 纯函数，无副作用
 *
 * 两种物理模型：
 * 1. 恒力做功（普通模式）：
 *    物块质量 m，受恒定拉力 F。拉力作用在位移区间 [0, s_target] 内，
 *    到达 s_target 之后拉力撤去 (F=0)，物块以末速度 v_final 匀速前进。
 * 2. 圆弧曲面下滑变力做功（进阶模式）：
 *    物块质量 m，自顶端以初速度 v0 沿半径为 R、动摩擦因数为 mu 的 1/4 圆弧轨道下滑。
 *    下滑过程中，受重力正功和变摩擦力负功作用，动能发生改变。
 *    滑到最低点后，滑入光滑水平面进行匀速直线运动。
 */

/** 动能定理模拟单步状态 */
export interface KEModelState {
  /** 时间 (s) */
  t: number
  /** 速度 (m/s) */
  v: number
  /** 水平位移 (m) */
  x: number
  /** 垂直下降高度 (m) */
  y: number
  /** 实时圆弧角度 (rad) */
  theta: number
  /** 实时切向作用力 (N)，普通模式为拉力，进阶模式为切向合外力 */
  F: number
  /** 加速度 (m/s²) */
  a: number
  /** 实时动能 (J) */
  Ek: number
  /** 实时累计重力功 (J) */
  Ep: number
  /** 实时累计合外力功 W_net (J) */
  W: number
  /** 阶段状态: 0=圆弧段/受力中, 1=水平面匀速/终态 */
  phase: number
}

/**
 * 恒力做功（普通模式，在 s_target 处撤力）— 预计算完整轨迹
 */
export function precomputeConstantKETrajectory(
  m: number,
  v0: number,
  F_pull: number,
  s_target: number,
  x_end: number,
  dt: number = 0.02
): { points: KEModelState[]; t_c: number; v_c: number } {
  const points: KEModelState[] = []
  const a_const = F_pull / m
  
  // 计算加速到位移 s_target 所需的时间 t_c
  const discriminant = v0 * v0 + 2 * a_const * s_target
  let t_c = 0
  if (a_const > 0 && discriminant >= 0) {
    t_c = (-v0 + Math.sqrt(discriminant)) / a_const
  } else if (v0 > 0) {
    t_c = s_target / v0
  }
  
  const v_c = discriminant >= 0 ? Math.sqrt(discriminant) : 0 // 临界末速度

  let t = 0
  let curX = 0
  while (curX < x_end) {
    if (t > 20) {
      break // 防止特殊零受力下死循环
    }
    let x = 0
    let v = 0
    let F = 0
    let a = 0
    let W = 0
    let phase = 0

    if (t < t_c) {
      // 第一阶段：恒力加速中
      a = a_const
      v = v0 + a * t
      x = v0 * t + 0.5 * a * t * t
      F = F_pull
      W = F_pull * x
      phase = 0
    } else {
      // 第二阶段：撤去拉力，匀速运动
      a = 0
      v = v_c
      x = s_target + v_c * (t - t_c)
      F = 0
      W = F_pull * s_target
      phase = 1
    }

    curX = x

    const Ek = 0.5 * m * v * v
    points.push({
      t,
      v,
      x,
      y: 0,
      theta: 0,
      F,
      a,
      Ek,
      Ep: 0,
      W,
      phase
    })

    if (curX >= x_end) {
      break
    }

    t += dt
  }

  return { points, t_c, v_c }
}

/**
 * 圆弧曲面轨道下滑（进阶模式，变力做功）— 预计算完整轨迹
 *
 * 物理模型（凹型 1/4 圆弧轨道，高考标准）：
 * - 1/4 凹型圆弧轨道，半径为 R。顶端 θ=0（轨道左侧，切线竖直），最低点 θ=PI/2（轨道底端，切线水平）
 * - 球在轨道内壁（凹面侧）滑行，圆心在轨道上方偏右
 * - 底端满足高考标准：F_N - mg = mv²/R，切线严格水平
 * - 微元数值积分求解切向运动方程：a_t = g*cosθ - mu*(g*sinθ + v^2/R)
 *
 * 几何参数方程：
 *   x = R*(1 - cosθ)  水平位移（θ=0时x=0，θ=π/2时x=R）
 *   y = R*sinθ        垂直下降高度（θ=0时y=0，θ=π/2时y=R）
 *
 * 力学分析（θ 为从轨道左侧起始的角度）：
 *   重力切向分量：mg·cosθ（θ=0时切线竖直，重力全部分量沿切向；θ=π/2时切线水平，分量为0）
 *   法向力：N = mg·sinθ + mv²/R（重力法向分量 + 向心力需求）
 *   摩擦力：f = μN
 *   切向合力：F_net = mg·cosθ - f
 *
 * @param m 质量 (kg)
 * @param v0 初速度 (m/s)
 * @param R 轨道半径 (m)
 * @param mu 动摩擦因数
 * @param x_end 最大水平位移 (m)
 * @param dt 时间步长 (s)
 * @returns 轨道点与触底时间 t_c
 */
export function precomputeCurvedTrackTrajectory(
  m: number,
  v0: number,
  R: number,
  mu: number,
  x_end: number,
  dt: number = 0.02
): { points: KEModelState[]; t_c: number; v_c: number; h_max: number } {
  const points: KEModelState[] = []
  const g = GRAVITY

  // 数值积分实时变量
  // 凹型弧 θ=0 时切线竖直向下，重力切向分量 = mg·cos(0) = mg > 0
  // 球自然下滑，不存在静摩擦阻碍启动的问题，无需 arctan(mu) 偏移
  let theta = Math.max(0.001, mu > 0 ? 0.01 : 0.001) // 从极小角度开始，避免除零
  let v = v0
  let t = 0
  let W_f = 0 // 摩擦力做功 (负值)
  
  let t_c = 0 // 最低点到达时间
  let v_c = 0
  let reachedBottom = false

  let curX = 0
  while (curX < x_end) {
    if (t > 20) {
      break // 防死循环
    }

    let x = 0
    let y = 0
    let F_net = 0
    let a = 0
    let Ek = 0
    let Ep = 0 // 累计重力正功 W_G
    let W = 0  // 累计合外力功 W_net = W_G + W_f
    let phase = 0

    if (!reachedBottom) {
      // 1. 凹型曲面下滑阶段 (数值微分积分)
      // 凹型圆弧轨道内侧，球在轨道内壁滑行：
      //   N = m*g*sinθ + m*v²/R（重力法向分量 + 向心力需求）
      //   f = μ*N（摩擦力）
      //   F_切向 = m*g*cosθ - f（重力切向分量 - 摩擦力）
      const normalForce = m * g * Math.sin(theta) + (m * v * v) / R // 法向力 (N)
      const frictionForce = mu * normalForce                         // 摩擦力 (N)
      const fGravityTangent = m * g * Math.cos(theta)                // 重力切向分力 (N)
      F_net = fGravityTangent - frictionForce                        // 切向合力 (N)
      a = F_net / m                                                   // 切向加速度 (m/s²)

      // 欧拉步长更新速度
      const nextV = v + a * dt
      if (nextV <= 0) {
        v = 0
        a = 0
        // 球静止，终止积分
        reachedBottom = true
        t_c = t
        v_c = 0
      } else {
        v = nextV
      }

      // 切向弧位移增量
      const ds = v * dt
      W_f -= frictionForce * ds // 累计摩擦力功 (负值)

      // 更新角度
      const dTheta = (v / R) * dt
      theta += dTheta

      // 触底边界判定
      if (theta >= Math.PI / 2) {
        theta = Math.PI / 2
        reachedBottom = true
        t_c = t
        v_c = v
      }

      x = R * (1 - Math.cos(theta))    // 水平位移 (m) — 凹型弧参数方程
      y = R * Math.sin(theta)           // 垂直下降高度 (m) — 凹型弧参数方程
      Ek = 0.5 * m * v * v
      Ep = m * g * y               // 重力功 W_G = mgy
      W = Ep + W_f                 // 总功 W_net = W_G + W_f
      phase = 0
    } else {
      // 2. 水平面匀速滑行阶段（底端切线水平，速度方向水平，完美衔接）
      a = 0
      v = v_c
      x = R + v_c * (t - t_c)
      y = R                        // 高度定格在 R
      F_net = 0
      Ek = 0.5 * m * v_c * v_c
      Ep = m * g * R               // 重力功达到最大定格
      W = Ep + W_f                 // 合外力功定格
      phase = 1
    }

    curX = x

    points.push({
      t,
      v,
      x,
      y,
      theta,
      F: F_net,
      a,
      Ek,
      Ep,
      W,
      phase
    })

    if (curX >= x_end) {
      break
    }

    t += dt
  }

  return { points, t_c, v_c, h_max: R }
}

/**
 * 线性插值获取指定时刻的状态
 */
export function getKEStateAtTime(
  points: KEModelState[],
  t: number
): KEModelState {
  if (points.length === 0) {
    return { t: 0, v: 0, x: 0, y: 0, theta: 0, F: 0, a: 0, Ek: 0, Ep: 0, W: 0, phase: 0 }
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
    v: p0.v + (p1.v - p0.v) * ratio,
    x: p0.x + (p1.x - p0.x) * ratio,
    y: p0.y + (p1.y - p0.y) * ratio,
    theta: p0.theta + (p1.theta - p0.theta) * ratio,
    F: p0.F + (p1.F - p0.F) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    Ek: p0.Ek + (p1.Ek - p0.Ek) * ratio,
    Ep: p0.Ep + (p1.Ep - p0.Ep) * ratio,
    W: p0.W + (p1.W - p0.W) * ratio,
    phase: p1.phase,
  }
}
