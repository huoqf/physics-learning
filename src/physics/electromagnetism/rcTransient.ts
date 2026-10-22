/**
 * RC 充放电暂态过程 — 纯函数模型（无 React / DOM 依赖）。
 *
 * 教学要点（人教版选修 3-1「电容器的电容」延伸）：
 *   - 充电：u_C = E(1 − e^(−t/τ))，i = (E/R)e^(−t/τ)，τ = RC
 *   - 放电：u_C = E·e^(−t/τ)，i 反向，大小同样按 e^(−t/τ) 衰减
 *   - i–t 图线下的面积 = ∫i dt = ΔQ = C·u_C —— 这是「面积即电量」的图像意义
 *
 * 时间常数 τ 只由 R、C 决定，与电源电动势无关；改变 E 只改变曲线高度，不改变形状。
 */

export type RCPhase = 'charge' | 'discharge'

/**
 * 观察窗口长度（以 τ 为单位）：t = 5τ 时 u_C 已达 99.3%，
 * 再往后画不出教学信息，只会把前 3τ 的关键段挤扁。
 */
export const RC_WINDOW_TAUS = 5

/**
 * 由左屏参数求时间常数 τ。
 *
 * 左屏给的是 R(kΩ) 与 C(μF)：1 kΩ × 1 μF = 10³ Ω × 10⁻⁶ F = 10⁻³ s = 1 ms。
 * 注册表（maxTime / criticalTimes）、图表窗口、场景数据卡都从这里取 τ，
 * 不允许各自再写一遍 R*C —— 那正是「双真源」的入口。
 */
export function rcTauFromParams(params: Record<string, number>): number {
  const rKOhm = params.R_t ?? 10
  const cMicroF = params.C_t ?? 200
  return Math.max(rKOhm * cMicroF * 1e-3, 1e-6)
}

/** 观察窗口时长 (s) = RC_WINDOW_TAUS · τ */
export function rcWindowFromParams(params: Record<string, number>): number {
  return RC_WINDOW_TAUS * rcTauFromParams(params)
}

export interface RCTransientState {
  /** 时间常数 τ = RC (s) */
  tau: number
  /** 电容器两端电压 u_C (V) */
  uC: number
  /** 回路电流 (A)：充电为正，放电为负（表示方向相反） */
  i: number
  /** 电容器所带电荷量 q = C·u_C (C) */
  q: number
  /** 已完成比例 u_C / E，0~1 */
  progress: number
  /** i–t 曲线下从 0 到 t 的面积 ∫|i|dt = ΔQ (C) */
  areaCharge: number
  /** 电容储能 E_C = ½Cu² (J) */
  storedEnergy: number
  /** 电阻瞬时热功率 i²R (W) */
  heatPower: number
}

/**
 * 计算某一时刻的 RC 暂态状态。
 *
 * @param emf 电源电动势 (V)；放电时作为初始电压 u_C(0) = emf
 * @param R 回路电阻 (Ω)
 * @param C 电容 (F)
 * @param t 从开关闭合（或断开）开始计时 (s)
 * @param phase 'charge' 充电 / 'discharge' 放电
 */
export function computeRCTransient(
  emf: number,
  R: number,
  C: number,
  t: number,
  phase: RCPhase,
): RCTransientState {
  const tau = Math.max(R * C, 1e-12)
  const tt = Math.max(0, t)
  const decay = Math.exp(-tt / tau)

  const uC = phase === 'charge' ? emf * (1 - decay) : emf * decay
  const i = phase === 'charge' ? (emf / R) * decay : -(emf / R) * decay

  return {
    tau,
    uC,
    i,
    q: C * uC,
    progress: emf > 0 ? uC / emf : 0,
    // 两条曲线共用同一个面积公式：∫|i|dt = C·E·(1 − e^(−t/τ)) = |ΔQ|
    areaCharge: C * emf * (1 - decay),
    storedEnergy: 0.5 * C * uC * uC,
    heatPower: i * i * R,
  }
}

/**
 * 采样 RC 暂态曲线，供图表绘制。
 *
 * @param windowSec 采样总时长 (s)
 * @param samples 采样段数
 * @returns 每个采样点的 { t, uC, i, q }
 */
export function sampleRCTransient(
  emf: number,
  R: number,
  C: number,
  phase: RCPhase,
  windowSec: number,
  samples = 160,
): Array<{ t: number; uC: number; i: number; q: number }> {
  const pts: Array<{ t: number; uC: number; i: number; q: number }> = []
  for (let k = 0; k <= samples; k++) {
    const t = (windowSec * k) / samples
    const s = computeRCTransient(emf, R, C, t, phase)
    pts.push({ t, uC: s.uC, i: s.i, q: s.q })
  }
  return pts
}
