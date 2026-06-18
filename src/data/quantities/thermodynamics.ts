/**
 * 热学动画物理量看板数据构建。
 */
import { averageKineticEnergy } from '../../physics/brownianMotion'
import { THERMO_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from './types'

export function buildThermodynamicsQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _lastChangedParam?: string | null,
): PhysicsPanelData | null {
  if (animId !== 'anim-brownian-motion') return null

  const T = params.temperature ?? 300
  const d = params.particleD ?? 5
  const mode = params.mode ?? 0
  const Ek = averageKineticEnergy(T)

  return {
    quantities: [
      { label: '温度 T', value: T.toFixed(0), unit: 'K', color: THERMO_COLORS.temperature },
      { label: '微粒直径 d', value: d.toFixed(1), unit: 'μm' },
      { label: '平均动能 Ēk', value: Ek.toExponential(2), unit: 'J', highlight: 'extreme', color: THERMO_COLORS.heatAbsorb },
      { label: '合力波动幅值', value: mode === 1 ? '实时显示' : '—', unit: mode === 1 ? 'N' : '' },
    ],
    formulas: [
      {
        name: '平均动能',
        latex: '\\bar{E}_k = \\dfrac{3}{2} k T',
        level: 'core',
        condition: '理想气体 / 统计规律',
        note: 'k = 1.38×10⁻²³ J/K 为玻尔兹曼常数',
      },
    ],
    gaokaoPoints: [
      { text: '温度是分子平均动能的标志；微粒越小、温度越高，布朗运动越剧烈。', importance: 'gaokao' },
      { text: '布朗运动不是分子的运动，而是固体微粒的运动，它间接反映了液体分子的无规则热运动。', importance: 'hard' },
    ],
    warnings: [
      { text: '布朗运动的主体是悬浮微粒，不是液体分子本身！', level: 'danger' },
      { text: '布朗运动是微粒受到大量分子碰撞的宏观表现，不是单个分子的作用。', level: 'warning' },
    ],
  }
}
