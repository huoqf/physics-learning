/**
 * 分子间作用力动画物理量看板数据构建。
 */
import {
  repulsiveForce,
  attractiveForce,
  netMolecularForce,
  molecularPotentialEnergy,
} from '../../physics/intermolecularForces'
import { CHART_COLORS } from '@/theme/physics'
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

  return {
    quantities: [
      { label: '分子间距 r', value: r.toFixed(2), unit: 'r₀', color: CHART_COLORS.labelText },
      { label: '斥力 F_斥', value: fRep.toExponential(2), unit: 'N', color: CHART_COLORS.criticalPt },
      { label: '引力 F_引', value: fAtt.toExponential(2), unit: 'N', color: CHART_COLORS.primary },
      {
        label: '合力 F_合',
        value: fNet.toExponential(2),
        unit: 'N',
        highlight: Math.abs(fNet) < 0.01 ? 'zero' : fNet > 0 ? 'positive' : 'negative',
        color: CHART_COLORS.compareC,
      },
      {
        label: '分子势能 E_p',
        value: ep.toExponential(2),
        unit: 'J',
        highlight: ep < 0 ? 'negative' : 'positive',
        color: CHART_COLORS.compareD,
      },
    ],
    formulas: [
      {
        name: '分子合力',
        latex: 'F_{合} = F_{斥} - F_{引}',
        level: 'core',
        condition: '正值为斥力，负值为引力',
      },
      {
        name: '分子力做功与势能',
        latex: 'W_{分子力} = -\\Delta E_p',
        level: 'core',
        condition: '分子力做正功，势能减小；做负功，势能增大',
      },
    ],
    gaokaoPoints: [
      {
        text: 'F-r 图线与 E_p-r 图线的特征点横坐标全等性：合力为零处（r=r₀）势能最小。',
        importance: 'gaokao',
      },
      {
        text: '当 r > r₀ 时，随距离增大分子力做负功，势能增大；当 r < r₀ 时，随距离减小分子力做负功，势能同样增大。',
        importance: 'gaokao',
      },
    ],
    warnings: [
      {
        text: 'r = r₀ 时分子势能最小，但绝不一定为零！势能零点的选择是任意的。',
        level: 'danger',
      },
      {
        text: '分子间同时存在引力和斥力，合力是两者的矢量和。',
        level: 'warning',
      },
    ],
  }
}
