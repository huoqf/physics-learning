import type { PhysicsPanelData } from './types'
import { normalizeParams, type ParamDefs } from './types'

interface NuclearHalfLifeParams {
  halfLife: number
  initCount: number
  temperature: number
  pressure: number
  resetTrigger: number
}

const DEFAULTS: ParamDefs<NuclearHalfLifeParams> = {
  halfLife: { default: 4.0 },
  initCount: { default: 100 },
  temperature: { default: 20 },
  pressure: { default: 1.0 },
  resetTrigger: { default: 0 },
}

export function buildNuclearHalfLifeQuantities(
  animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-nuclear-half-life') return null

  const p = normalizeParams(params, DEFAULTS)

  // 估算当前理论剩余比例与核个数
  const decayConst = Math.log(2) / p.halfLife
  const remainingRatio = Math.exp(-decayConst * time)
  const theoryRemaining = Math.max(0, Math.round(p.initCount * remainingRatio))
  const decayRatio = (1.0 - remainingRatio) * 100

  const halfLifePeriods = time / p.halfLife
  const c14EquivalentYears = Math.round(halfLifePeriods * 5730)

  const quantities = [
    { label: '半衰期 T', value: p.halfLife.toFixed(1), unit: 's' },
    { label: '初始原子核数 N₀', value: p.initCount, unit: '个' },
    { label: '理论剩余原子核数', value: theoryRemaining, unit: '个' },
    { label: '理论已衰变比例', value: decayRatio.toFixed(0), unit: '%' },
    { label: '经历半衰期期数 n', value: halfLifePeriods.toFixed(2), unit: '期 (t/T)' },
    { label: '碳-14断代等效年份', value: `${c14EquivalentYears}`, unit: '年 (T_C14=5730年)', highlight: 'positive' as const },
    { label: '当前温度 t', value: `${p.temperature} (半衰期恒定)`, unit: '℃', highlight: 'zero' as const },
    { label: '当前压强 p', value: `${p.pressure.toFixed(1)} (半衰期恒定)`, unit: 'atm', highlight: 'zero' as const },
  ]

  const formulas = [
    { name: '半衰期公式 (核个数)', latex: 'N(t) = N_0 \\left(\\frac{1}{2}\\right)^{\\frac{t}{T}}', level: 'core' as const },
    { name: '半衰期公式 (核质量)', latex: 'm(t) = m_0 \\left(\\frac{1}{2}\\right)^{\\frac{t}{T}}', level: 'core' as const },
    { name: '碳-14 考古测年方程', latex: 't = T_{\\text{C14}} \\log_2 \\left(\\frac{N_0}{N}\\right) = 5730 \\times n\\text{ 年}', level: 'important' as const, condition: '用于生物古木断代' },
    { name: '中子轰击氮生成碳-14', latex: '{}^1_0\\text{n} + {}^{14}_7\\text{N} \\rightarrow {}^{14}_6\\text{C} + {}^1_1\\text{H}', level: 'important' as const, condition: '高层大气宇宙线' },
  ]

  const gaokaoPoints = [
    { text: '半衰期定义：放射性元素的原子核有半数发生衰变所需的时间。', importance: 'basic' as const },
    { text: '半衰期由核内部自身结构决定，与所处的物理状态（温度、压强、磁场）或化学化合态完全无关！', importance: 'gaokao' as const },
    { text: '半衰期是大量原子核的统计规律，仅对大量核成立，对单个原子核衰变无意义（具有偶然性）。', importance: 'core' as const },
    { text: '示踪原子应用：利用同位素化学性质相同且具有放射性标记特性（如用 ¹³¹I 诊断甲状腺、用 ³²P 探究植物吸磷规律）。', importance: 'gaokao' as const },
    { text: '射线应用与防护：γ 射线工业探伤与辐射育种；严格防护α（防内照射）、β（铝板阻挡）与γ（厚铅水泥屏蔽）。', importance: 'gaokao' as const },
    { text: '高考要点：统计起伏。当初始核数 N₀ 较少时，实际曲线有明显的波动；当 N₀ 很大时，实际曲线完美贴合指数理论曲线。', importance: 'hard' as const },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
    mnemonic: '半数衰变用时 T，内部决定与外无关；示踪探伤断年代，防护厚铅保平安。',
  }
}
