/**
 * 薄膜干涉与增透膜纯物理计算函数。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI（长度 nm/m）。
 */

export interface ThinFilmPhysicsInput {
  wavelength_nm: number   // 入射光在真空中的波长 (nm)
  filmThickness_nm: number // 薄膜厚度 d (nm)
  n_film: number          // 薄膜介质折射率
  n_substrate: number     // 基底介质折射率 (增透膜通常 n_air=1 < n_film < n_substrate)
  theta_i_deg?: number    // 入射角 (度)，默认 0° (垂直入射)
}

export interface ThinFilmPhysicsResult {
  hasHalfWaveLossTop: boolean    // 上表面反射是否有半波损失
  hasHalfWaveLossBottom: boolean // 下表面反射是否有半波损失
  netHalfWaveLoss: boolean       // 净半波损失 (两者异号时有 λ/2 额外光程差)
  opticalPathDiff_nm: number     // 几何光程差 2 * n * d * cos(theta_r)
  totalPathDiff_nm: number       // 包含半波损失的有效总光程差
  phaseDiff_rad: number          // 两束反射光的相位差 (rad)
  reflectance: number            // 反射光强占比 (0 ~ 1)
  transmittance: number          // 透射光强占比 (0 ~ 1)
  idealCoatingThickness_nm: number // 对应当前波长的理想增透膜厚度 λ / (4 * n_film)
  isDestructive: boolean         // 是否接近反射相消 (增透条件)
  isConstructive: boolean        // 是否接近反射相长 (增反条件)
}

/**
 * 计算薄膜干涉与反射率。
 */
export function calculateThinFilmInterference(input: ThinFilmPhysicsInput): ThinFilmPhysicsResult {
  const {
    wavelength_nm,
    filmThickness_nm,
    n_film,
    n_substrate,
    theta_i_deg = 0,
  } = input

  const n_air = 1.0

  // 1. 半波损失判断：从光疏介质到光密介质反射时有半波损失 (λ/2)
  const hasHalfWaveLossTop = n_film > n_air
  const hasHalfWaveLossBottom = n_substrate > n_film
  // 若两表面一个有半波损失、一个没有，则净半波差为 λ/2
  const netHalfWaveLoss = hasHalfWaveLossTop !== hasHalfWaveLossBottom

  // 2. 膜内折射角 (斯涅尔定律)
  const theta_i_rad = (theta_i_deg * Math.PI) / 180
  const sin_theta_r = Math.min(1, Math.sin(theta_i_rad) / Math.max(1, n_film))
  const cos_theta_r = Math.sqrt(Math.max(0, 1 - sin_theta_r * sin_theta_r))

  // 3. 几何光程差 Δ = 2 * n_film * d * cos(theta_r)
  const opticalPathDiff_nm = 2 * n_film * filmThickness_nm * cos_theta_r

  // 4. 总光程差与相位差
  const halfWaveShift = netHalfWaveLoss ? wavelength_nm / 2 : 0
  const totalPathDiff_nm = opticalPathDiff_nm + halfWaveShift

  const phaseDiff_rad = (2 * Math.PI * totalPathDiff_nm) / Math.max(1, wavelength_nm)

  // 5. 严格多光束干涉/双光束反射率公式 (Airy 公式)
  const r1 = (n_film - n_air) / (n_film + n_air)
  const r2 = (n_substrate - n_film) / (n_substrate + n_film)
  const r1_sq = r1 * r1
  const r2_sq = r2 * r2

  // 相位差 delta = (2 * PI * opticalPathDiff_nm) / wavelength_nm + (netHalfWaveLoss ? PI : 0)
  const delta = (2 * Math.PI * opticalPathDiff_nm) / wavelength_nm + (netHalfWaveLoss ? Math.PI : 0)
  const cos_delta = Math.cos(delta)

  // 振幅反射率
  // R = (r1^2 + r2^2 + 2*r1*r2*cos(delta)) / (1 + r1^2*r2^2 + 2*r1*r2*cos(delta))
  const num = r1_sq + r2_sq + 2 * r1 * r2 * cos_delta
  const den = 1 + r1_sq * r2_sq + 2 * r1 * r2 * cos_delta
  const reflectance = Math.max(0, Math.min(1, den > 0 ? num / den : 0))
  const transmittance = Math.max(0, 1 - reflectance)

  // 6. 理想增透膜厚度 (当两者均有半波损失时，相消条件为 2nd = (k + 1/2)λ，k=0 时 d = λ / (4n))
  const idealCoatingThickness_nm = wavelength_nm / (4 * Math.max(1, n_film))

  // 7. 相长/相消状态
  const normalizedPhaseMod2Pi = Math.abs(phaseDiff_rad % (2 * Math.PI))
  const distToOddPi = Math.abs(normalizedPhaseMod2Pi - Math.PI)
  const distToEvenPi = Math.min(normalizedPhaseMod2Pi, 2 * Math.PI - normalizedPhaseMod2Pi)

  const isDestructive = distToOddPi < 0.25 || reflectance < 0.15
  const isConstructive = distToEvenPi < 0.25 || reflectance > 0.85

  return {
    hasHalfWaveLossTop,
    hasHalfWaveLossBottom,
    netHalfWaveLoss,
    opticalPathDiff_nm,
    totalPathDiff_nm,
    phaseDiff_rad,
    reflectance,
    transmittance,
    idealCoatingThickness_nm,
    isDestructive,
    isConstructive,
  }
}

/**
 * 劈尖干涉条纹间距计算。
 * 条纹间距 Δx = λ / (2 * n * tan(alpha)) ≈ λ / (2 * n * alpha)
 * @param wavelength_nm 光波长 (nm)
 * @param wedgeAngle_rad 劈尖夹角 (rad)
 * @param n_medium 劈尖内介质折射率 (空气通常为 1.0)
 * @returns 条纹间距 (mm)
 */
export function calculateWedgeFringeSpacing(
  wavelength_nm: number,
  wedgeAngle_rad: number,
  n_medium = 1.0,
): number {
  if (wedgeAngle_rad <= 0 || n_medium <= 0) return 0
  // Δx = λ / (2 * n * tan(alpha))
  const lambda_m = wavelength_nm * 1e-9
  const spacing_m = lambda_m / (2 * n_medium * Math.tan(wedgeAngle_rad))
  return spacing_m * 1e3 // 转换为 mm
}

/**
 * 牛顿环暗环半径计算。
 * 第 m 级暗环半径 r_m = sqrt(m * R * λ)
 * @param m 级次 (0, 1, 2, ...)
 * @param curvatureRadius_m 透镜曲率半径 R (m)
 * @param wavelength_nm 光波长 (nm)
 * @returns 暗环半径 (mm)
 */
export function calculateNewtonRingRadius(
  m: number,
  curvatureRadius_m: number,
  wavelength_nm: number,
): number {
  if (m < 0 || curvatureRadius_m <= 0 || wavelength_nm <= 0) return 0
  const lambda_m = wavelength_nm * 1e-9
  const radius_m = Math.sqrt(m * curvatureRadius_m * lambda_m)
  return radius_m * 1e3 // 转换为 mm
}
