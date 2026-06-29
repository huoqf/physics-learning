import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY } from '@/physics/constants'

interface MomentumConservationParams {
  advancedMode: number
  m1: number
  v1: number
  m2: number
  v2: number
  collisionType: number
  e_coefficient: number
  m_slider: number
  M_board: number
  mu: number
  L: number
  v0: number
}

const DEFAULTS: ParamDefs<MomentumConservationParams> = {
  advancedMode: { default: 0 },
  m1: { default: 3 },
  v1: { default: 5 },
  m2: { default: 2 },
  v2: { default: 0 },
  collisionType: { default: 0 },
  e_coefficient: { default: 0.5 },
  m_slider: { default: 1 },
  M_board: { default: 3 },
  mu: { default: 0.3 },
  L: { default: 2 },
  v0: { default: 6 },
}

export function handleMomentumConservation(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-momentum-conservation') return null
  const p = normalizeParams(params, DEFAULTS)
  const advancedMode = p.advancedMode ?? 0
  const isAdvanced = advancedMode === 1

  if (!isAdvanced) {
    const m1 = p.m1 ?? 3
    const v1 = p.v1 ?? 5
    const m2 = p.m2 ?? 2
    const v2 = p.v2 ?? 0
    const collisionType = p.collisionType ?? 0
    const e_coefficient = p.e_coefficient ?? 0.5

    let e = 1.0
    let typeName = '完全弹性碰撞'
    if (collisionType === 1) {
      e = 0.0
      typeName = '完全非弹性碰撞'
    } else if (collisionType === 2) {
      e = e_coefficient
      typeName = `非弹性碰撞 (e = ${e.toFixed(2)})`
    }

    const pInitial = m1 * v1 + m2 * v2
    const v1After = ((m1 - e * m2) * v1 + m2 * (1 + e) * v2) / (m1 + m2)
    const v2After = (m1 * (1 + e) * v1 + (m2 - e * m1) * v2) / (m1 + m2)

    const p1After = m1 * v1After
    const p2After = m2 * v2After
    const pTotalAfter = p1After + p2After

    const EkInitial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2
    const EkAfter = 0.5 * m1 * v1After * v1After + 0.5 * m2 * v2After * v2After
    const EkLoss = EkInitial - EkAfter

    return {
      quantities: [
        ...base,
        { label: '碰撞类型', value: typeName, unit: '' },
        { label: '碰前总动量', value: pInitial.toFixed(1), unit: 'kg·m/s' },
        { label: '碰后A速度', value: v1After.toFixed(2), unit: 'm/s' },
        { label: '碰后B速度', value: v2After.toFixed(2), unit: 'm/s' },
        { label: '碰后总动量', value: pTotalAfter.toFixed(1), unit: 'kg·m/s', highlight: 'positive' as const },
        { label: '机械能损失', value: EkLoss.toFixed(2), unit: 'J', highlight: EkLoss > 0.01 ? 'extreme' : undefined },
      ],
      formulas: [
        { name: '动量守恒', latex: 'm_1v_1 + m_2v_2 = m_1v_1\' + m_2v_2\'', level: 'core' as const },
        { name: '恢复系数', latex: 'e = -\\frac{v_1\' - v_2\'}{v_1 - v_2}', level: 'important' as const },
      ],
      gaokaoPoints: [
        { text: '系统所受合外力为零，总动量在碰撞前后严格守恒', importance: 'core' as const },
        { text: '弹性碰撞 (e=1) 机械能守恒；完全非弹性碰撞 (e=0) 机械能损失最大', importance: 'gaokao' as const },
        { text: '高考常考恢复系数 e 在 0 到 1 之间的一般碰撞，此时动量守恒，动能减少', importance: 'gaokao' as const },
      ],
    }
  } else {
    const m_slider = p.m_slider ?? 1
    const M_board = p.M_board ?? 3
    const v0 = p.v0 ?? 6
    const mu = p.mu ?? 0.3
    const L = p.L ?? 2
    const g = GRAVITY

    const pTotal = m_slider * v0
    const vCommon = (m_slider * v0) / (m_slider + M_board)
    const tCommon = (M_board * vCommon) / (mu * m_slider * g)
    const x1AtCommon = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
    const x2AtCommon = 0.5 * (mu * m_slider * g / M_board) * tCommon * tCommon
    const deltaXAtCommon = x1AtCommon - x2AtCommon

    const isFallen = deltaXAtCommon > L

    if (isFallen) {
      const a_rel = mu * g * (1 + m_slider / M_board)
      const tFall = (v0 - Math.sqrt(v0 * v0 - 2 * a_rel * L)) / a_rel
      const x1 = v0 * tFall - 0.5 * mu * g * tFall * tFall
      const x2 = 0.5 * (mu * m_slider * g / M_board) * tFall * tFall
      const Q = mu * m_slider * g * L
      const vSliderFall = v0 - mu * g * tFall
      const vBoardFall = (mu * m_slider * g / M_board) * tFall

      return {
        quantities: [
          ...base,
          { label: '系统总动量', value: pTotal.toFixed(1), unit: 'kg·m/s' },
          { label: '状态结论', value: '未达到共速，滑块已滑落', unit: '', highlight: 'negative' as const },
          { label: '滑落时刻', value: tFall.toFixed(2), unit: 's' },
          { label: '滑块滑落速度', value: vSliderFall.toFixed(2), unit: 'm/s' },
          { label: '木板滑落速度', value: vBoardFall.toFixed(2), unit: 'm/s' },
          { label: '滑块位移 x₁', value: x1.toFixed(2), unit: 'm' },
          { label: '木板位移 x₂', value: x2.toFixed(2), unit: 'm' },
          { label: '相对位移 Δx', value: L.toFixed(2), unit: 'm' },
          { label: '摩擦生热 Q', value: Q.toFixed(1), unit: 'J', highlight: 'extreme' as const },
        ],
        formulas: [
          { name: '滑落临界', latex: '\\Delta x_{\\text{相对}} = L', level: 'core' as const },
          { name: '摩擦生热', latex: 'Q = \\mu mgL', level: 'important' as const },
        ],
        gaokaoPoints: [
          { text: '当木板长度 L 小于达到共速所需的相对位移时，滑块会从木板上滑落', importance: 'gaokao' as const },
          { text: '滑落后，由于不受摩擦力，滑块与木板均做匀速直线运动，系统总动量守恒', importance: 'gaokao' as const },
          { text: '滑落临界问题是高考物理压轴题的高频考点，需注意相对位移与板长关系', importance: 'gaokao' as const },
        ],
      }
    } else {
      const Q = mu * m_slider * g * deltaXAtCommon

      return {
        quantities: [
          ...base,
          { label: '系统总动量', value: pTotal.toFixed(1), unit: 'kg·m/s' },
          { label: '状态结论', value: '达到共速，未滑落', unit: '', highlight: 'positive' as const },
          { label: '共同速度', value: vCommon.toFixed(2), unit: 'm/s' },
          { label: '达共速时间', value: tCommon.toFixed(2), unit: 's' },
          { label: '滑块位移 x₁', value: x1AtCommon.toFixed(2), unit: 'm' },
          { label: '木板位移 x₂', value: x2AtCommon.toFixed(2), unit: 'm' },
          { label: '相对位移 Δx', value: deltaXAtCommon.toFixed(2), unit: 'm' },
          { label: '摩擦生热 Q', value: Q.toFixed(1), unit: 'J', highlight: 'extreme' as const },
        ],
        formulas: [
          { name: '共同速度', latex: 'v_{\\text{共}} = \\frac{mv_0}{m+M}', level: 'core' as const },
          { name: '摩擦生热', latex: 'Q = \\mu mg \\Delta x_{\\text{相对}}', level: 'important' as const },
        ],
        gaokaoPoints: [
          { text: '滑块木板模型中，摩擦力为内力，系统总动量守恒', importance: 'gaokao' as const },
          { text: '达到共同速度是相对运动结束、内能损失最大的临界点', importance: 'gaokao' as const },
          { text: '系统内摩擦生热公式为 Q = f·Δx_相对', importance: 'gaokao' as const },
        ],
      }
    }
  }
}
