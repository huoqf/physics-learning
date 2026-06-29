import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface CollisionParams {
  advancedMode: number
  m1: number
  v1: number
  m2: number
  v2: number
  isElastic: number
  mA: number
  vA: number
  mB: number
  kLoss: number
}

const DEFAULTS: ParamDefs<CollisionParams> = {
  advancedMode: { default: 0 },
  m1: { default: 3 },
  v1: { default: 5 },
  m2: { default: 2 },
  v2: { default: 0 },
  isElastic: { default: 1 },
  mA: { default: 3 },
  vA: { default: 5 },
  mB: { default: 2 },
  kLoss: { default: 0 },
}

export function handleCollision(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-collision') return null
  const p = normalizeParams(params, DEFAULTS)
  const advancedMode = p.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  if (!isAdvanced) {
    const m1 = p.m1 ?? 3
    const v1 = p.v1 ?? 5
    const m2 = p.m2 ?? 2
    const v2 = p.v2 ?? 0
    const isElastic = p.isElastic ?? 1
    const EkInitial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2
    let EkFinal: number
    if (isElastic === 1) {
      const totalM = m1 + m2
      const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / totalM
      const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / totalM
      EkFinal = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f
    } else {
      const vCommon = (m1 * v1 + m2 * v2) / (m1 + m2)
      EkFinal = 0.5 * (m1 + m2) * vCommon * vCommon
    }

    return {
      quantities: [
        ...base,
        { label: '初始动能', value: EkInitial.toFixed(1), unit: 'J' },
        { label: '末了动能', value: EkFinal.toFixed(1), unit: 'J' },
        { label: '机械能守恒', value: Math.abs(EkInitial - EkFinal) < 0.1 ? '✓ 守恒' : `损失 ${(EkInitial - EkFinal).toFixed(1)} J`, unit: '' },
      ],
      formulas: [
        { name: '动量守恒', latex: 'm_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'', level: 'core' as const },
      ],
      gaokaoPoints: [
        { text: '完全弹性碰撞没有能量损失；完全非弹性碰撞损失机械能最多', importance: 'core' as const },
      ],
    }
  } else {
    const mA = p.mA ?? 3
    const vA = p.vA ?? 5
    const mB = p.mB ?? 2
    const kLoss = p.kLoss ?? 0
    const e = 1 - kLoss
    const totalM = mA + mB
    const vAf = (mA - e * mB) / totalM * vA
    const vBf = (1 + e) * mA / totalM * vA
    const deltaEkMax = (mA * mB) / (2 * totalM) * vA * vA

    return {
      quantities: [
        ...base,
        { label: "碰后 v_A'", value: vAf.toFixed(2), unit: 'm/s' },
        { label: "碰后 v_B'", value: vBf.toFixed(2), unit: 'm/s' },
        { label: '极大机械能损失', value: deltaEkMax.toFixed(1), unit: 'J', highlight: 'extreme' as const },
      ],
      formulas: [
        { name: '碰后A速度', latex: 'v_A\' = \\frac{m_A - m_B}{m_A + m_B}v_A', level: 'core' as const },
        { name: '碰后B速度', latex: 'v_B\' = \\frac{2m_A}{m_A + m_B}v_A', level: 'core' as const },
        { name: '极大能量损失', latex: '\\Delta E_{k\\max} = \\frac{m_A m_B}{2(m_A+m_B)}v_A^2', level: 'important' as const },
      ],
      gaokaoPoints: [
        { text: '等质量完全弹性碰撞：两球速度直接交换', importance: 'gaokao' as const },
        { text: 'm_A≪m_B撞静止大球，小球原速反弹，大球近似静止', importance: 'gaokao' as const },
        { text: '碰撞必须满足：后球速度不大于前球，总机械能不增加', importance: 'gaokao' as const },
      ],
    }
  }
}
