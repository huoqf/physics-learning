import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, calculateFrictionPullModel, calculateDoubleFrictionIncline } from '../../../physics'

interface Params {
  mode: number
  m: number
  mu: number
  g: number
  F_applied: number
  M: number
  angle: number
  mu_1: number
  mu_2: number
}

const DEFAULTS: ParamDefs<Params> = {
  mode: { default: 0 },
  m: { default: 5 },
  mu: { default: 0.3 },
  g: { default: GRAVITY },
  F_applied: { default: 15 },
  M: { default: 10 },
  angle: { default: 15 },
  mu_1: { default: 0.3 },
  mu_2: { default: 0.2 },
}

export function handleFriction(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-friction') return null
  const p = normalizeParams(params, DEFAULTS)

  const mode = p.mode ?? 0
  const m = p.m ?? 5
  const mu = p.mu ?? 0.3
  const g = p.g ?? GRAVITY

  if (mode === 0) {
    const F_applied = p.F_applied ?? 15
    const { a, F_net, isSliding, f_actual } = calculateFrictionPullModel(m, mu, F_applied, g)

    return {
      quantities: [
        ...base,
        { label: '运动状态', value: isSliding ? '匀加速滑动' : '静止', unit: '', highlight: isSliding ? 'positive' as const : 'zero' as const },
        { label: '摩擦力 f', value: f_actual.toFixed(2), unit: 'N', highlight: f_actual > 0.05 ? 'positive' as const : 'zero' as const },
        { label: '合外力 F_合', value: F_net.toFixed(2), unit: 'N', highlight: F_net > 0.05 ? 'positive' as const : 'zero' as const },
        { label: '加速度 a', value: a.toFixed(2), unit: 'm/s²', highlight: a > 0.05 ? 'positive' as const : 'zero' as const },
      ],
      formulas: [
        { name: '最大静摩擦力', latex: 'f_{\\text{max}} = \\mu_s F_N = 1.12\\mu mg', level: 'important', note: '1.12为静动摩擦系数比' },
        { name: '滑动摩擦力', latex: 'f_{\\text{slip}} = \\mu F_N = \\mu mg', level: 'core', condition: '水平面上' },
        { name: '滑动状态', latex: 'f = f_{\\text{slip}},\\quad a = \\frac{F - f_{\\text{slip}}}{m}', level: 'core' }
      ],
      gaokaoPoints: [
        { text: '静摩擦力是被动力，范围为 0 至最大静摩擦力。', importance: 'core' as const },
        { text: '滑动摩擦力仅取决于正压力和动摩擦因数，与速度、接触面积均无关。', importance: 'core' as const },
        { text: '最大静摩擦力略大于滑动摩擦力（1.12 倍），临界时摩擦力会突跳。', importance: 'gaokao' as const },
        { text: '解答摩擦力问题必须先判定：静摩擦还是滑动摩擦。', importance: 'gaokao' as const }
      ]
    }
  } else {
    const M = p.M ?? 10
    const theta = p.angle ?? 15
    const mu_1 = p.mu_1 ?? 0.3
    const mu_2 = p.mu_2 ?? 0.2
    const res = calculateDoubleFrictionIncline({ m, M, theta, mu_1, mu_2, g })

    let stateStr = '完全静止'
    let stateHighlight: 'zero' | 'positive' | 'extreme' = 'zero'
    if (res.isBlockSliding && res.isInclineSliding) {
      stateStr = '双加速错位滑动'
      stateHighlight = 'extreme'
    } else if (res.isBlockSliding) {
      stateStr = '滑块滑动 / 斜面静止'
      stateHighlight = 'positive'
    }

    const a1 = Math.sqrt(res.a_1x * res.a_1x + res.a_1y * res.a_1y)

    return {
      quantities: [
        ...base,
        { label: '运动状态', value: stateStr, unit: '', highlight: stateHighlight },
        { label: '滑块对斜面摩擦力 f₁', value: res.f1.toFixed(2), unit: 'N', highlight: res.f1 > 0.05 ? 'positive' as const : 'zero' as const },
        { label: '斜面所受地摩擦力 f₂', value: res.f2.toFixed(2), unit: 'N', highlight: res.f2 > 0.05 ? 'positive' as const : 'zero' as const },
        { label: '斜面水平加速度 a_M', value: res.a_M.toFixed(2), unit: 'm/s²', highlight: res.a_M > 0.05 ? 'positive' as const : 'zero' as const },
        { label: '滑块对地加速度 a₁', value: a1.toFixed(2), unit: 'm/s²', highlight: a1 > 0.05 ? 'positive' as const : 'zero' as const },
        { label: '临界下滑角 θ_c', value: res.criticalAngle.toFixed(1), unit: '°', highlight: 'extreme' as const },
      ],
      formulas: [
        { name: '几何关联', latex: '\\tan\\theta = \\frac{a_{1y}}{a_{1x} + a_M}', level: 'core' },
        { name: '竖直分解', latex: 'mg - F_{N1}\\cos\\theta - f_1\\sin\\theta = ma_{1y}', level: 'core', condition: '滑块沿y轴' },
        { name: '水平分解', latex: 'F_{N1}\\sin\\theta - f_1\\cos\\theta = ma_{1x}', level: 'important', condition: '滑块沿x轴' },
        { name: '斜面动力学', latex: 'F_{N1}\\sin\\theta - f_1\\cos\\theta - f_2 = Ma_M', level: 'important', condition: '斜面沿x轴' }
      ],
      gaokaoPoints: [
        { text: '临界条件 tan θ_c = 1.12 μ₁，超过后滑块在斜面上滑动并突跳减小。', importance: 'gaokao' as const },
        { text: '当滑块给斜面的水平推力大于地面最大静摩擦力时，斜面体同步向右加速运动。', importance: 'hard' as const },
        { text: '解答摩擦力多体系统必须建立地面系惯性参考坐标系进行正交分解。', importance: 'core' as const }
      ]
    }
  }
}
