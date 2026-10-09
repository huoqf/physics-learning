/**
 * 分子间作用力与分子势能物理量看板数据构建。
 */
import {
  repulsiveForce,
  attractiveForce,
  netMolecularForce,
  molecularPotentialEnergy,
} from '../../physics/intermolecularForces'
import { CHART_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'

export function buildIntermolecularForcesQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _lastChangedParam?: string | null,
): PhysicsPanelData | null {
  if (animId !== 'anim-intermolecular-forces') return null

  const r = params.r ?? 2.0
  const fRep = repulsiveForce(r)
  const fAtt = attractiveForce(r)
  const fNet = netMolecularForce(r)
  const ep = molecularPotentialEnergy(r)

  // 势能特征点判断
  const isEquilibrium = Math.abs(r - 1.0) < 0.05
  const isRepulsiveZone = r < 1.0
  const isAttractiveZone = r > 1.0

  return {
    quantities: [
      { label: '分子间距 r', value: r.toFixed(2), unit: 'r₀', color: CHART_COLORS.labelText },
      { label: '分子斥力 F_斥', value: fRep.toFixed(2), unit: 'F₀', color: CHART_COLORS.criticalPt },
      { label: '分子引力 F_引', value: fAtt.toFixed(2), unit: 'F₀', color: CHART_COLORS.primary },
      {
        label: '分子合力 F_合',
        value: (fNet > 0 ? `+${fNet.toFixed(2)} (斥)` : fNet < 0 ? `${fNet.toFixed(2)} (引)` : '0.00 (平衡)'),
        unit: 'F₀',
        highlight: isEquilibrium ? 'zero' : fNet > 0 ? 'positive' : 'negative',
        color: PHYSICS_COLORS.forceNet,
      },
      {
        label: '分子势能 E_p',
        value: ep.toFixed(2),
        unit: 'E₀',
        highlight: isEquilibrium ? 'extreme' : ep < 0 ? 'negative' : 'positive',
        color: CHART_COLORS.compareD,
      },
      {
        label: '所处状态区域',
        value: isEquilibrium ? '平衡位置 (r=r₀)' : isRepulsiveZone ? '斥力区间 (r<r₀)' : isAttractiveZone ? '引力区间 (r>r₀)' : '平衡位置',
        unit: '',
        color: isEquilibrium ? CHART_COLORS.equilibrium : CHART_COLORS.labelText,
      },
    ],
    formulas: [
      {
        name: '分子间合力',
        latex: 'F_{合} = F_{斥} - F_{引}',
        level: 'core',
        condition: 'r=r₀ 时 F_合 = 0；r<r₀ 合力表现为斥力；r>r₀ 合力表现为引力',
      },
      {
        name: '分子力做功与势能增量',
        latex: 'W_{分子力} = -\\Delta E_p = -\\int F_{合} \\,\\mathrm{d}r',
        level: 'core',
        condition: '势能零点选在无限远处 (r → ∞ 处 E_p = 0)',
        note: '分子力做正功势能减小，做负功势能增加；r=r₀ 时势能取极小值',
      },
      {
        name: '引力与斥力随距离衰减率',
        latex: 'F_{斥} \\propto \\dfrac{1}{r^{12}}, \\quad F_{引} \\propto \\dfrac{1}{r^6}',
        level: 'important',
        condition: 'Lennard-Jones 唯象模型',
        note: '斥力随距离变化比引力快得多，故靠近时斥力剧增，远离时引力占优',
      },
    ],
    gaokaoPoints: [
      {
        text: '合力为零与势能极小的横坐标严格全等：当 r = r₀ 时，合力 F_合 = 0，分子势能 E_p 达到最小值（势阱底部）。',
        importance: 'gaokao',
      },
      {
        text: '无论从 r₀ 增大还是减小距离，分子力都做负功，分子势能都增大。即 r > r₀ 时引力做负功势能增大；r < r₀ 时斥力做负功势能增大。',
        importance: 'gaokao',
      },
      {
        text: '引力最大值对应的横坐标约为 1.12 r₀，该点为 E_p-r 曲线的一阶导数极值点（拐点）。',
        importance: 'hard',
      },
    ],
    warnings: [
      {
        text: 'r = r₀ 时分子势能最小，但绝不代表分子势能为零！规定无限远处为零势能时，r₀ 处的势能为负值。',
        level: 'danger',
      },
      {
        text: '随距离 r 增大，引力和斥力都减小，绝对不能误认为“引力增大、斥力减小”。',
        level: 'warning',
      },
      {
        text: '当 r > 10 r₀ 时，分子间作用力极其微弱，通常可忽略不计（理想气体假设）。',
        level: 'warning',
      },
    ],
  }
}
