import type { PhysicsPanelData } from './types'
import { normalizeParams, type ParamDefs } from './types'
import { NUCLIDES, MASS_PROTON, MASS_NEUTRON, MASS_MEV_CONVERSION } from '@/features/modern/nuclear-reaction/model/constants'

interface NuclearReactionParams {
  mode: number                   // 0: 结合能, 1: 核反应
  nuclide: number                // 结合能模式下的核种 (0-6)
  showMassDefectWeight: number   // 0: 不放, 1: 放砝码
  reactionType: number           // 0: 聚变, 1: 单次裂变, 2: 链式反应
}

const DEFAULTS: ParamDefs<NuclearReactionParams> = {
  mode: { default: 0 },
  nuclide: { default: 3 },
  showMassDefectWeight: { default: 0 },
  reactionType: { default: 0 },
}

export function buildNuclearReactionQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-nuclear-reaction') return null

  const p = normalizeParams(params, DEFAULTS)

  const quantities = []
  const formulas = []
  const gaokaoPoints = []
  let mnemonic = ''

  if (p.mode === 0) {
    // ─── 结合能与质量亏损 ───
    const nuc = NUCLIDES[p.nuclide] ?? NUCLIDES[3]
    const mSum = nuc.Z * MASS_PROTON + nuc.N * MASS_NEUTRON
    const deltaM = Math.max(0, mSum - nuc.mNucleus)
    const eBindingCalculated = deltaM * MASS_MEV_CONVERSION
    const eAvg = nuc.A > 1 ? eBindingCalculated / nuc.A : 0

    quantities.push(
      { label: '当前核种', value: `${nuc.name} (${nuc.symbol})`, unit: '' },
      { label: '质子数 Z', value: nuc.Z, unit: '个' },
      { label: '中子数 N', value: nuc.N, unit: '个' },
      { label: '核子分散总质量 M_sum', value: mSum.toFixed(6), unit: 'u' },
      { label: '原子核实际质量 M_nuc', value: nuc.mNucleus.toFixed(6), unit: 'u' },
      { label: '质量亏损 Δm', value: deltaM.toFixed(6), unit: 'u', highlight: 'positive' as const },
      { label: '原子核结合能 E_b', value: eBindingCalculated.toFixed(2), unit: 'MeV' },
      { label: '比结合能 E_avg', value: eAvg.toFixed(2), unit: 'MeV/核子', highlight: 'extreme' as const },
    )

    formulas.push(
      { name: '质量亏损公式', latex: '\\Delta m = [Z m_p + (A - Z) m_n] - M_X', level: 'core' as const },
      { name: '爱因斯坦质能方程', latex: '\\Delta E = \\Delta m c^2', level: 'core' as const },
      { name: '比结合能公式', latex: 'E_{\\text{avg}} = \\frac{E_b}{A}', level: 'core' as const },
    )

    gaokaoPoints.push(
      { text: '结合能：分散的核子结合成原子核时释放的能量，或把原子核拆解为核子所需的能量。', importance: 'basic' as const },
      { text: '比结合能（平均结合能）：结合能除以质量数。比结合能越大，表示核子结合得越紧密，原子核越稳定。', importance: 'gaokao' as const },
      { text: '质量与能量对应：质量亏损并非质量变成了能量，而是当系统释放结合能时，其总能量降低，由于质能对应，系统的总惯性质量也相应减少了。', importance: 'core' as const },
      { text: '规律：中等质量的原子核比结合能最大（最稳定，铁-56在曲线顶点）；轻核与重核的比结合能较小。', importance: 'core' as const },
    )

    mnemonic = '核子聚拢释放能，质量亏损称作 Δm；比结合能越大越紧密，铁核居顶最安稳。'
  } else {
    // ─── 核反应过程 ───
    if (p.reactionType === 0) {
      // 轻核聚变
      // ²H + ³H -> ⁴He + n + 17.6 MeV
      const mBefore = 2.013553 + 3.015500
      const mAfter = 4.001506 + 1.008665
      const deltaM = mBefore - mAfter
      const eReleased = deltaM * MASS_MEV_CONVERSION

      quantities.push(
        { label: '反应类型', value: '轻核聚变 (Fusion)', unit: '' },
        { label: '反应前总质量 M_前', value: mBefore.toFixed(6), unit: 'u' },
        { label: '反应后总质量 M_后', value: mAfter.toFixed(6), unit: 'u' },
        { label: '质量亏损 Δm', value: deltaM.toFixed(6), unit: 'u', highlight: 'positive' as const },
        { label: '释放能量 ΔE', value: `${eReleased.toFixed(2)} (约17.6)`, unit: 'MeV', highlight: 'extreme' as const },
      )

      formulas.push(
        { name: '轻核聚变方程', latex: '{}^2_1\\text{H} + {}^3_1\\text{H} \\rightarrow {}^4_2\\text{He} + {}^1_0\\text{n} + 17.6\\text{ MeV}', level: 'core' as const },
        { name: '释放能量计算', latex: '\\Delta E = \\Delta m \\times 931.5\\text{ MeV}', level: 'core' as const },
      )

      gaokaoPoints.push(
        { text: '轻核聚变：两个轻核结合成较重原子核的反应。反应前后的比结合能上升，释放巨大能量。', importance: 'basic' as const },
        { text: '聚变优势：聚变比裂变释放的平均每个核子能量更大，且产物无长半衰期放射性污染，燃料储量极丰富。', importance: 'core' as const },
        { text: '发生条件：必须克服核子间巨大的库仑排斥力，使核子接近到核力作用范围。需要极高温度（热核反应）或高压。', importance: 'gaokao' as const },
      )

      mnemonic = '氘氚碰壁聚氦核，扔出中子能量多；要想迈过库仑障，超高温度必经过。'
    } else if (p.reactionType === 1) {
      // 重核单次裂变
      // n + ²³⁵U -> ¹⁴⁴Ba + ⁸⁹Kr + 3n + ~200 MeV
      const mBefore = 235.043929 + 1.008665
      const mAfter = 143.922953 + 88.917630 + 3 * 1.008665
      const deltaM = mBefore - mAfter
      const eReleased = deltaM * MASS_MEV_CONVERSION

      quantities.push(
        { label: '反应类型', value: '重核裂变 (Fission)', unit: '' },
        { label: '反应前总质量 M_前', value: mBefore.toFixed(6), unit: 'u' },
        { label: '反应后总质量 M_后', value: mAfter.toFixed(6), unit: 'u' },
        { label: '质量亏损 Δm', value: deltaM.toFixed(6), unit: 'u', highlight: 'positive' as const },
        { label: '释放能量 ΔE', value: `${eReleased.toFixed(1)} (约200)`, unit: 'MeV', highlight: 'extreme' as const },
      )

      formulas.push(
        { name: '铀-235裂变方程', latex: '{}^1_0\\text{n} + {}^{235}_{92}\\text{U} \\rightarrow {}^{144}_{56}\\text{Ba} + {}^{89}_{36}\\text{Kr} + 3{}^1_0\\text{n} + 200\\text{ MeV}', level: 'core' as const },
      )

      gaokaoPoints.push(
        { text: '重核裂变：重核在慢中子轰击下分裂成两个中等质量原子核的反应。反应前后的比结合能大幅上升。', importance: 'basic' as const },
        { text: '链式反应：裂变释放的快中子（减速成慢中子后）轰击其他铀核，使反应自发、指数级地持续进行。', importance: 'gaokao' as const },
        { text: '临界体积：裂变物质能够维持链式反应所需的最小体积。小于临界体积，中子容易逃逸到外部导致反应中断。', importance: 'core' as const },
      )

      mnemonic = '慢中子轰击铀核裂，裂变释放快中子；代代相传指数升，临界体积是生死。'
    } else {
      // 链式反应
      // 指数级增长的模拟数据
      const generation = Math.min(4, 1 + Math.floor(time * 2.5))
      const countU235 = Math.pow(3, generation - 1)
      const cumulativeEnergy = ((Math.pow(3, generation) - 1) / 2) * 200

      quantities.push(
        { label: '反应类型', value: '链式反应 (Chain)', unit: '' },
        { label: '当前裂变代数', value: generation, unit: '代' },
        { label: '本代裂变铀核数', value: countU235, unit: '个' },
        { label: '累计裂变铀核数', value: (Math.pow(3, generation) - 1) / 2, unit: '个' },
        { label: '累计释放能 ΔE_cum', value: cumulativeEnergy >= 1000 ? `${(cumulativeEnergy / 1000).toFixed(2)}` : cumulativeEnergy.toFixed(0), unit: cumulativeEnergy >= 1000 ? 'GeV' : 'MeV', highlight: 'extreme' as const },
      )

      formulas.push(
        { name: '链式反应指数增长', latex: 'N_n = 3^{n-1} \\quad (E_{\\text{cum}} \\propto 3^n)', level: 'core' as const },
      )

      gaokaoPoints.push(
        { text: '链式反应：每次裂变会放出2~3个中子。如果这些中子能继续引起其他重核裂变，裂变就会代代相传，并以指数级速度剧增，瞬间释放惊人能量。', importance: 'gaokao' as const },
        { text: '减速剂：铀-235最容易捕获慢中子（热中子），而裂变放出的中子是快中子，需要用石墨、重水或普通水等做减速剂来调速。', importance: 'core' as const },
        { text: '控制棒：用吸收中子能力极强的镉或硼制成，通过调节控制棒插入深度控制反应速度。', importance: 'core' as const },
      )

      mnemonic = '一中子打入铀核裂，生出三子继续追；代代相乘指数爆，控制棒深减速度。'
    }
  }

  return {
    quantities,
    formulas,
    gaokaoPoints,
    mnemonic,
  }
}
