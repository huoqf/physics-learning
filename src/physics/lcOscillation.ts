/**
 * LC 振荡电路（无阻尼理想回路）— 纯物理计算
 *
 * 教材依据：人教版选择性必修第二册 第4章「电磁振荡与电磁波」。
 *
 * ── 符号约定（重要，勿改）────────────────────────────────────────────────
 * 本模块取 **i(t) = dq/dt**，其中 q(t) 为电容器上极板（带正电侧）的电荷量。
 * 由此：
 *   q(t) = Q₀·cos(ωt)
 *   i(t) = dq/dt = −ωQ₀·sin(ωt)
 * 即「电荷最大时电流为零，电荷为零时电流最大」。
 *
 * ⚠️ 真实回路中「沿导线流动的电流」方向与上述符号存在约定差异（取决于电流
 * 正方向的取法）。教学动画只需保证 q 与 i 保持 90° 相位差、且极值时刻互补，
 * 因此本模块统一采用 i = dq/dt，避免出现「同一物理量两种符号」的分叉。
 *
 * ── 理想化条件（默认，`damped` 未开启）────────────────────────────────────
 * 无阻尼（回路电阻 R = 0），故为等幅振荡，总能量
 *   E总 = Ee + Em = Q₀²/(2C) = ½LI₀²  为常数。
 *
 * ── 阻尼的定性约定（`damped: true`）──────────────────────────────────────
 * 实际回路存在电阻 R，能量逐渐损耗为内能，形成振幅不断减小的阻尼振荡。
 * 高中只要求**定性**判断"振幅逐次减小"，不要求求解二阶 RLC 微分方程
 * （那需要二阶常系数线性微分方程，超出高中要求），因此本模块不作定量建模，
 * 只把**振幅**按指数包络衰减：
 *   q(t) = Q₀·cos(ωt)·e^(−t/τ)
 *   i(t) = −ωQ₀·sin(ωt)·e^(−t/τ)
 * 由此 Ee + Em = (Q₀²/2C)·e^(−2t/τ) —— 总能量单调减少（能量 ∝ 振幅²，
 * 比振幅衰减得更快）。τ 的定义唯一收口在 `lcDampingAmplitude`，
 * 周期仍取理想值 T = 2π√(LC)。
 *
 * ⚠️ 开启阻尼后 q 与 i 都是"理想解析解乘以同一个振幅包络"，
 * 因此严格关系 i = dq/dt **不再成立**（真实 RLC 的解在 i 上还含 (1/τ) 的
 * 修正项）。这里刻意保留"q 与 i 相位差 90°、电荷最大时电流为零"这一
 * **高考核心判据**，画法与教材阻尼振荡图象一致；
 * 但禁止据此推导 i 与 q 的导数关系（可参见测试中对应的边界断言）。
 *
 * ── 单一真源约定（重要，勿改）─────────────────────────────────────────────
 * "阻尼如何作用"只有一处定义：`lcDampingAmplitude`。
 * 画布、归一化波形、能量柱状图、右屏物理量都必须通过本模块的函数取值，
 * **禁止任何消费点自行写 `Math.exp(-t / tau)`**，否则会出现
 * "曲线画了衰减、数值却仍是理想值"的双真源不一致。
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

/** LC 回路的固有量（与时间无关，**不受 `damped` 影响**） */
export interface LCConstants {
  /** 固有角频率 ω = 1/√(LC) (rad/s) */
  omega: number
  /** 振荡周期 T = 2π√(LC) (s)：阻尼不改变该定义（定性约定） */
  T: number
  /** 振荡频率 f = 1/T (Hz) */
  f: number
  /** 总能量 E总 = Q₀²/(2C) (J)：**t = 0 时**的总能量，有阻尼时随时间减少 */
  eTotal: number
  /** 电流峰值 I₀ = ωQ₀ (A)：**理想**峰值，有阻尼时实际峰值乘以振幅系数 */
  iMax: number
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
  return {
    omega,
    T,
    f: 1 / T,
    eTotal: (Q0 * Q0) / (2 * C),
    iMax: omega * Math.abs(Q0),
  }
}

/**
 * 电容器电荷量 q(t) = Q₀·cos(ωt)。
 *
 * `params.damped` 为真时再乘上阻尼振幅系数（见模块头「阻尼的定性约定」）：
 * q(t) = Q₀·cos(ωt)·e^(−t/τ)。
 *
 * @param params LC 回路参数（含可选的 damped 开关）
 * @param t 时刻 (s)
 */
