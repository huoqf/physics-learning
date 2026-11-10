/**
 * LC / 弱阻尼 RLC 振荡电路 — 纯物理计算。
 *
 * 教材依据：人教版选择性必修第二册第 4 章「电磁振荡与电磁波」。
 *
 * ── 唯一符号约定 ─────────────────────────────────────────────────────────
 * q 为电容器上极板电荷量，逆时针放电为电流正方向（自上极板 A 流出经左回路电感回下极板 B），因此 **i = -dq/dt**。
 * 初始条件为 q(0) = Q₀、i(0) = 0。理想回路（R = 0）中：
 *   q(t) = Q₀ cos(ωt)
 *   i(t) = ωQ₀ sin(ωt)
 * 场景箭头、螺线管、图象与右屏都直接消费这里的 i，禁止渲染层再取反。
 *
 * ── 弱阻尼模型（`damped: true`）─────────────────────────────────────────
 * 高中只要求定性理解振幅衰减与能量耗散，但程序不能用破坏 i = -dq/dt
 * 的“理想解乘同一包络”来冒充真实状态。本模块采用欠阻尼串联 RLC 的闭式解：
 *   β = R/(2L)，ω_d = √(ω₀² − β²)
 *   q = Q₀e^(−βt)[cos(ω_dt) + (β/ω_d)sin(ω_dt)]
 *   i = (Q₀ω₀²/ω_d)e^(−βt)sin(ω_dt)
 * UI 只呈现高中要求的定性结论，不要求学生推导上述解析式。
 *
 * 理想 LC 的固有周期仍记为 T = 2π√(LC)；开启阻尼后不得再把 T/4、T/2
 * 等理想相位点标成“电荷为零 / 电流最大”。电磁能减少量等于回路内能增加量。
 *
 * @module physics/lcOscillation
 */

/** LC 回路参数 */
export interface LCParams {
  /** 电感 L (H) */
  L: number
  /** 电容 C (F) */
  C: number
  /** 初始电荷量 Q₀ (C)：t = 0 时电容器上的电荷 */
  Q0: number
  /**
   * 是否计入阻尼（定性）：默认 false = 无阻尼理想回路。
   *
   * 开启后 `lcChargeAt` / `lcCurrentAt` / `sampleLCWaveform` 返回的振幅
   * 统一按 `lcDampingAmplitude` 衰减，所有调用点无需（也不得）自行修正。
   */
  damped?: boolean
}

/**
 * LC 振荡演示默认参数（与 registry、quantities、组件全链路统一）。
 *
 * L = 0.4 H, C = 0.4 F, Q0 = 1 C => T = 2π√(LC) ≈ 2.51 s，单周期约 2.5 秒，兼顾观察平滑度与课堂节奏。
 */
export const LC_DEFAULT_PARAMS: Readonly<Required<Omit<LCParams, 'damped'>>> = {
  L: 0.4,
  C: 0.4,
  Q0: 1,
} as const

/** 弱阻尼演示的振幅时间常数：τ = 1.5T，保持既有演示节奏。 */
export const DAMPING_TAU_PERIODS = 1.5

/** LC 回路的固有量与阻尼参数（与时间无关） */
export interface LCConstants {
  /** 固有角频率 ω = 1/√(LC) (rad/s) */
  omega: number
  /** 振荡周期 T = 2π√(LC) (s)：阻尼不改变该定义（定性约定） */
  T: number
  /** 振荡频率 f = 1/T (Hz) */
  f: number
  /** 能量变化周期 T_E = T/2 (s)：一个振荡周期内电场能与磁场能各自完成两次完整转化 */
  energyPeriod: number
  /** 总能量 E总 = Q₀²/(2C) (J)：**t = 0 时**的总能量，有阻尼时随时间减少 */
  eTotal: number
  /** 理想电流峰值参考 I_ref = ω₀Q₀ (A)；阻尼模式仅作归一化参考 */
  iMax: number
  /** 阻尼系数 β = R/(2L) (s⁻¹)，理想模式为 0 */
  beta: number
  /** 弱阻尼角频率 ω_d = √(ω₀²−β²) (rad/s)，理想模式等于 ω₀ */
  omegaDamped: number
  /** 与当前弱阻尼演示等效的回路电阻 R (Ω)，理想模式为 0 */
  resistance: number
}

