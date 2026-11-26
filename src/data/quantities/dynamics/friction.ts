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
        { name: '静摩擦力取值范围', latex: '0 < f_{\\text{静}} \\le f_{\\text{max}}', level: 'core', condition: '物体有相对运动趋势但保持相对静止（按二力平衡或动力学方程求解，非 μF_N）' },
        { name: '最大静摩擦力', latex: 'f_{\\text{max}} = \\mu_s F_N', level: 'core', condition: '常规近似取 μ_s = μ；仅水平面且竖直无其他外力时 F_N = mg', note: '一般不直接把 F_N 等同于 mg' },
        { name: '滑动摩擦力', latex: 'F_f = \\mu F_N', level: 'core', condition: '物体与接触面相对滑动时；水平面且竖直无其他外力时 F_N = mg' },
        { name: '滑动加速方程', latex: 'F_f = \\mu F_N,\\quad a = \\frac{F - F_f}{m}', level: 'core', condition: '水平面上拉力 F 大于最大静摩擦力且产生向右滑动时' }
      ],
      gaokaoPoints: [
        { text: '静摩擦力是被动力，范围为 0 至最大静摩擦力。', importance: 'core' as const },
        { text: '滑动摩擦力仅取决于正压力和动摩擦因数，与速度、接触面积均无关。', importance: 'core' as const },
        { text: '最大静摩擦力通常略大于滑动摩擦力，但在无特别说明的常规习题中，通常近似按二者相等计算。', importance: 'core' as const },
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
        { name: '可动斜面运动学关联', latex: '\\tan\\theta = \\frac{a_{1y}}{a_{1x} + a_M}', level: 'supplementary', condition: '滑块紧贴可动光滑/粗糙斜面体滑动时（拓展模型）' },
        { name: '滑块竖直方向牛顿第二定律', latex: 'mg - F_{N1}\\cos\\theta - f_1\\sin\\theta = ma_{1y}', level: 'supplementary', condition: '斜面体可滑动时在地面惯性系下对滑块列式' },
        { name: '滑块水平方向牛顿第二定律', latex: 'F_{N1}\\sin\\theta - f_1\\cos\\theta = ma_{1x}', level: 'supplementary', condition: '斜面体可滑动时在地面惯性系下对滑块列式' },
        { name: '斜面体水平动力学', latex: 'F_{N1}\\sin\\theta - f_1\\cos\\theta - f_2 = Ma_M', level: 'supplementary', condition: '斜面体可在地面滑动时在地面惯性系下对斜面体列式' }
      ],
      gaokaoPoints: [
        { text: '当近似取最大静摩擦因数等于动摩擦因数 μ₁ 时，临界角满足 tan θ_c = μ₁；θ > θ_c 时滑块开始下滑，摩擦力转为滑动摩擦力 f₁ = μ₁ F_N1。', importance: 'gaokao' as const },
        { text: '当滑块给斜面的水平推力大于地面最大静摩擦力时，斜面体同步向左加速运动（反冲运动）。', importance: 'hard' as const },
        { text: '解答摩擦力多体系统必须建立地面系惯性参考坐标系进行正交分解。', importance: 'core' as const }
      ]
    }
  }
}
