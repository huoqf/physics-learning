import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateDualObjectComparison } from '../../../physics'

interface Params {
  vA: number
  aB: number
  deltaT: number
}

const DEFAULTS: ParamDefs<Params> = {
  vA: { default: 200 },
  aB: { default: 5 },
  deltaT: { default: 1 },
}

export function handleAcceleration(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-acceleration') return null
  const p = normalizeParams(params, DEFAULTS)

  const vA = p.vA ?? 200
  const aB = p.aB ?? 5
  const deltaT = p.deltaT ?? 1
  const result = calculateDualObjectComparison(vA, aB, deltaT, time)

  return {
    quantities: [
      ...base,
      { label: '飞机 Δv_A', value: result.deltaVA, unit: 'm/s', highlight: 'zero' as const },
      { label: '跑车 Δv_B', value: result.deltaVB, unit: 'm/s', highlight: 'positive' as const },
      { label: '核心结论', value: result.conclusion, unit: '', highlight: 'extreme' as const },
    ],
    gaokaoPoints: [
      { text: '加速度大小反映速度变化的快慢，与速度大小无关', importance: 'core' as const },
      { text: '速度大加速度可以为零；速度为零加速度可以很大', importance: 'hard' as const },
      { text: '加速度由合外力决定，采用比值定义法', importance: 'basic' as const },
    ],
  }
}
