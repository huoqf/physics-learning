/**
 * src/physics/photoelectric.ts
 * 光电效应纯物理计算 — 无 React/DOM/window 依赖
 *
 * 所有函数使用 SI 单位，能量单位为 eV（与高中物理教材一致）。
 */

import { SPEED_OF_LIGHT } from './constants'

/** 普朗克常数 h (eV·s) */
export const PLANCK_CONSTANT_EV = 4.135667696e-15

/**
 * 光电效应常用金属逸出功表 (eV)。
 *
 * 这是「左屏金属预设 marks / 右屏物理量 / 中屏 Ekm-ν 多金属对比图」三者共用的
 * 唯一真源——任何一处需要金属逸出功都必须从此表派生，禁止再各自写死数值。
 * 取值与《MODERN_RULES》§五.1 规定的高考常用金属一致。
 */
export const PHOTOELECTRIC_METALS = [
  { name: '铯', symbol: 'Cs', workFunction: 1.9 },
  { name: '钠', symbol: 'Na', workFunction: 2.29 },
  { name: '锌', symbol: 'Zn', workFunction: 3.3 },
  { name: '钨', symbol: 'W', workFunction: 4.5 },
] as const

/** 铯 (Cs) 逸出功 W₀ (eV) */
export const CESIUM_WORK_FUNCTION = PHOTOELECTRIC_METALS[0].workFunction

/** 钠 (Na) 逸出功 W₀ (eV) */
export const SODIUM_WORK_FUNCTION = PHOTOELECTRIC_METALS[1].workFunction

/** 默认阴极板材料（铯）逸出功 W₀ (eV) */
export const DEFAULT_WORK_FUNCTION = CESIUM_WORK_FUNCTION

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
 * 生成 Ekm-ν 图线（爱因斯坦光电效应方程的图像化）。
 *
 * 物理分界：ν < ν₀ 时根本不产生光电子，Ekm 无定义；教科书中该段画成
 * 「延长线」虚线，其与纵轴的交点即反向截距 −W₀。因此本函数把图线拆成
 * 两段返回，供图表分别以实线 / 虚线绘制——严禁把 ν < ν₀ 段压成 Ekm = 0
 * 的水平线（那会误导为"有光电子但动能为零"）。
 *
 * 两段共用同一条直线 Ekm = hν − W₀，故所有金属的图线斜率恒为 h、彼此平行，
 * 只是沿 ν 轴平移。
 *
 * @param W0 逸出功 (eV)
 * @param nuMax 频率上限 (×10¹⁴ Hz)
 * @param steps 采样段数
 * @param nuMin 频率下限 (×10¹⁴ Hz)，默认 0（即从纵轴出发，便于读出 −W₀）
 * @returns solid: ν ≥ ν₀ 的实线段；dashed: ν < ν₀ 的延长虚线段（含精确交点 (ν₀, 0)）
 */
export function generateEkmNuCurve(
  W0: number,
  nuMax: number,
  steps = 144,
  nuMin = 0,
): { solid: { x: number; y: number }[]; dashed: { x: number; y: number }[] } {
  const nu0 = calculateCutoffFrequency(W0)
  const step = (nuMax - nuMin) / steps
  const solid: { x: number; y: number }[] = []
  const dashed: { x: number; y: number }[] = []

  for (let i = 0; i <= steps; i++) {
    const nu = nuMin + i * step
    const ek = frequencyToPhotonEnergy(nu) - W0
    if (nu > nu0 + 1e-9) solid.push({ x: nu, y: ek })
    else dashed.push({ x: nu, y: ek })
  }

  // 补上精确交点 (ν₀, 0)：否则采样步长会把横轴交点切掉一个碎片，
  // 导致实线起点悬空、虚线延长线够不到横轴。
  if (nu0 <= nuMax) {
    dashed.push({ x: nu0, y: 0 })
    solid.unshift({ x: nu0, y: 0 })
  }

  return { solid, dashed }
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

/** 电子康普顿波长 λ_c = h / (m_e * c) ≈ 0.00242631 nm */
export const COMPTON_WAVELENGTH_NM = 0.00242631

/**
 * 计算康普顿散射波长偏移 Δλ (nm)
 * Δλ = λ' - λ = λ_c * (1 - cos θ)
 * @param thetaDeg 散射角 (角度，度)
 * @returns 波长改变量 Δλ (nm)
 */
export function calculateComptonWavelengthShift(thetaDeg: number): number {
  const rad = (thetaDeg * Math.PI) / 180
  return COMPTON_WAVELENGTH_NM * (1 - Math.cos(rad))
}

/**
 * 计算康普顿散射后的波长 λ' (nm)
 * @param lambda0Nm 入射光子波长 (nm)
 * @param thetaDeg 散射角 (度)
 * @returns 散射光子波长 λ' (nm)
 */
export function calculateComptonScatteredWavelength(lambda0Nm: number, thetaDeg: number): number {
  return lambda0Nm + calculateComptonWavelengthShift(thetaDeg)
}
