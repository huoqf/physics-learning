import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface Params {
  mode: number
  preset: number
  m1: number
  m2: number
  r: number
}

const DEFAULTS: ParamDefs<Params> = {
  mode: { default: 0 },
  preset: { default: 0 },
  m1: { default: 1000 },
  m2: { default: 10 },
  r: { default: 5 },
}

export function handleGravity(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-gravity') return null
  const p = normalizeParams(params, DEFAULTS)

  const mode = p.mode ?? 0
  const preset = p.preset ?? 0
  const G = 6.674e-11

  let m1 = p.m1 ?? 1000
  let m2 = p.m2 ?? 10
  let r = p.r ?? 5
  let F_val = 0

  if (mode === 1) {
    let realM1 = 5.97e24
    let realM2 = 7.35e22
    let realR = 3.84e8
    let name1 = '地球'
    let name2 = '月球'

    switch (preset) {
      case 1:
        realM1 = 5.97e24; realM2 = 7.35e22; realR = 3.84e8
        name1 = '地球'; name2 = '月球'
        break
      case 2:
        realM1 = 1.99e30; realM2 = 5.97e24; realR = 1.50e11
        name1 = '太阳'; name2 = '地球'
        break
      case 3:
        realM1 = 5.97e24; realM2 = 1.00e3; realR = 4.22e7
        name1 = '地球'; name2 = '同步卫星'
        break
      case 4:
        realM1 = 5.97e24; realM2 = 80; realR = 6.77e6
        name1 = '地球'; name2 = '宇航员'
        break
      default:
        realM1 = (p.m1 ?? 1000) * 1e21
        realM2 = (p.m2 ?? 10) * 1e20
        realR = (p.r ?? 5) * 1e7
        name1 = '天体 1'; name2 = '天体 2'
        break
    }

    F_val = (G * realM1 * realM2) / (realR * realR)

    return {
      quantities: [
        ...base,
        { label: `${name1}质量 m₁`, value: realM1.toExponential(2), unit: 'kg' },
        { label: `${name2}质量 m₂`, value: realM2.toExponential(2), unit: 'kg' },
        { label: '天体间距 r', value: realR.toExponential(2), unit: 'm' },
        { label: '万有引力 F', value: F_val.toExponential(2), unit: 'N', highlight: 'positive' as const },
        { label: '引力常数 G', value: '6.674×10⁻¹¹', unit: 'N·m²/kg²' }
      ],
      formulas: [
        { name: '万有引力定律', latex: 'F = G \\frac{m_1 m_2}{r^2}', level: 'core', condition: '质点或均匀球体' }
      ],
      gaokaoPoints: [
        { text: '万有引力是重力的本源，重力通常是引力的分力。', importance: 'core' as const },
        { text: '天体间距远大于自身半径时，天体才能简化为质点。', importance: 'basic' as const },
        { text: '引力常数 G 由卡文迪什通过扭秤实验测得，被誉为"称量地球第一人"。', importance: 'gaokao' as const }
      ]
    }
  } else {
    F_val = (m1 * m2) / (r * r)
    return {
      quantities: [
        ...base,
        { label: '天体 1 质量 m₁', value: m1, unit: '相对单位' },
        { label: '天体 2 质量 m₂', value: m2, unit: '相对单位' },
        { label: '天体间距 r', value: r.toFixed(1), unit: '相对单位' },
        { label: '万有引力 F_引', value: F_val.toFixed(2), unit: '相对单位', highlight: 'positive' as const },
        { label: '比例关系占比', value: 'F ∝ m₁m₂/r²', unit: '' }
      ],
      formulas: [
        { name: '比例变化关系', latex: 'F \\propto \\frac{m_1 m_2}{r^2}', level: 'core' }
      ],
      gaokaoPoints: [
        { text: '引力大小与物体质量乘积成正比，与距离平方成反比。', importance: 'core' as const },
        { text: '万有引力具有相互性，天体1对2的引力等于天体2对1的引力。', importance: 'core' as const },
        { text: '在轨道运动中，万有引力提供环绕天体所需的向心力。', importance: 'gaokao' as const }
      ]
    }
  }
}
