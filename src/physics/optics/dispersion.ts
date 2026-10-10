/**
 * 光的色散纯函数库：柯西经验色散律 + 三棱镜两次折射光路。
 *
 * 无副作用，不依赖 React / DOM / window。
 * 单位约定：波长 nm、折射率无量纲、角度 °（内部换算 rad）、
 *           光速 m/s、条纹间距 mm、光子能量 eV。
 *
 * ── 物理模型 ────────────────────────────────────────────────────────────
 * 1. 柯西经验色散律（同一种介质对不同波长光的折射率不同）：
 *      n(λ) = n_D + B · (1/λ² − 1/λ_D²)      （λ 以 μm 计）
 *    其中 n_D 为 589.3 nm 钠黄光 D 线处折射率，B 为介质色散强度系数。
 *    这是三棱镜能把白光分解成「红橙黄绿蓝靛紫」连续光谱的根本原因：
 *      λ 减小 ⟹ n 增大 ⟹ 偏折加剧。
 *
 * 2. 三棱镜两次折射（顶角 A、入射角 i、折射率 n）：
 *      sin r₁ = sin i / n          （空气 → 玻璃）
 *      r₂ = A − r₁                 （三角形内角和几何关系）
 *      sin i₂ = n · sin r₂         （玻璃 → 空气，r₂ ≥ C 时发生全反射）
 *      δ = i + i₂ − A              （偏向角）
 *    对固定 A 与 n，δ 随 i 先减小后增大；最小值对应左右对称光路：
 *      δ_min = 2·arcsin(n·sin(A/2)) − A ,  此时 i = (A + δ_min)/2
 *
 * 3. 由 n 的单调性可直接导出新高考「七大物理量极值矩阵」：
 *      λ红 > λ紫 ⟹ ν红 < ν紫 ⟹ n红 < n紫 ⟹ v红 > v紫
 *                ⟹ C红 > C紫 ⟹ Δx红 > Δx紫 ⟹ E红 < E紫
 */

/** 二维向量（棱镜局部坐标系：底边中点为原点，y 轴向下，底边长度为 1 归一化） */
export interface Vec2 {
  x: number
  y: number
}

/** 等边三棱镜顶角（高考几何光学标准器材） */
export const EQUILATERAL_PRISM_APEX_DEG = 60

/** 冕牌玻璃在 589.3 nm（钠黄光 D 线）处的折射率 —— 对应高中「玻璃 n ≈ 1.5」 */
export const CROWN_GLASS_N_D = 1.51

/**
 * 冕牌玻璃柯西色散系数 B (μm²)。
 *
 * 取 B = 0.0042 μm² 时 n(400 nm) ≈ 1.524、n(700 nm) ≈ 1.507，
 * Δn ≈ 0.018，与实测冕牌玻璃可见光波段折射率差一致。
 */
export const CROWN_GLASS_DISPERSION_B = 0.0042

/** 柯西公式标定波长 (μm)：589.3 nm 钠黄光 D 线 */
export const CAUCHY_REFERENCE_WAVELENGTH_UM = 0.5893

/** 可见光谱紫端（短波极限） */
export const SPECTRUM_VIOLET_NM = 400
/** 可见光谱红端（长波极限） */
export const SPECTRUM_RED_NM = 700

/** 真空光速 (m/s) */
export const VACUUM_LIGHT_SPEED = 2.998e8

/** 光子能量换算常数：E(eV) = 1239.84 / λ(nm)（由 E = hc/λ 且 e 归一得到） */
export const PHOTON_ENERGY_EV_NM = 1239.84

/** 双缝干涉对照几何：双缝间距 (mm) —— 与「光的双缝干涉」页面保持同一套参考装置 */
export const REFERENCE_SLIT_SEPARATION_MM = 0.2

/** 双缝干涉对照几何：缝屏距离 (m) */
export const REFERENCE_SCREEN_DISTANCE_M = 1.0

/** 判定浮点等价容差 */
const EPS = 1e-12

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180
}

function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

