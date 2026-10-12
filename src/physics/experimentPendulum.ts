/**
 * 高考物理实验：用单摆测重力加速度 —— 纯物理计算模型。
 *
 * 核心考点与物理量关系：
 * 1. 摆长测量：必须算至球心，L = l + d/2（l 为摆线长，米尺测定；d 为小球直径，游标卡尺测定）；
 * 2. 周期测量：累积计时法，从小球经过平衡位置开始计时，记录完成 N 次全振动（30~50次）的总时间 t，T = t / N；
 * 3. 重力加速度计算：由 T = 2π√(L/g) 得 g = 4π²L / T²；
 * 4. 图像法与系统误差分析：
 *    - T²-L 图像理论斜率 k_理 = 4π²/g_真；实测斜率 k_测 = T_测²/L => g_测 = 4π²/k_测；
 *    - 若误将线长 l 当作摆长（未计球半径 r=d/2），T² = (4π²/g)l + (4π²r/g)，图线在纵轴有正截距，但斜率仍为 4π²/g，求得的 g 依然准确；
 *    - 小角近似条件：θ₀ ≤ 5°，单摆二阶理论修正为 T_real ≈ T₀(1 + θ₀²/16)，偏差 < 0.05%。
 */

/** 高考单摆实验默认参数 */
export const PENDULUM_EXP_DEFAULTS = {
  l_line: 0.985, // 摆线长 (m)，米尺测量
  d_mm: 20.0, // 摆球直径 (mm)，游标卡尺测量
  n_cycles: 40, // 全振动次数 N (次)
  g_true: 9.800, // 真实环境重力加速度 (m/s²)，隐藏真值基准
  timing_err: 0, // 人工停表反应/操作误差 (s)
  theta0: 4, // 初始摆角 (度，高考实验要求 θ ≤ 5°)
} as const

/** 单摆动画全局默认参数单一真源 (SSOT) */
export const SIMPLE_PENDULUM_DEFAULT_PARAMS = {
  L: 1.5,
  g: 9.8,
  theta0: 8,
  phiDeg: 0,
  mode: 0,
  showGraph: 1,
  showHelper: 1,
  // 高考实验参数
  l_line: PENDULUM_EXP_DEFAULTS.l_line,
  d_mm: PENDULUM_EXP_DEFAULTS.d_mm,
  n_cycles: PENDULUM_EXP_DEFAULTS.n_cycles,
  timing_err: PENDULUM_EXP_DEFAULTS.timing_err,
  theta0_exp: PENDULUM_EXP_DEFAULTS.theta0,
} as const

export interface PendulumExperimentInput {
  /** 摆线长 l (m)，米尺测定，有效区间 [0.500, 1.500] */
  l_line?: number
  /** 摆球直径 d (mm)，游标卡尺测定，有效区间 [10.0, 30.0] */
  d_mm?: number
  /** 累积全振动次数 N (次)，有效区间 [20, 60] */
  n_cycles?: number
  /** 当地真实重力加速度真值 (m/s²)，默认 9.800 */
  g_true?: number
  /** 计时操作误差 Δt (s)，反应时间或停表读数偏差 */
  timing_err?: number
  /** 最大摆角 θ₀ (度)，实验标准建议 ≤ 5° */
  theta0?: number
}

export interface PendulumExperimentPoint {
  /** 摆长 L (m) */
  L: number
  /** 理论周期平方 T² (s²) */
  T2_theory: number
  /** 测得周期平方 T² (s²) */
  T2_measured: number
}

export interface PendulumExperimentResult {
  /** 摆线长 l (m) */
  l_line: number
  /** 摆球直径 d (m) */
  d_m: number
  /** 摆球直径 d (mm) */
  d_mm: number
  /** 摆球半径 r (m) */
  r_m: number
  /** 有效摆长 L = l + d/2 (m) */
  effectiveLength: number
  /** 真实重力加速度真值 g_true (m/s²) */
  trueG: number
  /** 初始摆角 θ₀ (度) */
  theta0: number
  /** 小角近似理论偏差 (%) */
  smallAngleErrorPercent: number
  /** 理论单摆周期 T_theory = 2π√(L/g) (s) */
  theoreticalPeriod: number
  /** 理论 N 次累计时间 (s) */
  idealTotalTime: number
  /** 实测 N 次累计时间 t = N*T + timing_err (s) */
  measuredTotalTime: number
  /** 累积全振动次数 N */
  n_cycles: number
  /** 实测单次周期 T_meas = t / N (s) */
  measuredPeriod: number
  /** 实测重力加速度 g_meas = 4π²L / T_meas² (m/s²) */
  measuredG: number
  /** 绝对误差 Δg = g_meas - g_true (m/s²) */
  errorDeltaG: number
  /** 相对误差百分比 η = (g_meas - g_true) / g_true * 100 (%) */
  relativeErrorPercent: number
  /** 若错误使用线长 l 代替摆长 L 算出的重力加速度 g_wrong (m/s²) */
  wrongG_withoutRadius: number
  /** 错误使用线长带来的相对误差百分比 (%) */
  wrongRelativeErrorPercent: number
  /** T²-L 图线的理论斜率 k_理 = 4π² / g_true (s²/m) */
  slopeT2_L: number
  /** T²-L 图线的实测斜率 k_测 = T_meas² / L = 4π² / g_meas (s²/m) */
  slopeT2_L_measured: number
  /** T²-l（线长）图线在纵轴的理论截距 b = 4π²r / g_true (s²) */
  interceptT2_l: number
  /** T²-L 图像的代表性比对数据点组 */
  comparisonPoints: PendulumExperimentPoint[]
}

