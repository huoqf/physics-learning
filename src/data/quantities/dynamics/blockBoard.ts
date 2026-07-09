import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { getBoardSystemState } from '../../../physics/blockBoard'

interface Params {
  m: number
  M: number
  mu1: number
  mu2: number
  v0: number
  L: number
}

const DEFAULTS: ParamDefs<Params> = {
  m: { default: 1 },
  M: { default: 3 },
  mu1: { default: 0.3 },
  mu2: { default: 0.05 },
  v0: { default: 5 },
  L: { default: 2.5 },
}

export function handleBlockBoard(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-block-board') return null
  const p = normalizeParams(params, DEFAULTS)

  const m = p.m ?? 1
  const M = p.M ?? 3
  const mu1 = p.mu1 ?? 0.3
  const mu2 = p.mu2 ?? 0.05
  const v0 = p.v0 ?? 5
  const L = p.L ?? 2.5
  const g = 9.8

  const param = { m, M, mu1, mu2, v0, L, g }
  const state = getBoardSystemState(param, time)

  // 力的计算
  const F_f1 = mu1 * m * g
  const F_f2 = state.hasFallen ? mu2 * M * g : mu2 * (M + m) * g

  const quantities = [
    ...base,
    { label: '滑块速度 v₁', value: state.vBlock.toFixed(2), unit: 'm/s', highlight: state.vBlock > 0.01 ? 'positive' as const : 'zero' as const },
    { label: '木板速度 v₂', value: state.vBoard.toFixed(2), unit: 'm/s', highlight: state.vBoard > 0.01 ? 'positive' as const : 'zero' as const },
    { label: '相对位移 Δx', value: (state.xBlock - state.xBoard).toFixed(2), unit: 'm' },
    { label: '滑块摩擦力 F_f1', value: F_f1.toFixed(1), unit: 'N' },
    { label: '地面摩擦力 F_f2', value: F_f2.toFixed(1), unit: 'N' },
    { label: '运动阶段', value: state.phase === 'sliding' ? '相对滑动' : state.phase === 'together' ? '共速整体' : state.phase === 'fallen' ? '已跌落' : '静止', unit: '' },
  ]

  const formulas: Formula[] = [
    {
      name: '① 滑块加速度',
      latex: 'a_1 = -\\mu_1 g',
      level: 'core',
      condition: '滑块在木板上滑动时',
    },
    {
      name: '② 木板加速度',
      latex: 'a_2 = \\frac{\\mu_1 mg - \\mu_2(M+m)g}{M}',
      level: 'core',
      condition: 'μ₁mg > μ₂(M+m)g 时木板才能被推动',
    },
    {
      name: '③ 共速时间',
      latex: 't_{\\text{共速}} = \\frac{v_0}{a_2 - a_1}',
      level: 'core',
    },
    {
      name: '④ 相对位移判据',
      latex: '\\Delta x = x_1(t) - x_2(t) \\leq L',
      level: 'important',
      note: '若 Δx > L 则滑块跌落，模型边界瓦解',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    { text: '板块模型核心：判断两物体何时达到速度相等（共速），以及共速前相对位移是否超过木板长度 L。', importance: 'gaokao' as const },
    { text: '解题三步：① 分别求 a₁、a₂；② 令 v₁ = v₂ 求共速时间；③ 计算相对位移 Δx 与 L 比较。', importance: 'core' as const },
    { text: '临界条件：若 μ₁mg ≤ μ₂(M+m)g，木板不动，滑块在静止木板上减速到 0。', importance: 'hard' as const },
    { text: '共速后：若静摩擦力足够维持相对静止，两者以共同加速度 a = -μ₂g 减速至停止。', importance: 'core' as const },
  ]

  return { quantities, formulas, gaokaoPoints }
}
