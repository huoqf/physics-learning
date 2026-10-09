/**
 * 油膜法估测油酸分子大小学生实验纯函数库。
 */

export interface OilFilmParams {
  ratio: number // 稀释比例，如 500 代表 1:500
  dropsPerMl: number // 1mL 滴数，如 80 滴/mL
  gridSideCm: number // 方格边长 cm，如 1.0 cm
  powderThickness: 'normal' | 'thick' | 'thin' // 痱子粉厚度
}

export interface OilFilmResult {
  vDropMl: number // 单滴溶液体积 (mL)
  vPureAcidMl: number // 单滴纯油酸体积 (mL)
  vPureAcidM3: number // 单滴纯油酸体积 (m³)
  gridCount: number // 有效方格数 (个)
  areaCm2: number // 油膜总面积 (cm²)
  areaM2: number // 油膜总面积 (m²)
  moleculeDiameterM: number // 分子直径 (m)
  diameterAngstrom: number // 分子直径 (Å)
}

/**
 * 依据实验参数计算油膜展开与分子直径
 */
export function calculateOilFilm(params: OilFilmParams): OilFilmResult {
  const { ratio, dropsPerMl, gridSideCm, powderThickness } = params

  // 1. 单滴溶液体积 (mL)
  const vDropMl = 1.0 / dropsPerMl

  // 2. 单滴纯油酸体积 (mL) 及 (m³)
  const vPureAcidMl = vDropMl / ratio
  const vPureAcidM3 = vPureAcidMl * 1e-6

  // 3. 理想油酸分子直径基准 d_true 约为 1.12 × 10⁻¹⁰ m (1.12 Å)
  const dTrue = 1.12e-10

  // 4. 痱子粉厚度影响扩散受阻程度
  let spreadFactor = 1.0
  if (powderThickness === 'thick') spreadFactor = 0.72 // 阻力过大，油膜散不开，S偏小，d偏大
  else if (powderThickness === 'thin') spreadFactor = 1.05 // 略微多散开一些

  // 5. 实际展开面积 (m²) 与 (cm²)
  const areaM2 = (vPureAcidM3 / dTrue) * spreadFactor
  const areaCm2 = areaM2 * 1e4

  // 6. 有效方格数 (四舍五入)
  const singleGridAreaCm2 = gridSideCm * gridSideCm
  const gridCount = Math.round(areaCm2 / singleGridAreaCm2)

  // 7. 学生测量测出的有效面积
  const measuredAreaM2 = (gridCount * singleGridAreaCm2) * 1e-4

  // 8. 估算的分子直径
  const moleculeDiameterM = vPureAcidM3 / measuredAreaM2
  const diameterAngstrom = moleculeDiameterM * 1e10

  return {
    vDropMl,
    vPureAcidMl,
    vPureAcidM3,
    gridCount,
    areaCm2: gridCount * singleGridAreaCm2,
    areaM2: measuredAreaM2,
    moleculeDiameterM,
    diameterAngstrom,
  }
}
