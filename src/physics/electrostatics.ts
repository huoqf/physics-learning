/**
 * 静电场纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * ⚠️ 库仑力 calculateCoulombForce 已在 src/physics/dynamics.ts 实现，
 *    此处不重复定义，使用方直接从 '@/physics' 引入即可。
 */

/**
 * 双丝线悬挂小球库仑平衡计算。
 *
 * 物理模型：两个相同质量 m 的小球，各用长 L 的丝线悬挂于同一点，
 * 带同号电量 q₁、q₂ 后因库仑力排斥而张开角度 θ。异号电荷在同悬点模型下无对称分离平衡。
 *
 * 平衡条件（隔离法）：
 *   水平：F_库 = T·sinθ
 *   竖直：mg = T·cosθ
 *   联立：tanθ = F_库 / (mg)
 *
 * 两球间距 r = 2L·sinθ
 * 库仑力 F = k·|q₁·q₂| / r²
 *
 * @param k     静电力常量 (N·m²/C²)，通常取 9×10⁹
 * @param q1    电荷1电量 (C)，含符号
 * @param q2    电荷2电量 (C)，含符号
 * @param m     小球质量 (kg)
 * @param L     丝线长度 (m)
 * @param g     重力加速度 (m/s²)
 * @returns theta 平衡角度 (rad), r 两球间距 (m), F 库仑力大小 (N), T 绳中拉力 (N),
 *          attractive 是否吸引, x1 球1水平偏移 (m), x2 球2水平偏移 (m)
 */
export function calculateCoulombPendulum(
  k: number,
  q1: number,
  q2: number,
  m: number,
  L: number,
  g: number
): {
  theta: number
  r: number
  F: number
  T: number
  attractive: boolean
  x1: number
  x2: number
  hasSeparatedEquilibrium: boolean
} {
  const attractive = q1 * q2 < 0

  if (attractive) {
    // 同一点悬挂的异号电荷会相互靠近/接触，不存在“向外张开”的对称分离平衡解。
    return { theta: 0, r: 0, F: 0, T: m * g, attractive, x1: 0, x2: 0, hasSeparatedEquilibrium: false }
  }

  // 迭代求解平衡角 θ
  // tanθ = k|q₁q₂| / (4L²sin²θ · mg)
  // 令 A = k|q₁q₂| / (4L²·mg)，则 f(θ) = sin²θ·tanθ - A = 0
  const q1Abs = Math.abs(q1)
  const q2Abs = Math.abs(q2)
  const A = (k * q1Abs * q2Abs) / (4 * L * L * m * g)

  // 二分法求 θ（保证收敛，牛顿迭代在大 A 时会过冲）
  // f(θ) = sin²θ·tanθ - A，f(0)=−A<0，f(π/2−ε)→+∞
  const f = (t: number) => {
    const s = Math.sin(t)
    const c = Math.cos(t)
    return c > 1e-12 ? s * s * (s / c) - A : 1e12
  }
  let lo = 0.001
  let hi = Math.PI / 2 - 0.01
  let theta = lo
  if (f(lo) >= 0) {
    // A 极小，角度几乎为 0
    theta = lo
  } else {
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2
      if (f(mid) < 0) lo = mid; else hi = mid
      if (hi - lo < 1e-10) break
    }
    theta = (lo + hi) / 2
  }

  const r = 2 * L * Math.sin(theta)
  const F = r > 0 ? (k * q1Abs * q2Abs) / (r * r) : 0
  const T = m * g / Math.cos(theta)

  // 异号电荷时两球靠近，x 方向为负
  const sign = attractive ? -1 : 1
  const x1 = sign * L * Math.sin(theta)
  const x2 = -sign * L * Math.sin(theta)

  return { theta, r, F, T, attractive, x1, x2, hasSeparatedEquilibrium: true }
}

/**
 * 计算三点电荷各自的合力。
 *
 * 物理模型：三个点电荷在二维平面上，每对电荷之间存在库仑力。
 * 对每个电荷，合力 = 其余两个电荷对它的库仑力矢量和。
 *
 * 库仑力公式：F = k·|q₁·q₂| / r²
 * 方向：同号电荷排斥，异号电荷吸引（沿连线方向）。
 *
 * @param k      静电力常量 (N·m²/C²)，通常取 9×10⁹
 * @param charges 三个电荷的位置和电量 [{x, y, q}]，x/y 单位 m，q 单位 C
 * @returns 每个电荷的合力 {fx, fy, magnitude}，单位 N
 *
 * @category M4
 */
