import type { PhysicsPanelData, PhysicsQuantity, ParamDefs, WarningItem } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY } from '@/physics/constants'
import { computeMomentumExperiment } from '@/physics/experimentMomentum'

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
  // 高考实验参数
  m1_exp: number
  m2_exp: number
  v1_exp: number
  plateWidth_mm: number
  collisionType_exp: number
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
  m1_exp: { default: 0.4 },
  m2_exp: { default: 0.2 },
  v1_exp: { default: 0.8 },
  plateWidth_mm: { default: 20.0 },
  collisionType_exp: { default: 0 },
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

  // ─── 模式 2: 高考实验·气垫导轨双车光电门碰撞测速 ───
  if (advancedMode === 2) {
    const expRes = computeMomentumExperiment({
      m1: p.m1_exp,
      m2: p.m2_exp,
      v1: p.v1_exp,
      v2: 0,
      plateWidth_mm: p.plateWidth_mm,
      collisionType: p.collisionType_exp,
    })

    const reboundLabel =
      expRes.isRebounded === 1
        ? `反弹向左 (${expRes.v1_after.toFixed(3)} m/s)`
        : Math.abs(expRes.v1_after) < 1e-4
          ? '碰后静止 (速度交换)'
          : `同向向右 (+${expRes.v1_after.toFixed(3)} m/s)`

    return {
      quantities: [
        ...base,
        { label: '碰撞端面类型', value: expRes.collisionTypeName, unit: '' },
        { label: '挡光片宽度 Δx', value: expRes.plateWidth_mm.toFixed(1), unit: 'mm' },
        { label: '滑块1质量 m₁', value: expRes.m1.toFixed(3), unit: 'kg' },
        { label: '滑块2质量 m₂', value: expRes.m2.toFixed(3), unit: 'kg' },
        { label: '碰前门1挡光时间 Δt₁', value: expRes.dt1_before.toFixed(4), unit: 's' },
        { label: '碰前初速度 v₁', value: expRes.v1.toFixed(3), unit: 'm/s' },
        { label: '碰前滑块1动量 p₁', value: expRes.p1_before.toFixed(3), unit: 'kg·m/s' },
        { label: '碰前总动量 p_前', value: expRes.p_total_before.toFixed(3), unit: 'kg·m/s', highlight: 'positive' },
        { label: '碰后门2挡光时间 Δt₂\'', value: expRes.dt2_after > 0 ? expRes.dt2_after.toFixed(4) : '--', unit: 's' },
        { label: '滑块2碰后速度 v₂\'', value: expRes.v2_after.toFixed(3), unit: 'm/s' },
        { label: '滑块2碰后动量 p₂\'', value: expRes.p2_after.toFixed(3), unit: 'kg·m/s' },
        ...(expRes.isRebounded === 1
          ? [
              { label: '反弹门1挡光时间 Δt₁\'', value: expRes.dt1_after.toFixed(4), unit: 's' },
              { label: '滑块1碰后速度 v₁\'', value: expRes.v1_after.toFixed(3), unit: 'm/s', highlight: 'negative' as const },
              { label: '滑块1碰后动量 p₁\'', value: expRes.p1_after.toFixed(3), unit: 'kg·m/s', highlight: 'negative' as const },
            ]
          : [
              { label: '滑块1碰后速度 v₁\'', value: expRes.v1_after.toFixed(3), unit: 'm/s' },
              { label: '滑块1碰后动量 p₁\'', value: expRes.p1_after.toFixed(3), unit: 'kg·m/s' },
            ]),
        { label: '滑块1碰后运动方向', value: reboundLabel, unit: '' },
        { label: '碰后总动量 p_后', value: expRes.p_total_after.toFixed(3), unit: 'kg·m/s', highlight: 'positive' },
        { label: '动量守恒相对偏差', value: `${expRes.momentumErrorPercent >= 0 ? '+' : ''}${expRes.momentumErrorPercent.toFixed(2)}%`, unit: '' },
        { label: '机械能损失 ΔE_k', value: `${expRes.Ek_loss.toFixed(3)} J (${expRes.Ek_lossPercent.toFixed(1)}%)`, unit: '', highlight: expRes.Ek_loss > 0.001 ? 'extreme' : undefined },
      ],
      formulas: [
        {
          name: '动量守恒定律',
          latex: 'm_1 v_1 + m_2 v_2 = m_1 v_1\' + m_2 v_2\'',
          level: 'core' as const,
          note: '系统所受外力之和为零（气轨微孔气垫消除摩擦阻力）',
        },
        {
          name: '光电门平均速度测瞬时速度',
          latex: 'v = \\dfrac{\\Delta x}{\\Delta t}',
          level: 'core' as const,
          note: '挡光片宽度 Δx 较窄时，平均速度极高精度逼近经过光电门时的瞬时速度',
        },
        {
          name: '完全非弹性碰撞粘合公式',
          latex: 'v_{\\text{共}} = \\dfrac{m_1 v_1}{m_1 + m_2}',
          level: 'important' as const,
          condition: '碰撞端面装有橡皮泥/魔术贴，碰后合为一体',
        },
        {
          name: '弹性碰撞恢复系数',
          latex: 'e = -\\dfrac{v_1\' - v_2\'}{v_1 - v_2} = 1',
          level: 'derived' as const,
          condition: '碰撞端面装有轻质弹性弹簧片，动能守恒',
        },
      ],
      gaokaoPoints: [
        { text: '【气轨调平检验】开气源后轻推滑块，滑块能匀速穿过两光电门（两门挡光时间相等）；若导轨倾斜，重力分力做功会导致动量不守恒。', importance: 'core' as const },
        { text: '【挡光片宽度选择】挡光片必须较窄（通常 1~2 cm），用游标卡尺精确测定其宽度 Δx；过宽会导致平均速度偏离瞬时速度。', importance: 'gaokao' as const },
        { text: '【反弹与矢量负号】当 m₁ < m₂ 发生弹性碰撞时，滑块 1 碰后反向回穿光电门 1（v₁\' < 0），计算碰后动量必须严格带负号：p_后 = -m₁|v₁\'| + m₂v₂\'。', importance: 'hard' as const },
        { text: '【两碰撞机制对比】弹簧圈碰为弹性碰撞（动能守恒）；橡皮泥碰为完全非弹性碰撞（碰后同速，机械能损失最大）。', importance: 'gaokao' as const },
      ],
    }
  }

  // 模式提示（替代恒定强警告）：指示可切换至高考实验模式
  const scopeNotice: WarningItem = {
    text: '【提示】当前为碰撞原理演示。如需查看气垫导轨、光电门测速、动量守恒验证及数据分析，请在左屏切换至「气轨实验」模式。',
    level: 'info',
  }

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
      warnings: [scopeNotice],
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
        warnings: [scopeNotice],
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
        warnings: [scopeNotice],
      }
    }
  }
}