/**
 * 柯西经验色散律：n(λ) = n_D + B · (1/λ² − 1/λ_D²)。
 *
 * @param wavelengthNm 波长 (nm)，须 > 0
 * @param nD 589.3 nm 处折射率（介质标定值）
 * @param dispersionB 介质色散强度系数 B (μm²)
 * @returns 折射率；参数非法时返回 NaN
 */
export function refractiveIndexOfCauchyMedium(
  wavelengthNm: number,
  nD: number = CROWN_GLASS_N_D,
  dispersionB: number = CROWN_GLASS_DISPERSION_B,
): number {
  if (!(wavelengthNm > 0) || !(nD > 0) || !(dispersionB >= 0)) return NaN
  const lambdaUm = wavelengthNm * 1e-3
  const invSquare = 1 / (lambdaUm * lambdaUm)
  const refInvSquare = 1 / (CAUCHY_REFERENCE_WAVELENGTH_UM * CAUCHY_REFERENCE_WAVELENGTH_UM)
  return nD + dispersionB * (invSquare - refInvSquare)
}

/** 介质中光速 v = c / n (m/s)；n 非法时返回 NaN */
export function speedInMedium(n: number): number {
  if (!(n > 0)) return NaN
  return VACUUM_LIGHT_SPEED / n
}

/** 介质 → 真空全反射临界角 C = arcsin(1/n) (°)；n < 1 时不存在，返回 NaN */
export function criticalAngleInMedium(n: number): number {
  if (!(n >= 1)) return NaN
  if (n === 1) return 90
  return rad2deg(Math.asin(1 / n))
}

/** 光子频率 ν = c / λ (Hz) */
export function photonFrequencyHz(wavelengthNm: number): number {
  if (!(wavelengthNm > 0)) return NaN
  return VACUUM_LIGHT_SPEED / (wavelengthNm * 1e-9)
}

/** 光子能量 E = hc / λ (eV) */
export function photonEnergyEv(wavelengthNm: number): number {
  if (!(wavelengthNm > 0)) return NaN
  return PHOTON_ENERGY_EV_NM / wavelengthNm
}

/**
 * 双缝干涉条纹间距 Δx = L·λ / d。
 *
 * @param wavelengthNm 波长 (nm)
 * @param slitSeparationMm 双缝间距 d (mm)
 * @param screenDistanceM 缝屏距离 L (m)
 * @returns 条纹间距 (mm)；参数非法时返回 NaN
 */
export function doubleSlitFringeSpacingMm(
  wavelengthNm: number,
  slitSeparationMm: number = REFERENCE_SLIT_SEPARATION_MM,
  screenDistanceM: number = REFERENCE_SCREEN_DISTANCE_M,
): number {
  if (!(wavelengthNm > 0) || !(slitSeparationMm > 0) || !(screenDistanceM > 0)) return NaN
  return (screenDistanceM * wavelengthNm * 1e-9) / (slitSeparationMm * 1e-3) * 1e3
}

/* ─── 三棱镜光路 ──────────────────────────────────────────────────────── */

/** 棱镜局部坐标系几何（底边长度归一化为 1） */
export interface PrismLocalGeometry {
  /** 顶点（上方） */
  apex: Vec2
  /** 底边左端 */
  baseLeft: Vec2
  /** 底边右端 */
  baseRight: Vec2
  /** 顶角 A (°) */
  apexDeg: number
  /** 左界面外法线（指向空气） */
  leftOutwardNormal: Vec2
  /** 右界面外法线（指向空气） */
  rightOutwardNormal: Vec2
}

/**
 * 构造「底边水平、顶点朝上」的等腰棱镜局部几何。
 * 底边长度归一化为 1，底边中点为原点，y 轴向下（SVG 约定）。
 */
export function buildPrismLocalGeometry(apexDeg: number): PrismLocalGeometry {
  const halfA = deg2rad(apexDeg / 2)
  const height = 0.5 / Math.tan(halfA)
  return {
    apex: { x: 0, y: -height },
    baseLeft: { x: -0.5, y: 0 },
    baseRight: { x: 0.5, y: 0 },
    apexDeg,
    leftOutwardNormal: { x: -Math.cos(halfA), y: -Math.sin(halfA) },
    rightOutwardNormal: { x: Math.cos(halfA), y: -Math.sin(halfA) },
  }
}

