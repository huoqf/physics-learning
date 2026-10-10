import type { PhysicsPanelData } from './types'

export function buildAlphaScatterQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-alpha-scatter') return null

  const modelType = params.modelType ?? 1
  const impactParameter = params.impactParameter ?? 15

  let scatterResult = ''
  let expectedAngle = '≈ 0°'
  if (modelType === 0) {
    scatterResult = '几乎全部直穿（无明显偏转）'
    expectedAngle = '< 1°'
  } else {
    if (impactParameter < 6) {
      scatterResult = '极少数粒子大角度反弹 (θ ≥ 90°)'
      expectedAngle = '120° ~ 180°'
    } else if (impactParameter < 15) {
      scatterResult = '少数粒子发生明显大角度偏转'
      expectedAngle = '15° ~ 60°'
    } else {
      scatterResult = '绝大多数粒子沿原方向或微小偏角穿过'
      expectedAngle = '< 5°'
    }
  }

  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '原子模型假设',
      value: modelType === 0 ? '汤姆孙“枣糕模型”' : '卢瑟福“核式结构模型”',
      unit: '',
    },
    {
      label: '碰撞参数',
      symbol: 'b',
      value: impactParameter.toString(),
      unit: 'px',
      highlight: impactParameter < 6 ? 'extreme' : undefined,
    },
    {
      label: '预计偏转角',
      symbol: 'θ',
      value: expectedAngle,
      unit: '',
      highlight: modelType === 1 && impactParameter < 6 ? 'negative' : 'positive',
    },
    {
      label: '散射行为特征',
      value: scatterResult,
      unit: '',
    },
  ]

  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '微观库仑斥力定律',
      latex: 'F = k \\frac{q_\\alpha Q_{\\text{Au}}}{r^2} = k \\frac{(2e)(79e)}{r^2}',
      condition: 'α 粒子与金原子核间库仑斥力',
      level: 'core',
    },
    {
      name: '最近距离能量守恒',
      latex: 'E_k = \\frac{1}{2} m_\\alpha v_0^2 = k \\frac{2 \\times 79 e^2}{r_{\\min}}',
      condition: '正对对心碰撞时动能完全转化为电势能',
      level: 'important',
    },
  ]

  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    { text: '卢瑟福 α 粒子散射实验彻底否定了汤姆孙枣糕模型，证实了原子核式结构。', importance: 'gaokao' },
    { text: '实验现象：绝大多数方向几乎不变；少数发生较大偏转；极少数（约1/8000）偏角大于 90° 甚至反弹。', importance: 'gaokao' },
    { text: '核式模型结论：原子中心有体积极小、集中几乎全部质量和全部正电荷的原子核，核外电子绕核高速旋转。', importance: 'core' },
    { text: '经典物理困难：绕核加速运动电子辐射电磁波导致轨道塌缩，且无法解释分立线状光谱（引出玻尔理论）。', importance: 'core' },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
    warnings: [],
    mnemonic: '绝大多数一直走，少数偏转大角度，极少数反弹回头看，核积极小重如山。',
  }
}