export function calculateThreeChargeForces(
  k: number,
  charges: Array<{ x: number; y: number; q: number }>
): Array<{ fx: number; fy: number; magnitude: number }> {
  const n = charges.length
  const results: Array<{ fx: number; fy: number; magnitude: number }> = []

  for (let i = 0; i < n; i++) {
    let fx = 0
    let fy = 0
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const dx = charges[j].x - charges[i].x
      const dy = charges[j].y - charges[i].y
      const rSq = dx * dx + dy * dy
      if (rSq < 1e-18) continue // 避免除零
      const r = Math.sqrt(rSq)
      const Fmag = (k * Math.abs(charges[i].q * charges[j].q)) / rSq
      // 同号排斥（力方向远离 j），异号吸引（力方向指向 j）
      const sign = charges[i].q * charges[j].q > 0 ? -1 : 1
      fx += sign * Fmag * (dx / r)
      fy += sign * Fmag * (dy / r)
    }
    const magnitude = Math.sqrt(fx * fx + fy * fy)
    results.push({ fx, fy, magnitude })
  }

  return results
}

/** 点电荷电场强度 E = kq/r²（N/C） */
export function calculateElectricField(k: number, q: number, r: number): { E: number; valid: boolean; singular: boolean } {
  if (r === 0) return { E: q === 0 ? NaN : Math.sign(q) * Infinity, valid: false, singular: true }
  if (r < 0) return { E: NaN, valid: false, singular: false }
  return { E: (k * q) / (r * r), valid: true, singular: false }
}

/** 点电荷电势 V = kq/r（V） */
export function calculateElectricPotential(k: number, q: number, r: number): { V: number; valid: boolean; singular: boolean } {
  if (r === 0) return { V: q === 0 ? NaN : Math.sign(q) * Infinity, valid: false, singular: true }
  if (r < 0) return { V: NaN, valid: false, singular: false }
  return { V: (k * q) / r, valid: true, singular: false }
}

/** 平行板电容 C = εS/d（F） */
export function calculateCapacitor(epsilon: number, S: number, d: number): { C: number; valid: boolean } {
  if (epsilon < 0 || S < 0 || d <= 0) return { C: NaN, valid: false }
  return { C: (epsilon * S) / d, valid: true }
}

export interface EFieldSimulationPoint {
  t: number
  x: number  // 物理坐标 x (m)
  y: number  // 物理坐标 y (m)
  vx: number // 速度 x (m/s)
  vy: number // 速度 y (m/s)
  ax: number // 加速度 x (m/s²)
  ay: number // 加速度 y (m/s²)
}

/**
 * 带电粒子在匀强电场及重力复合场中的运动轨迹模拟（数值积分）。
 *
 * @param U           极板间电压 (V)
 * @param d           极板间距 (m)
 * @param L           极板长度 (m)
 * @param q           电荷量 (C)
 * @param m           粒子质量 (kg)
 * @param v0          初速度 (m/s)
 * @param g           重力加速度 (m/s²)，0表示忽略重力
 * @param isAC        是否为周期交变方形波
 * @param freq        交变方形波的频率 (Hz)
 * @param maxTime     最大模拟时间 (s)，默认 1.0s
 * @param dt          积分步长 (s)，默认 0.0001s
 */
