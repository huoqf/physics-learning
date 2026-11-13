import { GRAVITY } from '../constants'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

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
  const g = GRAVITY
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

export interface SelfInductionCriticalParams {
  mode?: number
  L?: number
  RL?: number
  RA?: number
  B?: number
  isSlotted?: number
  switchState?: number
}

/**
 * 计算自感与涡流电磁阻尼页面关键时刻（SSOT）
 * - 模式0（通电自感）：时间常数 τ 与 3τ（接近稳态）
 * - 模式1（断电自感）：时间常数 τ（闪亮/衰减特征时间）与 3τ（基本熄灭）
 * - 模式2（电磁阻尼摆动）：首次过最低点与首次摆回另一侧极值
 */
export function getSelfInductionCriticalTimes(
  params: SelfInductionCriticalParams = {},
  maxTime = 6,
): CriticalTimePoint[] {
  const mode = params.mode ?? 0
  const L = params.L ?? 2.0
  const RL = params.RL ?? 2.0
  const RA = params.RA ?? 6.0
  const B = params.B ?? 1.5
  const isSlotted = (params.isSlotted ?? 0) === 1
  const switchClosed = (params.switchState ?? 1) === 1
  const events: CriticalTimePoint[] = []

  if (mode === 0) {
    if (!switchClosed) return []
    const rBranch = RL + RA
    const tau = rBranch > 0 ? L / rBranch : 0
    if (tau > 0) {
      const t1 = alignCriticalTime(tau, 'nearest')
      if (t1 > 0 && t1 <= maxTime) {
        events.push({ time: t1, label: 't = τ (达稳态63.2%)', variant: 'info', autoPause: false })
      }
      const t3 = alignCriticalTime(3 * tau, 'nearest')
      if (t3 > t1 + 0.05 && t3 <= maxTime) {
        events.push({ time: t3, label: 't = 3τ (接近稳态)', variant: 'warning', autoPause: false })
      }
    }
    return events
  }

  if (mode === 1) {
    const rTotal = RL + RA
    const tau = rTotal > 0 ? L / rTotal : 0
    const { willFlash } = checkFlashCondition(RL, RA)
    if (tau > 0) {
      const t1 = alignCriticalTime(tau, 'nearest')
      if (t1 > 0 && t1 <= maxTime) {
        events.push({
          time: t1,
          label: willFlash ? '闪亮后衰减 τ (降至37%)' : 't = τ (衰减至37%)',
          variant: 'warning',
          autoPause: false,
        })
      }
      const t3 = alignCriticalTime(3 * tau, 'nearest')
      if (t3 > t1 + 0.05 && t3 <= maxTime) {
        events.push({ time: t3, label: 't = 3τ (基本熄灭)', variant: 'info', autoPause: false })
      }
    }
    return events
  }

  // 模式2：电磁阻尼摆动 (length = 0.5m, gamma 规则同 calcEddyDampingOscillation)
  const w0 = Math.sqrt(GRAVITY / 0.5)
  const baseDamping = 0.15 + B * B * (isSlotted ? 0.08 : 1.25)
  const gamma = Math.min(baseDamping, 4.0)
  const dampedOmega = Math.sqrt(Math.max(0.1, w0 * w0 - gamma * gamma))

  const tZero = alignCriticalTime(Math.PI / (2 * dampedOmega), 'nearest')
  if (tZero > 0 && tZero <= maxTime) {
    events.push({ time: tZero, label: '首次过平衡位置 (最强涡流)', variant: 'info', autoPause: false })
  }
  const tHalf = alignCriticalTime(Math.PI / dampedOmega, 'nearest')
  if (tHalf > tZero + 0.05 && tHalf <= maxTime) {
    events.push({ time: tHalf, label: '到达对侧最高点', variant: 'warning', autoPause: false })
  }
  return events
}