/** 采样点：某时刻的电荷与电流 */
export interface LCSample {
  t: number
  q: number
  i: number
}

/**
 * 计算 LC 回路的固有量。
 *
 * ω = 1/√(LC)，T = 2π√(LC) = 2π/ω，E总 = Q₀²/(2C)。
 *
 * @param params LC 回路参数
 * @returns 固有角频率、周期、频率、总能量、电流峰值
 * @throws 当 L ≤ 0 或 C ≤ 0 时（无物理意义），抛出 Error
 */
export function calculateLCConstants(params: LCParams): LCConstants {
  const { L, C, Q0 } = params
  if (!(L > 0)) throw new Error(`calculateLCConstants: 电感 L 必须为正数，收到 ${L}`)
  if (!(C > 0)) throw new Error(`calculateLCConstants: 电容 C 必须为正数，收到 ${C}`)

  const omega = 1 / Math.sqrt(L * C)
  const T = (2 * Math.PI) / omega
  const beta = params.damped ? 1 / (DAMPING_TAU_PERIODS * T) : 0
  const omegaDamped = Math.sqrt(Math.max(0, omega * omega - beta * beta))
  return {
    omega,
    T,
    f: calculateLCFrequency(L, C),
    energyPeriod: T / 2,
    eTotal: (Q0 * Q0) / (2 * C),
    iMax: omega * Math.abs(Q0),
    beta,
    omegaDamped,
    resistance: 2 * L * beta,
  }
}

/**
 * 物理计算层浮点近零截断（规避三角函数与除法的浮点残差，兼容微库仑/微法级别真实工况）。
 */
export const LC_PHYSICS_EPSILON = 1e-12

/**
 * 能量二次项物理计算截断阈值 (J)。
 */
export const LC_ENERGY_EPSILON = 1e-14

/**
 * 能量显示格式化微小残差截断阈值（高中物理测量精度基准 0.00 J）。
 */
export const LC_DISPLAY_ENERGY_EPSILON = 1e-4

/**
 * 波形图固定横向时间窗 (s)。
 *
 * ⚠️ **必须是与参数无关的常量，禁止改回 `2T`。**
 * 历史上横轴取 `[0, 2T]`，于是无论 L、C 怎么调，曲线永远只画两个周期、
 * 永远铺满整块画布 —— "改变 L 后周期变长"这个本页最核心的结论在图上**恒等于零变化**。
 * 锁定窗口后，同样 6 s 内画出的周期数随 L、C 变化，周期差异直接可读。
 *
 * 取 6 s 的理由：默认参数 T ≈ 2.51 s，两个周期 ≈ 5.03 s 恰好铺满窗口，
 * 改动前后默认画面的观感一致（不会突然出现半屏空白）；
 * 周期更长时窗口顺时间滚动（只显示最近 6 s），周期更短时窗口内周期数增多。
 * 超出窗口由消费方滚动 `xDomain`，而不是放大窗口。
 */
export const LC_CURVE_TIME_WINDOW = 6

/**
 * 波形图固定纵向半量程 (C)。
 *
 * ⚠️ **必须是与参数无关的常量，禁止改回"除以当前 Q₀"。**
 * 历史上纵轴画 `q / Q₀`，于是 Q₀ 从 0.1 C 拉到 5 C 曲线形状一字不变（振幅恒为满幅），
 * 学生看不出 Q₀ 只改振幅、不改周期 —— 这正是"归一化抹掉参数效果"的典型错误。
 *
 * 取 Q₀ 滑块上限 5 C 再留 10% 余量：Q₀ 的调整直接表现为曲线上下的涨落。
 */
export const LC_CURVE_CHARGE_SPAN = 5.5

/**
 * 电容器电荷量。理想模式为 Q₀cos(ωt)；弱阻尼模式使用满足
 * q(0)=Q₀、i(0)=0 的欠阻尼解析解。
 */
export function lcChargeAt(params: LCParams, t: number): number {
  const { omega, beta, omegaDamped } = calculateLCConstants(params)
  const raw = params.damped && omegaDamped > 0
    ? params.Q0 * Math.exp(-beta * t) * (
        Math.cos(omegaDamped * t) + (beta / omegaDamped) * Math.sin(omegaDamped * t)
      )
    : params.Q0 * Math.cos(omega * t)
  return Math.abs(raw) < LC_PHYSICS_EPSILON ? 0 : raw
}

