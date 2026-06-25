/**
 * src/physics/momentumApplication.ts
 * 动量守恒定律三大经典模型（弧形槽-滑块、弹簧双滑块、人船模型）物理纯计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖，数据结构完全可序列化。
 * 单位制：SI（kg, m, m/s, N, s, J, rad）
 */

// ============================================================================
// 1. 弧形槽-滑块模型 (Curved Slot & Block Model)
// ============================================================================

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
  dt: number = 0.002
): CurvedSlotState[] {
  const states: CurvedSlotState[] = []
  
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

    if (!hasReachedBottom) {
      // 1. 物理量反解
      // 水平质心守恒: (M + m)X + m R sin(theta) = m R (因为初始 X=0, theta=pi/2)
      const X = (m * R * (1 - Math.sin(theta))) / (M + m)
      const v_X = -(m * R * omega * Math.cos(theta)) / (M + m)

      const x = X + R * Math.sin(theta)
      const y = R * (1 - Math.cos(theta))

      const v_x = v_X + R * omega * Math.cos(theta)
      const v_y = R * omega * Math.sin(theta)

      // 弹力大小
      const N = (m * M * (R * omega * omega + g * Math.cos(theta))) / (M + m * Math.sin(theta) * Math.sin(theta))
      const N_x = N * Math.sin(theta) // 作用在槽上的水平弹力，正向为右
      const N_y = N * Math.cos(theta) // 竖直弹力，正向为上

      const Ek_m = 0.5 * m * (v_x * v_x + v_y * v_y)
      const Ek_M = 0.5 * M * v_X * v_X
      const Ep = m * g * y

      states.push({
        t, theta, omega, X, v_X, x, y, v_x, v_y, N, N_x, N_y, Ek_m, Ek_M, Ep
      })

      // 判断是否滑到最低点 (theta = 0)
      if (theta <= 0.0001) {
        hasReachedBottom = true
        tEnd = t
        X_end = X
        x_end = x
        v_X_final = v_X
        v_x_final = v_x
      } else {
        // RK4 推进 theta 和 omega
        const k1_theta = omega
        const k1_omega = getCurvedSlotAlpha(theta, omega, m, M, R, g)

        const t2 = theta + 0.5 * dt * k1_theta
        const w2 = omega + 0.5 * dt * k1_omega
        const k2_theta = w2
        const k2_omega = getCurvedSlotAlpha(t2, w2, m, M, R, g)

        const t3 = theta + 0.5 * dt * k2_theta
        const w3 = omega + 0.5 * dt * k2_omega
        const k3_theta = w3
        const k3_omega = getCurvedSlotAlpha(t3, w3, m, M, R, g)

        const t4 = theta + dt * k3_theta
        const w4 = omega + dt * k3_omega
        const k4_theta = w4
        const k4_omega = getCurvedSlotAlpha(t4, w4, m, M, R, g)

        theta += (dt / 6) * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta)
        omega += (dt / 6) * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega)

        // 边界限制
        if (theta < 0) theta = 0
      }
    } else {
      // 脱离弧形槽，各自做水平匀速直线运动，弹力为 0
      const dtAfter = t - tEnd
      const X = X_end + v_X_final * dtAfter
      const x = x_end + v_x_final * dtAfter
      const y = 0
      
      const Ek_m = 0.5 * m * v_x_final * v_x_final
      const Ek_M = 0.5 * M * v_X_final * v_X_final

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

// ============================================================================
// 2. 弹簧双滑块模型 (Spring Double Blocks Model)
// ============================================================================

export interface SpringBlocksState {
  t: number
  xA: number       // 滑块A绝对位置 (m)
  xB: number       // 滑块B绝对位置 (m)
  vA: number       // 滑块A速度 (m/s)
  vB: number       // 滑块B速度 (m/s)
  aA: number       // 滑块A加速度 (m/s²)
  aB: number       // 滑块B加速度 (m/s²)
  delta: number    // 弹簧形变量 (m)，压缩为正，拉伸分离为0
  EkA: number      // A动能 (J)
  EkB: number      // B动能 (J)
  Ep: number       // 弹簧弹性势能 (J)
  Etotal: number   // 系统总机械能 (J)
}

/**
 * 预计算弹簧双滑块模型在时间轴上的物理状态
 * 
 * A从 xA = 0，vA = v0 冲向静止在 xB0 处的滑块B（连有原长 L0 的弹簧）。
 * 一旦弹簧在压缩后恢复原长并即将拉伸时，滑块A与弹簧分离。之后各自做匀速直线运动。
 * 
 * @param mA 滑块A质量 (kg)
 * @param mB 滑块B质量 (kg)
 * @param v0 A初速度 (m/s)
 * @param k 弹簧劲度系数 (N/m)
 * @param L0 弹簧原长 (m)，默认 1.5
 * @param xB0 B的初始坐标 (m)，默认 3.5
 * @param totalDuration 模拟总时长 (s)，默认 6.0
 * @param dt 模拟时间步长 (s)，默认 0.002
 * @returns states 状态数据点数组
 */
export function precomputeSpringBlocks(
  mA: number,
  mB: number,
  v0: number,
  k: number,
  L0: number = 1.5,
  xB0: number = 3.5,
  totalDuration: number = 6.0,
  dt: number = 0.002
): SpringBlocksState[] {
  const states: SpringBlocksState[] = []
  
  let xA = 0
  let vA = v0
  let xB = xB0
  let vB = 0
  
  let hasTouched = false
  let hasSeparated = false
  
  const steps = Math.round(totalDuration / dt)
  
  for (let step = 0; step <= steps; step++) {
    const t = step * dt
    
    // 计算当前的加速度与形变量
    let delta = 0
    let aA = 0
    let aB = 0
    
    if (!hasSeparated) {
      const springLeft = xB - L0
      if (xA >= springLeft) {
        hasTouched = true
        delta = xA - springLeft // 压缩量为正
        
        // 若压缩量变负，说明在接触后又拉伸了，二者发生分离
        if (delta < 0) {
          delta = 0
          hasSeparated = true
        }
      }
    }
    
    if (hasTouched && !hasSeparated) {
      aA = -(k * delta) / mA
      aB = (k * delta) / mB
    } else {
      aA = 0
      aB = 0
      delta = 0
    }
    
    const EkA = 0.5 * mA * vA * vA
    const EkB = 0.5 * mB * vB * vB
    const Ep = 0.5 * k * delta * delta
    const Etotal = EkA + EkB + Ep
    
    states.push({
      t, xA, xB, vA, vB, aA, aB, delta, EkA, EkB, Ep, Etotal
    })
    
    // 使用 RK4 积分
    // 状态量: [xA, vA, xB, vB]
    const getDerivatives = (x_A: number, v_A: number, x_B: number, v_B: number) => {
      let d_xA_dt = v_A
      let d_xB_dt = v_B
      let d_vA_dt = 0
      let d_vB_dt = 0
      
      if (hasTouched && !hasSeparated) {
        const springL = x_B - L0
        const d = x_A - springL
        if (d > 0) {
          d_vA_dt = -(k * d) / mA
          d_vB_dt = (k * d) / mB
        }
      }
      
      return [d_xA_dt, d_vA_dt, d_xB_dt, d_vB_dt]
    }
    
    // RK4 Steps
    const [dx1, dv1, dy1, dw1] = getDerivatives(xA, vA, xB, vB)
    
    const [dx2, dv2, dy2, dw2] = getDerivatives(
      xA + 0.5 * dt * dx1,
      vA + 0.5 * dt * dv1,
      xB + 0.5 * dt * dy1,
      vB + 0.5 * dt * dw1
    )
    
    const [dx3, dv3, dy3, dw3] = getDerivatives(
      xA + 0.5 * dt * dx2,
      vA + 0.5 * dt * dv2,
      xB + 0.5 * dt * dy2,
      vB + 0.5 * dt * dw2
    )
    
    const [dx4, dv4, dy4, dw4] = getDerivatives(
      xA + dt * dx3,
      vA + dt * dv3,
      xB + dt * dy3,
      vB + dt * dw3
    )
    
    xA += (dt / 6) * (dx1 + 2 * dx2 + 2 * dx3 + dx4)
    vA += (dt / 6) * (dv1 + 2 * dv2 + 2 * dv3 + dv4)
    xB += (dt / 6) * (dy1 + 2 * dy2 + 2 * dy3 + dy4)
    vB += (dt / 6) * (dw1 + 2 * dw2 + 2 * dw3 + dw4)
  }
  
  return states
}

/**
 * 根据播放时间插值查询双滑块状态
 */
export function interpolateSpringBlocks(states: SpringBlocksState[], currentTime: number): SpringBlocksState {
  if (states.length === 0) {
    return {
      t: 0, xA: 0, xB: 0, vA: 0, vB: 0, aA: 0, aB: 0, delta: 0, EkA: 0, EkB: 0, Ep: 0, Etotal: 0
    }
  }
  
  if (currentTime <= states[0].t) return states[0]
  if (currentTime >= states[states.length - 1].t) return states[states.length - 1]

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
    xA: s0.xA + ratio * (s1.xA - s0.xA),
    xB: s0.xB + ratio * (s1.xB - s0.xB),
    vA: s0.vA + ratio * (s1.vA - s0.vA),
    vB: s0.vB + ratio * (s1.vB - s0.vB),
    aA: s0.aA + ratio * (s1.aA - s0.aA),
    aB: s0.aB + ratio * (s1.aB - s0.aB),
    delta: s0.delta + ratio * (s1.delta - s0.delta),
    EkA: s0.EkA + ratio * (s1.EkA - s0.EkA),
    EkB: s0.EkB + ratio * (s1.EkB - s0.EkB),
    Ep: s0.Ep + ratio * (s1.Ep - s0.Ep),
    Etotal: s0.Etotal + ratio * (s1.Etotal - s0.Etotal)
  }
}

