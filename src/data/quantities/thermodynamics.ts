/**
 * 热学动画物理量看板数据构建。
 */
import { averageKineticEnergy, averageSpeed, SUBSTANCE_PRESETS, estimateMicroQuantities } from '../../physics/brownianMotion'
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
  const Ek = averageKineticEnergy(T)
  
  // 估算分子平均速率
  const vAvg = averageSpeed(T, d)

  // 微观量估算状态读取
  const substanceIdx = params.substanceIdx ?? 0
  const inputModeVal = params.inputMode ?? 0
  const inputValue = params.inputValue ?? 18

  const substance = SUBSTANCE_PRESETS[substanceIdx] || SUBSTANCE_PRESETS[0]
  const inputModeStr = inputModeVal === 0 ? 'mass' : 'volume'
  const estimation = estimateMicroQuantities(substance, inputModeStr, inputValue)

  return {
    quantities: [
      { label: '温度 T', value: T.toFixed(0), unit: 'K', color: THERMO_COLORS.temperature },
      { label: '微粒直径 d', value: d.toFixed(1), unit: 'μm' },
      { label: '平均动能 Ēk', value: Ek.toExponential(2), unit: 'J', highlight: 'extreme', color: THERMO_COLORS.heatAbsorb },
      { label: '分子平均速率', value: vAvg.toFixed(1), unit: 'm/s' },
      { label: `单个${substance.unitName.slice(0, 2)}质量 m₀`, value: estimation.m0.toExponential(2), unit: 'kg', color: THERMO_COLORS.temperature },
      { label: `单个${substance.unitName.slice(0, 2)}体积 V₀`, value: estimation.V0.toExponential(2), unit: 'm³' },
      { label: substance.model === 'sphere' ? '分子直径 d' : '分子平均距离 L', value: (estimation.size * 1e10).toFixed(2), unit: 'Å' },
      { label: '样本总分子数 N', value: estimation.N.toExponential(2), unit: '个', highlight: 'extreme', color: THERMO_COLORS.heatAbsorb },
    ],
    formulas: [
      {
        name: '平均动能',
        latex: '\\bar{E}_k = \\dfrac{3}{2} k T',
        level: 'core',
        condition: '理想气体 / 统计规律',
        note: 'k = 1.38×10⁻²³ J/K 为玻尔兹曼常数；温度是分子平均动能的标志',
      },
      {
        name: '单个分子质量',
        latex: 'm_0 = \\dfrac{M}{N_A}',
        level: 'important',
        condition: '任何物质',
        note: `当前(${substance.name}): m₀ = ${substance.molMass} / (6.02 × 10²³) ≈ ${estimation.m0.toExponential(2)} kg`,
      },
      {
        name: '分子占据空间',
        latex: 'V_0 = \\dfrac{V_{mol}}{N_A} = \\dfrac{M}{\\rho N_A}',
        level: 'important',
        condition: '紧密排列（固体/液体）',
        note: `当前(${substance.name}): V₀ = ${substance.molMass} / (${substance.density} × 6.02 × 10²³) ≈ ${estimation.V0.toExponential(2)} m³`,
      },
      {
        name: '球形分子直径',
        latex: 'd = \\sqrt[3]{\\dfrac{6 V_0}{\\pi}}',
        level: 'derived',
        condition: '球体模型（液体/固体）',
        note: `当前(${substance.name}): d = (6 × ${estimation.V0.toExponential(1)} / π)^(1/3) ≈ ${(estimation.size * 1e10).toFixed(1)} Å`,
      },
      {
        name: '样本分子数',
        latex: 'N = \\dfrac{m}{M} N_A \\text{ 或 } \\dfrac{V}{V_{mol}} N_A',
        level: 'derived',
        condition: '任何物质',
        note: `当前(${substance.name} ${inputValue}${inputModeVal === 0 ? 'g' : 'cm³'}): N ≈ ${estimation.N.toExponential(2)} 个`,
      },
    ],
    gaokaoPoints: [
      { text: '温度是分子平均动能的标志；微粒越小、温度越高，不平衡撞击越剧烈，布朗运动越明显。', importance: 'gaokao' },
      { text: '布朗运动是悬浮微粒的无规则运动，不是分子的运动，它间接反映了液体分子的无规则热运动。', importance: 'hard' },
      { text: '分子热运动是分子的无规则运动，永不停息且无规则，温度是热运动剧烈程度的量度。', importance: 'core' },
    ],
    warnings: [
      { text: '布朗运动的主体是悬浮固体微粒（如花粉），绝对不是液体分子本身！', level: 'danger' },
      { text: '布朗运动是受到大量分子碰撞的不平衡合力所致，并非单个分子碰撞的偶然表现。', level: 'warning' },
      { text: '温度升高，分子的平均动能增大，但并不是所有单个分子的动能都增大，这是统计规律。', level: 'warning' },
    ],
  }
}