export function calculateChargeInEFieldTrajectory(options: {
  U: number
  d: number
  L: number
  q: number
  m: number
  v0: number
  g: number
  isAC: boolean
  freq: number
  maxTime?: number
  dt?: number
}): {
  points: EFieldSimulationPoint[]
  tEnd: number
  hitType: 'none' | 'top' | 'bottom'
  hitsPlate: boolean
  xEnd: number
  yEnd: number
} {
  const {
    U,
    d,
    L,
    q,
    m,
    v0,
    g,
    isAC,
    freq,
    maxTime = 1.0,
    dt = 0.0001
  } = options

  const points: EFieldSimulationPoint[] = []
  
  let t = 0
  let x = 0
  let y = 0
  let vx = v0
  let vy = 0
  
  const halfGap = d / 2
  let hitType: 'none' | 'top' | 'bottom' = 'none'
  let hitsPlate = false

  // 初始点
  points.push({ t: 0, x: 0, y: 0, vx, vy, ax: 0, ay: 0 })

  const maxSteps = Math.min(10000, Math.ceil(maxTime / dt))
  for (let step = 0; step < maxSteps; step++) {
    // 判断电场极性系数
    let fieldSign = 1
    if (isAC && freq > 0) {
      const T = 1 / freq
      const phase = (t % T) / T
      fieldSign = phase < 0.5 ? 1 : -1
    }

    // 电场强度 (V/m)
    const E = U / d
    // 电场力 (N)
    const FE = q * E * fieldSign
    // 竖直加速度 (m/s²). y 轴向下为正方向
    const ay = (m > 0) ? (FE / m + g) : 0
    const ax = 0

    // 更新最后一点的加速度
    if (points.length > 0) {
      points[points.length - 1].ax = ax
      points[points.length - 1].ay = ay
    }

    // 辛欧拉积分
    t += dt
    vx += ax * dt
    vy += ay * dt
    x += vx * dt
    y += vy * dt

    points.push({ t, x, y, vx, vy, ax: 0, ay: 0 })

    // 边界碰撞检测（注意：y 轴向上偏是负值，向下偏是正值）
    // 上极板坐标为 -halfGap，下极板为 +halfGap
    if (y <= -halfGap) {
      hitType = 'top'
      hitsPlate = true
      points[points.length - 1].y = -halfGap
      break
    }
    if (y >= halfGap) {
      hitType = 'bottom'
      hitsPlate = true
      points[points.length - 1].y = halfGap
      break
    }
    // 飞出边界检测
    if (x >= L) {
      break
    }
  }

  // 确保最后一点有正确的加速度
  if (points.length > 0) {
    const lastPt = points[points.length - 1]
    let fieldSign = 1
    if (isAC && freq > 0) {
      const T = 1 / freq
      const phase = (lastPt.t % T) / T
      fieldSign = phase < 0.5 ? 1 : -1
    }
    const E = U / d
    const FE = q * E * fieldSign
    lastPt.ax = 0
    lastPt.ay = (m > 0) ? (FE / m + g) : 0
  }

  const lastPoint = points[points.length - 1]

  return {
    points,
    tEnd: lastPoint.t,
    hitType,
    hitsPlate,
    xEnd: lastPoint.x,
    yEnd: lastPoint.y
  }
}

export const CHARGE_EFIELD_PLAY_TIME = {
  dc: 2.5,
  ac: 8.0,
} as const

/**
 * 根据极板电场模式获取目标播放时间。
 *
 * @param isAC 是否交变方形波
 */
export function getChargeInEFieldTargetPlayTime(isAC: boolean): number {
  return isAC ? CHARGE_EFIELD_PLAY_TIME.ac : CHARGE_EFIELD_PLAY_TIME.dc
}

/**
 * 计算动态时间慢放系数 TIME_SCALE，实现"物理参数不变、动画时间动态映射"。
 *
 * @param tEnd 仿真实际终止时间 (s)
 * @param isAC 是否交变方形波
 */
export function getChargeInEFieldTimeScale(tEnd: number, isAC: boolean): number {
  const targetPlayTime = getChargeInEFieldTargetPlayTime(isAC)
  const rawScale = tEnd > 0 ? tEnd / targetPlayTime : 0.001
  return Math.max(1e-6, rawScale)
}

/**
 * 计算非匀强电场（由水平匀强背景电场与一个点电荷叠加而成）中的电势与场强。
 *
 * 注意：这是用于教学可视化的“正则化点电荷模型”。为避免 r→0 时数值发散，
 * 点电荷距离会被限制在最小半径 0.1 m 内；因此近场结果不是严格库仑场。
 * 
 * 物理模型：
 * 空间存在一水平向右的匀强电场 E_base，以及一个固定位置 (xq, yq) 的点电荷 Q。
 * 任意点 (x, y) 的电势为两者之和。
 * 
 * @param x            当前点物理 x 坐标 (m)
 * @param y            当前点物理 y 坐标 (m)
 * @param E_base       匀强电场强度 (V/m)，水平向右
 * @param xq           点电荷物理 x 坐标 (m)
 * @param yq           点电荷物理 y 坐标 (m)
 * @param Q            点电荷电量 (C)
 * @param zeroRef      零势点参考：'infinity' | 'ground'
 * @param x_ref        匀强电场参考 x 坐标 (m)，在此处匀强电场电势为 0
 * @param x_ground     大地参考 x 坐标 (m)
 * @param y_ground     大地参考 y 坐标 (m)
 * @returns phi 电势 (V), Ex/Ey 场强分量 (V/m), E 场强大小 (V/m)，以及正则化标记
 */
