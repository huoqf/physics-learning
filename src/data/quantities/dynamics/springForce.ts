import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface Params {
  k: number
  m: number
}

const DEFAULTS: ParamDefs<Params> = {
  k: { default: 100 },
  m: { default: 1 },
}

export function handleSpringForce(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-spring-force') return null
  const p = normalizeParams(params, DEFAULTS)

  const k = p.k ?? 100
  const m = p.m ?? 1
  const omega = Math.sqrt(k / m)
  const amplitude = 0.5
  const displacement = amplitude * Math.sin(omega * time)
  const potentialEnergy = 0.5 * k * displacement * displacement

  return {
    quantities: [
      ...base,
      { label: '弹性势能 E_p', value: potentialEnergy.toFixed(2), unit: 'J', highlight: potentialEnergy > 0.05 ? 'extreme' : undefined },
      { label: '固有角频率 ω', value: omega.toFixed(2), unit: 'rad/s' }
    ],
    formulas: [
      { name: '胡克定律', latex: 'F = -kx', level: 'core', condition: '弹性限度内' },
      { name: '弹性势能', latex: 'E_p = \\frac{1}{2}kx^2', level: 'important', condition: '弹簧处于自然长度时Ep=0' }
    ],
    gaokaoPoints: [
      { text: '胡克定律中的 x 是形变量（拉伸或压缩量），非弹簧长度。', importance: 'core' as const },
      { text: '弹力方向总是指向弹簧形变恢复的方向，与形变方向相反。', importance: 'core' as const },
      { text: 'F-x图像的斜率代表劲度系数k，图线围成的面积表弹性势能。', importance: 'gaokao' as const }
    ]
  }
}
