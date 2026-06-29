/**
 * 弧形槽-滑块模型 (Curved Slot & Block Model)
 */

export interface CurvedSlotState {
  t: number
  theta: number  // 滑块角位置 (rad)，从最低点 0 到最高点 pi/2
  omega: number  // 滑块角速度 (rad/s)
  X: number      // 槽的绝对水平位置 (m)
  v_X: number    // 槽的绝对水平速度 (m/s)
  x: number      // 滑块的绝对水平位置 (m)
  y: number      // 滑块的绝对竖直位置 (m)
  v_x: number    // 滑块的绝对水平速度 (m/s)
  v_y: number    // 滑块的绝对竖直速度 (m/s)
  N: number      // 相互作用弹力大小 (N)
  N_x: number    // 水平弹力分量 (N)
  N_y: number    // 竖直弹力分量 (N)
  Ek_m: number   // 滑块动能 (J)
  Ek_M: number   // 槽动能 (J)
  Ep: number     // 滑块重力势能 (J)
}

/**
 * 弧形槽-滑块系统的角加速度计算 (d²θ/dt²)
 * 
 * @param theta 当前角度 (rad)
 * @param omega 当前角速度 (rad/s)
 * @param m 滑块质量 (kg)
 * @param M 槽质量 (kg)
 * @param R 圆弧半径 (m)
 * @param g 重力加速度 (m/s²)
 * @returns alpha 角加速度 (rad/s²)
 */
export function getCurvedSlotAlpha(
  theta: number,
  omega: number,
  m: number,
  M: number,
  R: number,
  g: number
): number {
  const sin = Math.sin(theta)
  const cos = Math.cos(theta)
  const num = -(M + m) * g * sin - m * R * omega * omega * sin * cos
  const den = R * (M + m * sin * sin)
  return num / den
}

/**
 * 预计算弧形槽-滑块模型的完整运动轨迹
 * 
 * 采用四阶龙格库塔(RK4)算法进行积分。
 * 滑块从顶端 (theta = pi/2) 由静止下滑。到达最低点 (theta = 0) 后滑出。
 * 
 * @param m 滑块质量 (kg)
 * @param M 槽质量 (kg)
 * @param R 弧形半径 (m)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @param totalDuration 模拟的总时长 (s)，默认 6.0
 * @param dt 模拟时间步长 (s)，默认 0.002
 * @returns states 状态数据点数组
 */
