import type { PhysicsPanelData } from './types'

export function buildDoubleSlitInterferenceQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-double-slit-interference') return null

  const wavelength = params.wavelength ?? 650
  const slitDistance = params.slitDistance ?? 0.2
  const screenDistance = params.screenDistance ?? 1.0

  // 计算条纹物理间距: Δx = (L / d) * λ
  // L(m) / d(mm) * λ(nm) * 10^-3 = Δx(mm)
  const fringeSpacing = (screenDistance / slitDistance) * wavelength * 1e-3

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '波长 λ', value: wavelength, unit: 'nm', highlight: 'positive' as const },
    { label: '双缝间距 d', value: slitDistance, unit: 'mm' },
    { label: '缝屏距离 L', value: screenDistance, unit: 'm' },
    {
      label: '条纹间距 Δx',
      value: fringeSpacing.toFixed(2),
      unit: 'mm',
      highlight: 'extreme' as const,
    },
  ]

  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '双缝干涉条纹间距公式',
      latex: '\\Delta x = \\frac{L}{d} \\lambda',
      condition: '两列光波满足相干条件（频率相同、相位差恒定）',
      level: 'core',
    },
  ]

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    { text: '双缝干涉条纹间距与波长 λ、缝屏距离 L 成正比，与双缝间距 d 成反比', importance: 'gaokao' },
    { text: '不同颜色光的波长不同，红光波长最长，干涉条纹间距最大；紫光波长最短，干涉条纹间距最小', importance: 'core' },
    { text: '高考实验：用双缝干涉仪测定光的波长（★五星考点）', importance: 'gaokao' },
    { text: '双缝干涉产生的条件：两缝发出的光波频率相同、相位差恒定、振动方向一致', importance: 'core' },
  ]

  return { quantities, formulas, gaokaoPoints, warnings: [] }
}