/** 三棱镜单色光光路追踪结果（棱镜局部坐标系，底边长度归一化为 1） */
export interface PrismRayTrace {
  /** 入射角 i (°) */
  incidenceDeg: number
  /** 第一界面折射角 r₁ (°) */
  r1Deg: number
  /** 棱镜内第二界面入射角 r₂ (°) */
  r2Deg: number
  /** 第二界面折射角 i₂ (°)；全反射时为 NaN */
  exitAngleDeg: number
  /** 偏向角 δ = i + i₂ − A (°)；全反射时为 NaN */
  deviationDeg: number
  /** 是否在第二界面发生全反射（r₂ ≥ C） */
  totalInternalReflection: boolean
  /** 光路是否有效求解（入射点/出射点均落在界面上） */
  valid: boolean
  /** 入射光线方向（单位向量，棱镜局部坐标系） */
  inDir: Vec2
  /** 棱镜内光线方向（单位向量） */
  internalDir: Vec2
  /** 出射（全反射时为反射）光线方向（单位向量） */
  outDir: Vec2
  /** 入射点（局部坐标） */
  entryPoint: Vec2
  /** 出射点 / 第二界面反射点（局部坐标） */
  exitPoint: Vec2
}

function normalizeVec(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y)
  if (!(len > EPS)) return { x: NaN, y: NaN }
  return { x: v.x / len, y: v.y / len }
}

/**
 * 斯涅尔定律矢量折射（与 GLSL refract 同构）。
 *
 * @param incident 入射方向（单位向量，指向界面）
 * @param normal 指向入射侧的单位法线（与入射方向夹角为钝角）
 * @param eta 折射率比 n₁ / n₂
 * @returns 折射方向；全反射时返回 null
 */
function refractVector(incident: Vec2, normal: Vec2, eta: number): Vec2 | null {
  const cosI = -(normal.x * incident.x + normal.y * incident.y)
  const k = 1 - eta * eta * (1 - cosI * cosI)
  if (k < 0) return null
  const scale = eta * cosI - Math.sqrt(k)
  return normalizeVec({
    x: incident.x * eta + normal.x * scale,
    y: incident.y * eta + normal.y * scale,
  })
}

/** 反射：r = i − 2(i·n)n */
function reflectVector(incident: Vec2, normal: Vec2): Vec2 {
  const dot = incident.x * normal.x + incident.y * normal.y
  return normalizeVec({ x: incident.x - 2 * dot * normal.x, y: incident.y - 2 * dot * normal.y })
}

/**
 * 求射线 origin + t·dir 与线段 p→q 的交点参数 t（射线参数）与 s（线段参数）。
 * 平行或退化时返回 null。
 */
function intersectRaySegment(
  origin: Vec2,
  dir: Vec2,
  p: Vec2,
  q: Vec2,
): { t: number; s: number; point: Vec2 } | null {
  const ex = q.x - p.x
  const ey = q.y - p.y
  const denom = dir.x * ey - dir.y * ex
  if (Math.abs(denom) < EPS) return null
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  const t = (dx * ey - dy * ex) / denom
  // 联立 origin + t·dir = p + s·e 解出 s（符号由行列式展开确定，勿交换 dx/dy）
  const s = (dx * dir.y - dir.x * dy) / denom
  return { t, s, point: { x: origin.x + t * dir.x, y: origin.y + t * dir.y } }
}

/** 射线与线段交点求解选项 */
export interface TracePrismRayOptions {
  /** 入射角 i (°)，以左界面法线为基准 */
  incidenceDeg: number
  /** 棱镜折射率 n */
  n: number
  /** 顶角 A (°)，默认等边三棱镜 60° */
  apexDeg?: number
  /**
   * 入射点沿左界面的位置参数 t ∈ [0, 1]（0 = 底边左端，1 = 顶点）。
   * 默认 0.5（左界面中点）。视景层可用它把出射光路平移到画布合适位置。
   */
  entryFraction?: number
}

