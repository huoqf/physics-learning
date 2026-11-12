import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  computeMomentumExperiment,
  momentumExperimentInputFromParams,
} from '@/physics/experimentMomentum'

interface ExperimentMomentumParams {
  m1_exp: number
  m2_exp: number
  v1_exp: number
  plateWidth_mm: number
  collisionType_exp: number
  timing_err: number
}

const DEFAULTS: ParamDefs<ExperimentMomentumParams> = {
  m1_exp: { default: 0.4 },
  m2_exp: { default: 0.2 },
  v1_exp: { default: 0.8 },
  plateWidth_mm: { default: 20.0 },
  collisionType_exp: { default: 0 },
  timing_err: { default: 0.0 },
}

export function handleExperimentMomentum(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-experiment-momentum') return null
  const p = normalizeParams(params, DEFAULTS)
  const expRes = computeMomentumExperiment(momentumExperimentInputFromParams(p))

  const reboundLabel =
    expRes.isRebounded === 1
      ? `反弹向左 (${expRes.v1_after_measured.toFixed(3)} m/s)`
      : Math.abs(expRes.v1_after_measured) < 1e-4
        ? '碰后静止 (速度交换)'
        : `同向向右 (+${expRes.v1_after_measured.toFixed(3)} m/s)`

  return {
    quantities: [
      ...base,
      { label: '碰撞端面类型', value: expRes.collisionTypeName, unit: '' },
      { label: '挡光片宽度 Δx', value: expRes.plateWidth_mm.toFixed(1), unit: 'mm' },
      ...(Math.abs(expRes.timing_err) > 1e-4
        ? [{
            label: '计时测量误差 Δt_err',
            value: `${expRes.timing_err > 0 ? '+' : ''}${expRes.timing_err.toFixed(1)}`,
            unit: 'ms',
            highlight: 'extreme' as const,
          }]
        : []),
      { label: '滑块1质量 m₁', value: expRes.m1.toFixed(3), unit: 'kg' },
      { label: '滑块2质量 m₂', value: expRes.m2.toFixed(3), unit: 'kg' },
      { label: '碰前门1挡光时间 Δt₁', value: expRes.dt1_before_measured.toFixed(4), unit: 's' },
      { label: '碰前初速度 v₁', value: expRes.v1_measured.toFixed(3), unit: 'm/s' },
      { label: '碰前滑块1动量 p₁', value: expRes.p1_before_measured.toFixed(3), unit: 'kg·m/s' },
      { label: '碰前总动量 p_前', value: expRes.p_total_before_measured.toFixed(3), unit: 'kg·m/s', highlight: 'positive' },
      { label: '碰后门2挡光时间 Δt₂\'', value: expRes.dt2_after_measured > 0 ? expRes.dt2_after_measured.toFixed(4) : '--', unit: 's' },
      { label: '滑块2碰后速度 v₂\'', value: expRes.v2_after_measured.toFixed(3), unit: 'm/s' },
      { label: '滑块2碰后动量 p₂\'', value: expRes.p2_after_measured.toFixed(3), unit: 'kg·m/s' },
      ...(expRes.isRebounded === 1
        ? [
            { label: '反弹门1挡光时间 Δt₁\'', value: expRes.dt1_after_measured.toFixed(4), unit: 's' },
            { label: '滑块1碰后速度 v₁\'', value: expRes.v1_after_measured.toFixed(3), unit: 'm/s', highlight: 'negative' as const },
            { label: '滑块1碰后动量 p₁\'', value: expRes.p1_after_measured.toFixed(3), unit: 'kg·m/s', highlight: 'negative' as const },
          ]
        : [
            ...(expRes.collisionType === 0 && expRes.v1_after_measured > 1e-4
              ? [{ label: '碰后门2挡光时间(滑块1) Δt₁\'', value: expRes.dt1_after_measured.toFixed(4), unit: 's' }]
              : []),
            { label: '滑块1碰后速度 v₁\'', value: expRes.v1_after_measured.toFixed(3), unit: 'm/s' },
            { label: '滑块1碰后动量 p₁\'', value: expRes.p1_after_measured.toFixed(3), unit: 'kg·m/s' },
          ]),
      { label: '滑块1碰后运动方向', value: reboundLabel, unit: '' },
      { label: '碰后总动量 p_后', value: expRes.p_total_after_measured.toFixed(3), unit: 'kg·m/s', highlight: 'positive' },
      {
        label: '动量守恒相对偏差',
        value: `${expRes.momentumErrorPercent >= 0 ? '+' : ''}${expRes.momentumErrorPercent.toFixed(2)}%`,
        unit: '',
        highlight: Math.abs(expRes.momentumErrorPercent) > 0.05 ? ('extreme' as const) : undefined,
      },
      {
        label: '机械能损失 ΔE_k',
        value: `${expRes.Ek_loss.toFixed(3)} J (${expRes.Ek_lossPercent.toFixed(1)}%)`,
        unit: '',
        highlight: expRes.Ek_loss > 0.001 ? 'extreme' : undefined,
      },
    ],
    formulas: [
      {
        name: '动量守恒定律',
        latex: 'm_1 v_1 + m_2 v_2 = m_1 v_1\' + m_2 v_2\'',
        level: 'core' as const,
        condition: '系统所受合外力为零（气轨气垫消除摩擦阻力）',
        note: '系统所受合外力为零时总动量保持不变',
      },
      {
        name: '光电门平均速度测瞬时速度',
        latex: 'v = \\dfrac{\\Delta x}{\\Delta t}',
        level: 'core' as const,
        note: '挡光片宽度 Δx 较窄时，平均速度近似等于经过光电门时的瞬时速度',
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
      { text: '【光电门测速误差分析】毫秒计计时误差或挡光片测量偏差会使反算的速度偏离真实值，导致实测动量守恒出现相对偏差。', importance: 'gaokao' as const },
      { text: '【两碰撞机制对比】弹簧片碰撞近似为弹性碰撞（动能守恒）；橡皮泥碰撞为完全非弹性碰撞（碰后同速，机械能损失最大）。', importance: 'gaokao' as const },
    ],
  }
}
