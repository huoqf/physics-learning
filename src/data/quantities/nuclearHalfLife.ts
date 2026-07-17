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

  const quantities = [
    { label: '半衰期 T', value: p.halfLife.toFixed(1), unit: 's' },
    { label: '初始原子核数 N₀', value: p.initCount, unit: '个' },
    { label: '理论剩余原子核数', value: theoryRemaining, unit: '个' },
    { label: '理论已衰变比例', value: decayRatio.toFixed(0), unit: '%' },
    { label: '当前温度 t', value: `${p.temperature} (半衰期不变)`, unit: '℃', highlight: 'zero' as const },
    { label: '当前压强 p', value: `${p.pressure.toFixed(1)} (半衰期不变)`, unit: 'atm', highlight: 'zero' as const },
  ]

  const formulas = [
    { name: '半衰期公式 (核个数)', latex: 'N(t) = N_0 \\left(\\frac{1}{2}\\right)^{\\frac{t}{T}}', level: 'core' as const },
    { name: '半衰期公式 (核质量)', latex: 'm(t) = m_0 \\left(\\frac{1}{2}\\right)^{\\frac{t}{T}}', level: 'core' as const },
  ]

  const gaokaoPoints = [
    { text: '半衰期：放射性元素的原子核有半数发生衰变所需的时间。', importance: 'basic' as const },
    { text: '半衰期由原子核内部自身性质决定，与所处的物理状态（温度、压强、电磁场）或化学状态（单质/化合物）完全无关！', importance: 'gaokao' as const },
    { text: '半衰期是一个统计规律，仅对大量原子核的衰变成立，对单个或少数原子核的衰变无意义（具有偶然性与随机性）。', importance: 'core' as const },
    { text: '高考要点：半衰期的统计起伏。当初始核数 N₀ 较少时，实际曲线有明显的波动；当 N₀ 很大时，实际曲线完美贴合指数理论曲线。', importance: 'hard' as const },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
    mnemonic: '半数衰变用时 T，内部决定与外无关；温度压强不改道，大量统计才灵验。',
  }
}
