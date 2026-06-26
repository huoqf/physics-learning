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
  /** 杆/绳对 B球的作用力矢量 (N) */
  F_B: { x: number; y: number }
  /** 杆/绳对 A球的径向作用力矢量 (N) */
  F_A_radial?: { x: number; y: number }
  /** 杆/绳对 A球的切向作用力矢量 (N) */
  F_A_tangential?: { x: number; y: number }
  /** 杆/绳对 B球的径向作用力矢量 (N) */
  F_B_radial?: { x: number; y: number }
  /** 杆/绳对 B球的切向作用力矢量 (N) */
  F_B_tangential?: { x: number; y: number }
  /** 能量传输功率 (W) (从A向B为正，柔性绳下为0) */
  powerB: number
  /** 杆对 A球做功功率 (W) */
  powerA: number

  // 新增字段
  /** A球相对挂点的直角坐标 X (m) */
  x_A_rel: number
  /** A球相对挂点的直角坐标 Y (m，向下为正) */
  y_A_rel: number
  /** B球相对挂点的直角坐标 X (m) */
  x_B_rel: number
  /** B球相对挂点的直角坐标 Y (m，向下为正) */
  y_B_rel: number
  /** A球绳子是否松弛 */
  isSlackA: boolean
  /** B球绳子是否松弛 */
  isSlackB: boolean
  /** A球绳子拉力大小 (N) */
  T_A: number
  /** B球绳子拉力大小 (N) */
  T_B: number
  /** A球在该时间步触发的事件 */
  eventA?: 'slack' | 'tension' | null
  /** B球在该时间步触发的事件 */
  eventB?: 'slack' | 'tension' | null
}

/**
 * 预计算双球连接体系统的运动轨迹（数值积分）。
 *
 * @param m1 - A球质量 (kg)
 * @param m2 - B球质量 (kg)
 * @param L - 杆/绳总长度 (m)
 * @param g - 重力加速度 (m/s²)
 * @param mode - 约束类型：0=刚性轻杆，1=双绳分系两球（跨滑轮耦合）
 * @param tMax - 最大模拟时间 (s)，默认 15
 * @param dt - 时间步长 (s)，默认 0.02
 * @param theta0 - 初始角度 (rad)
 * @param v0 - B球初始切向速度大小 (m/s)，默认 0.0
 * @returns 轨迹点数组，按时间升序排列
 */