export function calculateNonUniformEField(
  x: number,
  y: number,
  E_base: number,
  xq: number,
  yq: number,
  Q: number,
  zeroRef: 'infinity' | 'ground',
  x_ref: number,
  x_ground: number,
  y_ground: number
): { phi: number; Ex: number; Ey: number; E: number; isRegularized: boolean; rEffective: number } {
  const k = 9e9
  const MIN_R = 0.1 // 可视化正则化半径：10 cm
  const dx = x - xq
  const dy = y - yq
  const r = Math.sqrt(dx * dx + dy * dy)
  const rClamped = Math.max(MIN_R, r)
  const isRegularized = r < MIN_R

  // 1. 点电荷产生的电势与场强
  const phiPoint = (k * Q) / rClamped
  const EPointX = (k * Q * dx) / (rClamped * rClamped * rClamped)
  const EPointY = (k * Q * dy) / (rClamped * rClamped * rClamped)

  // 2. 匀强电场产生的电势（以 x_ref 为参考点）
  const phiBase = -E_base * (x - x_ref)
  const EBaseX = E_base
  const EBaseY = 0

  // 3. 计算未校正的总电势
  const phiRaw = phiBase + phiPoint

  // 4. 计算合场强（场强为电势梯度的负值，是矢量叠加，不受零势点选择影响）
  const Ex = EBaseX + EPointX
  const Ey = EBaseY + EPointY
  const E = Math.sqrt(Ex * Ex + Ey * Ey)

  // 5. 零势点校正
  let phi = phiRaw
  if (zeroRef === 'ground') {
    const dxGround = x_ground - xq
    const dyGround = y_ground - yq
    const rGround = Math.max(MIN_R, Math.sqrt(dxGround * dxGround + dyGround * dyGround))
    const phiPointGround = (k * Q) / rGround
    const phiBaseGround = -E_base * (x_ground - x_ref)
    const phiGroundRef = phiBaseGround + phiPointGround
    phi = phiRaw - phiGroundRef
  }

  return { phi, Ex, Ey, E, isRegularized, rEffective: rClamped }
}

/**
 * 两个相同金属小球接触带电后的电荷量分配。
 * 高考考点：同种电荷平分，异种电荷先中和再平分。
 * 
 * 公式：q₁' = q₂' = (q₁ + q₂) / 2
 *
 * @param q1 电荷量1 (C)
 * @param q2 电荷量2 (C)
 * @returns 接触分配后的电量 { q1New: number, q2New: number }，单位 C
 */
export function calculateContactCharges(q1: number, q2: number): { q1New: number; q2New: number } {
  const qNew = (q1 + q2) / 2
  return { q1New: qNew, q2New: qNew }
}

/**
 * 求解三个共线自由电荷仅在库仑力作用下同时处于平衡的配置。
 * 高考考点：
 *   1. 两同夹一异：外侧两电荷极性相同，中间电荷极性相反。
 *   2. 两大夹一小：外侧电荷量绝对值大于中间电荷量绝对值。
 *   3. 近小远大：中间电荷靠近绝对值较小的电荷。
 * 
 * 物理公式：
 *   对自由电荷 1、2（距离为 r），若要使引入的电荷 3 在 X 轴上平衡，且使得 1 和 2 也平衡：
 *   - 若 q1 与 q2 同号：
 *     - q3 必在 1、2 之间，距离 q1 的比例为：r13 / r23 = sqrt(|q1| / |q2|)
 *     - q3 电量：q3 = - (q1 * q2) / (sqrt(|q1|) + sqrt(|q2|))^2
 *   - 若 q1 与 q2 异号（且绝对值不相等）：
 *     - q3 必在绝对值较小的一侧外侧。
 *     - 若 |q1| < |q2|，q3 在 q1 外侧。r13 / r23 = sqrt(|q1| / |q2|)，r13 = r * sqrt(|q1|) / (sqrt(|q2|) - sqrt(|q1|))
 *     - q3 电量：q3 = - (q1 * q2) / (sqrt(|q2|) - sqrt(|q1|))^2
 *   - 若 q1 与 q2 异号且绝对值相等：
 *     - 无法实现三体平衡（无解）。
 *
 * @param q1 电荷1电量 (C)
 * @param q2 电荷2电量 (C)
 * @param r  电荷1与电荷2的间距 (m)
 * @returns equilibriumConfig 平衡配置，包括：
 *          q3 达到平衡所需的电量 (C),
 *          r13 电荷3到电荷1的距离 (m)（电荷3在电荷1右侧为正，左侧为负）,
 *          r23 电荷3到电荷2的距离 (m),
 *          valid 是否存在平衡解
 */
