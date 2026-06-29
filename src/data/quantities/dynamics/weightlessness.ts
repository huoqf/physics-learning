import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateElevatorMotion } from '../../../physics'

interface Params {
  m: number
  g: number
  a: number
  advancedMode: number
  modelIdx: number
}

const DEFAULTS: ParamDefs<Params> = {
  m: { default: 50 },
  g: { default: 9.8 },
  a: { default: 2 },
  advancedMode: { default: 0 },
  modelIdx: { default: 0 },
}

export function handleWeightlessness(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-weightlessness') return null
  const p = normalizeParams(params, DEFAULTS)

  const m = p.m ?? 50
  const g = p.g ?? 9.8
  const a_param = p.a ?? 2
  const advancedMode = p.advancedMode ?? 0

  let a = a_param
  let v = 0
  let N = m * (g + a)
  let stateName = '正常平衡'

  if (advancedMode === 1) {
    const modelIdx = (p.modelIdx ?? 0) as 0 | 1
    const motion = calculateElevatorMotion(modelIdx, m, g, time)
    a = motion.a
    v = motion.v
    N = motion.N

    if (motion.state === 'overweight') stateName = '超重'
    else if (motion.state === 'underweight') stateName = '失重'
    else if (motion.state === 'weightless') stateName = '完全失重'
    else stateName = '正常平衡'
  } else {
    const motion = calculateElevatorMotion(2, m, g, time, a_param)
    a = a_param
    v = motion.v
    N = m * (g + a)
    if (N < 0) N = 0

    if (Math.abs(a) < 0.01) stateName = '正常平衡'
    else if (Math.abs(a + g) < 0.1) stateName = '完全失重'
    else if (a > 0) stateName = '超重'
    else stateName = '失重'
  }

  return {
    quantities: [
      ...base,
      { label: '电梯加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : a < -0.05 ? 'negative' as const : 'zero' as const },
      { label: '支持力/视重 N', value: N.toFixed(1), unit: 'N', highlight: N > m * g + 0.1 ? 'positive' as const : N < 0.1 ? 'zero' as const : N < m * g - 0.1 ? 'negative' as const : undefined },
      { label: '真实重力 G', value: (m * g).toFixed(1), unit: 'N' },
      { label: '电梯速度 v', value: v.toFixed(2), unit: 'm/s' },
      { label: '超失重状态', value: stateName, unit: '', highlight: stateName === '超重' ? 'positive' as const : stateName === '完全失重' ? 'extreme' as const : stateName === '失重' ? 'negative' as const : undefined }
    ],
    formulas: [
      { name: '视重计算公式', latex: 'N = m(g + a)', level: 'core', condition: '取向上为正方向' },
      { name: '牛顿第二定律', latex: 'N - mg = ma', level: 'core', condition: '取向上为正方向' }
    ],
    gaokaoPoints: [
      { text: '【实重与视重】物体的真实重力 mg 保持不变，改变的仅是支持力（视重）。', importance: 'core' as const },
      { text: '【加速度决定态】状态仅由 a 的方向决定：a 向上则超重，a 向下则失重，与速度方向无关。', importance: 'gaokao' as const },
      { text: '【完全失重】当 a = -g 时，支持力 N = 0，物体在空中处于漂浮态。', importance: 'core' as const }
    ]
  }
}
