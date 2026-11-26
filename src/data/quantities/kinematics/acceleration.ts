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
    formulas: [
      {
        name: '加速度定义式',
        latex: 'a = \\frac{\\Delta v}{\\Delta t}',
        level: 'core',
        condition: '比值定义式，适用于一切变速运动（匀变速直线运动中 a 恒定不变）',
        note: '比值定义式：a 反映速度变化快慢，大小由 F_合 与 m 决定（a = F_合/m），与 Δv、Δt 无关',
      },
    ],
    gaokaoPoints: [
      { text: '加速度大小反映速度变化的快慢，与速度大小及速度变化量无关', importance: 'core' as const },
      { text: '速度大加速度可以为零；速度为零加速度可以很大', importance: 'hard' as const },
      { text: '加速度决定式为 a = F_合/m，a = Δv/Δt 仅为比值定义式', importance: 'basic' as const },
    ],
  }
}
