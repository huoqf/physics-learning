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
  const r = denom === 0 ? 0 : (m * v) / denom
  const T = denom === 0 ? 0 : (2 * Math.PI * m) / denom
  const omega = m === 0 ? 0 : denom / m
  return { r, T, omega }
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
export const THUMB_BASE_ANGLE = -130

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
