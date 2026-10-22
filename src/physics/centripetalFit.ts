/**
 * 向心力的「实验探究」模型 — 纯函数（无 React / DOM 依赖）。
 *
 * 高考实验「探究向心力与质量、半径、角速度的关系」的结论是
 *   F = m·ω²·r
 * 数据处理上只做一件事：**保持 r、m 不变，改变 ω，画 F–ω² 图**。
 * 得到的是一条过原点的直线，斜率 k = m·r —— 这就是「用图像验证 F ∝ ω²」的全部内容。
 *
 * 本模块同时给出：
 *   - 理论直线 F = (m·r)·ω²
 *   - 带模拟测量残差的 5 组采样点（固定序列，不用随机数，保证每次渲染/每次测试完全一致）
 *   - 由采样点**过原点最小二乘**拟合出的斜率 k_fit（不是直接把 m·r 抄一遍，
 *     否则「拟合」二字就没有意义了）
 *   - 对照组斜率 2m·r（质量加倍），用于控制变量法的对照
 */

export interface CentripetalFitSample {
  /** 该组采样对应的线速度 (m/s) */
  v: number
  /** 横坐标 ω² = (v/r)² (rad²/s²) */
  omegaSq: number
  /** 理论向心力 m·r·ω² (N) */
  fTheory: number
  /** 模拟测量值（理论值叠加残差）(N) */
  fMeasured: number
}

export interface CentripetalFitResult {
  /** 理论斜率 k = m·r (N·s²/rad²) */
  slope: number
  /** 过原点最小二乘拟合斜率 */
  fitSlope: number
  /** 拟合斜率相对理论斜率的偏差 (k_fit/k − 1)，带符号 */
  slopeError: number
  /** 采样点 */
  samples: CentripetalFitSample[]
  /** 可控范围内的 ω² 上限 = (vMax/r)² */
  omegaSqMax: number
  /** 对照组（质量加倍）斜率 2m·r */
  compareSlope: number
  /** 纵轴上限（含对照组），单位 N */
  fMax: number
}

/** 模拟测量残差序列（±1.5% 以内，固定值以保证可复现） */
const MEASURE_RESIDUALS = [0.010, -0.012, 0.014, -0.006, 0.008] as const

/** 采样点个数 */
const SAMPLE_COUNT = MEASURE_RESIDUALS.length

export interface CentripetalFitOptions {
  /** 线速度下限 (m/s)，默认 1 */
  vMin?: number
  /** 线速度上限 (m/s)，默认 10 */
  vMax?: number
}

/**
 * 计算 F–ω² 实验图层的全部数据。
 *
 * @param m 质量 (kg)
 * @param r 半径 (m)
 * @param opts 线速度范围（与左屏滑块一致，默认 1~10 m/s）
 */
export function computeCentripetalFit(
  m: number,
  r: number,
  opts: CentripetalFitOptions = {},
): CentripetalFitResult {
  const vMin = opts.vMin ?? 1
  const vMax = opts.vMax ?? 10
  const safeR = Math.max(r, 1e-6)
  const safeM = Math.max(m, 0)

  const slope = safeM * safeR
  // ω² 的可控上限：v 最大、r 取当前值时 ω = v/r 最大
  const omegaSqMax = (vMax / safeR) ** 2

  const samples: CentripetalFitSample[] = []
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    // 在 [vMin, vMax] 上均匀取 5 个线速度
    const v = vMin + ((vMax - vMin) * i) / (SAMPLE_COUNT - 1)
    const omegaSq = (v / safeR) ** 2
    const fTheory = slope * omegaSq
    const fMeasured = fTheory * (1 + MEASURE_RESIDUALS[i])
    samples.push({ v, omegaSq, fTheory, fMeasured })
  }

  // 过原点最小二乘：k = Σ(x·y) / Σ(x²)
  let sxy = 0
  let sxx = 0
  for (const s of samples) {
    sxy += s.omegaSq * s.fMeasured
    sxx += s.omegaSq * s.omegaSq
  }
  const fitSlope = sxx > 1e-12 ? sxy / sxx : slope
  const slopeError = slope > 1e-12 ? fitSlope / slope - 1 : 0

  const compareSlope = 2 * slope

  return {
    slope,
    fitSlope,
    slopeError,
    samples,
    omegaSqMax,
    compareSlope,
    fMax: compareSlope * omegaSqMax * 1.1,
  }
}

/**
 * 拟合直线 F = k_fit·ω² 在 [0, ω²max] 上的采样点，供图表绘制。
 *
 * @param samples 采样段数，默认 24
 */
export function sampleFitLine(
  fit: CentripetalFitResult,
  samples = 24,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= samples; i++) {
    const x = (fit.omegaSqMax * i) / samples
    pts.push({ x, y: fit.fitSlope * x })
  }
  return pts
}