// ============================================================================
// 3. 人船模型 (Man & Boat Model)
// ============================================================================

export interface ManBoatState {
  s: number        // 人相对于船头的距离 (m)，范围 [0, L]
  x_boat: number   // 船在绝对坐标中的左端位置 (m)
  x_person: number // 人在绝对坐标中的位置 (m)
  x_cm: number     // 质心绝对位置 (m)，永远是 0
  v_rel: number    // 人相对于船的速度 (m/s)
  v_boat: number   // 船在绝对坐标中的速度 (m/s)
  v_person: number // 人在绝对坐标中的速度 (m/s)
}

/**
 * 人船模型解析计算 (解析计算以防数值积累误差，满足质心绝对定点)
 * 
 * 假定系统总质心被锁死在绝对坐标 0。船重 M，长 L，人重 m。
 * 人相对于船头（船的左端）的距离为 s (0 <= s <= L)。
 * 
 * @param s 人相对于船头的距离 (m)
 * @param v_rel 人相对于船的瞬时速度 (m/s)
 * @param m 人质量 (kg)
 * @param M 船质量 (kg)
 * @param L 船长 (m)
 * @returns state 当前的人船物理状态
 */
export function calculateManBoatState(
  s: number,
  v_rel: number,
  m: number,
  M: number,
  L: number
): ManBoatState {
  // 限制人不能跑出船
  const clampedS = Math.max(0, Math.min(L, s))

  // 根据质心公式：(m * x_person + M * x_boat_center) / (m + M) = 0
  // 其中 x_person = x_boat + s, x_boat_center = x_boat + L/2
  // => m*(x_boat + s) + M*(x_boat + L/2) = 0
  // => (m + M)*x_boat + m*s + M*L/2 = 0
  // => x_boat = -(m*s + M*L/2) / (m + M)
  const x_boat = -(m * clampedS + M * L * 0.5) / (m + M)
  const x_person = x_boat + clampedS

  // 质心计算 (用以自检)
  const x_cm = (m * x_person + M * (x_boat + L * 0.5)) / (m + M)

  // 速度关系：m * v_person + M * v_boat = 0 且 v_person = v_boat + v_rel
  // => m * (v_boat + v_rel) + M * v_boat = 0
  // => v_boat = -(m * v_rel) / (m + M)
  const v_boat = -(m * v_rel) / (m + M)
  const v_person = v_boat + v_rel

  return {
    s: clampedS,
    x_boat,
    x_person,
    x_cm,
    v_rel,
    v_boat,
    v_person
  }
}

/**
 * 自动演示模式下人船的相对位置和相对速度计算
 * 
 * 在 4 秒的周期内，人以余弦变速曲线从船头走动到船尾。
 * 
 * @param t 当前播放时间 (s)
 * @param L 船长 (m)
 * @param durationWalk 走路总耗时 (s)，默认 4.0
 * @returns { s, v_rel } 相对位置 (m) 与相对速度 (m/s)
 */
export function getManBoatAutoMotion(
  t: number,
  L: number,
  durationWalk: number = 4.0
): { s: number; v_rel: number } {
  if (t <= 0) return { s: 0, v_rel: 0 }
  if (t >= durationWalk) return { s: L, v_rel: 0 }

  // 相对位置：s(t) = L/2 * (1 - cos(pi * t / durationWalk))
  const angle = (Math.PI * t) / durationWalk
  const s = (L * 0.5) * (1 - Math.cos(angle))
  
  // 相对速度：v_rel(t) = ds/dt = L/2 * (pi / durationWalk) * sin(pi * t / durationWalk)
  const v_rel = (L * 0.5) * (Math.PI / durationWalk) * Math.sin(angle)

  return { s, v_rel }
}
