import type { PhysicsPanelData, PhysicsQuantity } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY } from '../../../physics/constants'
import { computeInclinedPlane } from '../../../physics/inclined_plane'

const DEFAULTS = {
  theta: { default: 30 },
  mu: { default: 0.3 },
  m: { default: 2.0 },
}

/**
 * 处理斜面模型物理指标与教学公式看板数据
 * 
 * @param animId 动画 ID
 * @param params 参数值映射
 * @param _time 仿真时间
 * @param base 基础物理量
 */
export function handleInclinedPlane(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-inclined-plane') return null
  const p = normalizeParams(params, DEFAULTS)

  const theta = p.theta ?? 30
  const mu = p.mu ?? 0.3
  const m = p.m ?? 2.0
  const g = GRAVITY

  const res = computeInclinedPlane({ theta, mu, m, g })

  return {
    quantities: [
      ...base,
      { label: '倾角 θ', value: `${theta.toFixed(0)}`, unit: '°' },
      { label: '动摩擦因数 μ', value: `${mu.toFixed(2)}`, unit: '' },
      { label: '质量 m', value: `${m.toFixed(1)}`, unit: 'kg' },
      { label: '运动状态', value: res.isSliding ? '下滑加速' : '静止平衡', unit: '', highlight: res.isSliding ? ('positive' as const) : ('zero' as const) },
      { label: '正压力 F_N', value: `${res.FN.toFixed(2)}`, unit: 'N', highlight: 'positive' as const },
      { label: '摩擦力 F_f', value: `${res.Ff.toFixed(2)}`, unit: 'N', highlight: res.Ff > 0.05 ? ('positive' as const) : ('zero' as const) },
      { label: '加速度 a', value: `${res.accel.toFixed(2)}`, unit: 'm/s²', highlight: res.accel > 0.05 ? ('positive' as const) : ('zero' as const) },
      { label: '临界下滑角 θ_crit', value: `${res.criticalTheta.toFixed(1)}`, unit: '°', highlight: 'extreme' as const },
    ],
    formulas: [
      { name: '垂直斜面平衡', latex: 'F_N = mg\\cos\\theta', level: 'core' },
      { name: '最大静摩擦力', latex: 'F_{f\\text{max}} = \\mu F_N = \\mu mg\\cos\\theta', level: 'core' },
      { name: '下滑临界条件', latex: '\\tan\\theta_{\\text{crit}} = \\mu', level: 'important' },
      { name: '加速下滑规律', latex: 'a = g\\sin\\theta - \\mu g\\cos\\theta', level: 'important', condition: '\\theta > \\theta_{\\text{crit}}' },
      { name: '静止平衡规律', latex: 'F_f = mg\\sin\\theta', level: 'core', condition: '\\theta \\le \\theta_{\\text{crit}}' }
    ],
    gaokaoPoints: [
      { text: '判断物块下滑的关键，在于比较沿斜面的动力分量 mg sinθ 与最大静摩擦力 f_max 的大小，临界判定为 tan θ_crit = μ。', importance: 'gaokao' as const },
      { text: '当 θ > θ_crit 时，物体开始加速下滑，摩擦力变为滑动摩擦力 f = μ mg cosθ，加速度随角度增大而增大。', importance: 'core' as const },
      { text: '改变质量 m 无法改变物体是否下滑的本质状态！通过调节质量 m 的滑动条可发现临界角完全不动，破除“越重越容易下滑”的直觉误区。', importance: 'gaokao' as const },
    ]
  }
}
