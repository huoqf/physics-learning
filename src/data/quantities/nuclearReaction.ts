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
      { name: '爱因斯坦质能方程', latex: '\\Delta E = \\Delta m c^2 = \\Delta m \\times 931.5\\text{ MeV}', level: 'core' as const },
      { name: '比结合能公式', latex: 'E_{\\text{avg}} = \\frac{E_b}{A}', level: 'core' as const },
      { name: '结合能与释放核能关系', latex: '\\Delta E = E_{\\text{后总结合能}} - E_{\\text{前总结合能}}', level: 'important' as const },
    )

    gaokaoPoints.push(
      { text: '结合能：分散的核子结合成原子核时释放的能量，或把原子核拆解为自由核子所需吸收的能量。', importance: 'basic' as const },
      { text: '比结合能（平均结合能）：结合能除以质量数 A。比结合能越大，表示核子结合得越紧密，原子核越稳定！', importance: 'gaokao' as const },
      { text: '易错陷阱：结合能大不等于稳定！例如 ²³⁸U 的结合能（约1800 MeV）远大于 ⁵⁶Fe（约492 MeV），但铁的比结合能（8.8 MeV）大于铀（7.6 MeV），故铁核最稳定。', importance: 'hard' as const },
      { text: '质量亏损物理本质：并不是质量消失转变成能量，而是系统总能量降低时，由相对论质能等价性导致系统惯性质量相应减少。', importance: 'core' as const },
      { text: '规律：中等质量核比结合能最大（56Fe在顶点）；轻核聚变和重核裂变都是向比结合能增大的方向反应，从而释放能量。', importance: 'core' as const },
    )

    mnemonic = '核子聚拢释放能，质量亏损称作 Δm；比结合能越大越紧密，铁核居顶最安稳。'
  } else {
    // ─── 核反应过程 ───
    if (p.reactionType === 0) {
      // 轻核聚变
      const mBefore = 2.013553 + 3.015500
      const mAfter = 4.001506 + 1.008665
      const deltaM = mBefore - mAfter
      const eReleased = deltaM * MASS_MEV_CONVERSION

      quantities.push(
        { label: '反应类型', value: '轻核聚变 (Fusion)', unit: '', highlight: 'positive' as const },
        { label: '反应前总质量 M_前', value: mBefore.toFixed(6), unit: 'u' },
        { label: '反应后总质量 M_后', value: mAfter.toFixed(6), unit: 'u' },
        { label: '质量亏损 Δm', value: deltaM.toFixed(6), unit: 'u', highlight: 'positive' as const },
        { label: '释放能量 ΔE', value: `${eReleased.toFixed(2)} (约17.6)`, unit: 'MeV', highlight: 'extreme' as const },
        { label: '平均核子释放能量', value: (17.6 / 5).toFixed(2), unit: 'MeV/核子', highlight: 'positive' as const },
      )

      formulas.push(
        { name: '轻核聚变方程 (氘氚聚变)', latex: '{}^2_1\\text{H} + {}^3_1\\text{H} \\rightarrow {}^4_2\\text{He} + {}^1_0\\text{n} + 17.6\\text{ MeV}', level: 'core' as const },
        { name: '释放能量计算', latex: '\\Delta E = \\Delta m \\times 931.5\\text{ MeV}', level: 'core' as const },
        { name: '四大核反应辨析法则', latex: '\\text{聚变: 两轻核相撞生成较重核}', level: 'important' as const },
      )

      gaokaoPoints.push(
        { text: '轻核聚变：两个轻核结合成较重原子核的反应。反应前后的比结合能大幅上升，释放巨大核能。', importance: 'basic' as const },
        { text: '聚变优越性：聚变平均每个核子释放能量（约 3.5 MeV）远大于裂变（约 0.85 MeV），原料海水中极丰富且产物无长半衰期强放射性。', importance: 'gaokao' as const },
        { text: '发生条件：必须克服核子间巨大的库仑排斥力，使核子接近到核力作用距离（10⁻¹⁵ m），故需要几千万开尔文的高温（热核反应）。', importance: 'core' as const },
        { text: '新高考速查：四大核反应类型辨析——衰变（箭头左边仅一种核）、人工核转变（微粒轰击原子核）、裂变（重核吸收慢中子分裂成两中等核）、聚变（两轻核聚合成较重核）。', importance: 'gaokao' as const },
      )

      mnemonic = '氘氚碰壁聚氦核，扔出中子能量多；要想迈过库仑障，超高温度必经过。'
    } else if (p.reactionType === 1) {
      // 重核单次裂变
      const mBefore = 235.043929 + 1.008665
      const mAfter = 143.922953 + 88.917630 + 3 * 1.008665
      const deltaM = mBefore - mAfter
      const eReleased = deltaM * MASS_MEV_CONVERSION

      quantities.push(
        { label: '反应类型', value: '重核裂变 (Fission)', unit: '', highlight: 'positive' as const },
        { label: '反应前总质量 M_前', value: mBefore.toFixed(6), unit: 'u' },
        { label: '反应后总质量 M_后', value: mAfter.toFixed(6), unit: 'u' },
        { label: '质量亏损 Δm', value: deltaM.toFixed(6), unit: 'u', highlight: 'positive' as const },
        { label: '单核释放能量 ΔE', value: `${eReleased.toFixed(1)} (约200)`, unit: 'MeV', highlight: 'extreme' as const },
        { label: '净增中子倍数', value: '3 倍 (放出3个快中子)', unit: '' },
      )

      formulas.push(
        { name: '铀-235裂变方程', latex: '{}^1_0\\text{n} + {}^{235}_{92}\\text{U} \\rightarrow {}^{144}_{56}\\text{Ba} + {}^{89}_{36}\\text{Kr} + 3{}^1_0\\text{n} + 200\\text{ MeV}', level: 'core' as const },
        { name: '核反应守恒律', latex: '\\sum A_{\\text{前}} = \\sum A_{\\text{后}}, \\quad \\sum Z_{\\text{前}} = \\sum Z_{\\text{后}}', level: 'core' as const },
      )

      gaokaoPoints.push(
        { text: '重核裂变：重核在慢中子轰击下分裂成两个中等质量原子核的反应。反应前后的比结合能上升。', importance: 'basic' as const },
        { text: '链式反应条件：铀-235对慢中子（热中子）反应概率极高，裂变放出的快中子必须用减速剂（石墨、重水）减速才能维持链式反应。', importance: 'gaokao' as const },
        { text: '临界体积：裂变物质能够维持链式反应所需的最小体积。体积过小会导致大量中子逃逸，使反应熄灭。', importance: 'core' as const },
        { text: '核反应堆核心构件：燃料棒（铀棒）、减速剂（重水/石墨）、控制棒（吸收中子能力极强的镉/硼棒，控制速率）、防护层（水泥厚铅墙）。', importance: 'gaokao' as const },
      )

      mnemonic = '慢中子轰击铀核裂，裂变释放快中子；代代相传指数升，临界体积是生死。'
    } else {
      // 链式反应
      const generation = Math.min(4, 1 + Math.floor(time * 2.5))
      const countU235 = Math.pow(3, generation - 1)
      const cumulativeEnergy = ((Math.pow(3, generation) - 1) / 2) * 200

      quantities.push(
        { label: '反应类型', value: '链式反应 (Chain)', unit: '', highlight: 'positive' as const },
        { label: '当前裂变代数', value: generation, unit: '代' },
        { label: '本代裂变铀核数', value: countU235, unit: '个' },
        { label: '累计裂变铀核数', value: (Math.pow(3, generation) - 1) / 2, unit: '个' },
        { label: '累计释放能 ΔE_cum', value: cumulativeEnergy >= 1000 ? `${(cumulativeEnergy / 1000).toFixed(2)}` : cumulativeEnergy.toFixed(0), unit: cumulativeEnergy >= 1000 ? 'GeV' : 'MeV', highlight: 'extreme' as const },
      )

      formulas.push(
        { name: '链式反应指数增长', latex: 'N_n = 3^{n-1} \\quad (E_{\\text{cum}} \\propto 3^n)', level: 'core' as const },
        { name: '人工核转变对比方程', latex: '{}^{14}_7\\text{N} + {}^4_2\\text{He} \\rightarrow {}^{17}_8\\text{O} + {}^1_1\\text{H} \\quad (\\text{卢瑟福发现质子})', level: 'important' as const },
        { name: '查德威克发现中子方程', latex: '{}^9_4\\text{Be} + {}^4_2\\text{He} \\rightarrow {}^{12}_6\\text{C} + {}^1_0\\text{n}', level: 'important' as const },
      )

      gaokaoPoints.push(
        { text: '链式反应特点：每次裂变放出 2~3 个快中子，在足够体积下呈 3ⁿ 指数级爆炸式蔓延，微秒级瞬间释放出毁灭性核能（原子弹原理）。', importance: 'gaokao' as const },
        { text: '人工核转变考点辨析：不是自发的（衰变是自发的），必须由外来高速粒子轰击靶核（例如发现质子、发现中子、制造人工放射性同位素）。', importance: 'gaokao' as const },
        { text: '控制棒调控机理：镉棒或硼棒插入越深，吸收中子越多，反应速度越慢；向上提起则反应加快。', importance: 'core' as const },
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
