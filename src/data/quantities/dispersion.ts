import type { PhysicsPanelData } from './types'
import {
  CROWN_GLASS_N_D,
  EQUILATERAL_PRISM_APEX_DEG,
  REFERENCE_SCREEN_DISTANCE_M,
  REFERENCE_SLIT_SEPARATION_MM,
  SPECTRUM_RED_NM,
  SPECTRUM_VIOLET_NM,
  buildDispersionExtremeMatrix,
  prismMinDeviationIncidenceDeg,
  prismMinimumDeviationDeg,
  sampleDispersion,
} from '@/physics/optics/dispersion'

/**
 * 「光的色散与光谱综合」右屏物理量看板。
 *
 * 核心输出：新高考「七大物理量红紫极值矩阵」——
 *   λ红>λ紫 ⟹ ν红<ν紫 ⟹ n红<n紫 ⟹ v红>v紫 ⟹ C红>C紫 ⟹ Δx红>Δx紫 ⟹ E红<E紫
 * 全部数值均由物理层按真实 SI 单位计算，未经任何视景放大。
 */
export function buildDispersionQuantities(
  animId: string,
  params: Record<string, number>,
): PhysicsPanelData | null {
  if (animId !== 'anim-dispersion') return null

  const incidenceDeg = params.incidenceAngle ?? 50
  const apexDeg = EQUILATERAL_PRISM_APEX_DEG

  const red = sampleDispersion(SPECTRUM_RED_NM, incidenceDeg, apexDeg)
  const violet = sampleDispersion(SPECTRUM_VIOLET_NM, incidenceDeg, apexDeg)
  const matrix = buildDispersionExtremeMatrix(incidenceDeg, apexDeg)
  const nD = CROWN_GLASS_N_D
  const iMin = prismMinDeviationIncidenceDeg(nD, apexDeg)
  const deltaMin = prismMinimumDeviationDeg(nD, apexDeg)

  const row = (key: (typeof matrix)[number]['key']) => matrix.find((item) => item.key === key)!

  const pair = (key: (typeof matrix)[number]['key']): string => {
    const r = row(key)
    return `${r.red.toFixed(r.digits)} / ${r.violet.toFixed(r.digits)}`
  }

  const relationLabel = (key: (typeof matrix)[number]['key'], name: string, symbol: string): string => {
    const r = row(key)
    return `${name} ${symbol}（红 ${r.relation} 紫）`
  }

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '入射角 i', value: incidenceDeg, unit: '°' },
    { label: '棱镜顶角 A', value: apexDeg, unit: '°' },
    {
      label: '偏向角 δ（红 / 紫）',
      value: `${red.deviationDeg.toFixed(2)} / ${violet.deviationDeg.toFixed(2)}`,
      unit: '°',
      highlight: 'extreme',
    },
    { label: relationLabel('wavelength', '波长', 'λ'), value: pair('wavelength'), unit: 'nm' },
    { label: relationLabel('frequency', '频率', 'ν'), value: pair('frequency'), unit: '×10¹⁴ Hz' },
    { label: relationLabel('refractiveIndex', '折射率', 'n'), value: pair('refractiveIndex'), unit: '' },
    {
      label: relationLabel('speed', '玻璃中光速', 'v'),
      value: pair('speed'),
      unit: '×10⁸ m/s',
    },
    { label: relationLabel('criticalAngle', '临界角', 'C'), value: pair('criticalAngle'), unit: '°' },
    {
      label: relationLabel('fringeSpacing', '双缝条纹间距', 'Δx'),
      value: pair('fringeSpacing'),
      unit: 'mm',
    },
    {
      label: relationLabel('photonEnergy', '光子能量', 'E'),
      value: pair('photonEnergy'),
      unit: 'eV',
    },
  ]

  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '柯西经验色散律',
      latex: 'n(\\lambda) = n_D + B\\left(\\frac{1}{\\lambda^{2}} - \\frac{1}{\\lambda_D^{2}}\\right)',
      condition: '同一介质中，波长越短折射率越大 —— 色散现象的根本原因',
      level: 'core',
    },
    {
      name: '折射定律（斯涅尔定律）',
      latex: 'n = \\frac{\\sin i}{\\sin r}, \\qquad v = \\frac{c}{n}',
      condition: '光从空气射入折射率为 n 的介质',
      level: 'core',
    },
    {
      name: '三棱镜偏向角',
      latex: '\\delta = i + i_2 - A',
      condition: '光线经两次折射后偏离原方向的角度',
      level: 'important',
    },
    {
      name: '最小偏向角',
      latex: '\\delta_{\\min} = 2\\arcsin\\!\\left(n\\sin\\frac{A}{2}\\right) - A',
      condition: '光路左右对称时取得，此时光在棱镜内平行于底边',
      level: 'important',
    },
    {
      name: '全反射临界角',
      latex: '\\sin C = \\frac{1}{n}',
      condition: '光由介质射向空气；r₂ ≥ C 时第二界面发生全反射，无出射光',
      level: 'core',
    },
    {
      name: '双缝干涉条纹间距',
      latex: '\\Delta x = \\frac{L}{d}\\,\\lambda',
      condition: `对照装置：双缝间距 d = ${REFERENCE_SLIT_SEPARATION_MM.toFixed(2)} mm，缝屏距离 L = ${REFERENCE_SCREEN_DISTANCE_M.toFixed(1)} m`,
      level: 'important',
    },
    {
      name: '光子能量与频率',
      latex: 'E = h\\nu = \\frac{hc}{\\lambda}',
      condition: '波长越短，单个光子能量越大',
      level: 'core',
    },
  ]

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '同一介质中频率越大的色光折射率越大（n紫 > n红），这是白光经三棱镜分解为彩色光谱的根本原因。',
      importance: 'gaokao',
    },
    {
      text: '白光经三棱镜后按 红→橙→黄→绿→蓝→靛→紫 展开为连续光谱：偏折角越大越靠下，故红光在上、紫光在下。',
      importance: 'gaokao',
    },
    {
      text: '七大物理量极值链：λ红>λ紫 ⟹ ν红<ν紫 ⟹ n红<n紫 ⟹ v红>v紫 ⟹ C红>C紫 ⟹ Δx红>Δx紫 ⟹ E红<E紫。',
      importance: 'gaokao',
    },
    {
      text: `偏向角 δ 随入射角 i 先减小后增大；光路对称时取最小值 δ_min = ${deltaMin.toFixed(2)}°，对应入射角 i ≈ ${iMin.toFixed(1)}°。`,
      importance: 'hard',
    },
    {
      text: '紫光在玻璃中传播最慢（v = c/n 最小），经历相同的几何路程用时最长，故偏折最显著。',
      importance: 'core',
    },
    {
      text: '色散只能发生在界面处逐次偏折的复色光上，单色光经三棱镜只偏折不色散。',
      importance: 'core',
    },
    {
      text: '若第二界面的入射角 r₂ ≥ 临界角 C，光在棱镜内发生全反射而无出射光线；本页入射角量程已避开该情形。',
      importance: 'extend',
    },
  ]

  const warnings: PhysicsPanelData['warnings'] = []
  if (red.totalInternalReflection || violet.totalInternalReflection) {
    warnings.push({
      text: '当前入射角使光在棱镜第二界面发生全反射，无出射光谱，请增大入射角。',
      level: 'warning',
    })
  }

  return { quantities, formulas, gaokaoPoints, warnings }
}
