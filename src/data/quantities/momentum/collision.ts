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
        { name: '动量守恒定律', latex: 'm_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'', level: 'core' as const, condition: '碰撞过程中系统所受合外力可忽略；或某方向合外力为零，则该方向动量守恒' },
        { name: '弹性碰撞动能守恒', latex: '\\frac{1}{2}m_1v_1^2 + \\frac{1}{2}m_2v_2^2 = \\frac{1}{2}m_1{v_1\'}^2 + \\frac{1}{2}m_2{v_2\'}^2', level: 'core' as const, condition: '仅适用于弹性碰撞（e = 1，碰撞前后系统总动能不变）' },
        { name: '弹性碰撞末速 v₁\'', latex: 'v_1\' = \\frac{(m_1 - m_2)v_1 + 2m_2v_2}{m_1 + m_2}', level: 'derived' as const, condition: '一维弹性碰撞（由动量守恒与动能守恒联立消元得到）' },
        { name: '弹性碰撞末速 v₂\'', latex: 'v_2\' = \\frac{2m_1v_1 + (m_2 - m_1)v_2}{m_1 + m_2}', level: 'derived' as const, condition: '一维弹性碰撞（由动量守恒与动能守恒联立消元得到）' },
        { name: '恢复系数 e', latex: 'e = -\\frac{v_1\' - v_2\'}{v_1 - v_2}', level: 'supplementary' as const, condition: '一维对心碰撞碰撞后分离相对速度与碰前接近相对速度之比（0 ≤ e ≤ 1）' },
      ],
      gaokaoPoints: [
        { text: '碰撞过程遵循三大制约：动量守恒、动能不增（E_k后 ≤ E_k前，即 ΔE_k ≤ 0）及运动实际可行（碰后后球速度不大于前球速度、两球不穿透）', importance: 'core' as const },
        { text: '弹性碰撞（e=1）没有动能损失；完全非弹性碰撞（e=0）系统机械能损失最多且两球碰后粘合共速', importance: 'gaokao' as const },
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
        { name: '碰后A速度', latex: 'v_A\' = \\frac{m_A - e\\cdot m_B}{m_A + m_B}v_A', level: 'supplementary' as const, condition: '一维碰撞且 B 球碰前静止（v_B = 0，拓展式）' },
        { name: '碰后B速度', latex: 'v_B\' = \\frac{(1+e)m_A}{m_A + m_B}v_A', level: 'supplementary' as const, condition: '一维碰撞且 B 球碰前静止（v_B = 0，拓展式）' },
        { name: '极大能量损失', latex: '\\Delta E_{k\\max} = \\frac{m_A m_B}{2(m_A+m_B)}v_A^2', level: 'important' as const, condition: 'B 球碰前静止（v_B = 0）且发生完全非弹性碰撞（碰后共速）时取得' },
      ],
      gaokaoPoints: [
        { text: '等质量弹性碰撞（m_A = m_B）：碰后两球速度交换；若 B 球碰前静止，则碰后 A 球静止、B 球以 A 球碰前速度运动', importance: 'gaokao' as const },
        { text: '大撞小（mA≫mB，碰撞静止小球）：大球速度几乎不变（vA\'≈vA），小球速度变为两倍（vB\'≈2vA）', importance: 'gaokao' as const },
        { text: '小撞大（mA≪mB，碰撞静止大球）：小球被原速反弹（vA\'≈-vA），大球近似保持静止', importance: 'gaokao' as const },
        { text: '物理约束：任意碰撞必须满足两球不相互穿透（符合运动实际），且系统总动能不能增加（E_k后 ≤ E_k前，即 ΔE_k ≤ 0）', importance: 'gaokao' as const },
      ],
    }
  }
}
