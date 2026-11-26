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
  const currentT = isMovingPhysically ? tension : 0
  const staticRange = physicsResult.staticTensionRange
  const tensionText = isMovingPhysically
    ? currentT.toFixed(1)
    : F === 0
      ? '0.0'
      : `${staticRange?.min.toFixed(1) ?? '0.0'}~${staticRange?.max.toFixed(1) ?? '0.0'} (静不定)`
  const f1Text = isMovingPhysically ? physicsResult.f1Max.toFixed(1) : F === 0 ? '0.0' : `静摩擦 (≤${physicsResult.f1Max.toFixed(1)})`
  const f2Text = isMovingPhysically ? physicsResult.f2Max.toFixed(1) : F === 0 ? '0.0' : `静摩擦 (≤${physicsResult.f2Max.toFixed(1)})`

  const quantities = [
    ...base,
    { label: '系统加速度 a', value: currentA.toFixed(2), unit: 'm/s²', highlight: currentA > 0 ? 'positive' as const : undefined },
    { label: '连接内力 T', value: tensionText, unit: 'N', highlight: isMovingPhysically && currentT > 0 ? 'positive' as const : undefined },
    { label: 'm₁ 摩擦力 f₁', value: f1Text, unit: 'N' },
    { label: 'm₂ 摩擦力 f₂', value: f2Text, unit: 'N' },
  ]

  const formulas: Formula[] = []
  if (analysisView === 0) {
    formulas.push({ name: '① 整体方程', latex: 'F - f_1 - f_2 = (m_1 + m_2)a', level: 'core' })
    formulas.push({ name: '② 隔离 m₁', latex: 'T - f_1 = m_1 a', level: 'core' })
  } else if (analysisView === 1) {
    formulas.push({ name: '整体方程 (高亮)', latex: 'F - (f_1 + f_2) = (m_1 + m_2)a', level: 'core' })
  } else if (analysisView === 2) {
    formulas.push({ name: '隔离 m₁ (高亮)', latex: 'T - f_1 = m_1 a', level: 'core' })
    formulas.push({ name: '内力结论', latex: 'T = \\frac{m_1}{m_1 + m_2}F', level: 'important', condition: '同材质粗糙面上滑动时', note: '与动摩擦因数 μ 无关' })
  } else if (analysisView === 3) {
    formulas.push({ name: '隔离 m₂ (高亮)', latex: 'F - T - f_2 = m_2 a', level: 'core' })
  }

  const gaokaoPoints: GaokaoPoint[] = [
    { text: '整体法与隔离法：求解系统加速度优先用整体法，求解内力必须隔离。', importance: 'core' as const },
    { text: '同材质粗糙面上滑动时，绳/弹簧拉力 T = m₁F/(m₁+m₂)，与动摩擦因数 μ 无关。', importance: 'gaokao' as const },
    { text: '临界起动条件：外拉力 F 必须大于最大静摩擦力之和 μ(m₁+m₂)g 才能使系统起动。', importance: 'hard' as const },
  ]

  return { quantities, formulas, gaokaoPoints }
}