export function precomputeLightRodRopeTrajectory(
  m1: number,
  m2: number,
  L: number,
  g: number,
  mode: number, // 0=杆, 1=绳
  tMax: number = 15,
  dt: number = 0.02,
  theta0: number = 0.0,
  v0: number = 0.0
): LRRModelState[] {
  const points: LRRModelState[] = []

  // 绳子总长度 (视觉上初始与杆模式重合：A在L/2处，B在L处，所以总长定为 1.5 L)
  const L_rope = 1.5 * L
  const R_A0 = L / 2
  const R_B0 = L

  let thetaA = theta0
  let thetaB = theta0
  
  // 初始角速度，B球线速度为 v0，对应角速度 w0 = v0 / L
  const w0 = v0 / L
  let wA = w0
  let wB = w0

  // 绳子拉直状态极径
  let r_A = R_A0
  let r_B = R_B0
  let v_r = 0.0 // 径向速度 (A球向外为正)

  // 初始直角物理坐标 (悬挂点为原点，x向右为正，y向下为正)
  let x_A = r_A * Math.cos(thetaA)
  let y_A = r_A * Math.sin(thetaA)
  let x_B = r_B * Math.cos(thetaB)
  let y_B = r_B * Math.sin(thetaB)

  // 初始直角物理坐标下速度分量 (x向右为正，y向下为正)
  let vAx = v_r * Math.cos(thetaA) - r_A * wA * Math.sin(thetaA)
  let vAy = v_r * Math.sin(thetaA) + r_A * wA * Math.cos(thetaA)
  let vBx = -v_r * Math.cos(thetaB) - r_B * wB * Math.sin(thetaB)
  let vBy = -v_r * Math.sin(thetaB) + r_B * wB * Math.cos(thetaB)

  // 绳子是否松弛 (一端松弛即整根松弛)
  let isSlack = false

  let t = 0.0
  const subSteps = 100
  const subDt = dt / subSteps

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
    let F_A_radial = { x: 0, y: 0 }
    let F_A_tangential = { x: 0, y: 0 }
    let F_B_radial = { x: 0, y: 0 }
    let F_B_tangential = { x: 0, y: 0 }
    let powerB = 0
    let powerA = 0
    let T_A = 0
    let T_B = 0

    // 用于在当前 dt 时间步记录是否触发了状态跳变
    let stepEventA: 'slack' | 'tension' | null = null
    let stepEventB: 'slack' | 'tension' | null = null

    if (mode === 0) {
      // 刚性轻杆连接 (物理计算逻辑完全保持不变)
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
      const F_Br = m2 * g * Math.sin(theta) + m2 * L * w * w
      const F_Bt = (m2 * g * Math.cos(theta) * m1) / (m1 + 4 * m2)

      // 杆对 A 的受力
      const F_Ar = m1 * g * Math.sin(theta) + m1 * (L / 2) * w * w
      const F_At = (-m1 * g * Math.cos(theta) * 2 * m2) / (m1 + 4 * m2)

      // 转换成 Cartesian 坐标系 (物理坐标系：x向右, y向上)
      F_Bx = -F_Br * Math.cos(theta) - F_Bt * Math.sin(theta)
      F_By = F_Br * Math.sin(theta) - F_Bt * Math.cos(theta)

      F_Ax = -F_Ar * Math.cos(theta) - F_At * Math.sin(theta)
      F_Ay = F_Ar * Math.sin(theta) - F_At * Math.cos(theta)

      F_B_radial = { x: -F_Br * Math.cos(theta), y: F_Br * Math.sin(theta) }
      F_B_tangential = { x: -F_Bt * Math.sin(theta), y: -F_Bt * Math.cos(theta) }

      F_A_radial = { x: -F_Ar * Math.cos(theta), y: F_Ar * Math.sin(theta) }
      F_A_tangential = { x: -F_At * Math.sin(theta), y: -F_At * Math.cos(theta) }

      // 能量传输功率 P_B = F_Bt * vB_val = F_Bt * L * w
      powerB = F_Bt * L * w
      powerA = -powerB

      T_A = F_Ar
      T_B = F_Br
    } else {
      // 双绳分系两球（跨滑轮动力学耦合连接体）

      // 用当前的实际物理高度计算势能 (零势点为 L_rope 挂垂底端)
      epA = m1 * g * (L_rope - y_A)
      epB = m2 * g * (L_rope - y_B)

      // 动能
      ekA = 0.5 * m1 * (vAx * vAx + vAy * vAy)
      ekB = 0.5 * m2 * (vBx * vBx + vBy * vBy)

      // 绳拉力计算 (若拉紧，绳张力 T 沿径向向内作用在两个球上)
      if (!isSlack) {
        // 利用动力学约束方程解出张力 T
        const numerator = g * (Math.sin(thetaA) + Math.sin(thetaB)) + r_A * wA * wA + r_B * wB * wB
        const denominator = 1.0 / m1 + 1.0 / m2
        const T = numerator / denominator
        const T_val = T > 0 ? T : 0.0

        T_A = T_val
        T_B = T_val

        // A球拉力矢量 (Cartesian 坐标，x右，y向上为正)
        F_Ax = -T_val * Math.cos(thetaA)
        F_Ay = T_val * Math.sin(thetaA)
        F_A_radial = { x: F_Ax, y: F_Ay }

        // B球拉力矢量
        F_Bx = -T_val * Math.cos(thetaB)
        F_By = T_val * Math.sin(thetaB)
        F_B_radial = { x: F_Bx, y: F_By }

        // 绳对小球拉扯做功的瞬时功率 P = F * v
        // 绳拉力为反径向，A球径向速度为 v_r，B球径向速度为 -v_r
        powerA = -T_val * v_r
        powerB = T_val * v_r // 严格满足 powerA + powerB = 0
      } else {
        T_A = 0
        T_B = 0
        powerA = 0
        powerB = 0
      }
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
      vA: Math.sqrt(vAx * vAx + vAy * vAy),
      vB: Math.sqrt(vBx * vBx + vBy * vBy),
      alphaA,
      alphaB,
      EpA: epA,
      EpB: epB,
      EkA: ekA,
      EkB: ekB,
      EA,
      EB,
      Etot: EA + EB,
      F_A: { x: F_Ax, y: F_Ay },
      F_B: { x: F_Bx, y: F_By },
      F_A_radial,
      F_A_tangential,
      F_B_radial,
      F_B_tangential,
      powerB,
      powerA,
      x_A_rel: x_A,
      y_A_rel: y_A,
      x_B_rel: x_B,
      y_B_rel: y_B,
      isSlackA: isSlack,
      isSlackB: isSlack,
      T_A,
      T_B,
      eventA: stepEventA,
      eventB: stepEventB
    })

    // 如果是最后一点，直接跳出
    if (t >= tMax) break

    // 子步数值积分 (Euler-Cromer)
    for (let step = 0; step < subSteps; step++) {
      if (mode === 0) {
        // 刚性轻杆
        const curTheta = thetaA
        const curAlpha = (2 * (m1 + 2 * m2) * g * Math.cos(curTheta)) / ((m1 + 4 * m2) * L)
        wA = wA + curAlpha * subDt
        thetaA = thetaA + wA * subDt
        thetaB = thetaA
        wB = wA

        // 更新直角物理坐标
        x_A = R_A0 * Math.cos(thetaA)
        y_A = R_A0 * Math.sin(thetaA)
        vAx = -R_A0 * wA * Math.sin(thetaA)
        vAy = R_A0 * wA * Math.cos(thetaA)

        x_B = R_B0 * Math.cos(thetaB)
        y_B = R_B0 * Math.sin(thetaB)
        vBx = -R_B0 * wB * Math.sin(thetaB)
        vBy = R_B0 * wB * Math.cos(thetaB)
      } else {
        // 双绳分系，跨滑轮动力学耦合

        if (!isSlack) {
          // ─── 绳拉紧状态下的耦合运动 ───
          const numerator = g * (Math.sin(thetaA) + Math.sin(thetaB)) + r_A * wA * wA + r_B * wB * wB
          const denominator = 1.0 / m1 + 1.0 / m2
          const T = numerator / denominator

          if (T < 0) {
            // 张力降为 0，绳松弛
            isSlack = true
            stepEventA = 'slack'
            stepEventB = 'slack'
            
            // 松弛后转为独立的抛体加速
            vAy = vAy + g * subDt
            x_A = x_A + vAx * subDt
            y_A = y_A + vAy * subDt + 0.5 * g * subDt * subDt

            vBy = vBy + g * subDt
            x_B = x_B + vBx * subDt
            y_B = y_B + vBy * subDt + 0.5 * g * subDt * subDt
            
            r_A = Math.sqrt(x_A * x_A + y_A * y_A)
            thetaA = Math.atan2(y_A, x_A)
            r_B = Math.sqrt(x_B * x_B + y_B * y_B)
            thetaB = Math.atan2(y_B, x_B)
            
            wA = (-vAx * y_A + vAy * x_A) / (r_A * r_A)
            wB = (-vBx * y_B + vBy * x_B) / (r_B * r_B)
            v_r = (vAx * x_A + vAy * y_A) / r_A
          } else {
            // 拉紧状态加速
            const a_r = g * Math.sin(thetaA) - T / m1 + r_A * wA * wA
            const alpha_A = (-g * Math.cos(thetaA) - 2.0 * v_r * wA) / r_A
            const alpha_B = (-g * Math.cos(thetaB) + 2.0 * v_r * wB) / r_B

            v_r = v_r + a_r * subDt
            wA = wA + alpha_A * subDt
            wB = wB + alpha_B * subDt

            r_A = r_A + v_r * subDt
            
            // 极径幅值保护，防止小球冲入滑轮中心导致除零发散
            const MIN_R = 0.05
            if (r_A < MIN_R) {
              r_A = MIN_R
              v_r = 0
            } else if (r_A > L_rope - MIN_R) {
              r_A = L_rope - MIN_R
              v_r = 0
            }
            r_B = L_rope - r_A

            thetaA = thetaA + wA * subDt
            thetaB = thetaB + wB * subDt

            // 更新直角物理坐标与速度
            x_A = r_A * Math.cos(thetaA)
            y_A = r_A * Math.sin(thetaA)
            vAx = v_r * Math.cos(thetaA) - r_A * wA * Math.sin(thetaA)
            vAy = v_r * Math.sin(thetaA) + r_A * wA * Math.cos(thetaA)

            x_B = r_B * Math.cos(thetaB)
            y_B = r_B * Math.sin(thetaB)
            vBx = -v_r * Math.cos(thetaB) - r_B * wB * Math.sin(thetaB)
            vBy = -v_r * Math.sin(thetaB) + r_B * wB * Math.cos(thetaB)
          }
        } else {
          // ─── 绳松弛状态下，小球做独立的抛体运动 ───
          vAy = vAy + g * subDt
          x_A = x_A + vAx * subDt
          y_A = y_A + vAy * subDt + 0.5 * g * subDt * subDt

          vBy = vBy + g * subDt
          x_B = x_B + vBx * subDt
          y_B = y_B + vBy * subDt + 0.5 * g * subDt * subDt

          // 重新反算极坐标状态
          r_A = Math.sqrt(x_A * x_A + y_A * y_A)
          thetaA = Math.atan2(y_A, x_A)
          r_B = Math.sqrt(x_B * x_B + y_B * y_B)
          thetaB = Math.atan2(y_B, x_B)

          // 重新投影算极坐标速度分量
          const vAr_cur = (vAx * x_A + vAy * y_A) / r_A
          const vBr_cur = (vBx * x_B + vBy * y_B) / r_B
          wA = (-vAx * y_A + vAy * x_A) / (r_A * r_A)
          wB = (-vBx * y_B + vBy * x_B) / (r_B * r_B)

          // 重新拉直判定：极径之和超出或等于绳总长，且处于径向向外拉伸趋势
          if (r_A + r_B >= L_rope) {
            const v_rel = vAr_cur + vBr_cur
            if (v_rel > 0) {
              // 发生拉紧非弹性碰撞，系统径向动量在两球之间转移
              const v_r_new = (m1 * vAr_cur - m2 * vBr_cur) / (m1 + m2)
              v_r = v_r_new

              // 更新速度分量
              vAx = v_r * Math.cos(thetaA) - r_A * wA * Math.sin(thetaA)
              vAy = v_r * Math.sin(thetaA) + r_A * wA * Math.cos(thetaA)
              vBx = -v_r * Math.cos(thetaB) - r_B * wB * Math.sin(thetaB)
              vBy = -v_r * Math.sin(thetaB) + r_B * wB * Math.cos(thetaB)

              // 几何位置微调，纠正数值漂移
              const scale = L_rope / (r_A + r_B)
              r_A = r_A * scale
              r_B = r_B * scale
              x_A = r_A * Math.cos(thetaA)
              y_A = r_A * Math.sin(thetaA)
              x_B = r_B * Math.cos(thetaB)
              y_B = r_B * Math.sin(thetaB)

              isSlack = false
              stepEventA = 'tension'
              stepEventB = 'tension'
            }
          }
        }
      }
    }

    // 将本时间步内子步发生的事件记录到轨迹点的最后状态
    if (stepEventA) {
      points[points.length - 1].eventA = stepEventA
    }
    if (stepEventB) {
      points[points.length - 1].eventB = stepEventB
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
      F_A: { x: 0, y: 0 }, F_B: { x: 0, y: 0 }, powerB: 0, powerA: 0,
      x_A_rel: 0, y_A_rel: 0, x_B_rel: 0, y_B_rel: 0,
      isSlackA: false, isSlackB: false, T_A: 0, T_B: 0
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
    F_A_radial: {
      x: (p0.F_A_radial?.x ?? 0) + ((p1.F_A_radial?.x ?? 0) - (p0.F_A_radial?.x ?? 0)) * ratio,
      y: (p0.F_A_radial?.y ?? 0) + ((p1.F_A_radial?.y ?? 0) - (p0.F_A_radial?.y ?? 0)) * ratio,
    },
    F_A_tangential: {
      x: (p0.F_A_tangential?.x ?? 0) + ((p1.F_A_tangential?.x ?? 0) - (p0.F_A_tangential?.x ?? 0)) * ratio,
      y: (p0.F_A_tangential?.y ?? 0) + ((p1.F_A_tangential?.y ?? 0) - (p0.F_A_tangential?.y ?? 0)) * ratio,
    },
    F_B_radial: {
      x: (p0.F_B_radial?.x ?? 0) + ((p1.F_B_radial?.x ?? 0) - (p0.F_B_radial?.x ?? 0)) * ratio,
      y: (p0.F_B_radial?.y ?? 0) + ((p1.F_B_radial?.y ?? 0) - (p0.F_B_radial?.y ?? 0)) * ratio,
    },
    F_B_tangential: {
      x: (p0.F_B_tangential?.x ?? 0) + ((p1.F_B_tangential?.x ?? 0) - (p0.F_B_tangential?.x ?? 0)) * ratio,
      y: (p0.F_B_tangential?.y ?? 0) + ((p1.F_B_tangential?.y ?? 0) - (p0.F_B_tangential?.y ?? 0)) * ratio,
    },
    powerB: p0.powerB + (p1.powerB - p0.powerB) * ratio,
    powerA: p0.powerA + (p1.powerA - p0.powerA) * ratio,
    x_A_rel: p0.x_A_rel + (p1.x_A_rel - p0.x_A_rel) * ratio,
    y_A_rel: p0.y_A_rel + (p1.y_A_rel - p0.y_A_rel) * ratio,
    x_B_rel: p0.x_B_rel + (p1.x_B_rel - p0.x_B_rel) * ratio,
    y_B_rel: p0.y_B_rel + (p1.y_B_rel - p0.y_B_rel) * ratio,
    isSlackA: ratio < 0.5 ? p0.isSlackA : p1.isSlackA,
    isSlackB: ratio < 0.5 ? p0.isSlackB : p1.isSlackB,
    T_A: p0.T_A + (p1.T_A - p0.T_A) * ratio,
    T_B: p0.T_B + (p1.T_B - p0.T_B) * ratio,
    eventA: p0.eventA || p1.eventA,
    eventB: p0.eventB || p1.eventB,
  }
}
