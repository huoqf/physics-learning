import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface Params {
  k: number
  m: number
  mode: number
  isCut: number
}

const DEFAULTS: ParamDefs<Params> = {
  k: { default: 100 },
  m: { default: 1 },
  mode: { default: 0 },
  isCut: { default: 0 },
}

export function handleSpringForce(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-spring-force' && animId !== 'anim-light-weight-mutation') return null
  const p = normalizeParams(params, DEFAULTS)

  const k = p.k ?? 100
  const m = p.m ?? 1
  const mode = animId === 'anim-light-weight-mutation' ? 1 : (p.mode ?? 0)
  const isCut = p.isCut ?? 0

  if (mode === 0) {
    const omega = Math.sqrt(k / m)
    const amplitude = 0.5
    const displacement = amplitude * Math.sin(omega * time)
    const potentialEnergy = 0.5 * k * displacement * displacement
    const force = -k * displacement

    return {
      quantities: [
        ...base,
        { label: '实时形变 x', value: `${displacement > 0 ? '+' : ''}${displacement.toFixed(2)}`, unit: 'm', highlight: Math.abs(displacement) > 0.05 ? 'positive' : undefined },
        { label: '实时弹力 F', value: `${force > 0 ? '+' : ''}${force.toFixed(1)}`, unit: 'N', highlight: Math.abs(force) > 0.5 ? 'extreme' : undefined },
        { label: '弹性势能 E_p', value: potentialEnergy.toFixed(2), unit: 'J', highlight: potentialEnergy > 0.05 ? 'extreme' : undefined },
        { label: '固有角频率 ω', value: omega.toFixed(2), unit: 'rad/s' }
      ],
      formulas: [
        { name: '胡克定律', latex: 'F = -kx', level: 'core', condition: '弹性限度内' },
        { name: '弹性势能', latex: 'E_p = \\frac{1}{2}kx^2', level: 'important', condition: '自然长度处 Ep=0' }
      ],
      gaokaoPoints: [
        { text: '胡克定律中的 x 是形变量（拉伸或压缩量），非弹簧长度。', importance: 'core' as const },
        { text: '弹力方向总是指向弹簧形变恢复的方向，与形变方向相反。', importance: 'core' as const },
        { text: 'F-x图像的斜率代表劲度系数k，图线围成的面积表弹性势能。', importance: 'gaokao' as const }
      ]
    }
  } else {
    // 模式 1：绳与弹簧瞬时切断
    const g = 9.8
    // 剪断瞬时的加速度大小
    const aA = isCut === 1 ? g : 0
    const aB = isCut === 1 ? g : 0
    const aC = isCut === 1 ? 2 * g : 0
    const aD = isCut === 1 ? 0 : 0

    return {
      quantities: [
        ...base,
        { label: '球 A 加速度 a_A', value: `${isCut === 1 ? '↑ ' : ''}${aA.toFixed(2)}`, unit: 'm/s²', highlight: isCut === 1 ? 'positive' : undefined },
        { label: '球 B 加速度 a_B', value: `${isCut === 1 ? '↓ ' : ''}${aB.toFixed(2)}`, unit: 'm/s²', highlight: isCut === 1 ? 'extreme' : undefined },
        { label: '球 C 加速度 a_C', value: `${isCut === 1 ? '↓ ' : ''}${aC.toFixed(2)}`, unit: 'm/s²', highlight: isCut === 1 ? 'extreme' : undefined },
        { label: '球 D 加速度 a_D', value: aD.toFixed(2), unit: 'm/s²', highlight: isCut === 1 ? 'positive' : undefined }
      ],
      formulas: [
        { name: '左球A (向上加速)', latex: 'a_A = \\frac{F_{s1} - mg}{m} = \\frac{2mg - mg}{m} = g', level: 'core' },
        { name: '左球B (自由落体)', latex: 'a_B = \\frac{mg - T_1}{m} = \\frac{mg - 0}{m} = g', level: 'core' },
        { name: '右球C (向下加速)', latex: 'a_C = \\frac{mg + F_{s2}}{m} = \\frac{mg + mg}{m} = 2g', level: 'core' },
        { name: '右球D (瞬时静止)', latex: 'a_D = \\frac{mg - F_{s2}}{m} = \\frac{mg - mg}{m} = 0', level: 'core' }
      ],
      gaokaoPoints: [
        { text: '切断瞬间细绳弹力可突变为 0，因为细绳形变量极小、微元质量可忽略。', importance: 'core' as const },
        { text: '弹簧的弹力取决于两端的形变量，由于物体位移在瞬时不能突变，故弹簧弹力在瞬间保持不变。', importance: 'core' as const },
        { text: '高考解题切入点：先分析剪断前各连接体受力（求出弹簧力），再分析剪断瞬时，保持弹簧力不变而将绳子拉力置为 0，对各个物体进行隔离分析。', importance: 'gaokao' as const }
      ]
    }
  }
}