export function lcChargeAt(params: LCParams, t: number): number {
  const { omega, T } = calculateLCConstants(params)
  const amp = params.damped ? lcDampingAmplitude(t, T) : 1
  const raw = params.Q0 * Math.cos(omega * t) * amp
  return Math.abs(raw) < 1e-12 ? 0 : raw
}

/**
 * 回路电流 i(t) = −ωQ₀·sin(ωt)。
 *
 * 符号约定见模块头注释（理想情况下 i = dq/dt）。
 * `params.damped` 为真时同样乘以阻尼振幅系数。
 *
 * @param params LC 回路参数（含可选的 damped 开关）
 * @param t 时刻 (s)
 */
export function lcCurrentAt(params: LCParams, t: number): number {
  const { omega, T } = calculateLCConstants(params)
  const amp = params.damped ? lcDampingAmplitude(t, T) : 1
  const raw = -omega * params.Q0 * Math.sin(omega * t) * amp
  return Math.abs(raw) < 1e-12 ? 0 : raw
}

/**
 * 电容器中的电场能 Ee = q²/(2C)。
 *
 * @param q 电荷量 (C)
 * @param C 电容 (F)
 */
export function lcElectricEnergy(q: number, C: number): number {
  if (Math.abs(q) < 1e-12) return 0
  const ee = (q * q) / (2 * C)
  return ee < 1e-14 ? 0 : ee
}

/**
 * 线圈中的磁场能 Em = ½Li²。
 *
 * @param i 电流 (A)
 * @param L 电感 (H)
 */
export function lcMagneticEnergy(i: number, L: number): number {
  if (Math.abs(i) < 1e-12) return 0
  const em = 0.5 * L * i * i
  return em < 1e-14 ? 0 : em
}

/**
 * 在 [0, cycles·T] 上均匀采样 q(t) 与 i(t)，用于绘制振荡曲线。
 *
 * 返回的数组长度固定为 `sampleCount + 1`（含首尾），便于直接作为
 * RelationChart / TimeSeriesChart 的完整曲线数据。
 *
 * 与 `lcChargeAt` / `lcCurrentAt` 完全同源：`params.damped` 为真时
 * 逐点乘上同一个 `lcDampingAmplitude`，因此**曲线与被采样的瞬时值
 * 永远一致**（消除"曲线衰减、读数不衰减"的双真源）。
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
  const n = Math.max(1, Math.floor(sampleCount))
  const tEnd = cycles * T
  const out: LCSample[] = []
  for (let k = 0; k <= n; k++) {
    const t = (tEnd * k) / n
    out.push({
      t,
      q: lcChargeAt(params, t),
      i: lcCurrentAt(params, t),
    })
  }
  return out
}

/**
 * 阻尼振荡的定性时间常数，以周期为单位：τ = 1.5T。
 *
 * 取 1.5 个周期是为了在 2 个周期的演示窗口内肉眼可见衰减
 * （t = 2T 时振幅约为初始值的 26%，总能量约为 7%）。
 */
export const DAMPING_TAU_PERIODS = 1.5

/**
 * 阻尼振幅系数（**全链路唯一入口**）。
 *
 * ⚠️ 这是整个项目里唯一一处"阻尼如何作用"的定义：
 * 画布、归一化波形、能量柱状图、右屏物理量都只能经由
 * `lcChargeAt` / `lcCurrentAt` / `sampleLCWaveform`（它们内部调用本函数）
 * 取值，**禁止任何消费点自行写 `Math.exp(-t / tau)`**——
 * 否则会出现"曲线画了衰减、读数却仍是理想值"的双真源不一致。
 *
 * 作用方式：把 e^(−t/τ) 乘在理想解析解的**振幅**上，
 *   q(t) = Q₀·cos(ωt)·e^(−t/τ)
 *   i(t) = −ωQ₀·sin(ωt)·e^(−t/τ)
 * 这是高中要求的"定性"处理（真实 RLC 欠阻尼解的幅值与相位还含 R 的修正项，
 * 不作要求），因此**不求解二阶 RLC 微分方程**。
 *
 * 由此得到的推论与定性结论一致：
 *   Ee + Em = (Q₀²/2C)·e^(−2t/τ) —— 总能量单调减少，即转化为内能。
 *
 * @param t 时刻 (s)，负值夹紧到 0（不回弹放大）
 * @param period 回路固有周期 T (s)，需 > 0；不合法时返回 1（退化为理想振荡）
 * @returns 振幅系数，取值 (0, 1]
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
  if (Math.abs(val) < 1e-4) return '0.00'
  if (val >= 100) return val.toFixed(1)
  if (val >= 1) return val.toFixed(2)
  return val.toFixed(3)
}

