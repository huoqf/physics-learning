/**
 * 交流电路纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

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
 * 交变电流产生——计算任意时刻的完整物理状态。
 *
 * 物理模型：
 *   矩形线圈（面积 S，匝数 N）在匀强磁场 B 中以角速度 ω 匀速旋转。
 *   初始时刻线圈法线与磁场夹角为 θ₀。
 *   磁通量：Φ(t) = BS·cos(ωt + θ₀)
 *   感应电动势：e(t) = NBSω·sin(ωt + θ₀)
 *   线圈侧边线速度大小：v = ωr（r 为侧边到转轴距离）
 *   速度在磁场垂直方向分量：v⊥ = v·cos(ωt + θ₀) → 切割磁感线有效速度
 *   速度在磁场平行方向分量：v∥ = v·sin(ωt + θ₀) → 不产生感应电动势
 *
 * @param B       磁感应强度 (T)
 * @param S       线圈面积 (m²)
 * @param omega   角速度 (rad/s)
 * @param N       线圈匝数
 * @param theta0  初始相位角 (rad)，0 表示中性面起始
 * @param t       当前时刻 (s)
 * @param coilRadius 线圈侧边到转轴距离 (m)，用于速度分解可视化，默认 S 的等效半径
 * @returns 包含 Φ, e, Em, theta, vPerp, vPara, vTangential, isNeutral, isMaxEmf 的状态对象
 */
export function computeACGenerationState(
  B: number,
  S: number,
  omega: number,
  N: number,
  theta0: number,
  t: number,
  coilRadius?: number,
): {
  phi: number
  e: number
  Em: number
  theta: number
  vTangential: number
  vPerp: number
  vPara: number
  isNeutral: boolean
  isMaxEmf: boolean
} {
  const Em = N * B * S * omega
  const theta = omega * t + theta0
  const phi = B * S * Math.cos(theta)
  const e = Em * Math.sin(theta)

  const r = coilRadius ?? Math.sqrt(S / Math.PI)
  const vTangential = omega * r
  const vPerp = vTangential * Math.cos(theta)
  const vPara = vTangential * Math.sin(theta)

  const sinT = Math.sin(theta)
  const cosT = Math.cos(theta)
  const isNeutral = Math.abs(sinT) < 0.09
  const isMaxEmf = Math.abs(cosT) < 0.09

  return { phi, e, Em, theta, vTangential, vPerp, vPara, isNeutral, isMaxEmf }
}

/**
 * 远距离输电全链路计算（理想变压器）。
 *
 * 物理模型：发电厂 → 升压变压器 → 输电线 → 降压变压器 → 用户
 *
 * 因果链（四电压四功率）：
 *   【发电端】P1 = U1·I1
 *   【输电线】I_line = P1/U2 → ΔU = I_line·r → P_loss = I_line²·r
 *   【降压端】U3 = U2 - ΔU → P3 = P1 - P_loss
 *   【用户端】U4 = U3·(n4/n3) → P_user = P3（理想变压器）
 *
 * @param P1 发电功率 (W) — 自变量
 * @param U2 输电电压，升压变压器副线圈电压 (V) — 自变量
 * @param r  输电线总电阻 (Ω) — 自变量
 * @param n3 降压变压器原线圈匝数 — 自变量
 * @param n4 降压变压器副线圈匝数 — 自变量
 * @returns 完整四电压四功率链路（所有中间变量）
 *
 * @category M4
 */
export function calculatePowerTransmission(
  P1: number,
  U2: number,
  r: number,
  n3: number,
  n4: number,
): {
  /** 发电功率 (W) */
  P1: number
  /** 输电线电流 (A) */
  I_line: number
  /** 电压损失 (V) */
  deltaU: number
  /** 功率损失 (W) */
  P_loss: number
  /** 降压变压器原线圈电压 (V) */
  U3: number
  /** 降压变压器原线圈功率 (W) */
  P3: number
  /** 用户端电压 (V) */
  U4: number
  /** 用户端功率 (W) */
  P_user: number
  /** 输电效率 (0-1) */
  eta: number
} {
  // 【输电线】
  const I_line = U2 === 0 ? 0 : P1 / U2
  const deltaU = I_line * r
  const P_loss = I_line * I_line * r

  // 【降压端】
  const U3 = U2 - deltaU
  const P3 = P1 - P_loss

  // 【用户端】
  const U4 = n3 === 0 ? 0 : U3 * (n4 / n3)
  const P_user = P3

  // 【效率】
  const eta = P1 === 0 ? 0 : P_user / P1

  return { P1, I_line, deltaU, P_loss, U3, P3, U4, P_user, eta }
}
