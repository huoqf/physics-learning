/**
 * 电磁感应纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

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
  N: number,
  ironCoreFactor: number = 1
): {
  phi: number
  dPhi: number
  theta: number
} {
  const safeR = Math.max(5, R) // 边界保护：变阻器最小阻值限制为 5 Ω
  const M = 0.1 * ironCoreFactor // 互感系数 (H)，铁芯影响聚磁能力

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