/**
 * 追踪单色光通过三棱镜的完整光路（两次折射，必要时判定全反射）。
 *
 * 光从左侧界面射入、右侧界面射出；入射角 i 以左界面法线为基准。
 */
export function tracePrismRay({
  incidenceDeg,
  n,
  apexDeg = EQUILATERAL_PRISM_APEX_DEG,
  entryFraction = 0.5,
}: TracePrismRayOptions): PrismRayTrace {
  const geo = buildPrismLocalGeometry(apexDeg)
  const halfA = deg2rad(apexDeg / 2)
  const iRad = deg2rad(incidenceDeg)

  const emptyDir: Vec2 = { x: NaN, y: NaN }
  const empty: PrismRayTrace = {
    incidenceDeg,
    r1Deg: NaN,
    r2Deg: NaN,
    exitAngleDeg: NaN,
    deviationDeg: NaN,
    totalInternalReflection: false,
    valid: false,
    inDir: emptyDir,
    internalDir: emptyDir,
    outDir: emptyDir,
    entryPoint: { x: NaN, y: NaN },
    exitPoint: { x: NaN, y: NaN },
  }

  if (!(n > 1) || !(apexDeg > 0)) return empty

  // 左界面内法线（指向棱镜内部）：相对水平面下倾 A/2
  const leftInwardNormal: Vec2 = { x: Math.cos(halfA), y: Math.sin(halfA) }

  // 入射方向：与左界面内法线夹角为 i，取使光线自左向右传播的分支
  const inAngle = Math.atan2(leftInwardNormal.y, leftInwardNormal.x) - iRad
  const inDir = normalizeVec({ x: Math.cos(inAngle), y: Math.sin(inAngle) })

  // 入射点：沿左界面（底边左端 → 顶点）
  const t = Math.min(1, Math.max(0, entryFraction))
  const entryPoint: Vec2 = {
    x: geo.baseLeft.x + t * (geo.apex.x - geo.baseLeft.x),
    y: geo.baseLeft.y + t * (geo.apex.y - geo.baseLeft.y),
  }

  // 第一界面折射：空气 → 玻璃
  const internalDir = refractVector(inDir, geo.leftOutwardNormal, 1 / n)
  if (!internalDir) return empty

  // 与右界面求交
  const hit = intersectRaySegment(entryPoint, internalDir, geo.baseRight, geo.apex)
  if (!hit || hit.t <= 0 || hit.s < -1e-6 || hit.s > 1 + 1e-6) return empty

  const exitPoint = hit.point

  // 第二界面折射：玻璃 → 空气，法线取指向棱镜内部（入射侧）的方向
  const rightInwardNormal: Vec2 = {
    x: -geo.rightOutwardNormal.x,
    y: -geo.rightOutwardNormal.y,
  }
  const refracted = refractVector(internalDir, rightInwardNormal, n)

  // 折射角取「光线与界面法线之锐夹角」：法线为有向向量（指向介质内部），
  // 棱镜内光线可能与其成钝角（如自右界面射出时），故必须取绝对值后再取反余弦。
  const r1Deg = rad2deg(Math.acos(clampUnit(Math.abs(
    internalDir.x * leftInwardNormal.x + internalDir.y * leftInwardNormal.y,
  ))))
  const r2Deg = rad2deg(Math.acos(clampUnit(Math.abs(
    internalDir.x * rightInwardNormal.x + internalDir.y * rightInwardNormal.y,
  ))))

  if (!refracted) {
    // 全反射：出射方向取第二界面反射方向
    return {
      incidenceDeg,
      r1Deg,
      r2Deg,
      exitAngleDeg: NaN,
      deviationDeg: NaN,
      totalInternalReflection: true,
      valid: true,
      inDir,
      internalDir,
      outDir: reflectVector(internalDir, rightInwardNormal),
      entryPoint,
      exitPoint,
    }
  }

  const exitAngleDeg = rad2deg(Math.acos(clampUnit(Math.abs(
    refracted.x * rightInwardNormal.x + refracted.y * rightInwardNormal.y,
  ))))
  // 偏向角取入射光线方向与出射光线方向的夹角（等价于 δ = i + i₂ − A，但数值更稳健）
  const deviationDeg = rad2deg(Math.acos(clampUnit(inDir.x * refracted.x + inDir.y * refracted.y)))

  return {
    incidenceDeg,
    r1Deg,
    r2Deg,
    exitAngleDeg,
    deviationDeg,
    totalInternalReflection: false,
    valid: true,
    inDir,
    internalDir,
    outDir: refracted,
    entryPoint,
    exitPoint,
  }
}

