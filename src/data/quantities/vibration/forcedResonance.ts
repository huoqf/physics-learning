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

  const t0 = steady.f0 > 0 ? 1 / steady.f0 : 0
  const tDriver = f > 0 ? 1 / f : 0

  const quantities: PhysicsQuantity[] = [
    { label: '系统固有频率', symbol: 'f0', value: +steady.f0.toFixed(2), unit: 'Hz' },
    { label: '系统固有周期', symbol: 'T0', value: +t0.toFixed(2), unit: 's' },
    { label: '驱动力频率', symbol: 'f', value: +f.toFixed(2), unit: 'Hz' },
    { label: '驱动力周期', symbol: 'T', value: +tDriver.toFixed(2), unit: 's' },
    { label: '受迫振动振幅', symbol: 'A', value: +(steady.amplitude * 100).toFixed(1), unit: 'cm' },
    { label: '共振最大振幅', symbol: 'Amax', value: +(steady.maxAmplitude * 100).toFixed(1), unit: 'cm' },
    { label: '振子实时位移', symbol: 'x', value: +(state.x * 100).toFixed(1), unit: 'cm' },
    { label: '振子实时速度', symbol: 'v', value: +state.v.toFixed(2), unit: 'm/s' },
    { label: '实时驱动力', symbol: 'F驱', value: +state.fDriver.toFixed(2), unit: 'N' },
    { label: '弹簧弹力', symbol: 'F弹', value: +state.elasticForce.toFixed(2), unit: 'N' },
    { label: '介质阻力', symbol: 'F阻', value: +state.dampingForce.toFixed(2), unit: 'N' },
    { label: '位移滞后驱动力相位差', symbol: 'φ', value: +steady.phaseLagDeg.toFixed(1), unit: '°' },
  ]

  const formulas: Formula[] = [
    {
      name: '系统固有频率与周期',
      latex: 'f_0 = \\frac{1}{2\\pi}\\sqrt{\\frac{k}{m}},\\quad T_0 = 2\\pi\\sqrt{\\frac{m}{k}}',
      level: 'core',
    },
    {
      name: '受迫振动频率决定铁律',
      latex: 'f_{\\text{受迫}} = f_{\\text{驱}},\\quad T_{\\text{受迫}} = T_{\\text{驱}}',
      level: 'core',
    },
    {
      name: '共振发生条件与判据',
      latex: 'f_{\\text{驱}} = f_0 \\implies A = A_{\\text{max}}',
      level: 'core',
    },
    {
      name: '受迫振幅理论公式 (选学拓展)',
      latex: 'A = \\frac{F_0}{\\sqrt{m^2(\\omega_0^2 - \\omega^2)^2 + \\gamma^2\\omega^2}}',
      level: 'important',
    },
    {
      name: '位移与驱动力相位差 (选学拓展)',
      latex: '\\tan\\varphi = \\frac{\\gamma\\omega}{m(\\omega_0^2 - \\omega^2)}\\quad (\\text{共振时 } \\varphi = 90^\\circ)',
      level: 'important',
    },
  ]

  const gaokaoPoints: GaokaoPoint[] = [
    {
      text: '受迫振动的频率特征（高考第一铁律）：物体做受迫振动达到稳定后，其振动频率与周期恒等于驱动力的频率与周期，与物体自身的固有频率完全无关！',
      importance: 'gaokao',
    },
    {
      text: '共振条件与极值规律：当驱动力频率 f 接近系统的固有频率 f0 时，驱动力持续对振子做正功，输入能量效率最高，振幅达到极大值，发生共振。',
      importance: 'gaokao',
    },
    {
      text: '质量改变对共振转速的调节（共振筛模型）：装料使总质量 m 增大 -> 固有频率 f0 减小 -> 必须降低电动机驱动转速使 f=f0 才能维持最大共振振幅。',
      importance: 'gaokao',
    },
    {
      text: '阻力对共振曲线的影响：介质阻力越小，共振曲线的峰值越尖锐陡峭；介质阻力越大，共振峰越平缓钝化。',
      importance: 'core',
    },
    {
      text: '生活与工程中的利用与防止：共振筛、微波炉利用共振；军队过桥便步走、机器减震机座（使工作频率远离固有频率）防止共振破坏。',
      importance: 'gaokao',
    },
  ]

  return {
    quantities,
    formulas,
    gaokaoPoints,
  }
}
