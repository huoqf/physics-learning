/**
 * 气体分子运动统计规律（麦克斯韦速率分布）物理量看板数据构建。
 */
import {
  calcMostProbableSpeed,
  calcAverageSpeed,
  calcRmsSpeed,
  M_O2,
} from '@/physics/maxwellDistribution'
import { THERMO_COLORS, PHYSICS_COLORS, CHART_COLORS } from '@/theme/physics'
import type { PhysicsPanelData } from '../types'

export function buildMaxwellDistributionData(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _lastChangedParam?: string | null,
): PhysicsPanelData | null {
  if (animId !== 'anim-maxwell-distribution') return null

  const T1 = params.temperature1 ?? 300
  const T2 = params.temperature2 ?? 500

  const vp1 = calcMostProbableSpeed(T1, M_O2)
  const vAvg1 = calcAverageSpeed(T1, M_O2)
  const vRms1 = calcRmsSpeed(T1, M_O2)

  const vp2 = calcMostProbableSpeed(T2, M_O2)

  const kB = 1.38e-23
  const EkAvg = 1.5 * kB * T1

  return {
    quantities: [
      { label: '基准温度 T₁', value: T1.toFixed(0), unit: 'K', color: THERMO_COLORS.temperature },
      { label: '对比温度 T₂', value: T2.toFixed(0), unit: 'K', color: CHART_COLORS.reference },
      { label: '最概然速率 v_p (T₁)', value: vp1.toFixed(1), unit: 'm/s', highlight: 'extreme', color: THERMO_COLORS.heatAbsorb },
      { label: '平均速率 v̄ (T₁)', value: vAvg1.toFixed(1), unit: 'm/s', color: PHYSICS_COLORS.velocity },
      { label: '方均根速率 v_rms (T₁)', value: vRms1.toFixed(1), unit: 'm/s', color: CHART_COLORS.primary },
      { label: '最概然速率 v_p (T₂)', value: vp2.toFixed(1), unit: 'm/s', color: CHART_COLORS.labelText },
      { label: '平均分子动能 Ēk (T₁)', value: EkAvg.toExponential(2), unit: 'J', color: THERMO_COLORS.heatAbsorb },
      { label: '曲线总面积（概率积分）', value: '1.000', unit: '(100%)', highlight: 'zero', color: PHYSICS_COLORS.forceNet },
    ],
    formulas: [
      {
        name: '麦克斯韦速率分布函数',
        latex: 'f(v) = 4\\pi \\left( \\dfrac{m}{2\\pi k T} \\right)^{\\frac{3}{2}} v^2 \\exp\\left( -\\dfrac{m v^2}{2 k T} \\right)',
        level: 'core',
        condition: '热平衡态理想气体',
        note: 'f(v)dv 表示速率在 v 到 v+dv 范围内的分子数占总分子数的百分比',
      },
      {
        name: '最概然速率（分布峰值横坐标）',
        latex: 'v_p = \\sqrt{\\dfrac{2 k T}{m}}',
        level: 'core',
        condition: '分布曲线导数为零处（概率最大的速率）',
        note: '随温度 T 升高而增大，与分子质量 m 开平方成反比',
      },
      {
        name: '三大特征速率比例关系',
        latex: 'v_p : \\bar{v} : v_{rms} = \\sqrt{2} : \\sqrt{\\dfrac{8}{\\pi}} : \\sqrt{3} \\approx 1 : 1.128 : 1.225',
        level: 'important',
        condition: '任何理想气体系统均严格成立',
      },
      {
        name: '总分子数守恒（归一化条件）',
        latex: '\\int_0^{\\infty} f(v) \\,\\mathrm{d}v = 1',
        level: 'core',
        condition: '所有温度下的曲线总面积守恒',
        note: '温度升高峰值右移时，峰高必须降低，使总面积保持为 1',
      },
    ],
    gaokaoPoints: [
      {
        text: '“中间多、两头少”：在特定温度下，大部分分子的速率集中在最概然速率 vp 附近，极端低速和极端高速的分子只占极少数。',
        importance: 'gaokao',
      },
      {
        text: '温度对分布曲线的变形规律（高考高频考点）：温度升高时，分子平均动能增加，最概然速率右移；同时由于分子总数占比恒为 100%（面积守恒），曲线峰高必定降低、整体展宽平坦。',
        importance: 'gaokao',
      },
      {
        text: '单个分子速率在持续碰撞中瞬息万变，无确定轨迹；但大量分子的速率分布服从极为严格的统计确定性规律。',
        importance: 'core',
      },
    ],
    warnings: [
      {
        text: '绝对不能认为“温度升高时，所有分子的速率都增大”！温度升高只代表平均速率增大，低速区间依然存在分子。',
        level: 'danger',
      },
      {
        text: '曲线纵坐标是单位速率区间的概率密度 f(v)，而不是某个孤立确定速率下的分子数。',
        level: 'warning',
      },
    ],
  }
}
