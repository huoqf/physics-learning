/**
 * src/physics/photoelectric.ts
 * 光电效应纯物理计算 — 无 React/DOM/window 依赖
 *
 * 所有函数使用 SI 单位，能量单位为 eV（与高中物理教材一致）。
 */

/** 普朗克常数 h (eV·s) */
export const PLANCK_CONSTANT_EV = 4.135667696e-15

/** 铯 (Cs) 逸出功 W₀ (eV) — 默认阴极板材料 */
export const CESIUM_WORK_FUNCTION = 2.14

/** 光速 c (m/s) */
export const SPEED_OF_LIGHT = 3.0e8

/**
 * 计算截止频率 ν₀
 * 当入射光频率低于此值时，无论光强多大都不能产生光电效应。
 *
 * @param W0 逸出功 (eV)
 * @returns 截止频率 (Hz)，返回值为 ×10¹⁴ Hz 便于与 UI 频率轴对齐
 */
export function calculateCutoffFrequency(W0: number): number {
  // ν₀ = W₀ / h，返回 ×10^14 Hz
  return (W0 / PLANCK_CONSTANT_EV) / 1e14
}

/**
 * 计算光电子最大初动能 E_km
 *
 * 爱因斯坦光电效应方程：E_km = hν - W₀
 *
 * @param hv 入射光子能量 (eV)，即 hν
 * @param W0 逸出功 (eV)
 * @returns 最大初动能 (eV)，若不发生光电效应返回 0
 */
export function calculateMaxKineticEnergy(hv: number, W0: number): number {
  if (hv <= W0) return 0
  return hv - W0
}

/**
 * 由频率计算光子能量 hν
 *
 * @param nu 频率 (×10¹⁴ Hz)
 * @returns 光子能量 (eV)
 */
export function frequencyToPhotonEnergy(nu: number): number {
  return PLANCK_CONSTANT_EV * nu * 1e14
}

/**
 * 计算遏止电压 U_c
 *
 * 关系式：eU_c = E_km → U_c = E_km / e
 * 由于 E_km 已以 eV 为单位，数值上 U_c (V) = E_km (eV)
 *
 * @param Ekm 最大初动能 (eV)
 * @returns 遏止电压 (V)
 */
export function calculateStoppingVoltage(Ekm: number): number {
  return Ekm
}

/**
 * 判断是否发生光电效应
 *
 * @param nu 入射光频率 (×10¹⁴ Hz)
 * @param W0 逸出功 (eV)
 * @returns 是否发生光电效应
 */
export function isPhotoelectricEffect(nu: number, W0: number): boolean {
  const hv = frequencyToPhotonEnergy(nu)
  return hv >= W0
}

/**
 * 计算光电流 I (μA)
 *
 * 基于反向电压的指数衰减模型：
 * - 当 U ≥ 0 时，电流达到饱和 I = I_max
 * - 当 -U_c < U < 0 时，I = I_max × (1 - exp(-k × (U + U_c)))
 * - 当 U ≤ -U_c 时，I = 0
 *
 * @param U 极板电压 (V)，负值为反向电压
 * @param Uc 遏止电压 (V)
 * @param Imax 饱和光电流 (μA)，由光强决定
 * @returns 光电流 (μA)
 */
export function calculatePhotocurrent(U: number, Uc: number, Imax: number): number {
  if (Uc <= 0) return 0
  if (U >= 0) return Imax
  if (U <= -Uc) return 0
  // 指数衰减模型，k 控制衰减速率
  const k = 2.5
  return Imax * (1 - Math.exp(-k * (U + Uc)))
}

/**
 * 由光强计算饱和光电流
 *
 * 光强正比于单位时间光子数，光子数正比于光电子数。
 *
 * @param intensity 光源强度 (0~100%)
 * @returns 饱和光电流 (μA)，范围 0~50 μA
 */
export function intensityToSaturationCurrent(intensity: number): number {
  return (intensity / 100) * 50
}

/**
 * 频率 → 光束颜色 (hex)
 *
 * 映射关系：
 * - ν < 4.5 (红外): 红色
 * - 4.5 ≤ ν < 5.0 (红~橙): 橙红
 * - 5.0 ≤ ν < 5.5 (黄~绿): 黄绿
 * - 5.5 ≤ ν < 6.0 (绿~蓝): 蓝绿
 * - 6.0 ≤ ν < 6.5 (蓝~靛): 蓝色
 * - 6.5 ≤ ν < 7.0 (靛~紫): 靛蓝
 * - ν ≥ 7.0 (紫外): 紫色
 *
 * @param nu 频率 (×10¹⁴ Hz)
 * @returns hex 颜色字符串
 */
export function frequencyToColor(nu: number): string {
  if (nu < 4.5) return '#EF4444'     // 红
  if (nu < 5.0) return '#F97316'     // 橙
  if (nu < 5.5) return '#EAB308'     // 黄
  if (nu < 6.0) return '#22C55E'     // 绿
  if (nu < 6.5) return '#3B82F6'     // 蓝
  if (nu < 7.0) return '#6366F1'     // 靛
  return '#7C3AED'                    // 紫（紫外）
}

/**
 * 频率 → 可见光波长 (nm)
 *
 * λ = c / ν，超出可见光范围 (380~760nm) 返回 null。
 *
 * @param nu 频率 (×10¹⁴ Hz)
 * @returns 波长 (nm) 或 null（不可见光）
 */
export function frequencyToWavelength(nu: number): number | null {
  const nuHz = nu * 1e14
  const lambdaNm = (SPEED_OF_LIGHT / nuHz) * 1e9
  if (lambdaNm < 380 || lambdaNm > 760) return null
  return lambdaNm
}

/**
 * 生成 I-U 伏安特性曲线点阵
 *
 * @param Uc 遏止电压 (V)
 * @param Imax 饱和光电流 (μA)
 * @param uMin 电压最小值 (V)
 * @param uMax 电压最大值 (V)
 * @param steps 采样点数
 * @returns 点阵数组 {x: U, y: I}
 */
export function generateIUCurve(
  Uc: number,
  Imax: number,
  uMin = -5.0,
  uMax = 3.0,
  steps = 80,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const step = (uMax - uMin) / steps
  for (let i = 0; i <= steps; i++) {
    const u = uMin + i * step
    const iVal = calculatePhotocurrent(u, Uc, Imax)
    points.push({ x: u, y: iVal })
  }
  return points
}
