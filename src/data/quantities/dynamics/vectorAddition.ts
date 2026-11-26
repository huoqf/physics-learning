import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateVectorAddition, calculateOrthogonalDecomposition } from '../../../physics'

interface Params {
  f1: number
  f2: number
  angle: number
  phi: number
  mode: number
}

const DEFAULTS: ParamDefs<Params> = {
  f1: { default: 10 },
  f2: { default: 8 },
  angle: { default: 60 },
  phi: { default: 0 },
  mode: { default: 0 },
}

export function handleVectorAddition(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-vector-addition') return null
  const p = normalizeParams(params, DEFAULTS)

  const quantities: PhysicsQuantity[] = [...base]
  const f1 = p.f1 ?? 10
  const f2 = p.f2 ?? 8
  const angle = p.angle ?? 60
  const phi = p.phi ?? 0
  const mode = p.mode ?? 0

  if (mode === 2) {
    const { fx, fy } = calculateOrthogonalDecomposition(f1, angle)
    quantities.push(
      { label: '水平分量 Fx', value: fx.toFixed(2), unit: 'N' },
      { label: '竖直分量 Fy', value: fy.toFixed(2), unit: 'N' }
    )
  } else {
    const { fResultant, resultAngleDeg } = calculateVectorAddition(f1, f2, angle, phi)
    quantities.push(
      { label: '合力 F', value: fResultant.toFixed(2), unit: 'N', highlight: 'positive' as const },
      { label: '合力与 F₁ 夹角 α', value: resultAngleDeg.toFixed(1), unit: '°' }
    )
  }

  let formulas: Formula[] = []
  let gaokaoPoints: GaokaoPoint[] = []

  if (mode === 2) {
    formulas = [
      { name: '水平分量', latex: 'F_x = F \\cos\\theta', level: 'core' },
      { name: '竖直分量', latex: 'F_y = F \\sin\\theta', level: 'core' }
    ]
    gaokaoPoints = [
      { text: '正交分解法是力学最核心的分析工具。', importance: 'gaokao' as const },
      { text: '建系时通常使尽可能多的力落在轴上。', importance: 'core' as const }
    ]
  } else {
    formulas = [
      { name: '合力大小', latex: 'F = \\sqrt{F_1^2 + F_2^2 + 2F_1F_2\\cos\\theta}', level: 'core', condition: '两共点分力 F₁、F₂ 夹角为 θ ∈ [0°, 180°]' },
      { name: '合力范围', latex: '|F_1 - F_2| \\le F_{\\text{合}} \\le F_1 + F_2', level: 'core', condition: '两共点分力大小不变，夹角 θ ∈ [0°, 180°]（同向最大，反向最小）' },
      { name: '偏角正切', latex: '\\tan\\alpha = \\frac{F_2\\sin\\theta}{F_1 + F_2\\cos\\theta}', level: 'derived', condition: 'α 为合力 F 与分力 F₁ 的夹角' }
    ]
    gaokaoPoints = [
      { text: '力的合成遵循平行四边形与三角形定则。', importance: 'core' as const },
      { text: '两分力大小不变时，在夹角 θ ∈ [0°, 180°] 范围内，合力随夹角 θ 增大而单调减小。', importance: 'gaokao' as const }
    ]
  }

  return { quantities, formulas, gaokaoPoints }
}