/**
 * 回路电流，统一取逆时针放电为正方向：i = -dq/dt。
 * 理想模式为 ωQ₀sin(ωt)，弱阻尼模式与 lcChargeAt 严格互为导数。
 */
export function lcCurrentAt(params: LCParams, t: number): number {
  const { omega, beta, omegaDamped } = calculateLCConstants(params)
  const raw = params.damped && omegaDamped > 0
    ? (params.Q0 * omega * omega / omegaDamped) * Math.exp(-beta * t) * Math.sin(omegaDamped * t)
    : omega * params.Q0 * Math.sin(omega * t)
  return Math.abs(raw) < LC_PHYSICS_EPSILON ? 0 : raw
}

/**
 * 电容器两极板间瞬时电压 u_C(t) = q(t) / C (V)。
 * 规定上极板 A 电势高于下极板 B 时为正。
 */
export function lcVoltageAt(params: LCParams, t: number): number {
  const q = lcChargeAt(params, t)
  const raw = q / params.C
  return Math.abs(raw) < LC_PHYSICS_EPSILON ? 0 : raw
}

/**
 * 回路电流瞬时变化率 di/dt (A/s)。
 *
 * 严格满足串联 RLC 回路方程 L·(di/dt) + i·R = q/C（理想模式 R = 0，故 di/dt = q/(LC) = ω²q）。
 * 与 `lcCurrentAt` 严格互为导数，直接呈现“电流为零时变化率最大、电流最大时变化率为零”的高考核心结论。
 */
export function lcCurrentRateAt(params: LCParams, t: number): number {
  const { omega, beta, omegaDamped } = calculateLCConstants(params)
  const raw = params.damped && omegaDamped > 0
    ? (params.Q0 * omega * omega / omegaDamped) * Math.exp(-beta * t) * (
        omegaDamped * Math.cos(omegaDamped * t) - beta * Math.sin(omegaDamped * t)
      )
    : omega * omega * params.Q0 * Math.cos(omega * t)
  return Math.abs(raw) < LC_PHYSICS_EPSILON ? 0 : raw
}

/**
 * 电感线圈瞬时自感电动势大小 |e_L(t)| = L · |di/dt| (V)。
 * 理想 LC 回路中任意时刻 |e_L| = |u_C|。
 */
export function lcInductorEmfMagnitudeAt(params: LCParams, t: number): number {
  const rate = lcCurrentRateAt(params, t)
  const raw = params.L * Math.abs(rate)
  return raw < LC_PHYSICS_EPSILON ? 0 : raw
}

/**
 * 判定当前时刻 LC 回路所处的充/放电阶段（基于 d(q²)/dt = -2qi 的严格物理判据，理想与阻尼均适用）。
 */
export function lcOscillationStage(
  params: LCParams,
  t: number,
): { stage: string; energyFlow: string } {
  const q = lcChargeAt(params, t)
  const i = lcCurrentAt(params, t)
  const { iMax } = calculateLCConstants(params)
  const qThresh = Math.max(LC_PHYSICS_EPSILON, Math.abs(params.Q0) * 1e-3)
  const iThresh = Math.max(LC_PHYSICS_EPSILON, iMax * 1e-3)

  if (Math.abs(i) < iThresh) {
    return {
      stage: q >= 0 ? '正向电荷峰值 (i=0)' : '反向电荷峰值 (i=0)',
      energyFlow: params.damped ? '磁场能归零·变化率极值' : '全为电场能 (Em=0)',
    }
  }
  if (Math.abs(q) < qThresh) {
    return {
      stage: i > 0 ? '逆时针电流峰值 (q=0)' : '顺时针电流峰值 (q=0)',
      energyFlow: params.damped ? '电场能归零·|di/dt|极小' : '全为磁场能 (Ee=0)',
    }
  }
  // d(q²)/dt = -2qi：q 与 i 同号时 |q| 减小 -> 放电；异号时 |q| 增大 -> 充电
  if (q * i > 0) {
    return {
      stage: q > 0 ? '正向放电 (q↓, i↑)' : '反向放电 (|q|↓, |i|↑)',
      energyFlow: '电场能 → 磁场能',
    }
  }
  return {
    stage: q < 0 ? '反向充电 (|q|↑, i↓)' : '正向充电 (q↑, |i|↓)',
    energyFlow: '磁场能 → 电场能',
  }
}

