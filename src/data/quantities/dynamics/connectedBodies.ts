import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, calculateConnectedBody } from '../../../physics'

interface Params {
  m1: number
  m2: number
  F: number
  mu: number
  advancedMode: number
  analysisView: number
}

const DEFAULTS: ParamDefs<Params> = {
  m1: { default: 2 },
  m2: { default: 3 },
  F: { default: 15 },
  mu: { default: 0.1 },
  advancedMode: { default: 0 },
  analysisView: { default: 0 },
}

export function handleConnectedBodies(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-connected-bodies') return null
  const p = normalizeParams(params, DEFAULTS)

  const m1 = p.m1 ?? 2
  const m2 = p.m2 ?? 3
  const F = p.F ?? 15
  const mu = p.mu ?? 0.1
  const advancedMode = p.advancedMode ?? 0
  const analysisView = p.analysisView ?? 0

  const physicsResult = calculateConnectedBody(m1, m2, F, mu, GRAVITY)
  const { isMoving: isMovingPhysically, a: acceleration, T: tension } = physicsResult

  const tMax = 4.0
  const isStarted = time > 0
  const isEnded = advancedMode === 0 ? false : time >= tMax
  const isMoving = isStarted && !isEnded && isMovingPhysically

  const currentA = isMoving ? acceleration : 0
  const currentT = isMoving ? tension : physicsResult.displayTension
  const currentFf1 = physicsResult.f1Max
  const currentFf2 = physicsResult.f2Max

  const quantities = [
    ...base,
    { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' as const : undefined },
    { label: '连接内力 T', value: currentT.toFixed(1), unit: 'N', highlight: currentT > 0 ? 'positive' as const : undefined },
    { label: 'm₁ 摩擦力 f₁', value: currentFf1.toFixed(1), unit: 'N' },
    { label: 'm₂ 摩擦力 f₂', value: currentFf2.toFixed(1), unit: 'N' },
  ]

  const formulas: Formula[] = []
  if (analysisView === 0) {
    formulas.push({ name: '① 整体方程', latex: 'F - f_1 - f_2 = (m_1 + m_2)a', level: 'core' })
    formulas.push({ name: '② 隔离 m₁', latex: 'T - f_1 = m_1 a', level: 'core' })
  } else if (analysisView === 1) {
    formulas.push({ name: '整体方程 (高亮)', latex: 'F - (f_1 + f_2) = (m_1 + m_2)a', level: 'core' })
  } else if (analysisView === 2) {
    formulas.push({ name: '隔离 m₁ (高亮)', latex: 'T - f_1 = m_1 a', level: 'core' })
    formulas.push({ name: '内力结论', latex: 'T = \\frac{m_1}{m_1 + m_2}F', level: 'important', condition: '同材质粗糙面上滑动时', note: '与摩擦系数μ无关' })
  } else if (analysisView === 3) {
    formulas.push({ name: '隔离 m₂ (高亮)', latex: 'F - T - f_2 = m_2 a', level: 'core' })
  }

  const gaokaoPoints: GaokaoPoint[] = [
    { text: '整体法与隔离法：求解系统加速度优先用整体法，求解内力必须隔离。', importance: 'core' as const },
    { text: '秒杀结论：在同材质粗糙面上滑动时，绳/弹簧拉力 T = m₁F/(m₁+m₂)，与摩擦系数 μ 无关。', importance: 'gaokao' as const },
    { text: '临界起动条件：外拉力 F 必须大于最大静摩擦力之和 μ(m₁+m₂)g 才能使系统起动。', importance: 'hard' as const },
  ]

  return { quantities, formulas, gaokaoPoints }
}
