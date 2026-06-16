/**
 * 电磁学纯函数库（[M4-1]）。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * ⚠️ 库仑力 calculateCoulombForce 已在 src/physics/dynamics.ts 实现，
 *    此处不重复定义，使用方直接从 '@/physics' 引入即可。
 */

/**
 * 双丝线悬挂小球库仑平衡计算。
 *
 * 物理模型：两个相同质量 m 的小球，各用长 L 的丝线悬挂于同一点，
 * 带电量 q₁、q₂ 后因库仑力排斥/吸引而张开角度 θ。
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
} {
  const attractive = q1 * q2 < 0

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

  return { theta, r, F, T, attractive, x1, x2 }
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
export function calculateElectricField(k: number, q: number, r: number): { E: number } {
  return { E: (k * q) / (r * r) }
}

/** 点电荷电势 V = kq/r（V） */
export function calculateElectricPotential(k: number, q: number, r: number): { V: number } {
  return { V: (k * q) / r }
}

/** 平行板电容 C = εS/d（F） */
export function calculateCapacitor(epsilon: number, S: number, d: number): { C: number } {
  return { C: (epsilon * S) / d }
}

/** 欧姆定律 I = U/R（A） */
export function calculateOhmLaw(U: number, R: number): { I: number } {
  return { I: U / R }
}

/** 串联电阻 R_total = ΣR（Ω） */
export function calculateSeriesResistance(Rs: number[]): { R_total: number } {
  return { R_total: Rs.reduce((sum, r) => sum + r, 0) }
}

/** 并联电阻 1/R_total = Σ(1/R)（Ω）；空数组或含 0 电阻时返回 0 */
export function calculateParallelResistance(Rs: number[]): { R_total: number } {
  if (Rs.length === 0 || Rs.some((r) => r === 0)) return { R_total: 0 }
  const inv = Rs.reduce((sum, r) => sum + 1 / r, 0)
  return { R_total: 1 / inv }
}

/**
 * 闭合电路欧姆定律。
 * I = EMF/(R_ext + r)，路端电压 U = EMF - I·r
 * 输出功率 P_output = U·I，总功率 P_total = EMF·I，效率 eta = P_output/P_total
 */
export function calculateClosedCircuit(
  EMF: number,
  r: number,
  R_ext: number
): { I: number; U_terminal: number; P_output: number; P_total: number; eta: number } {
  const I = EMF / (R_ext + r)
  const U_terminal = EMF - I * r
  const P_output = U_terminal * I
  const P_total = EMF * I
  const eta = P_total === 0 ? 0 : P_output / P_total
  return { I, U_terminal, P_output, P_total, eta }
}

/** 安培力 F = BIL·sinθ（N），θ 为电流与磁场夹角 */
export function calculateAmpereForce(
  B: number,
  I: number,
  L: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: B * I * L * Math.sin(angleRad) }
}

/** 洛伦兹力 F = qvB·sinθ（N），θ 为速度与磁场夹角 */
export function calculateLorentzForce(
  q: number,
  v: number,
  B: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: q * v * B * Math.sin(angleRad) }
}

/**
 * 带电粒子在匀强磁场中圆周运动（垂直入射）。
 * r = mv/(qB)，T = 2πm/(qB)，ω = qB/m
 */
export function calculateChargeInMagField(
  q: number,
  m: number,
  v: number,
  B: number
): { r: number; T: number; omega: number } {
  const denom = q * B
  const r = denom === 0 ? 0 : Math.abs((m * v) / denom)
  const T = denom === 0 ? 0 : Math.abs((2 * Math.PI * m) / denom)
  const omega = m === 0 ? 0 : denom / m
  return { r, T, omega }
}

/**
 * 计算带电粒子在匀强磁场中的圆周运动轨迹点。
 * x = R sin(ωt), y = R(1 - cos(ωt))
 *
 * @param q 电荷 (C)
 * @param m 质量 (kg)
 * @param B 磁感应强度 (T)
 * @param v 速度 (m/s)
 * @param t 时间 (s)
 */
export function calculateLorentzTrajectory(
  q: number,
  m: number,
  B: number,
  v0: number,
  t: number
): { x: number; y: number; vx: number; vy: number } {
  const { omega } = calculateChargeInMagField(q, m, v0, B)
  
  if (Math.abs(omega) < 1e-9) {
    // 磁场为0，匀速直线运动
    return {
      x: v0 * t,
      y: 0,
      vx: v0,
      vy: 0
    }
  }

  // 自洽圆周运动轨迹：
  // x(t) = (v0 / omega) * sin(omega * t)
  // y(t) = (v0 / omega) * (cos(omega * t) - 1)
  const x = (v0 / omega) * Math.sin(omega * t)
  const y = (v0 / omega) * (Math.cos(omega * t) - 1)
  
  // 速度：
  // vx = dx/dt = v0 * cos(omega * t)
  // vy = dy/dt = -v0 * sin(omega * t)
  const vx = v0 * Math.cos(omega * t)
  const vy = -v0 * Math.sin(omega * t)
  
  return { x, y, vx, vy }
}

/**
 * 法拉第电磁感应定律 EMF = N·(dΦ/dt)（V）
 */
export function calculateFaradayEMF(N: number, dPhi_dt: number): { EMF: number } {
  return { EMF: N * dPhi_dt }
}

/**
 * 导体切割磁感线计算（[M4-1.x]）。
 *
 * 物理模型：导体棒长 L 在匀强磁场 B 中以速度 v 沿垂直方向运动，θ 为 v 与棒方向
 *          夹角（默认 90° 即垂直切割，sinθ=1 取最大值）。回路总电阻 = R + r
 *          （外电阻 R + 内阻 r）。B_out = 0 表示 B 垂直纸面向里（⊗），1 表示向外（⊙）。
 *
 * 右手定则决定方向：F_lorentz = qv × B。
 *  - B_out=0（向里）、v>0：正电荷受力向上，EMF 为正
 *  - B_out=1（向外）、v>0：正电荷受力向下，EMF 为负
 *  - v 反向则 EMF 同步反向
 *
 * 输出：
 *  - EMF        感应电动势（V），符号反映方向
 *  - I          回路电流（A），符号与 EMF 一致
 *  - F_ampere   安培力大小（N），方向由楞次定律确定（与 v 反向）
 *  - P_output   外电阻 R 消耗的功率（W）
 *  - eta        输运效率 η = R / (R + r)，无量纲
 */