export function precomputeCurvedSlot(
  m: number,
  M: number,
  R: number,
  g: number = 9.8,
  totalDuration: number = 6.0,
  dt: number = 0.002,
  isFixed: number = 0,
  slotShape: number = 0
): CurvedSlotState[] {
  const states: CurvedSlotState[] = []
  
  // 轨道固定时，将有效 M 设为极大值，使槽的加速度逼近 0，模拟固定地面
  const M_eff = isFixed ? 1e8 : M

  // 初始状态
  let theta = Math.PI / 2
  let omega = 0
  let t = 0
  
  // 记录是否已到达最低点并滑出
  let hasReachedBottom = false
  let tEnd = Infinity
  let X_end = 0
  let x_end = 0
  let v_X_final = 0
  let v_x_final = 0

  const steps = Math.round(totalDuration / dt)

  for (let step = 0; step <= steps; step++) {
    t = step * dt

    // 如果是四分之一圆弧轨道 (slotShape === 0) 且已到最低点，则小球脱离滑出
    const shouldRelease = slotShape === 0 && hasReachedBottom

    if (!shouldRelease) {
      // 1. 物理量反解
      // 水平质心守恒: (M_eff + m)X + m R sin(theta) = m R
      // 即 X = m R (1 - sin(theta)) / (M_eff + m)
      let X = (m * R * (1 - Math.sin(theta))) / (M_eff + m)
      let v_X = -(m * R * omega * Math.cos(theta)) / (M_eff + m)

      // 如果轨道固定，强制槽的位置和速度为 0
      if (isFixed) {
        X = 0
        v_X = 0
      }

      // 滑块坐标：
      // 当 theta > 0 时，滑块在最低点右侧，相对坐标为 (R*sin(theta), R*(1-cos(theta)))
      // 这里的 x 和 y 为绝对坐标
      const x = X + R * Math.sin(theta)
      const y = R * (1 - Math.cos(theta))

      const v_x = v_X + R * omega * Math.cos(theta)
      const v_y = R * omega * Math.sin(theta)

      // 弹力大小 (当固定时 M_eff 极大，N 简缩为 m * (R * omega^2 + g * cos(theta)))
      const N = (m * M_eff * (R * omega * omega + g * Math.cos(theta))) / (M_eff + m * Math.sin(theta) * Math.sin(theta))
      const N_x = isFixed ? 0 : N * Math.sin(theta) // 作用在槽上的水平力，固定时为 0
      const N_y = N * Math.cos(theta)

      const Ek_m = 0.5 * m * (v_x * v_x + v_y * v_y)
      const Ek_M = isFixed ? 0 : 0.5 * M * v_X * v_X
      const Ep = m * g * y

      states.push({
        t, theta, omega, X, v_X, x, y, v_x, v_y, N, N_x, N_y, Ek_m, Ek_M, Ep
      })

      // 判断是否滑到最低点 (theta = 0)
      if (slotShape === 0 && theta <= 0.0001) {
        hasReachedBottom = true
        tEnd = t
        X_end = X
        x_end = x
        v_X_final = v_X
        v_x_final = v_x
      } else {
        // RK4 推进 theta 和 omega
        const k1_theta = omega
        const k1_omega = getCurvedSlotAlpha(theta, omega, m, M_eff, R, g)

        const t2 = theta + 0.5 * dt * k1_theta
        const w2 = omega + 0.5 * dt * k1_omega
        const k2_theta = w2
        const k2_omega = getCurvedSlotAlpha(t2, w2, m, M_eff, R, g)

        const t3 = theta + 0.5 * dt * k2_theta
        const w3 = omega + 0.5 * dt * k2_omega
        const k3_theta = w3
        const k3_omega = getCurvedSlotAlpha(t3, w3, m, M_eff, R, g)

        const t4 = theta + dt * k3_theta
        const w4 = omega + dt * k3_omega
        const k4_theta = w4
        const k4_omega = getCurvedSlotAlpha(t4, w4, m, M_eff, R, g)

        theta += (dt / 6) * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta)
        omega += (dt / 6) * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega)

        // 边界限制
        if (slotShape === 0) {
          // 四分之一圆弧限制不能越过最低点或回弹越过顶部
          if (theta < 0) theta = 0
        } else {
          // 对称半圆轨道限制在 [-pi/2, pi/2]
          if (theta < -Math.PI / 2) {
            theta = -Math.PI / 2
            omega = 0
          } else if (theta > Math.PI / 2) {
            theta = Math.PI / 2
            omega = 0
          }
        }
      }
    } else {
      // 四分之一轨道下滑出后，各自在光滑水平面上做水平匀速直线运动，弹力为 0
      const dtAfter = t - tEnd
      const X = X_end + v_X_final * dtAfter
      const x = x_end + v_x_final * dtAfter
      const y = 0
      
      const Ek_m = 0.5 * m * v_x_final * v_x_final
      const Ek_M = isFixed ? 0 : 0.5 * M * v_X_final * v_X_final

      states.push({
        t,
        theta: 0,
        omega: 0,
        X,
        v_X: v_X_final,
        x,
        y,
        v_x: v_x_final,
        v_y: 0,
        N: 0,
        N_x: 0,
        N_y: 0,
        Ek_m,
        Ek_M,
        Ep: 0
      })
    }
  }

  return states
}

/**
 * 根据当前播放时间对弧形槽状态数据进行插值查询
 */
export function interpolateCurvedSlot(states: CurvedSlotState[], currentTime: number): CurvedSlotState {
  if (states.length === 0) {
    return {
      t: 0, theta: Math.PI / 2, omega: 0, X: 0, v_X: 0, x: 0, y: 0, v_x: 0, v_y: 0, N: 0, N_x: 0, N_y: 0, Ek_m: 0, Ek_M: 0, Ep: 0
    }
  }
  
  if (currentTime <= states[0].t) return states[0]
  if (currentTime >= states[states.length - 1].t) return states[states.length - 1]

  // 二分查找
  let low = 0
  let high = states.length - 1
  while (low < high - 1) {
    const mid = Math.floor((low + high) / 2)
    if (states[mid].t <= currentTime) {
      low = mid
    } else {
      high = mid
    }
  }

  const s0 = states[low]
  const s1 = states[high]
  const ratio = (currentTime - s0.t) / (s1.t - s0.t)

  return {
    t: currentTime,
    theta: s0.theta + ratio * (s1.theta - s0.theta),
    omega: s0.omega + ratio * (s1.omega - s0.omega),
    X: s0.X + ratio * (s1.X - s0.X),
    v_X: s0.v_X + ratio * (s1.v_X - s0.v_X),
    x: s0.x + ratio * (s1.x - s0.x),
    y: s0.y + ratio * (s1.y - s0.y),
    v_x: s0.v_x + ratio * (s1.v_x - s0.v_x),
    v_y: s0.v_y + ratio * (s1.v_y - s0.v_y),
    N: s0.N + ratio * (s1.N - s0.N),
    N_x: s0.N_x + ratio * (s1.N_x - s0.N_x),
    N_y: s0.N_y + ratio * (s1.N_y - s0.N_y),
    Ek_m: s0.Ek_m + ratio * (s1.Ek_m - s0.Ek_m),
    Ek_M: s0.Ek_M + ratio * (s1.Ek_M - s0.Ek_M),
    Ep: s0.Ep + ratio * (s1.Ep - s0.Ep)
  }
}