/**
 * 电容器中的电场能 Ee = q²/(2C)。
 *
 * @param q 电荷量 (C)
 * @param C 电容 (F)
 */
export function lcElectricEnergy(q: number, C: number): number {
  if (Math.abs(q) < LC_PHYSICS_EPSILON) return 0
  const ee = (q * q) / (2 * C)
  return ee < LC_ENERGY_EPSILON ? 0 : ee
}

/**
 * 线圈中的磁场能 Em = ½Li²。
 *
 * @param i 电流 (A)
 * @param L 电感 (H)
 */
export function lcMagneticEnergy(i: number, L: number): number {
  if (Math.abs(i) < LC_PHYSICS_EPSILON) return 0
  const em = 0.5 * L * i * i
  return em < LC_ENERGY_EPSILON ? 0 : em
}

/**
 * 在 [0, cycles·T] 上均匀采样 q(t) 与 i(t)，用于绘制振荡曲线。
 *
 * 返回的数组长度固定为 `sampleCount + 1`（含首尾），便于直接作为
 * RelationChart / TimeSeriesChart 的完整曲线数据。
 *
 * 每个采样点都直接调用 `lcChargeAt` / `lcCurrentAt`，因此曲线、
 * 场景与右屏瞬时值始终一致。
 *
 * @param params LC 回路参数（含可选的 damped 开关）
 * @param sampleCount 采样区间数（> 0）
 * @param cycles 采样覆盖的周期数（默认 1）
 */
export function sampleLCWaveform(
  params: LCParams,
  sampleCount: number,
  cycles = 1,
): LCSample[] {
  const { T } = calculateLCConstants(params)
  const tEnd = cycles * T
  return sampleLCWaveformRange(params, 0, tEnd, sampleCount)
}

/**
 * 在指定时间区间 [tStart, tEnd] 上均匀采样 q(t) 与 i(t)。
 *
 * 用于固定时间窗波形展示：确保在 L、C 极大时（周期很长），当前可见时间窗内
 * 依然保持完整采样密度，避免“整段定点数采样”在局部窗口只剩寥寥数点。
 *
 * @param params LC 回路参数（含可选的 damped 开关）
 * @param tStart 起始时刻 (s)
 * @param tEnd 结束时刻 (s)
 * @param sampleCount 采样区间数（> 0）
 */
export function sampleLCWaveformRange(
  params: LCParams,
  tStart: number,
  tEnd: number,
  sampleCount: number,
): LCSample[] {
  const safeStart = Math.max(0, tStart)
  if (!(tEnd > safeStart)) {
    return [
      {
        t: safeStart,
        q: lcChargeAt(params, safeStart),
        i: lcCurrentAt(params, safeStart),
      },
    ]
  }
  const n = Math.max(1, Math.floor(sampleCount))
  const span = tEnd - safeStart
  const out: LCSample[] = []
  for (let k = 0; k <= n; k++) {
    const t = safeStart + (span * k) / n
    out.push({
      t,
      q: lcChargeAt(params, t),
      i: lcCurrentAt(params, t),
    })
  }
  return out
}

/**
 * 弱阻尼振幅参考包络 e^(−t/τ)，仅用于图象叠加。
 *
 * 它不是独立的物理状态入口：q、i 必须由 `lcChargeAt/lcCurrentAt`
 * 的欠阻尼解析解计算，禁止再把本包络直接乘到理想正弦解上。
 */
export function lcDampingAmplitude(t: number, period: number): number {
  const tau = DAMPING_TAU_PERIODS * period
  if (!(tau > 0)) return 1
  return Math.exp(-Math.max(0, t) / tau)
}

/**
 * 格式化 LC 回路能量数值（全项目唯一入口）。
 *
 * 规避极小残差下的科学记数法泄漏与多组件格式不一致：
 * - 绝对值 < 1e-4 J 时严格归为 "0.00"（高中物理测量精度基准）
 * - ≥ 100 J 保留 1 位小数
 * - ≥ 1 J 保留 2 位小数
 * - < 1 J 统一保留 3 位小数（如 0.500 J、0.042 J）
 *
 * @param val 能量值 (J)
 */