/**
 * 纯物理计算函数：用单摆测重力加速度
 *
 * @param input 测量输入参数
 * @returns 完整的单摆实验数据分析结果
 */
export function computePendulumExperiment(
  input: PendulumExperimentInput = {},
): PendulumExperimentResult {
  const l_line = Math.max(0.1, input.l_line ?? PENDULUM_EXP_DEFAULTS.l_line)
  const d_mm = Math.max(1.0, input.d_mm ?? PENDULUM_EXP_DEFAULTS.d_mm)
  const n_cycles = Math.max(1, Math.round(input.n_cycles ?? PENDULUM_EXP_DEFAULTS.n_cycles))
  const trueG = Math.max(1.0, input.g_true ?? PENDULUM_EXP_DEFAULTS.g_true)
  const timing_err = input.timing_err ?? PENDULUM_EXP_DEFAULTS.timing_err
  const theta0 = Math.max(0.5, input.theta0 ?? PENDULUM_EXP_DEFAULTS.theta0)

  const d_m = d_mm / 1000
  const r_m = d_m / 2
  const effectiveLength = l_line + r_m

  // 1. 小角近似理论偏差分析：T_real ≈ T₀ * (1 + θ₀²/16)
  const theta0Rad = (theta0 * Math.PI) / 180
  const smallAngleErrorPercent = (1 / 16) * theta0Rad * theta0Rad * 100

  // 2. 理论周期与理论总耗时
  const theoreticalPeriod = 2 * Math.PI * Math.sqrt(effectiveLength / trueG)
  const idealTotalTime = n_cycles * theoreticalPeriod

  // 3. 实测累计总时间与实测单次周期
  const measuredTotalTime = Math.max(0.1, idealTotalTime + timing_err)
  const measuredPeriod = measuredTotalTime / n_cycles

  // 4. 测得重力加速度及误差
  const measuredG = (4 * Math.PI * Math.PI * effectiveLength) / (measuredPeriod * measuredPeriod)
  const errorDeltaG = measuredG - trueG
  const relativeErrorPercent = (errorDeltaG / trueG) * 100

  // 5. 高考经典错因分析：若误用线长 l 计算（漏加球半径 r）
  const wrongG_withoutRadius = (4 * Math.PI * Math.PI * l_line) / (measuredPeriod * measuredPeriod)
  const wrongRelativeErrorPercent = ((wrongG_withoutRadius - trueG) / trueG) * 100

  // 6. T²-L 斜率计算：理论斜率与实测拟合斜率
  const slopeT2_L = (4 * Math.PI * Math.PI) / trueG
  const slopeT2_L_measured = (measuredPeriod * measuredPeriod) / effectiveLength
  const interceptT2_l = (4 * Math.PI * Math.PI * r_m) / trueG

  // 7. 生成 T²-L 多组独立摆长测量数据点 (取 L = 0.6, 0.8, 1.0, 1.2 及当前有效摆长)
  // 模拟真实高考实验中改变摆长多次独立测量，包含系统误差与微小操作读数涨落
  const sampleConfigs = [
    { L: 0.60, delta: -0.06 },
    { L: 0.80, delta: 0.08 },
    { L: 1.00, delta: -0.05 },
    { L: 1.20, delta: 0.07 },
  ]
  const comparisonPoints: PendulumExperimentPoint[] = sampleConfigs.map(({ L: L_sample, delta }) => {
    const t_theory = 2 * Math.PI * Math.sqrt(L_sample / trueG)
    const t_total_meas = Math.max(0.1, n_cycles * t_theory + timing_err + delta)
    const t_meas = t_total_meas / n_cycles
    return {
      L: L_sample,
      T2_theory: t_theory * t_theory,
      T2_measured: t_meas * t_meas,
    }
  })

  // 加入当前实测点
  comparisonPoints.push({
    L: Number(effectiveLength.toFixed(4)),
    T2_theory: theoreticalPeriod * theoreticalPeriod,
    T2_measured: measuredPeriod * measuredPeriod,
  })
  comparisonPoints.sort((a, b) => a.L - b.L)

  return {
    l_line,
    d_m,
    d_mm,
    r_m,
    effectiveLength,
    trueG,
    theta0,
    smallAngleErrorPercent,
    theoreticalPeriod,
    idealTotalTime,
    measuredTotalTime,
    n_cycles,
    measuredPeriod,
    measuredG,
    errorDeltaG,
    relativeErrorPercent,
    wrongG_withoutRadius,
    wrongRelativeErrorPercent,
    slopeT2_L,
    slopeT2_L_measured,
    interceptT2_l,
    comparisonPoints,
  }
}
