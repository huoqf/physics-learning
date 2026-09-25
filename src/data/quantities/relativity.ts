import type { PhysicsPanelData, ParamDefs } from './types'
import { normalizeParams } from './types'
import { calcLorentzFactor } from '@/physics/relativity'
import { PHYSICS_COLORS } from '@/theme/physics'

interface RelativityParams {
  beta: number
  m0: number
  mode: number
  showGeometry: number
}

const RELATIVITY_DEFAULTS: ParamDefs<RelativityParams> = {
  beta: { default: 0.6 },
  m0: { default: 1.0 },
  mode: { default: 0 },
  showGeometry: { default: 1 },
}

export function buildRelativityQuantities(
  animId: string,
  params: Record<string, number>,
  _time: number,
): PhysicsPanelData | null {
  if (animId !== 'anim-relativity') return null

  const p = normalizeParams(params, RELATIVITY_DEFAULTS)
  const beta = Math.min(Math.max(p.beta, 0.05), 0.95)
  const gamma = calcLorentzFactor(beta)
  const lRatio = 1 / gamma
  const m = gamma * p.m0

  // 1. 物理量展示
  const quantities: PhysicsPanelData['quantities'] = [
    {
      label: '航速与光速比',
      symbol: 'β = v/c',
      value: beta.toFixed(2),
      unit: '',
      color: PHYSICS_COLORS.velocity,
      highlight: 'positive',
    },
    {
      label: '洛伦兹因子',
      symbol: 'γ',
      value: gamma.toFixed(4),
      unit: '',
      color: PHYSICS_COLORS.acceleration,
      highlight: 'extreme',
    },
    {
      label: '相对论时间延缓',
      symbol: 'Δt / Δτ',
      value: gamma.toFixed(4),
      unit: '',
      color: PHYSICS_COLORS.period,
    },
    {
      label: '沿运动方向长度收缩率',
      symbol: 'L / L₀',
      value: lRatio.toFixed(4),
      unit: '',
      color: PHYSICS_COLORS.displacement,
    },
    {
      label: '相对论质量',
      symbol: 'm = γ·m₀',
      value: m.toFixed(3),
      unit: 'kg',
      color: PHYSICS_COLORS.potentialEnergy,
    },
  ]

  // 2. 公式列表
  const formulas: PhysicsPanelData['formulas'] = [
    {
      name: '洛伦兹变换因子',
      latex: '\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}} = \\frac{1}{\\sqrt{1 - \\beta^2}}',
      condition: '0 \\le v < c',
      level: 'core',
    },
    {
      name: '时间延缓效应（动钟变慢）',
      latex: '\\Delta t = \\gamma \\Delta \\tau = \\frac{\\Delta \\tau}{\\sqrt{1 - v^2/c^2}}',
      condition: 'Δτ 为固有时间（钟与事件相对静止系测得）',
      level: 'core',
    },
    {
      name: '长度收缩效应（动尺缩短）',
      latex: 'L = \\frac{L_0}{\\gamma} = L_0 \\sqrt{1 - v^2/c^2}',
      condition: '仅发生在沿运动速度方向，垂直方向尺寸不变',
      level: 'important',
    },
    {
      name: '爱因斯坦质能方程',
      latex: 'E = mc^2 = \\gamma m_0 c^2 = E_0 + E_k',
      condition: '静能 E₀ = m₀c²，相对论动能 Ek = (γ - 1)m₀c²',
      level: 'core',
    },
  ]

  // 3. 高考考点
  const gaokaoPoints: PhysicsPanelData['gaokaoPoints'] = [
    {
      text: '狭义相对论两大假设：狭义相对性原理（物理定律在一切惯性系形式相同）与光速不变原理（真空中光速与光源和观测者运动无关，恒为 c）。',
      importance: 'gaokao',
    },
    {
      text: '动钟变慢与固有时间：与事件相对静止的参考系测得的固有时间 Δτ 最短，其余相对运动参考系测得时间均延长（Δt = γ·Δτ > Δτ）。',
      importance: 'gaokao',
    },
    {
      text: '尺缩效应的方向性：仅发生在平行于相对运动速度方向（L = L₀/γ），垂直于运动方向的几何尺寸完全不变。',
      importance: 'core',
    },
    {
      text: '宇宙射线 μ 子寿命实验：μ 子近光速飞行因时间延缓地面测得寿命成倍延长，因而能穿透厚重大气层到达地面，是动钟变慢的直接实验铁证。',
      importance: 'gaokao',
    },
  ]

  return { quantities, formulas, gaokaoPoints }
}