export function calculateFreeThreeChargeEquilibrium(
  q1: number,
  q2: number,
  r: number
): {
  q3: number
  r13: number
  r23: number
  valid: boolean
} {
  if (q1 === 0 || q2 === 0) {
    return { q3: 0, r13: r / 2, r23: r / 2, valid: false }
  }

  const absQ1 = Math.abs(q1)
  const absQ2 = Math.abs(q2)
  const sameSign = q1 * q2 > 0

  if (sameSign) {
    // 同号：q3 夹在中间
    const ratio = Math.sqrt(absQ1) / (Math.sqrt(absQ1) + Math.sqrt(absQ2))
    const r13 = r * ratio
    const r23 = r - r13
    const q3 = -(q1 * q2) / Math.pow(Math.sqrt(absQ1) + Math.sqrt(absQ2), 2)
    return { q3, r13, r23, valid: true }
  } else {
    // 异号：q3 在绝对值小的一端的外侧
    if (Math.abs(absQ1 - absQ2) < 1e-12) {
      // 绝对值相等，无解
      return { q3: 0, r13: 0, r23: 0, valid: false }
    }

    if (absQ1 < absQ2) {
      // q3 在 q1 外侧（即偏离 q2 一侧）
      // 设 q1 在左(0)，q2 在右(r)。q3 在 q1 左侧 (-r13)
      const ratio = Math.sqrt(absQ1) / (Math.sqrt(absQ2) - Math.sqrt(absQ1))
      const d13 = r * ratio // 实际距离
      const r13 = -d13 // x 坐标偏移
      const r23 = r + d13
      const q3 = -(q1 * q2) / Math.pow(Math.sqrt(absQ2) - Math.sqrt(absQ1), 2)
      return { q3, r13, r23, valid: true }
    } else {
      // q3 在 q2 外侧
      // 设 q1 在左(0)，q2 在右(r)。q3 在 q2 右侧 (r + d23)
      const ratio = Math.sqrt(absQ2) / (Math.sqrt(absQ1) - Math.sqrt(absQ2))
      const d23 = r * ratio
      const r13 = r + d23
      const r23 = d23
      const q3 = -(q1 * q2) / Math.pow(Math.sqrt(absQ1) - Math.sqrt(absQ2), 2)
      return { q3, r13, r23, valid: true }
    }
  }
}

/**
 * 计算单个电荷在固定两电荷库仑力作用下的平衡位置。
 *
 * 物理模型：两个固定电荷 q1、q2 分别位于 x1、x2（x 轴上），
 * 求第三个电荷 q3 的平衡位置 x3，使得 q3 所受合力为零。
 *
 * 平衡条件：F13 + F23 = 0
 *   其中 F13 = k·q1·q3 / (x3-x1)²（带符号，排斥为正、吸引为负）
 *        F23 = k·q2·q3 / (x3-x2)²
 *
 * 使用二分法在 [minX, maxX] 区间内搜索零点。
 *
 * @param q1  电荷1电量 (μC)，含符号
 * @param x1  电荷1位置 (m)
 * @param q2  电荷2电量 (μC)，含符号
 * @param x2  电荷2位置 (m)
 * @param q3  待平衡电荷电量 (μC)，含符号
 * @param minX 搜索区间左边界 (m)
 * @param maxX 搜索区间右边界 (m)
 * @returns x 平衡位置 (m), possible 是否存在平衡解
 *
 * @category M4
 */
export function findEquilibriumX3(
  q1: number, x1: number,
  q2: number, x2: number,
  q3: number,
  minX: number, maxX: number
): { x: number; possible: boolean } {
  const Q1 = q1 * 1e-6
  const Q2 = q2 * 1e-6
  const Q3 = q3 * 1e-6

  if (Q3 === 0) return { x: (x1 + x2) / 2, possible: false }

  const f = (x3: number) => {
    const r13 = x3 - x1
    const r23 = x3 - x2
    if (Math.abs(r13) < 1e-9 || Math.abs(r23) < 1e-9) return Infinity
    const F13 = (Q1 * Q3) / (r13 * Math.abs(r13))
    const F23 = (Q2 * Q3) / (r23 * Math.abs(r23))
    return F13 + F23
  }

  const lo = minX
  const hi = maxX

  const fLo = f(lo)
  const fHi = f(hi)

  if (Math.abs(fLo) < 1e-12) return { x: lo, possible: true }
  if (Math.abs(fHi) < 1e-12) return { x: hi, possible: true }
  if (fLo * fHi > 0) return { x: (x1 + x2) / 2, possible: false }

  let a = lo
  let b = hi
  for (let i = 0; i < 100; i++) {
    const mid = (a + b) / 2
    const fm = f(mid)
    if (Math.abs(fm) < 1e-12) return { x: mid, possible: true }
    if (f(a) * fm < 0) {
      b = mid
    } else {
      a = mid
    }
  }
  const result = (a + b) / 2
  if (result < minX || result > maxX) return { x: (x1 + x2) / 2, possible: false }
  return { x: result, possible: true }
}

