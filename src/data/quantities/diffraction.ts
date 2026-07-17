import type { PhysicsPanelData } from './types'

export function buildDiffractionQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-diffraction') return null

  const modeVal = params.mode ?? 0
  const wavelength = params.wavelength ?? 650
  const obstacleSize = params.obstacleSize ?? 0.1
  const screenDistance = params.screenDistance ?? 1.0

  const quantities: PhysicsPanelData['quantities'] = [
    { label: '波长 λ', value: wavelength, unit: 'nm', highlight: 'positive' as const },
    { label: '缝屏距离 L', value: screenDistance, unit: 'm' },
  ]

  let formulas: PhysicsPanelData['formulas'] = []
  let gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = []

  if (modeVal === 0) {
    // 单缝衍射
    const width = 2 * (screenDistance / obstacleSize) * wavelength * 1e-3
    quantities.push({ label: '单缝缝宽 a', value: obstacleSize, unit: 'mm' })
    quantities.push({
      label: '中央亮纹宽度 W',
      value: width.toFixed(3),
      unit: 'mm',
      highlight: 'extreme' as const,
    })

    formulas = [
      {
        name: '单缝衍射暗纹条件',
        latex: 'a \\sin\\theta = k\\lambda \\quad (k=\\pm 1, \\pm 2, \\dots)',
        condition: '当缝宽 a 越接近波长 λ 时，衍射现象越明显',
        level: 'core',
      },
      {
        name: '中央明条纹物理宽度',
        latex: 'W = \\frac{2L}{a}\\lambda',
        condition: '中央亮纹的宽度是两侧亮纹宽度的 2 倍',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '单缝衍射条纹特征：中央最宽、最亮，往两侧条纹变窄、变暗，呈明暗相间分布', importance: 'gaokao' },
      { text: '单缝衍射条纹宽度与波长 λ、缝屏距离 L 成正比，与缝宽 a 成反比', importance: 'gaokao' },
      { text: '衍射与干涉的区别：双缝干涉条纹等宽等亮；单缝衍射条纹中央宽亮，两侧窄暗', importance: 'gaokao' },
    ]
  } else if (modeVal === 1) {
    // 圆孔衍射
    const diameter = 2.44 * (screenDistance / obstacleSize) * wavelength * 1e-3
    quantities.push({ label: '圆孔孔径 d', value: obstacleSize, unit: 'mm' })
    quantities.push({
      label: '中央艾里斑直径 D',
      value: diameter.toFixed(3),
      unit: 'mm',
      highlight: 'extreme' as const,
    })

    formulas = [
      {
        name: '圆孔衍射第一暗环条件',
        latex: 'd \\sin\\theta = 1.22 \\lambda',
        condition: '中央最亮区域称为艾里斑，包含约 84% 的透射光能量',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '圆孔衍射图样：明暗相间的同心圆环。孔径越小，中央明斑尺寸越大', importance: 'gaokao' },
      { text: '当圆孔孔径非常大时，光沿直线传播，在屏上只投射出一个几何亮斑', importance: 'core' },
      { text: '艾里斑大小限制了光学仪器的分辨率（瑞利判据）', importance: 'extend' },
    ]
  } else {
    // 泊松亮斑
    quantities.push({ label: '圆板直径 D_ob', value: obstacleSize, unit: 'mm' })
    // 计算阴影物理直径
    const shadowD = obstacleSize
    quantities.push({
      label: '几何阴影直径 D_sh',
      value: shadowD.toFixed(2),
      unit: 'mm',
      highlight: 'extreme' as const,
    })

    formulas = [
      {
        name: '圆板衍射（泊松亮斑）',
        latex: '\\text{阴影中心亮点强度} \\approx I_0',
        condition: '当障碍圆板足够小时，波绕过圆板边缘在阴影正中心同相叠加',
        level: 'core',
      },
    ]

    gaokaoPoints = [
      { text: '泊松亮斑图样：在较大几何阴影的正中心有一个极小极亮的亮点，外围有微弱同心圆环', importance: 'gaokao' },
      { text: '菲涅耳与泊松的历史争论：泊松曾用波动说推导出圆板中心必然有亮斑，企图推翻波动说，结果阿拉戈实验验证了亮斑的真实存在，反而确立了波动说的地位', importance: 'extend' },
      { text: '泊松亮斑是光的波动性（特别是波动衍射与相长干涉）的有力实验证据', importance: 'gaokao' },
    ]
  }

  return { quantities, formulas, gaokaoPoints, warnings: [] }
}