export function calculateCuttingEMF(
  B: number,
  L: number,
  v: number,
  R: number,
  theta: number = 90,
  r: number = 0,
  B_out: number = 0
): { EMF: number; I: number; F_ampere: number; P_output: number; eta: number } {
  const sinTheta = Math.sin((theta * Math.PI) / 180)
  const emfMagnitude = B * L * Math.abs(v) * sinTheta
  const vSign = v >= 0 ? 1 : -1
  const directionFactor = (B_out === 0 ? 1 : -1) * vSign
  const EMF = emfMagnitude * directionFactor

  const totalR = R + r
  const I = totalR > 0 ? EMF / totalR : 0

  const F_ampere = B * Math.abs(I) * L * sinTheta
  const P_output = I * I * R
  const eta = totalR > 0 && Math.abs(I) > 1e-12 ? R / totalR : 0

  return { EMF, I, F_ampere, P_output, eta }
}

/**
 * 受力运动模式单步积分（[M4-1.x] PR 2）。
 *
 * 物理模型：导体棒在驱动力 F_drive 推动下沿导轨运动，受到磁场的安培力 F_ampere 阻碍
 *          （F_ampere 总是与 v 反向，由楞次定律保证）。m 为导体棒质量。
 *
 * 公式：
 *  F_ampere = sign(v) · B²L²·|v|·sin²θ / (R + r)   // 大小
 *  F_ampere_signed = -sign(v) · |F_ampere|           // 方向（与 v 反向）
 *  F_net = F_drive + F_ampere_signed
 *  a = F_net / m
 *  v_new = v + a·dt                                  // semi-implicit Euler
 *  x_new = x + v_new·dt
 *
 * 终端速度（v_terminal）= F_drive·(R + r) / (B²L²·sin²θ) — 当 F_net = 0 时
 *
 * @param B 磁感应强度（T）
 * @param L 导体有效长度（m）
 * @param v 当前速度（m/s，含符号）
 * @param x 当前位移（m）
 * @param R 外电阻（Ω）
 * @param theta 夹角（°），默认 90°
 * @param r 内阻（Ω），默认 0
 * @param F_drive 驱动力（N），正方向沿 +x，默认 2N
 * @param m 导体棒质量（kg），默认 0.1kg
 * @param dt 时间步长（s），默认 1/60 ≈ 0.0167
 *
 * @returns v_new, x_new, F_ampere, F_drive, F_net, a, v_terminal
 */
export function simulateForceMotion(
  B: number,
  L: number,
  v: number,
  x: number,
  R: number,
  theta: number = 90,
  r: number = 0,
  F_drive: number = 2,
  m: number = 0.1,
  dt: number = 1 / 60
): {
  v_new: number
  x_new: number
  F_ampere: number
  F_drive: number
  F_net: number
  a: number
  v_terminal: number
} {
  const sinTheta = Math.sin((theta * Math.PI) / 180)
  const totalR = R + r
  const denomBL = B * B * L * L * sinTheta * sinTheta

  const F_ampereMag = denomBL > 0 && totalR > 0
    ? (denomBL * Math.abs(v)) / totalR
    : 0
  const F_ampere = F_ampereMag === 0 ? 0 : (v > 0 ? -F_ampereMag : F_ampereMag)

  const F_net = F_drive + F_ampere
  const a = m > 0 ? F_net / m : 0
  const v_new = v + a * dt
  const x_new = x + v_new * dt

  const v_terminal = denomBL > 0 && totalR > 0 && B > 0
    ? (F_drive * totalR) / denomBL
    : 0

  return { v_new, x_new, F_ampere, F_drive, F_net, a, v_terminal }
}

/**
 * 楞次定律计算。
 *
 * @param magnetPole    磁极指向：1=N极朝下, -1=S极朝下
 * @param velocity      速度：正值=远离线圈, 负值=靠近线圈
 * @param coilN         线圈匝数
 * @returns 楞次定律分析结果
 */
export function calculateLenzsLaw(
  magnetPole: number,
  velocity: number
): {
  originalFieldDirection: 'up' | 'down'
  fluxChange: 'increasing' | 'decreasing' | 'stable'
  inducedFieldDirection: 'up' | 'down'
  inducedCurrentDirection: 'clockwise' | 'counterclockwise'
  equivalentPole: 'N' | 'S' | null
  forceType: 'repulsion' | 'attraction' | null
  currentAction: string
} {
  // 原磁场方向（N极朝下磁场向下，S极朝下磁场向上）
  const originalFieldDirection: 'up' | 'down' = magnetPole > 0 ? 'down' : 'up'

  // 磁通量变化（速度负=靠近=磁通增加，速度正=远离=磁通减少）
  const fluxChange: 'increasing' | 'decreasing' | 'stable' =
    velocity < -0.1 ? 'increasing' :
    velocity > 0.1 ? 'decreasing' : 'stable'

  // 楞次定律：感应磁场阻碍原磁通变化
  const inducedFieldDirection: 'up' | 'down' =
    fluxChange === 'increasing'
      ? (originalFieldDirection === 'down' ? 'up' : 'down')
      : fluxChange === 'decreasing'
      ? originalFieldDirection
      : 'up' // stable时默认向上

  // 感应电流方向（右手定则：感应磁场向上=逆时针，向下=顺时针）
  const inducedCurrentDirection: 'clockwise' | 'counterclockwise' =
    inducedFieldDirection === 'up' ? 'counterclockwise' : 'clockwise'

  // 等效磁极（上端与感应磁场方向对应）
  const equivalentPole: 'N' | 'S' | null =
    fluxChange === 'stable' ? null :
    inducedFieldDirection === 'up' ? 'N' : 'S'

  // 力反馈（阻碍原理：靠近排斥，远离吸引）
  const forceType: 'repulsion' | 'attraction' | null =
    fluxChange === 'increasing' ? 'repulsion' :
    fluxChange === 'decreasing' ? 'attraction' : null

  // 当前动作描述
  const currentAction =
    magnetPole > 0
      ? (velocity < 0 ? 'N极靠近' : 'N极远离')
      : (velocity < 0 ? 'S极靠近' : 'S极远离')

  return {
    originalFieldDirection,
    fluxChange,
    inducedFieldDirection,
    inducedCurrentDirection,
    equivalentPole,
    forceType,
    currentAction,
  }
}