/**
 * 最小偏向角 δ_min = 2·arcsin(n·sin(A/2)) − A (°)。
 * 当 n·sin(A/2) > 1（光线无法从第二界面射出）时返回 NaN。
 */
export function prismMinimumDeviationDeg(
  n: number,
  apexDeg: number = EQUILATERAL_PRISM_APEX_DEG,
): number {
  if (!(n > 0) || !(apexDeg > 0)) return NaN
  const s = n * Math.sin(deg2rad(apexDeg / 2))
  if (s > 1) return NaN
  return 2 * rad2deg(Math.asin(s)) - apexDeg
}

/**
 * 最小偏向角对应的入射角 i_min = (A + δ_min)/2 (°)，即左右对称光路的入射角。
 */
export function prismMinDeviationIncidenceDeg(
  n: number,
  apexDeg: number = EQUILATERAL_PRISM_APEX_DEG,
): number {
  const deltaMin = prismMinimumDeviationDeg(n, apexDeg)
  if (isNaN(deltaMin)) return NaN
  return (apexDeg + deltaMin) / 2
}

/** 单色光色散物理量组（供左/中/右三屏与看板共用） */
export interface DispersionQuantitySample {
  /** 波长 λ (nm) */
  wavelengthNm: number
  /** 频率 ν (Hz) */
  frequencyHz: number
  /** 折射率 n */
  refractiveIndex: number
  /** 玻璃中光速 v (m/s) */
  speedInMedium: number
  /** 玻璃 → 空气临界角 C (°) */
  criticalAngleDeg: number
  /** 双缝干涉条纹间距 Δx (mm)，参考装置 L = 1.0 m、d = 0.20 mm */
  fringeSpacingMm: number
  /** 光子能量 E (eV) */
  photonEnergyEv: number
  /** 三棱镜偏向角 δ (°)；全反射时为 NaN */
  deviationDeg: number
  /** 是否在第二界面发生全反射 */
  totalInternalReflection: boolean
}

/**
 * 采样指定波长在给定棱镜条件下的全部色散物理量。
 *
 * @param wavelengthNm 波长 (nm)
 * @param incidenceDeg 入射角 i (°)
 * @param apexDeg 顶角 A (°)
 * @param nD 589.3 nm 处折射率
 * @param dispersionB 柯西色散系数 B (μm²)
 */
export function sampleDispersion(
  wavelengthNm: number,
  incidenceDeg: number,
  apexDeg: number = EQUILATERAL_PRISM_APEX_DEG,
  nD: number = CROWN_GLASS_N_D,
  dispersionB: number = CROWN_GLASS_DISPERSION_B,
): DispersionQuantitySample {
  const n = refractiveIndexOfCauchyMedium(wavelengthNm, nD, dispersionB)
  const trace = tracePrismRay({ incidenceDeg, n, apexDeg })
  return {
    wavelengthNm,
    frequencyHz: photonFrequencyHz(wavelengthNm),
    refractiveIndex: n,
    speedInMedium: speedInMedium(n),
    criticalAngleDeg: criticalAngleInMedium(n),
    fringeSpacingMm: doubleSlitFringeSpacingMm(wavelengthNm),
    photonEnergyEv: photonEnergyEv(wavelengthNm),
    deviationDeg: trace.deviationDeg,
    totalInternalReflection: trace.totalInternalReflection,
  }
}

