import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, calculateNewtonSecondVariableMotion } from '../../../physics'

interface Params {
  F: number
  m: number
  mu: number
  advancedMode: number
  modelIdx: number
  k: number
  F0: number
  omega: number
}

const DEFAULTS: ParamDefs<Params> = {
  F: { default: 10 },
  m: { default: 2 },
  mu: { default: 0 },
  advancedMode: { default: 0 },
  modelIdx: { default: 0 },
  k: { default: 2 },
  F0: { default: 15 },
  omega: { default: 1.5 },
}

export function handleNewtonSecond(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-newton-second') return null
  const p = normalizeParams(params, DEFAULTS)

  const F = p.F ?? 10
  const m = p.m ?? 2
  const mu = p.mu ?? 0
  const advancedMode = p.advancedMode ?? 0

  let F_applied = F
  let f = 0
  let F_net = 0
  let a = 0
  let v = 0
  let s = 0

  if (advancedMode === 1) {
    const modelIdx = (p.modelIdx ?? 0) as 0 | 1
    const k = p.k ?? 2
    const F0 = p.F0 ?? 15
    const omega = p.omega ?? 1.5
    const motion = calculateNewtonSecondVariableMotion(modelIdx, { m, mu, k, F0, omega }, time)
    F_applied = motion.F_applied
    f = motion.f
    F_net = motion.F_net
    a = motion.a
    v = motion.v
    s = motion.s
  } else {
    const g = GRAVITY
    const N = m * g
    f = mu * N
    F_applied = F
    F_net = Math.max(0, F_applied - f)
    a = F_net / m
    v = a * time
    s = 0.5 * a * time * time
  }

  return {
    quantities: [
      ...base,
      { label: '合外力 F_合', value: F_net, unit: 'N', highlight: F_net > 0.05 ? 'positive' as const : 'zero' as const },
      { label: '加速度 a', value: a, unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
      { label: '瞬时速度 v', value: v, unit: 'm/s', highlight: v > 0.05 ? 'positive' as const : 'zero' as const },
      { label: '当前位移 s', value: s, unit: 'm' },
    ],
    formulas: [
      { name: '牛顿第二定律', latex: 'F_{\\text{合}} = ma', level: 'core' },
      { name: '合外力计算', latex: 'F_{\\text{合}} = F - f', level: 'core', condition: '水平面上，拉力与摩擦力方向相反' },
      { name: '滑动摩擦力', latex: 'f = \\mu N = \\mu mg', level: 'core', condition: '水平面上滑动时' }
    ],
    gaokaoPoints: [
      { text: '加速度 a 与合外力 F_合 瞬时对应，力变则 a 变。', importance: 'gaokao' as const },
      { text: 'a 的方向始终与合外力 F_合 的方向相同。', importance: 'core' as const },
      { text: '合外力、质量与加速度必须对应同一个研究对象（小车）。', importance: 'core' as const }
    ]
  }
}
