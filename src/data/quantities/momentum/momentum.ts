import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface MomentumParams {
  advancedMode: number
  m: number
  v: number
  mA: number
  vA: number
  mB: number
  vB: number
}

const DEFAULTS: ParamDefs<MomentumParams> = {
  advancedMode: { default: 0 },
  m: { default: 3 },
  v: { default: 4 },
  mA: { default: 3 },
  vA: { default: 5 },
  mB: { default: 2 },
  vB: { default: -3 },
}

export function handleMomentum(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-momentum') return null
  const p = normalizeParams(params, DEFAULTS)
  const advancedMode = p.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  if (!isAdvanced) {
    const m = p.m ?? 3
    const v = p.v ?? 4
    const pVal = m * v

    return {
      quantities: [
        ...base,
        { label: '质量 m', value: m.toFixed(1), unit: 'kg' },
        { label: '速度 v', value: v.toFixed(1), unit: 'm/s' },
        { label: '动量 p', value: pVal.toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
      ],
      formulas: [
        { name: '动量定义', latex: 'p = mv', level: 'core' as const },
        { name: '动量与动能关系', latex: 'E_k = \\frac{p^2}{2m}', level: 'important' as const, condition: '仅适用于动能与动量的数值关系' },
      ],
      gaokaoPoints: [
        { text: '动量是状态量，求某时刻动量须用该时刻的瞬时速度', importance: 'core' as const },
      ],
    }
  } else {
    const mA = p.mA ?? 3
    const vA = p.vA ?? 5
    const mB = p.mB ?? 2
    const vB = p.vB ?? -3

    const pA = mA * vA
    const pB = mB * vB
    const pTotal = pA + pB
    const EkA = (pA * pA) / (2 * mA)
    const EkB = (pB * pB) / (2 * mB)

    return {
      quantities: [
        ...base,
        { label: 'A球动量 p_A', value: pA.toFixed(1), unit: 'kg·m/s', highlight: pA >= 0 ? 'positive' as const : 'negative' as const },
        { label: 'B球动量 p_B', value: pB.toFixed(1), unit: 'kg·m/s', highlight: pB >= 0 ? 'positive' as const : 'negative' as const },
        { label: '系统总动量 p_总', value: pTotal.toFixed(1), unit: 'kg·m/s', highlight: pTotal === 0 ? 'zero' as const : 'extreme' as const },
        { label: 'A球动能 E_kA', value: EkA.toFixed(1), unit: 'J' },
        { label: 'B球动能 E_kB', value: EkB.toFixed(1), unit: 'J' },
      ],
      formulas: [
        { name: '动量定义（一维）', latex: 'p = mv', level: 'core' as const, condition: '一维计算必须先规定正方向，用正负号表示方向' },
        { name: '系统总动量', latex: 'p_{\\text{总}} = p_A + p_B', level: 'core' as const },
        { name: '动量与动能转化', latex: 'E_k = \\frac{p^2}{2m}', level: 'important' as const, note: 'p 不变时，m↑ 则 E_k↓，动量大不代表动能一定大' },
      ],
      gaokaoPoints: [
        { text: '动量是矢量，一维计算必须先规定正方向，用正负号表示', importance: 'gaokao' as const },
        { text: '熟记 E_k = p²/(2m)，高考高频使用', importance: 'gaokao' as const },
        { text: '动量大则动能一定大？错！p 相同时 m 越大 E_k 越小', importance: 'hard' as const },
      ],
    }
  }
}