/**
 * 理想变压器（基础变比模型）。
 * U2 = U1·(n2/n1)，I2 = I1·(n1/n2)（功率守恒）
 *
 * 适用于已知原线圈电流 I1 的场景。
 * 若已知负载电阻 R，请使用 calculateTransformerWithLoad。
 *
 * @param n1 原线圈匝数，必须 > 0
 * @param n2 副线圈匝数，必须 > 0
 * @param U1 原线圈输入电压 (V)
 * @param I1 原线圈电流 (A)
 * @returns U2 副线圈输出电压 (V)、I2 副线圈电流 (A)
 *
 * @category M4
 */
export function calculateTransformer(
  n1: number,
  n2: number,
  U1: number,
  I1: number
): { U2: number; I2: number } {
  const U2 = n1 === 0 ? 0 : U1 * (n2 / n1)
  const I2 = n2 === 0 ? 0 : I1 * (n1 / n2)
  return { U2, I2 }
}

/**
 * 正弦交流有效值。
 * V_rms = V_peak/√2，I_rms = I_peak/√2
 *
 * @param V_peak  电压峰值 (V)
 * @param I_peak  电流峰值 (A)，可选。未传入时 I_rms = V_peak/√2（向后兼容）
 */
export function calculateACRMS(V_peak: number, I_peak?: number): { V_rms: number; I_rms: number } {
  const factor = Math.SQRT1_2 // 1/√2
  return { V_rms: V_peak * factor, I_rms: (I_peak !== undefined ? I_peak : V_peak) * factor }
}

/**
 * 带负载的理想变压器。
 * U2 = U1·(n2/n1)，I2 = U2/R，I1 = I2·(n2/n1)（功率守恒）
 *
 * @param n1 原线圈匝数
 * @param n2 副线圈匝数
 * @param U1 原线圈输入电压 (V)
 * @param R  副线圈负载电阻 (Ω)
 */
export function calculateTransformerWithLoad(
  n1: number,
  n2: number,
  U1: number,
  R: number
): { U2: number; I2: number; I1: number; P_input: number; P_output: number } {
  const U2 = n1 === 0 ? 0 : U1 * (n2 / n1)
  const I2 = R === 0 ? 0 : U2 / R
  const I1 = n1 === 0 ? 0 : I2 * (n2 / n1)
  const P_input = U1 * I1
  const P_output = U2 * I2
  return { U2, I2, I1, P_input, P_output }
}

/**
 * 远距离输电全链路计算（理想变压器）。
 *
 * 模型：发电厂 → 升压变压器 → 输电线 → 降压变压器 → 用户
 *
 * @param P_send       输送功率 (W)
 * @param U_trans      输电电压（升压变压器副线圈电压）(V)
 * @param R_line       输电线总电阻 (Ω)
 * @param n1_step_up   升压变压器原线圈匝数
 * @param n2_step_up   升压变压器副线圈匝数
 * @param n1_step_down 降压变压器原线圈匝数
 * @param n2_step_down 降压变压器副线圈匝数
 */
export function calculatePowerTransmission(
  P_send: number,
  U_trans: number,
  R_line: number,
  _n1_step_up: number,
  _n2_step_up: number,
  n1_step_down: number,
  n2_step_down: number
): {
  I_line: number
  U_loss: number
  P_loss: number
  U_user: number
  P_user: number
  eta: number
} {
  const I_line = U_trans === 0 ? 0 : P_send / U_trans
  const U_loss = I_line * R_line
  const P_loss = I_line * I_line * R_line

  const U_before_step_down = U_trans - U_loss
  const U_user = n1_step_down === 0 ? 0 : U_before_step_down * (n2_step_down / n1_step_down)
  const P_user = P_send - P_loss
  const eta = P_send === 0 ? 0 : P_user / P_send

  return { I_line, U_loss, P_loss, U_user, P_user, eta }
}

/**
 * 手性约定：右手 / 左手。决定中指相对拇指的"绕向"。
 * - 'right'：中指在拇指顺时针 90°（右手定则：B 出纸面时拇 v、食 B、中 I 满足 v×B=I）
 * - 'left' ：中指在拇指逆时针 90°（左手定则：B 入纸面时拇 F、食 B、中 I 满足 F=BIL）
 */
export type HandChirality = 'right' | 'left'

/**
 * 2D 向量辅助（手指定位纯函数）。Canvas 坐标：+x 向右，+y 向下。
 */
export interface Vec2 { x: number; y: number }

/**
 * 右手拇指的静止方向（度，Canvas 坐标系）。
 * 配合 `computeHandPose` 推算整只手的旋转角：
 *   `rotationDeg = atan2(thumbDir.y, thumbDir.x) * 180/π - THUMB_BASE_ANGLE`
 * 即"整只手额外旋转 `THUMB_BASE_ANGLE`"才能让拇指精确对齐 `thumbDir`。
 * 该值与 `SkeletalHand.tsx` 的解剖学约定保持一致（拇指静止时指向左上方）。
 */
export const THUMB_BASE_ANGLE = -90

/**
 * 把角度（度）归一化到 (-180, 180]。
 */
export function normalizeAngleDeg(deg: number): number {
  let a = deg % 360
  if (a > 180) a -= 360
  else if (a <= -180) a += 360
  return a
}

/**
 * 沿最短路径把 `current` 向 `target`（度）逼近一帧。
 * 用于 2D 骨骼手的旋转、握拳/张开动画的平滑过渡。
 *
 * @param current  当前角度（度）
 * @param target   目标角度（度）
 * @param speed    插值速度 0~1，越大越快（默认 0.18）
 */
export function lerpAngleDeg(current: number, target: number, speed = 0.18): number {
  const diff = normalizeAngleDeg(target - current)
  return current + diff * speed
}

/**
 * 手指定位结果：决定每根手指相对"手指根部局部坐标系"的旋转角。
 * 渲染端会再叠加 `handRotation`（整只手的整体旋转）。
 */
export interface HandFingerAngles {
  /** 拇指（拇）相对手掌的"外展角"（度） */
  thumb: number
  /** 食指（食）弯曲角（度）：0=伸直，>0=向掌心弯 */
  index: number
  /** 中指（中）弯曲角（度） */
  middle: number
  /** 无名指弯曲角（度） */
  ring: number
  /** 小拇指弯曲角（度） */
  little: number
}

