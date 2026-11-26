import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateElevatorMotion } from '../../../physics'
import { GRAVITY } from '@/physics/constants'

interface Params {
  m: number
  g: number
  a: number
  advancedMode: number
  modelIdx: number
}

const DEFAULTS: ParamDefs<Params> = {
  m: { default: 50 },
  g: { default: GRAVITY },
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
  const g = p.g ?? GRAVITY
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
      { label: '支持力/视重 N', value: N.toFixed(1), unit: 'N', highlight: N > m * g + 0.1 ? 'positive' as const : N < 0.1 ? 'zero' as const : N < m * g - 0.1 ? 'negative' as const : undefined },
      { label: '真实重力 G', value: (m * g).toFixed(1), unit: 'N' },
      { label: '电梯速度 v', value: v.toFixed(2), unit: 'm/s' },
      { label: '超失重状态', value: stateName, unit: '', highlight: stateName === '超重' ? 'positive' as const : stateName === '完全失重' ? 'extreme' as const : stateName === '失重' ? 'negative' as const : undefined }
    ],
    formulas: [
      { name: '视重计算公式', latex: 'N = m(g + a_y)', level: 'core', condition: '取竖直向上为正方向，仅受重力与支持力时（a_y 为竖直方向加速度分量）' },
      { name: '牛顿第二定律', latex: 'N - mg = m a_y', level: 'core', condition: '取竖直向上为正方向，a_y > 0 为超重，a_y < 0 为失重' }
    ],
    gaokaoPoints: [
      { text: '【实重与视重】物体的真实重力 mg 保持不变，改变的仅是支持力或拉力（视重）。', importance: 'core' as const },
      { text: '【竖直加速度分量决定】超重或失重仅取决于加速度的竖直分量 a_y 的方向：a_y 向上则超重，a_y 向下则失重，与速度方向无关。', importance: 'gaokao' as const },
      { text: '【完全失重】当 a_y = -g 时，支持力 N = 0（视重为零），物体与接触面间弹力消失（相对自由下落参考系处于漂浮状态）。', importance: 'core' as const }
    ]
  }
}