export function formatLCEnergy(val: number): string {
  if (Math.abs(val) < LC_DISPLAY_ENERGY_EPSILON) return '0.00'
  if (val >= 100) return val.toFixed(1)
  if (val >= 1) return val.toFixed(2)
  return val.toFixed(3)
}

/**
 * 平行板电容器间距变化对电容的物理影响（高中物理教材公式 C ∝ εrS/d）。
 *
 * @param baseC 初始基准电容 (F)
 * @param dRatio 相对间距因子（基准为 1.0，增大表示极板拉开，减小表示极板靠近）
 * @returns 实际有效电容 (F)
 */
export function calculateCapacitanceWithGap(baseC: number, dRatio: number): number {
  const safeDRatio = Math.max(0.1, dRatio)
  return baseC / safeDRatio
}

/**
 * 无线电接收回路固有频率 f = 1 / (2π√(LC))。
 *
 * @param L 回路电感 (H)
 * @param C 回路电容 (F)
 * @returns 固有频率 (Hz)
 */
export function calculateLCFrequency(L: number, C: number): number {
  if (!(L > 0) || !(C > 0)) return 0
  return 1 / (2 * Math.PI * Math.sqrt(L * C))
}

/**
 * 调谐电谐振判定阈值常量（归一化响应度 ≥ 0.85 判定为达成电谐振/选台成功）。
 * 保证中屏场景指示、共振曲线与右屏物理量看板判定口径 100% 统一（单一可信源 SSOT）。
 */
export const RADIO_TUNING_THRESHOLD = 0.85

/**
 * 默认调谐品质因数 Q。
 *
 * 全项目**唯一**的调谐 Q 默认值：`calculateRadioResonance` / `calculateRadioTuning`
 * 及其全部消费点（场景、右屏物理量、共振曲线）都不得再自行写 14 或 16，
 * 否则会出现"同一次调谐两套尖锐度"的双真源不一致。
 */
export const DEFAULT_RADIO_TUNING_Q = 14

/**
 * 无线电接收回路电谐振响应计算（归一化共振曲线）。
 *
 * 当接收回路固有频率 f0 接近电台发射频率 fTx 时发生电谐振，
 * 回路感应电流大幅度增加（调谐选台）。
 *
 * @param fTx 发射信号频率 (Hz)
 * @param fRx 接收回路固有频率 (Hz)
 * @param Q 回路品质因数（默认 `DEFAULT_RADIO_TUNING_Q`，决定共振曲线尖锐程度/选择性）
 * @returns 响应幅度 (0~1] 及是否达到谐振阈值
 */
export function calculateRadioResonance(
  fTx: number,
  fRx: number,
  Q: number = DEFAULT_RADIO_TUNING_Q,
): { response: number; isTuned: boolean } {
  if (!(fTx > 0) || !(fRx > 0)) {
    return { response: 0, isTuned: false }
  }
  const ratio = fRx / fTx
  const detuning = ratio - 1 / ratio
  const response = 1 / Math.sqrt(1 + Q * Q * detuning * detuning)
  const isTuned = response >= RADIO_TUNING_THRESHOLD

  return { response, isTuned }
}

export interface RadioTuningResult {
  fTx: number
  fRx: number
  response: number
  isTuned: boolean
}

/**
 * 无线电接收回路调谐与电谐振计算（单一可信源 SSOT）。
 *
 * @param fTx 发射电台载波频率 (Hz)
 * @param cRx 可变调谐电容相对因子（基准调谐点为 1.0）
 * @param Q 回路品质因数（默认 `DEFAULT_RADIO_TUNING_Q`）
 * @returns 调谐结果，包含发射频率、固有频率、归一化响应度及是否谐振
 */
export function calculateRadioTuning(
  fTx: number,
  cRx: number,
  Q: number = DEFAULT_RADIO_TUNING_Q,
): RadioTuningResult {
  const safeC = Math.max(0.1, cRx)
  // f₀ ∝ 1 / √C，cRx = 1.0 时 fRx = fTx
  const fRx = fTx / Math.sqrt(safeC)
  const { response, isTuned } = calculateRadioResonance(fTx, fRx, Q)
  return { fTx, fRx, response, isTuned }
}