/** 沿可见光谱等间隔采样（含两端点） */
export function sampleVisibleSpectrum(
  incidenceDeg: number,
  apexDeg: number = EQUILATERAL_PRISM_APEX_DEG,
  sampleCount: number = 31,
  nD: number = CROWN_GLASS_N_D,
  dispersionB: number = CROWN_GLASS_DISPERSION_B,
): DispersionQuantitySample[] {
  const count = Math.max(2, Math.floor(sampleCount))
  const step = (SPECTRUM_RED_NM - SPECTRUM_VIOLET_NM) / (count - 1)
  const samples: DispersionQuantitySample[] = []
  for (let i = 0; i < count; i++) {
    samples.push(sampleDispersion(SPECTRUM_VIOLET_NM + i * step, incidenceDeg, apexDeg, nD, dispersionB))
  }
  return samples
}

/** 「七大物理量极值矩阵」的一行（红端 vs 紫端对照） */
export interface DispersionExtremeRow {
  /** 物理量键 */
  key: 'wavelength' | 'frequency' | 'refractiveIndex' | 'speed' | 'criticalAngle' | 'fringeSpacing' | 'photonEnergy'
  /** 物理量中文名（不含符号，看板用法保持一致） */
  label: string
  /** 展示用符号 */
  symbol: string
  /** 红端取值 */
  red: number
  /** 紫端取值 */
  violet: number
  /** 单位 */
  unit: string
  /** 红端相对紫端的比较关系：'>' 表示 红 > 紫 */
  relation: '>' | '<'
  /** 小数位（格式化用） */
  digits: number
}

/**
 * 构建新高考「七大物理量红紫极值矩阵」。
 *
 * 由柯西色散律 n(λ) 的单调性一次性导出全部极值关系，供右屏看板直击考点。
 */
export function buildDispersionExtremeMatrix(
  incidenceDeg: number,
  apexDeg: number = EQUILATERAL_PRISM_APEX_DEG,
  nD: number = CROWN_GLASS_N_D,
  dispersionB: number = CROWN_GLASS_DISPERSION_B,
): DispersionExtremeRow[] {
  const red = sampleDispersion(SPECTRUM_RED_NM, incidenceDeg, apexDeg, nD, dispersionB)
  const violet = sampleDispersion(SPECTRUM_VIOLET_NM, incidenceDeg, apexDeg, nD, dispersionB)
  const relation = (r: number, v: number): '>' | '<' => (r >= v ? '>' : '<')
  return [
    {
      key: 'wavelength', label: '波长', symbol: 'λ',
      red: red.wavelengthNm, violet: violet.wavelengthNm, unit: 'nm',
      relation: relation(red.wavelengthNm, violet.wavelengthNm), digits: 0,
    },
    {
      key: 'frequency', label: '频率', symbol: 'ν',
      red: red.frequencyHz / 1e14, violet: violet.frequencyHz / 1e14, unit: '×10¹⁴ Hz',
      relation: relation(red.frequencyHz, violet.frequencyHz), digits: 2,
    },
    {
      key: 'refractiveIndex', label: '折射率', symbol: 'n',
      red: red.refractiveIndex, violet: violet.refractiveIndex, unit: '',
      relation: relation(red.refractiveIndex, violet.refractiveIndex), digits: 4,
    },
    {
      key: 'speed', label: '玻璃中光速', symbol: 'v',
      red: red.speedInMedium / 1e8, violet: violet.speedInMedium / 1e8, unit: '×10⁸ m/s',
      relation: relation(red.speedInMedium, violet.speedInMedium), digits: 4,
    },
    {
      key: 'criticalAngle', label: '临界角', symbol: 'C',
      red: red.criticalAngleDeg, violet: violet.criticalAngleDeg, unit: '°',
      relation: relation(red.criticalAngleDeg, violet.criticalAngleDeg), digits: 2,
    },
    {
      key: 'fringeSpacing', label: '双缝条纹间距', symbol: 'Δx',
      red: red.fringeSpacingMm, violet: violet.fringeSpacingMm, unit: 'mm',
      relation: relation(red.fringeSpacingMm, violet.fringeSpacingMm), digits: 2,
    },
    {
      key: 'photonEnergy', label: '光子能量', symbol: 'E',
      red: red.photonEnergyEv, violet: violet.photonEnergyEv, unit: 'eV',
      relation: relation(red.photonEnergyEv, violet.photonEnergyEv), digits: 3,
    },
  ]
}
