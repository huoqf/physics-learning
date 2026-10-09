/**
 * 阿伏伽德罗常数与微观量估算物理量看板数据构建。
 */
import { SUBSTANCE_PRESETS, estimateMicroQuantities } from '@/physics/brownianMotion'
import { AVOGADRO_CONSTANT } from '@/physics'
import { THERMO_COLORS, PHYSICS_COLORS } from '@/theme/physics'
import { splitScientific, formatScientific } from '@/utils'
import type { PhysicsPanelData } from '../types'

export function buildMicroQuantitiesData(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _lastChangedParam?: string | null,
): PhysicsPanelData | null {
  if (animId !== 'anim-micro-quantities') return null

  const substanceIdx = params.substanceIdx ?? 0
  const inputModeVal = params.inputMode ?? 0
  const inputValue = params.inputValue ?? 18

  const substance = SUBSTANCE_PRESETS[substanceIdx] || SUBSTANCE_PRESETS[0]
  const inputModeStr = inputModeVal === 0 ? 'mass' : 'volume'
  const est = estimateMicroQuantities(substance, inputModeStr, inputValue)

  const isSphere = substance.model === 'sphere'
  const m0Fmt = splitScientific(est.m0, 2, 'kg')
  const V0Fmt = splitScientific(est.V0, 2, 'm³')
  const nFmt = splitScientific(est.n, 2, 'mol')
  const NFmt = splitScientific(est.N, 2, '个')

  return {
    quantities: [
      { label: '选定研究物质', value: `${substance.name} (${substance.symbol})`, unit: '' },
      { label: '摩尔质量 M', value: (substance.molMass * 1000).toFixed(1), unit: 'g/mol', color: THERMO_COLORS.temperature },
      { label: '物质密度 ρ', value: (substance.density / 1000).toFixed(3), unit: 'g/cm³' },
      { label: '单个分子质量 m₀', value: m0Fmt.value, unit: m0Fmt.unit, color: PHYSICS_COLORS.forceNet },
      { label: '单个分子占据空间 V₀', value: V0Fmt.value, unit: V0Fmt.unit },
      {
        label: isSphere ? '分子直径 d (球体)' : '分子平均间距 L (立方)',
        value: isSphere ? (est.size * 1e10).toFixed(2) : (est.size * 1e9).toFixed(2),
        unit: isSphere ? 'Å (10⁻¹⁰m)' : 'nm (10⁻⁹m)',
        highlight: 'extreme',
        color: PHYSICS_COLORS.velocity,
      },
      { label: '样本物质的量 n', value: nFmt.value, unit: nFmt.unit },
      { label: '样本总分子数 N', value: NFmt.value, unit: NFmt.unit, highlight: 'extreme', color: THERMO_COLORS.heatAbsorb },
    ],
    formulas: [
      {
        name: '单个微观分子质量',
        latex: 'm_0 = \\dfrac{M}{N_A}',
        level: 'core',
        condition: '适用于任何纯净物',
        note: `当前: m₀ = ${substance.molMass} / (${formatScientific(AVOGADRO_CONSTANT, 2)}) ≈ ${formatScientific(est.m0, 2)} kg`,
      },
      {
        name: '单个分子占据体积',
        latex: 'V_0 = \\dfrac{V_{mol}}{N_A} = \\dfrac{M}{\\rho N_A}',
        level: 'core',
        condition: '宏观量向微观空间桥梁',
        note: `当前: V₀ ≈ ${formatScientific(est.V0, 2)} m³`,
      },
      {
        name: isSphere ? '球体紧密排列模型（固体/液体）' : '立方体均摊模型（气体）',
        latex: isSphere
          ? 'd = \\sqrt[3]{\\dfrac{6 V_0}{\\pi}} = \\sqrt[3]{\\dfrac{6 M}{\\pi \\rho N_A}}'
          : 'L = \\sqrt[3]{V_0} = \\sqrt[3]{\\dfrac{V_{mol}}{N_A}}',
        level: 'important',
        condition: isSphere ? '固体、液体分子尺寸估算' : '气体分子平均间距估算',
        note: isSphere
          ? `固体/液体分子紧密接触，分子本身大小即为其所占体积`
          : `气体分子间距极大，计算结果为分子间平均距离并非分子自身半径`,
      },
      {
        name: '微观实体总数估算',
        latex: 'N = n \\cdot N_A = \\dfrac{m}{M} N_A = \\dfrac{V}{V_{mol}} N_A',
        level: 'core',
        condition: '宏观质量或体积估算粒子数',
      },
    ],
    gaokaoPoints: [
      {
        text: '阿伏伽德罗常数 NA 是联系宏观物理量（质量、体积、摩尔质量、摩尔体积）与微观物理量（分子质量、分子体积、分子个数）的桥梁纽带。',
        importance: 'gaokao',
      },
      {
        text: '微观模型选择区分：固体和液体分子大小采用“球形模型”或“立方体模型”紧密排列；气体分子之间空隙极大，通过摩尔体积与 NA 算出的并非分子直径，而是气体分子间的“平均距离”。',
        importance: 'gaokao',
      },
      {
        text: '数量级常识记忆：一般分子质量数量级为 10⁻²⁶ kg，分子大小（直径）数量级为 10⁻¹⁰ m（约几个 Å）。',
        importance: 'core',
      },
    ],
    warnings: [
      {
        text: '严禁混淆气体摩尔体积与气体分子大小！标况下 1mol 气体体积为 22.4L，由 V_mol / NA 算出的间距约为 10⁻⁹ m，而气体分子自身直径仍为 10⁻¹⁰ m 左右！',
        level: 'danger',
      },
      {
        text: '对于单原子分子（如稀有气体、金属），微观粒子是指原子；对于多原子分子，计算得到的是分子整体尺寸。',
        level: 'warning',
      },
    ],
  }
}
