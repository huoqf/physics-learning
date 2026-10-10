import type { PhysicsPanelData } from './types'
import {
  SCATTER_SCALE_PX,
  classifyScatterAngle,
  scatterAngleDeg,
  closestApproachPx,
} from '@/physics/alphaScatter'

/** 散射行为描述文本（与 {@link classifyScatterAngle} 的分类一一对应） */
const SCATTER_TEXT: Record<string, string> = {
  straight: '沿原方向几乎直穿（偏转角极小）',
  deflected: '发生明显偏转（未反弹）',
  rebound: '大角度反弹（θ ≥ 90°，极少数）',
}

export function buildAlphaScatterQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-alpha-scatter') return null

  const modelType = params.modelType ?? 1
  const impactParameter = params.impactParameter ?? 15

  // 散射角与最近接近距离统一取自物理层解析解，
  // 与中屏动画的数值积分结果一一对应（误差 < 1°），两屏不会互相矛盾。
  const isRutherford = modelType !== 0
  const angleDeg = isRutherford ? scatterAngleDeg(impactParameter) : 0
  const rMinPx = closestApproachPx(impactParameter)
  const scatterClass = classifyScatterAngle(angleDeg)

  const scatterResult = isRutherford
    ? SCATTER_TEXT[scatterClass]
    : '几乎全部直穿（枣糕模型正电荷弥散，斥力可忽略）'

  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '原子模型假设',
      value: isRutherford ? '卢瑟福“核式结构模型”' : '汤姆孙“枣糕模型”',
      unit: '',
    },
    {
      label: '碰撞参数',
      symbol: 'b',
      value: impactParameter.toString(),
      unit: 'px',
      highlight: isRutherford && impactParameter < SCATTER_SCALE_PX ? 'extreme' : undefined,
    },
    {
      label: '预计偏转角',
      symbol: 'θ',
      value: isRutherford ? angleDeg.toFixed(1) : '0.0',
      unit: '°',
      highlight: isRutherford ? (scatterClass === 'straight' ? 'positive' : 'negative') : 'positive',
    },
    {
      label: '散射行为',
      value: scatterResult,
      unit: '',
    },
    {
      label: '最近接近距离',
      symbol: 'r_min',
      value: rMinPx.toFixed(1),
      unit: 'px',
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
    { text: '碰撞参数 b 越小，α 粒子越接近金核，受到的库仑斥力越大，偏转角也越大。', importance: 'core' },
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
