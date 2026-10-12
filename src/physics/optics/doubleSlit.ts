/**
 * 双缝干涉物理与高考实验测量计算模块 (Double Slit Interference Physics)
 *
 * 遵循高中物理规范与高考实验考纲：
 * 1. 条纹理论间距: Δx = (L / d) * λ
 * 2. 测微目镜读数与逐差法测波长:
 *    x_k = base + k * Δx
 *    Δx_测 = |x_n - x_1| / (n - 1)
 *    λ_测 = (d / L) * Δx_测
 * 3. 对准偶然误差模型：
 *    仅在分划板十字丝瞄准第 1 条 (activeFringe=1) 或第 n 条 (activeFringe=n) 亮纹时，
 *    手轮微调偏置 (handwheelOffset) 计入读数，模拟实验员对准中心时的偶然误差并进入逐差计算。
 * 4. 仪器物理量程校验：
 *    实验室标准螺旋测微器主尺量程为 0 ~ 10.0 mm，标定超量程状态以供视觉与看板防护。
 *
 * 注意：本模块为纯物理函数，禁止依赖 React、DOM、Window 或 Store。
 */

export interface DoubleSlitPhysicsInput {
  /** 光的波长 λ (nm)，一般可见光范围 400 ~ 700 nm */
  wavelength: number
  /** 双缝间距 d (mm)，一般范围 0.1 ~ 0.5 mm */
  slitDistance: number
  /** 缝屏距离 L (m)，一般遮光筒长度 0.5 ~ 2.0 m */
  screenDistance: number
  /** 逐差法测量的目标条纹序号 n (必须 >= 2，默认 4) */
  targetFringe?: number
  /** 当前十字分划丝瞄准的条纹序号 (默认 1) */
  activeFringe?: number
  /** 测微手轮对准微调偏移量 (mm，默认 0) */
  handwheelOffset?: number
}

export interface DoubleSlitPhysicsState {
  /** 条纹理论物理间距 Δx (mm) */
  fringeSpacing: number
  /** 测微目镜原点基准读数 (mm) */
  baseReadingMm: number
  /** 第 1 条亮纹读数 x1 (mm) */
  x1: number
  /** 第 n 条亮纹读数 xn (mm) */
  xn: number
  /** 目标条纹序号 n */
  targetFringe: number
  /** 当前瞄准条纹序号 */
  activeFringe: number
  /** 逐差法测得的条纹间距 Δx_测 = |xn - x1| / (n - 1) (mm) */
  measuredDeltaX: number
  /** 逐差法计算求得的光波长 λ_测 = (d / L) * Δx_测 (nm) */
  measuredWavelength: number
  /** 当前螺旋测微手轮实际刻度读数 (mm) */
  currentReading: number
  /** 相对测量误差 η = |λ_测 - λ| / λ * 100% (%) */
  relativeErrorPercent: number
  /** 是否超出螺旋测微器 10.0mm 物理量程 */
  isOverRange: boolean
}

/** 实验室测量头螺旋测微器基准起始读数偏置 (mm)，确保亮纹分布在主尺正量程内 */
export const DOUBLE_SLIT_BASE_READING_MM = 1.5

/** 实验室测量头螺旋测微器最大标称量程 (mm) */
export const MICROMETER_MAX_READING_MM = 10.0

/** 双缝干涉标准物理默认参数（良态基准，各模块共享） */
export const DOUBLE_SLIT_DEFAULT_PARAMS = {
  mode: 0,
  wavelength: 650,
  slitDistance: 0.3,
  screenDistance: 0.8,
  targetFringe: 4,
  currentFringe: 1,
  handwheelOffset: 0,
} as const

/**
 * 纯物理计算函数：计算双缝干涉理论与实验逐差法状态
 *
 * @param input 实验物理与操作参数
 * @returns 完整的双缝干涉物理量与测量状态
 */
export function calculateDoubleSlitPhysics(
  input: DoubleSlitPhysicsInput,
): DoubleSlitPhysicsState {
  // 1. 安全防御性兜底：防止 URL 参数或未受控输入导致除零或 NaN
  const safeSlit = Number.isFinite(input.slitDistance) && input.slitDistance > 0 ? input.slitDistance : 0.3
  const safeScreen = Number.isFinite(input.screenDistance) && input.screenDistance > 0 ? input.screenDistance : 0.8
  const safeWavelength = Number.isFinite(input.wavelength) && input.wavelength > 0 ? input.wavelength : 650
  const n = Math.max(2, Math.round(Number.isFinite(input.targetFringe) ? input.targetFringe! : 4))
  const activeFringe = Math.max(0, Math.round(Number.isFinite(input.activeFringe) ? input.activeFringe! : 1))
  const offset = Number.isFinite(input.handwheelOffset) ? input.handwheelOffset! : 0

  // 2. 理论条纹间距: Δx = (L / d) * λ
  //    L(m) / d(mm) * λ(nm) * 1e-3 = Δx(mm)
  const fringeSpacing = (safeScreen / safeSlit) * safeWavelength * 1e-3

  // 3. 测量读数计算 (方案 A1 对准偶然误差模型):
  //    在真实高考实验中，若学生在对准第 1 条亮纹 (activeFringe === 1) 时手轮存在微调偏置，
  //    则记录下的 x1 包含偏置；同理对准第 n 条亮纹 (activeFringe === n) 时，xn 包含偏置。
  const baseReadingMm = DOUBLE_SLIT_BASE_READING_MM
  const x1 = baseReadingMm + 1 * fringeSpacing + (activeFringe === 1 ? offset : 0)
  const xn = baseReadingMm + n * fringeSpacing + (activeFringe === n ? offset : 0)

  // 4. 当前测微手轮实际所指刻度读数: x = base + k * Δx + offset
  const currentReading = baseReadingMm + activeFringe * fringeSpacing + offset

  // 5. 逐差法条纹间距: Δx_测 = |xn - x1| / (n - 1)
  const measuredDeltaX = Math.abs(xn - x1) / (n - 1)

  // 6. 实验反求光波长: λ_测 = (d / L) * Δx_测 (nm)
  const measuredWavelength = (safeSlit / safeScreen) * measuredDeltaX * 1e3

  // 7. 相对测量误差: η = |λ_测 - λ| / λ * 100%
  const relativeErrorPercent =
    safeWavelength > 0 ? (Math.abs(measuredWavelength - safeWavelength) / safeWavelength) * 100 : 0

  // 8. 仪器量程校验: 检查 x1、xn 或当前读数是否越出 0 ~ 10mm 量程 (同时判定 <0 与 >10)
  const isOverRange =
    x1 < 0 ||
    x1 > MICROMETER_MAX_READING_MM ||
    xn < 0 ||
    xn > MICROMETER_MAX_READING_MM ||
    currentReading < 0 ||
    currentReading > MICROMETER_MAX_READING_MM

  return {
    fringeSpacing,
    baseReadingMm,
    x1,
    xn,
    targetFringe: n,
    activeFringe,
    measuredDeltaX,
    measuredWavelength,
    currentReading,
    relativeErrorPercent,
    isOverRange,
  }
}