/**
 * 整只手在画布上的姿态结果（[M4-1.x] 增强）。
 *
 * - rotationDeg ：整只手绕手掌中心的整体旋转角，使 拇指 与 `thumbDir` 同向、中指 与 `middleDir` 同向
 * - chirality   ：手性，决定中指绕拇指的绕向（右手 = 中指在拇指顺时针 90°，左手 = 逆时针 90°）
 * - pose        ：张开 / 半握 / 握拳
 * - B_out       ：true 表示磁场方向 ⊙（出纸面），false 表示 ⊗（入纸面）
 */
export interface HandPoseResult {
  rotationDeg: number
  chirality: HandChirality
  pose: 'open' | 'half-fist' | 'fist'
  B_out: boolean
}

/**
 * 由三个 2D 向量（v、B 投影、I）计算 2D 骨骼手的整体旋转。
 *
 * 物理含义：右手定则下，拇指沿 v 方向、中指沿 I 方向、整只手应旋转
 *          `atan2(v.y, v.x)`，使拇指对齐 v。此时 B 必须满足 `v × B = I`
 *          （B 在 +z 出纸面方向）；若方向相反则手性翻转为左手。
 *
 * 约定：传入的 v/I 均为 Canvas 2D 向量（+x 右，+y 下）。零向量返回 0。
 *
 * @param v 拇指方向（2D）
 * @param I 中指方向（2D）
 * @returns HandPoseResult
 */
/**
 * 重构后的手部姿态计算：
 * 以四指平面（中指指向）为旋转基准，确保手部角度自然垂直。
 * 在右手右手定则中，四指指代 B 方向（或者更准确地，令掌心平面指向 I 方向）。
 */
export function computeHandPose(v: Vec2, I: Vec2): HandPoseResult {
  const vMag = Math.hypot(v.x, v.y)
  const iMag = Math.hypot(I.x, I.y)

  if (vMag < 1e-9 || iMag < 1e-9) {
    return { rotationDeg: 0, chirality: 'right', pose: 'open', B_out: true }
  }

  // 计算中指（手掌中轴）应当指向的角度
  const iAngle = Math.atan2(I.y, I.x)

  // 修正旋转角：使中指（掌心轴）指向 I 方向。
  // 在静止姿态 (0°) 下，SkeletonHand 组件中的四指是朝上（-90°）定义的。
  // 所以当 I 方向为 iAngle 时，需要旋转 `iAngle - (-90°)`.
  const rotationDeg = (iAngle * 180) / Math.PI + 90

  const cross = v.x * I.y - v.y * I.x
  const chirality: HandChirality = cross > 0 ? 'right' : 'left'
  const B_out = cross > 0

  return {
    rotationDeg,
    chirality,
    pose: 'open',
    B_out,
  }
}

/**
 * 给定 (v, B, I) 三个 2D/3D 分量，输出整只手应当呈现的姿态。
 *
 * 用于"导体切割磁感线"动画：根据 v 方向（正/负）、B 方向（出/入纸面），
 * 自动推导出 I 方向（I = v × B 右手螺旋），进而决定手的整体旋转与手性。
 *
 * @param vDir    速度方向：+1 向右、-1 向左
 * @param B_out   0 = B 入纸面 ⊗，1 = B 出纸面 ⊙
 * @returns HandPoseResult，含 rotationDeg / chirality / B_out
 */
export function computeCuttingEMFHandPose(vDir: number, B_out: 0 | 1): HandPoseResult {
  const v: Vec2 = { x: vDir, y: 0 }
  // I = v × B（右手定则）：v=(vx,0,0), B=(0,0,Bz) → I_3d = (0, -vx*Bz, 0)
  //   Canvas 中 y 翻转：I_canvas = (0, vx*Bz, 0)
  const sign = B_out === 0 ? -1 : 1
  const I: Vec2 = { x: 0, y: vDir * sign }
  const result = computeHandPose(v, I)
  return { ...result, B_out: B_out === 1 }
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
 * 计算动态时间慢放系数 TIME_SCALE，实现“物理参数不变、动画时间动态映射”。
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
 * @returns phi 电势 (V), Ex 电场 x 分量 (V/m), Ey 电场 y 分量 (V/m), E 场强大小 (V/m)
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
): { phi: number; Ex: number; Ey: number; E: number } {
  const k = 9e9
  const dx = x - xq
  const dy = y - yq
  const r = Math.sqrt(dx * dx + dy * dy)
  const rClamped = Math.max(0.1, r) // 限制最小距离 10cm，防止除零与发散

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
    const rGround = Math.max(0.1, Math.sqrt(dxGround * dxGround + dyGround * dyGround))
    const phiPointGround = (k * Q) / rGround
    const phiBaseGround = -E_base * (x_ground - x_ref)
    const phiGroundRef = phiBaseGround + phiPointGround
    phi = phiRaw - phiGroundRef
  }

  return { phi, Ex, Ey, E }
}

/**
 * 粒子在速度选择器（正交电磁场）中的运动轨迹解析解状态描述。
 */
export interface VelocitySelectorPoint {
  t: number
  x: number  // 物理坐标 x (m)
  y: number  // 物理坐标 y (m)
  vx: number // 速度 x (m/s)
  vy: number // 速度 y (m/s)
  fx: number // 洛伦兹力 x 分量 (N)
  fy: number // 洛伦兹力 y 分量 (N)
  fEx: number // 电场力 x 分量 (N)
  fEy: number // 电场力 y 分量 (N)
}

/**
 * 求解在复合正交电磁场中 x(t) = L 的穿出时间 t_out (二分法)。
 */
function solveTOut(v0: number, vd: number, omega: number, L: number): number {
  let tMin = 0
  let tMax = Math.max(10.0, (10 * L) / Math.max(0.1, v0))
  for (let i = 0; i < 30; i++) {
    const tMid = (tMin + tMax) / 2
    const xMid = vd * tMid + ((v0 - vd) / omega) * Math.sin(omega * tMid)
    if (xMid < L) {
      tMin = tMid
    } else {
      tMax = tMid
    }
  }
  return (tMin + tMax) / 2
}

