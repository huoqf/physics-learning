/**
 * 自感、互感与涡流电磁阻尼纯物理计算模型 (SSOT)
 *
 * 遵循铁律：纯函数，无 React / DOM / Store 依赖，提供带物理量与单位的严格推导。
 */

/**
 * 通电自感瞬态电流响应
 * 回路微分方程: E - L*(dI/dt) = I*R
 * 解为: I(t) = (E / R) * (1 - exp(-t / tau)), 其中 tau = L / R
 *
 * @param t 当前时间 (s)
 * @param E 电源电动势 (V)
 * @param R 回路总电阻 (Ω)
 * @param L 自感系数 (H)
 * @returns 瞬态电流 (A)
 */
export function calcTurnOnCurrent(t: number, E: number, R: number, L: number): number {
  if (t <= 0 || R <= 0) return 0
  const tau = L / R
  if (tau <= 0) return E / R
  return (E / R) * (1 - Math.exp(-t / tau))
}

/**
 * 断电自感断开瞬间及后续电流响应
 * 断开前线圈稳态电流: I0 = E / RL
 * 断开瞬间电感电流不可突变，线圈与灯泡组成闭合回路，总电阻为 RL + RA
 * 电流衰减: I(t) = I0 * exp(-t / tau_off), 其中 tau_off = L / (RL + RA)
 *
 * @param t 距断开电键的时间 (s)
 * @param E 电源电动势 (V)
 * @param RL 线圈内阻 (Ω)
 * @param RA 灯泡电阻 (Ω)
 * @param L 自感系数 (H)
 * @returns 局部回路瞬态电流 (A)
 */
export function calcTurnOffCurrent(
  t: number,
  E: number,
  RL: number,
  RA: number,
  L: number,
): number {
  if (t < 0 || RL <= 0 || RA <= 0) return 0
  const I0 = E / RL
  const RTotal = RL + RA
  const tau = L / RTotal
  if (tau <= 0) return 0
  return I0 * Math.exp(-t / tau)
}

/**
 * 判断断电自感中灯泡是否会发生“闪亮”
 * 高考关键考点:
 * 断开前灯泡正常电流 IA = E / RA
 * 断开瞬间流过灯泡的初电流等于线圈断开前的稳态电流 IL = E / RL
 * 闪亮条件: IL > IA ↔ RL < RA
 *
 * @param RL 线圈电阻 (Ω)
 * @param RA 灯泡电阻 (Ω)
 * @returns 是否闪亮以及电流倍率
 */
export function checkFlashCondition(
  RL: number,
  RA: number,
): { willFlash: boolean; ratio: number } {
  if (RL <= 0 || RA <= 0) return { willFlash: false, ratio: 1 }
  const ratio = RA / RL
  return {
    willFlash: ratio > 1.05, // 容忍 5% 阈值裕度
    ratio,
  }
}

/**
 * 自感反电动势绝对值
 * |EL| = L * |dI/dt|
 *
 * @param t 相对触发的时间 (s)
 * @param E 电动势 (V)
 * @param R 阻值 (Ω)
 * @param L 自感系数 (H)
 * @returns 感应电动势 (V)
 */
export function calcSelfInductanceEMF(
  t: number,
  E: number,
  R: number,
  L: number,
): number {
  if (t < 0 || R <= 0 || L <= 0) return 0
  const tau = L / R
  return E * Math.exp(-t / tau)
}

/**
 * 电磁阻尼摆动动力学 (小角阻尼振动)
 * 方程: theta(t) = theta0 * exp(-gamma * t) * cos(omega * t)
 *
 * @param t 当前时间 (s)
 * @param theta0 初始摆角 (rad)
 * @param B 磁感应强度 (T)
 * @param isSlotted 是否为开缝梳齿片 (true: 涡流被切断，阻尼极小; false: 整体金属片，强涡流强阻尼)
 * @param length 摆长 (m)
 * @returns 摆角 (rad) 与当前角速度 (rad/s)
 */
export function calcEddyDampingOscillation(
  t: number,
  theta0: number,
  B: number,
  isSlotted: boolean,
  length: number = 0.5,
): { theta: number; omega: number; energyRatio: number } {
  if (t < 0) return { theta: theta0, omega: 0, energyRatio: 1 }
  const g = 9.8
  const w0 = Math.sqrt(g / length)

  // 阻尼系数 gamma: 与 B^2 成正比，开缝梳齿片阻尼弱化 15 倍
  const baseDamping = 0.15 + (B * B) * (isSlotted ? 0.08 : 1.25)
  const gamma = Math.min(baseDamping, 4.0)

  // 衰减包络
  const envelope = Math.exp(-gamma * t)
  const dampedOmega = Math.sqrt(Math.max(0.1, w0 * w0 - gamma * gamma))

  const theta = theta0 * envelope * Math.cos(dampedOmega * t)
  const omega = -envelope * theta0 * (gamma * Math.cos(dampedOmega * t) + dampedOmega * Math.sin(dampedOmega * t))

  // 机械能比例 E(t) / E0
  const energyRatio = Math.max(0, envelope * envelope)

  return { theta, omega, energyRatio }
}
