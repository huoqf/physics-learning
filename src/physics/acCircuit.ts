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
