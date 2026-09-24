import type { PhysicsPanelData, PhysicsQuantity, Formula, GaokaoPoint } from '../types'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
} from '@/physics/vibration/forcedResonance'

export function buildForcedResonanceQuantities(
  _animId: string,
  params: Record<string, number>,
  time: number,
): PhysicsPanelData | null {
  const m = params.m ?? 1.0
  const k = params.k ?? 39.5
  const gamma = params.gamma ?? 0.5
  const F0 = params.F0 ?? 2.0
  const f = params.f ?? 1.0
  const mode = params.mode ?? 1

  const config = { m, k, gamma, F0, f }
  const steady = calculateSteadyStateResonance(config)
  const state = calculateForcedVibrationState(config, time, mode)

  const quantities: PhysicsQuantity[] = [
    { label: '系统固有频率', symbol: 'f_0', value: +steady.f0.toFixed(2), unit: 'Hz' },
    { label: '驱动力频率', symbol: 'f', value: +f.toFixed(2), unit: 'Hz' },
    { label: '受迫稳态振幅', symbol: 'A', value: +(steady.amplitude * 100).toFixed(1), unit: 'cm' },
    { label: '共振峰值振幅', symbol: 'A_{\\text{max}}', value: +(steady.maxAmplitude * 100).toFixed(1), unit: 'cm' },
    { label: '实时受迫位移', symbol: 'x', value: +(state.x * 100).toFixed(1), unit: 'cm' },
    { label: '实时驱动力', symbol: 'F_{\\text{驱}}', value: +state.fDriver.toFixed(2), unit: 'N' },
  ]

  const formulas: Formula[] = [
    {
      name: '系统固有频率',
      latex: 'f_0 = \\frac{1}{2\\pi}\\sqrt{\\frac{k}{m}}',
      level: 'core',
    },
    {
      name: '受迫振动频率特征',
      latex: 'f_{\\text{受迫}} = f_{\\text{驱动}}',
      level: 'core',
    },
    {
      name: '共振发生判据',
      latex: 'f_{\\text{驱动}} = f_0 \\implies A = A_{\\text{max}}',
      level: 'core',
    },
    {
      name: '受迫稳态振幅公式',
      latex: 'A = \\frac{F_0/m}{\\sqrt{(\\omega_0^2 - \\omega^2)^2 + (2\\beta\\omega)^2}}',
      level: 'important',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '受迫振动的频率特征：物体做受迫振动达到稳定后，其振动频率总是等于驱动力的频率，与物体的固有频率无关。',
      importance: 'gaokao',
    },
    {
      text: '共振条件与极值：当驱动力频率 f 等于系统固有频率 f0 时，振子从驱动力吸收能量的效率最高，振幅达到最大值，发生共振。',
      importance: 'gaokao',
    },
    {
      text: '阻尼对共振曲线的影响：阻尼越小，共振峰越陡峭尖锐，共振振幅越大；阻尼越大，共振峰越平缓宽阔，共振频率略向低频微移。',
      importance: 'core',
    },
    {
      text: '高考常见应用与防止：共振筛、微波炉加热利用共振；桥梁行军、机器基座、列车过桥需设法避开共振区。',
      importance: 'gaokao',
    },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}