/**
 * 洛伦兹力与速度选择器模型粒子轨迹解析解计算。
 *
 * @param q       粒子电量 (C)，带符号
 * @param m       粒子质量 (kg)
 * @param v0      入射速度 (m/s)
 * @param E_val   电场强度大小 (V/m)，始终 >= 0
 * @param B_val   磁感应强度大小 (T)，始终 >= 0
 * @param L       平行板长度 (m)
 * @param d       平行板间距 (m)
 * @param t       运行时间 (s)
 */
export function calculateVelocitySelectorTrajectory(
  q: number,
  m: number,
  v0: number,
  E_y: number,
  B_z: number,
  L: number,
  d: number,
  t: number
): {
  point: VelocitySelectorPoint
  tHit: number | null
  tOut: number
  hitsPlate: boolean
  hitType: 'none' | 'top' | 'bottom'
} {
  const omega = m > 0 ? (q * B_z) / m : 0
  const vd = Math.abs(B_z) > 1e-6 ? E_y / B_z : 0
  
  let tHit: number | null = null
  let hitType: 'none' | 'top' | 'bottom' = 'none'
  let hitsPlate = false

  const halfD = d / 2

  if (Math.abs(B_z) < 1e-6) {
    // 纯电场类平抛运动
    if (Math.abs(E_y) > 1e-6 && Math.abs(q) > 1e-9 && m > 0) {
      const a_y = (q * E_y) / m
      if (Math.abs(a_y) > 1e-6) {
        tHit = Math.sqrt(halfD / (0.5 * Math.abs(a_y)))
        hitType = a_y > 0 ? 'top' : 'bottom'
        hitsPlate = true
      }
    }
  } else {
    // 匀强磁场或复合正交电磁场
    if (Math.abs(omega) > 1e-6) {
      const A = (v0 - vd) / omega
      if (Math.abs(A) > 1e-6) {
        if (A < 0) {
          // 向上偏，可能撞击上极板 y = +halfD
          const val = 1 + halfD / A
          if (val >= -1 && val <= 1) {
            tHit = Math.acos(val) / Math.abs(omega)
            hitType = 'top'
            hitsPlate = true
          }
        } else {
          // 向下偏，可能撞击下极板 y = -halfD
          const val = 1 - halfD / A
          if (val >= -1 && val <= 1) {
            tHit = Math.acos(val) / Math.abs(omega)
            hitType = 'bottom'
            hitsPlate = true
          }
        }
      }
    }
  }

  let tOut = L / Math.max(0.1, v0)
  if (Math.abs(B_z) >= 1e-6 && Math.abs(omega) > 1e-6) {
    tOut = solveTOut(v0, vd, omega, L)
  }

  if (hitsPlate && tHit !== null && tHit < tOut) {
    // 粒子撞板，不穿出
  } else {
    hitsPlate = false
    hitType = 'none'
    tHit = null
  }

  let px = 0
  let py = 0
  let vx = v0
  let vy = 0

  const tEffective = hitsPlate && tHit !== null ? Math.min(t, tHit) : t

  if (tEffective <= 0) {
    px = 0
    py = 0
    vx = v0
    vy = 0
  } else if (!hitsPlate && tEffective > tOut) {
    let px_out = 0
    let py_out = 0
    let vx_out = v0
    let vy_out = 0

    if (Math.abs(omega) < 1e-9) {
      px_out = v0 * tOut
      py_out = 0.5 * ((q * E_y) / m) * tOut * tOut
      vx_out = v0
      vy_out = ((q * E_y) / m) * tOut
    } else {
      px_out = vd * tOut + ((v0 - vd) / omega) * Math.sin(omega * tOut)
      py_out = ((v0 - vd) / omega) * (Math.cos(omega * tOut) - 1)
      vx_out = vd + (v0 - vd) * Math.cos(omega * tOut)
      vy_out = -(v0 - vd) * Math.sin(omega * tOut)
    }

    const tAfter = tEffective - tOut
    px = px_out + vx_out * tAfter
    py = py_out + vy_out * tAfter
    vx = vx_out
    vy = vy_out
  } else {
    if (Math.abs(omega) < 1e-9) {
      px = v0 * tEffective
      py = 0.5 * ((q * E_y) / m) * tEffective * tEffective
      vx = v0
      vy = ((q * E_y) / m) * tEffective
    } else {
      px = vd * tEffective + ((v0 - vd) / omega) * Math.sin(omega * tEffective)
      py = ((v0 - vd) / omega) * (Math.cos(omega * tEffective) - 1)
      vx = vd + (v0 - vd) * Math.cos(omega * tEffective)
      vy = -(v0 - vd) * Math.sin(omega * tEffective)
    }
  }

  const isInside = tEffective <= tOut
  // 洛伦兹力分量
  const fx = isInside && Math.abs(B_z) > 0 ? q * B_z * vy : 0
  const fy = isInside && Math.abs(B_z) > 0 ? -q * B_z * vx : 0
  
  const fEx = 0
  // 电场力分量
  const fEy = isInside && Math.abs(E_y) > 0 ? q * E_y : 0

  return {
    point: {
      t: tEffective,
      x: px,
      y: py,
      vx,
      vy,
      fx,
      fy,
      fEx,
      fEy
    },
    tHit,
    tOut,
    hitsPlate,
    hitType
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 安培力场景参数
// ═══════════════════════════════════════════════════════════════════════════════

/** 基础模式（直交规律）场景参数 */
export const AMPERE_BASIC_SCENE = {
  xMin: -1.6,    // 左边界 (m)
  xMax: 1.6,     // 右边界 (m)
  mass: 0.5,     // 导体棒质量 (kg)
} as const

/** 进阶模式（斜面平衡）场景参数 */
export const AMPERE_ADVANCED_SCENE = {
  xMin: -1.1,    // 左边界 (m)
  xMax: 1.1,     // 右边界 (m)
  mass: 0.5,     // 导体棒质量 (kg)
} as const

export interface BasicAmperePhysicsResult {
  /** 安培力大小 F (N)，有正负号，表示沿导轨水平方向的受力（+x 为右，-x 为左） */
  F: number
  /** 安培力绝对值 |F| */
  FAbs: number
  /** 加速度 a (m/s²) */
  a: number
  /** 导体棒的瞬时物理位移 x (m) */
  x: number
  /** 是否达到了轨道边缘限位 */
  isLimited: boolean
  /** 电流方向：'positive' | 'negative' | 'zero' */
  currentDir: 'positive' | 'negative' | 'zero'
  /** 磁场方向：'intoPage' | 'outOfPage' | 'zero' */
  magneticDir: 'intoPage' | 'outOfPage' | 'zero'
  /** 受力方向：'left' | 'right' | 'zero' */
  forceDir: 'left' | 'right' | 'zero'
}

/**
 * 基础模式物理状态求解器
 * @param I 电流 (A)
 * @param B 磁感应强度 (T)
 * @param L 有效长度 (m)
 * @param m 导体棒质量 (kg)
 * @param t 当前时间 (s)
 * @param scene 场景参数（初始位置、边界）
 */
export function solveBasicAmpere(
  I: number,
  B: number,
  L: number = 4.0,
  m: number = AMPERE_BASIC_SCENE.mass,
  t: number = 0,
  scene: { xMin: number; xMax: number } = AMPERE_BASIC_SCENE
): BasicAmperePhysicsResult {
  // 物理符号约定：
  // 磁场向里为负（B > 0，⊗），磁场向外为正（B < 0，⊙）
  // 电流向上为正（I > 0），电流向下为负（I < 0）
  // 根据左手定则，这里我们令 F = -B * I * L，这样：
  // B > 0, I > 0 -> F = - (1 * 2 * 4) = -8 N (向左)
  // B < 0, I > 0 -> F = - (-1 * 2 * 4) = +8 N (向右)
  const F = -B * I * L
  const FAbs = Math.abs(F)

  const a = m > 0 ? F / m : 0

  // 从场景参数读取位置边界，初始位置为轨道中点
  const { xMin, xMax } = scene
  const x0 = (xMin + xMax) / 2

  let x = x0
  let isLimited = false

  if (Math.abs(a) > 1e-6) {
    if (a > 0) {
      const tLimit = Math.sqrt((2 * (xMax - x0)) / a)
      if (t >= tLimit) {
        x = xMax
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    } else {
      const tLimit = Math.sqrt((2 * (x0 - xMin)) / Math.abs(a))
      if (t >= tLimit) {
        x = xMin
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    }
  }

  const currentDir = I > 0 ? 'positive' : I < 0 ? 'negative' : 'zero'
  const magneticDir = B > 0 ? 'intoPage' : B < 0 ? 'outOfPage' : 'zero'
  const forceDir = F > 1e-4 ? 'right' : F < -1e-4 ? 'left' : 'zero'

  return {
    F,
    FAbs,
    a,
    x,
    isLimited,
    currentDir,
    magneticDir,
    forceDir,
  }
}

export interface AdvancedAmperePhysicsResult {
  /** 安培力大小 F (N) */
  F_ampere: number
  /** 支持力 N (N) */
  N: number
  /** 摩擦力 f (N)，沿斜面向下为负，向上为正 */
  f: number
  /** 加速度 a (m/s²)，沿斜面向下为负，向上为正 */
  a: number
  /** 导体棒沿斜面的物理位移 x (m) (初始 0.0m，范围 [-1.1, 1.1]) */
  x: number
  /** 状态：'equilibrium' (静止平衡) | 'sliding-up' (向上滑动) | 'sliding-down' (向下滑动) */
  state: 'equilibrium' | 'sliding-up' | 'sliding-down'
  /** 是否达到了斜面边界限制 */
  isLimited: boolean
  /** 待平衡合力分量 R_parallel (N) */
  R_parallel: number
}

/**
 * 进阶模式物理状态求解器 (斜面受力平衡)
 * @param I 电流 (A)
 * @param B 磁感应强度 (T)，磁场竖直向上 (B > 0) 或竖直向下 (B < 0)
 * @param theta 倾角 (度)
 * @param mu 摩擦因数
 * @param L 有效长度 (m)
 * @param m 质量 (kg)
 * @param t 当前时间 (s)
 * @param scene 场景参数（初始位置、边界）
 */
export function solveAdvancedAmpere(
  I: number,
  B: number,
  theta: number,
  mu: number,
  L: number = 4.0,
  m: number = AMPERE_ADVANCED_SCENE.mass,
  t: number = 0,
  scene: { xMin: number; xMax: number } = AMPERE_ADVANCED_SCENE
): AdvancedAmperePhysicsResult {
  const g = 9.8

  const F_ampere = -B * I * L
  const rad = (theta * Math.PI) / 180

  let N = m * g * Math.cos(rad) + F_ampere * Math.sin(rad)
  if (N < 0) N = 0

  const R_parallel = F_ampere * Math.cos(rad) - m * g * Math.sin(rad)

  const fMax = mu * N
  let f = 0
  let a = 0
  let state: 'equilibrium' | 'sliding-up' | 'sliding-down' = 'equilibrium'

  if (Math.abs(R_parallel) <= fMax + 1e-5) {
    f = -R_parallel
    a = 0
    state = 'equilibrium'
  } else {
    if (R_parallel > 0) {
      f = -fMax
      a = (R_parallel + f) / m
      state = 'sliding-up'
    } else {
      f = fMax
      a = (R_parallel + f) / m
      state = 'sliding-down'
    }
  }

  // 从场景参数读取位置边界，初始位置为轨道中点
  const { xMin, xMax } = scene
  const x0 = (xMin + xMax) / 2

  let x = x0
  let isLimited = false

  if (Math.abs(a) > 1e-6) {
    if (a > 0) {
      const tLimit = Math.sqrt((2 * (xMax - x0)) / a)
      if (t >= tLimit) {
        x = xMax
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    } else {
      const tLimit = Math.sqrt((2 * (x0 - xMin)) / Math.abs(a))
      if (t >= tLimit) {
        x = xMin
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    }
  }

  return {
    F_ampere,
    N,
    f,
    a,
    x,
    state,
    isLimited,
    R_parallel,
  }
}

/**
 * @description 计算带电粒子在匀强磁场中的回旋半径
 * @param {number} m - 粒子质量 (kg)
 * @param {number} v - 速度大小 (m/s)
 * @param {number} q - 电荷量 (C)
 * @param {number} B - 磁感应强度 (T)
 * @returns {number} 物理半径 R (m)
 */
export const calcParticleRadius = (m: number, v: number, q: number, B: number): number => {
  if (Math.abs(q) < 1e-9 || Math.abs(B) < 1e-9) return Infinity
  return (m * v) / (Math.abs(q) * Math.abs(B))
}

/**
 * @description 计算粒子在磁场中的运动周期
 * @returns {number} 周期 T (s)
 */
export const calcParticlePeriod = (m: number, q: number, B: number): number => {
  if (Math.abs(q) < 1e-9 || Math.abs(B) < 1e-9) return Infinity
  return (2 * Math.PI * m) / (Math.abs(q) * Math.abs(B))
}

/**
 * @description 计算动态圆圆心物理坐标 (xc, yc)
 * @param {number} entryAngle - 射入夹角 (rad)
 * @param {number} R - 物理半径 (m)
 * @param {number} q - 电荷量
 * @param {number} B - 磁感应强度
 */
export const calcTrajectoryCenter = (entryAngle: number, R: number, q: number = 1, B: number = 1) => {
  // 假定入射点为原点 (0,0)
  // 右手螺旋定则下，当 q*B > 0 且垂直射入时，受力向右，即向速度方向右侧偏转（sign = -1）
  const sign = (q * B) >= 0 ? -1 : 1
  const cxAngle = entryAngle + sign * Math.PI / 2
  return {
    xc: R * Math.cos(cxAngle),
    yc: R * Math.sin(cxAngle)
  }
}

/**
 * @description 计算粒子运动的圆心角
 * @param entryAngle - 射入夹角 (rad)
 * @param q - 电荷量
 * @param B - 磁感应强度
 */
export const calcParticleArcAngle = (entryAngle: number, _q: number, _B: number): number => {
  // 对于 y=0 的直线边界，从原点射入 y>0 区域
  // 射出时的偏转角与入射角有关
  // 如果向左偏转（qB>0），圆心在入射速度左侧。
  return 2 * entryAngle // 简化模型，具体取决于几何关系，通常从直线边界射入再射出时，轨迹圆弧对应的圆心角为 2 * (pi - 夹角) 或者 2 * 夹角
}

/**
 * 磁铁插入线圈定性物理计算。
 * 
 * 物理原理：
 * 设线圈中心在 coilX。磁铁在 x 处，以速度 v 移动。
 * 穿过线圈的磁通量为距离的函数：Phi(x) = Phi0 / (1 + alpha * (x - coilX)^2)。
 * 磁通量变化率为：dPhi/dt = (dPhi/dx) * v = -2 * alpha * (x - coilX) * Phi0 * v / (1 + alpha * (x - coilX)^2)^2。
 * 感应电流（定性）正比于磁通量变化率：I = -N * dPhi_dt / R_total。
 * 电流计偏转角度正比于感应电流：theta = k * I。
 *
 * @param x 磁铁当前位置，单位 px
 * @param v 磁铁当前移动速度，单位 px/s
 * @param coilX 线圈中心位置，单位 px
 * @param N 线圈匝数
 * @param pole 磁铁极性，1 = 左S右N，-1 = 左N右S
 * @returns phi 磁通量 (Wb), dPhi 磁通量变化率 (Wb/s), theta 电流计指针偏转比例 (无量纲，范围 -1 到 1)
 */
export function calculateMagnetInduction(
  x: number,
  v: number,
  coilX: number,
  N: number,
  pole: number
): {
  phi: number
  dPhi: number
  theta: number
} {
  const Phi0 = 1.0 // 最大磁通量 (Wb)
  const alpha = 0.00015 // 空间衰减系数 (px^-2)
  const dx = x - coilX // 磁铁距离线圈中心的相对位置

  // 磁通量
  const phi = Phi0 / (1 + alpha * dx * dx)

  // 磁通量随位移的变化率 dPhi/dx
  const denom = 1 + alpha * dx * dx
  const dPhi_dx = (-2 * alpha * dx * Phi0) / (denom * denom)

  // 磁通量随时间的变化率 dPhi/dt = dPhi/dx * v (v为 px/s)
  // 注意，磁极 pole 翻转会使穿过线圈的磁通量极性变反
  let dPhi = dPhi_dx * v * pole
  if (dPhi === 0) dPhi = 0

  // 根据法拉第电磁感应定律，感应电动势 E = -N * dPhi/dt
  // 我们定性表示偏转比例，当向右移动靠近时（v>0，dx<0，dPhi_dx>0，如pole=1，则dPhi>0，E < 0）
  // 指针偏转与感应电动势成正比，即与 -dPhi 挂钩。
  const k = 0.12 // 比例系数
  let theta = -k * N * dPhi
  if (theta === 0) theta = 0

  // 限幅在 [-1, 1]
  theta = Math.max(-1, Math.min(1, theta))

  return { phi, dPhi, theta }
}

/**
 * 原副线圈回路（互感）定性物理计算。
 * 
 * 物理原理：
 * 原线圈回路电流 I1 = E / R。
 * 产生的磁场 B 正比于 I1。
 * 穿过副线圈的磁通量 Phi = M * I1 = M * E / R。
 * 磁通量变化率 dPhi/dt = -M * E / R^2 * dR_dt。
 * 感应电动势 E_induced = -N * dPhi/dt = N * M * E / R^2 * dR_dt。
 * 电流计指针偏转角度 theta 正比于感应电动势。
 *
 * @param R 当前滑动变阻器阻值，单位 Ω，为防止除以0应不为0
 * @param dR_dt 变阻器阻值变化率，单位 Ω/s
 * @param E 原线圈回路电源电压，单位 V
 * @param N 副线圈匝数
 * @returns phi 磁通量 (Wb), dPhi 磁通量变化率 (Wb/s), theta 电流计指针偏转比例 (无量纲，范围 -1 到 1)
 */
export function calculateCoilInduction(
  R: number,
  dR_dt: number,
  E: number,
  N: number
): {
  phi: number
  dPhi: number
  theta: number
} {
  const safeR = Math.max(5, R) // 边界保护：变阻器最小阻值限制为 5 Ω
  const M = 0.1 // 互感系数 (H)

  // 磁通量
  const phi = (M * E) / safeR

  // 磁通量变化率 dPhi/dt = -M * E / R^2 * dR_dt
  let dPhi = -((M * E) / (safeR * safeR)) * dR_dt
  if (dPhi === 0) dPhi = 0

  // 感应电动势 E_induced = -N * dPhi/dt
  // 指针偏转与感应电动势正比
  const k = 0.8 // 偏转系数
  let theta = -k * N * dPhi
  if (theta === 0) theta = 0

  // 限幅
  theta = Math.max(-1, Math.min(1, theta))

  return { phi, dPhi, theta }
}

/**
 * 计算匀变磁场下的感应电动势。
 * @param turns 线圈匝数 n，单位：匝
 * @param area 线圈面积 S，单位：m^2
 * @param dBdt 磁感应强度变化率，单位：T/s
 * @returns 感应电动势 E，单位：V
 */
export function computeFaradayEmf(turns: number, area: number, dBdt: number): number {
  return turns * area * dBdt
}

/**
 * 计算条形磁铁在线圈轴线产生的近似轴线磁通量。
 * @param magnetLeftPx 磁铁左端 x 坐标（px）
 * @param B            磁铁磁感应强度（T）
 * @returns Φ（Wb，有符号）
 */
export function computeFaradayMagnetFlux(magnetLeftPx: number, B: number): number {
  const COIL_X = 280          // 线圈中心 px
  const MAGNET_LEN = 100      // 磁铁长度 px
  const SCALE_PX_PER_M = 500  // 1 m = 500 px
  const COIL_RADIUS_M = 65 / SCALE_PX_PER_M // 线圈等效半径（米）
  const PHI0 = 0.45           // 磁通量归一化系数

  const magnetCenterPx = magnetLeftPx + MAGNET_LEN / 2
  const dist = (COIL_X - magnetCenterPx) / SCALE_PX_PER_M
  const R = COIL_RADIUS_M
  const halfLen = MAGNET_LEN / 2 / SCALE_PX_PER_M

  const uN = dist + halfLen
  const uS = dist - halfLen
  const termN = uN / Math.sqrt(uN * uN + R * R)
  const termS = uS / Math.sqrt(uS * uS + R * R)
  return PHI0 * B * (termN - termS)
}

export interface FaradayChartPoint {
  t: number
  phi: number
  emf: number
}

/**
 * 生成法拉第电磁感应定律图像点（匀变磁场模式）。
 * @param turns 线圈匝数 n，单位：匝
 * @param area 线圈面积 S，单位：m^2
 * @param dBdt 磁感应强度变化率，单位：T/s
 * @param B0 初始磁场强度，单位：T
 * @param duration 总时长，单位：s
 * @param steps 采样步数
 */
export function generateUniformFaradayPoints(
  turns: number,
  area: number,
  dBdt: number,
  B0: number = 0.5,
  duration: number = 10,
  steps: number = 100
): FaradayChartPoint[] {
  const points: FaradayChartPoint[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration
    const B = B0 + dBdt * t
    const phi = B * area
    const emf = -turns * dBdt * area // E = -n * dPhi/dt
    points.push({ t, phi, emf })
  }
  return points
}

/**
 * 生成磁铁变速运动模式下的法拉第定律图表点。
 * @param turns 匝数 n
 * @param B 磁铁强度
 * @param velocity 磁铁运动速度 px/s (支持正负号，正值向右插入，负值向左拔出)
 * @param duration 采样时长 (s)
 * @param steps 采样点数
 */
export function generateMagnetFaradayPoints(
  turns: number,
  B: number,
  velocity: number,
  duration: number = 10,
  steps: number = 100
): FaradayChartPoint[] {
  const MAGNET_MIN_X = 60
  const COIL_X = 280
  const COIL_RX = 42
  const MAGNET_MAX_X = COIL_X + COIL_RX - 10 // 完全穿过线圈右侧 px

  const points: FaradayChartPoint[] = []
  const dt = 0.001

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration
    
    // 磁铁初始在左侧 MAGNET_MIN_X
    let currentX = MAGNET_MIN_X + velocity * t
    currentX = Math.max(MAGNET_MIN_X, Math.min(MAGNET_MAX_X, currentX))
    const phi = computeFaradayMagnetFlux(currentX, B)

    // 计算瞬时 dPhi/dt
    let nextX = MAGNET_MIN_X + velocity * (t + dt)
    nextX = Math.max(MAGNET_MIN_X, Math.min(MAGNET_MAX_X, nextX))
    const nextPhi = computeFaradayMagnetFlux(nextX, B)
    const dPhi_dt = (nextPhi - phi) / dt
    const emf = -turns * dPhi_dt

    points.push({ t, phi, emf })
  }
  return points
}

/**
 * 计算单棒动力学特征常数。
 * @param B 磁感应强度，单位：T
 * @param L 导轨间距，单位：m
 * @param R 回路总电阻，单位：ohm
 * @param m 金属棒质量，单位：kg
 * @param F 外力，单位：N
 */
export function computeRodConstants(B: number, L: number, R: number, m: number, F: number) {
  const factor = B * B * L * L;

  return {
    terminalVelocity: (F * R) / factor,
    timeConstant: (m * R) / factor,
    initialAcceleration: F / m,
  };
}

/**
 * 根据解析解，计算金属棒在特定时刻 t 的动力学状态。
 * @param t 当前时间，单位：s
 * @param B 磁感应强度，单位：T
 * @param L 导轨间距，单位：m
 * @param R 回路总电阻，单位：ohm
 * @param m 金属棒质量，单位：kg
 * @param F 外力，单位：N
 * @returns 包含速度 v (m/s)、位移 x (m)、加速度 a (m/s²)、安培力 F_amp (N)、电热功率 P_heat (W) 的状态对象
 */
export function computeRodStateAtTime(
  t: number,
  B: number,
  L: number,
  R: number,
  m: number,
  F: number
): {
  v: number
  x: number
  a: number
  F_amp: number
  P_heat: number
} {
  const factor = B * B * L * L;
  const EPS = 1e-6;
  if (B < EPS || L < EPS || R < EPS || m < EPS) {
    return { v: 0, x: 0, a: 0, F_amp: 0, P_heat: 0 };
  }

  const { terminalVelocity: v_m, timeConstant: tau, initialAcceleration: a_0 } = computeRodConstants(B, L, R, m, F);

  const expTerm = Math.exp(-t / tau);
  const v = v_m * (1 - expTerm);
  const x = v_m * t - v_m * tau * (1 - expTerm);
  const a = a_0 * expTerm;
  const F_amp = (factor * v) / R;
  const P_heat = F_amp * v;

  return { v, x, a, F_amp, P_heat };
}

