/**
 * 弹簧双滑块模型 (Spring Double Blocks Model)
 */

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