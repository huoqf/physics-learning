import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  precomputeSpringBlocks,
  interpolateSpringBlocks,
} from '@/physics/momentumApplication'

interface SpringBlocksParams {
  mA_spring: number
  mB_spring: number
  v0_spring: number
  k_spring: number
  connectionMode_spring: number
}

const DEFAULTS: ParamDefs<SpringBlocksParams> = {
  mA_spring: { default: 2 },
  mB_spring: { default: 3 },
  v0_spring: { default: 5 },
  k_spring: { default: 20 },
  connectionMode_spring: { default: 0 },
}

export function handleSpringBlocks(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-spring-blocks') return null
  const p = normalizeParams(params, DEFAULTS)

  const mA = p.mA_spring
  const mB = p.mB_spring
  const v0 = p.v0_spring
  const k = p.k_spring
  const connectionMode = p.connectionMode_spring

  const states = precomputeSpringBlocks(mA, mB, v0, k, 1.5, 3.5, 6.0, 0.002, connectionMode)
  const st = interpolateSpringBlocks(states, _time)
  const pTotal = mA * v0
  const isConnected = connectionMode === 1

  return {
    quantities: [
      { label: '系统总动量 p_总', value: pTotal.toFixed(1), unit: 'kg·m/s' },
      { label: 'A球速度 v_A', value: st.vA.toFixed(2), unit: 'm/s' },
      { label: 'B球速度 v_B', value: st.vB.toFixed(2), unit: 'm/s' },
      { label: '弹簧形变量 δ', value: st.delta.toFixed(2), unit: 'm', highlight: Math.abs(st.delta) > 0.01 ? 'extreme' as const : undefined },
      { label: '弹性势能 E_p', value: st.Ep.toFixed(1), unit: 'J', highlight: st.Ep > 0.05 ? 'positive' as const : undefined },
      { label: '系统总能量 E_总', value: st.Etotal.toFixed(1), unit: 'J' },
    ],
    formulas: isConnected
      ? [
          { name: '动量守恒', latex: 'm_A v_A + m_B v_B = m_A v_0', level: 'core' as const },
          { name: '能量守恒', latex: '\\frac{1}{2}m_A v_A^2 + \\frac{1}{2}m_B v_B^2 + \\frac{1}{2}k \\delta^2 = \\frac{1}{2}m_A v_0^2', level: 'core' as const },
          { name: '共速（压缩/拉伸极值）', latex: 'v_{\\text{共}} = \\frac{m_A v_0}{m_A + m_B}', level: 'important' as const },
          { name: '简谐振动周期', latex: 'T = 2\\pi \\sqrt{\\frac{\\mu}{k}}', level: 'important' as const, note: '折合质量 μ = mA*mB / (mA+mB)' },
        ]
      : [
          { name: '动量守恒', latex: 'm_A v_A + m_B v_B = m_A v_0', level: 'core' as const },
          { name: '能量守恒', latex: '\\frac{1}{2}m_A v_A^2 + \\frac{1}{2}m_B v_B^2 + \\frac{1}{2}k \\delta^2 = \\frac{1}{2}m_A v_0^2', level: 'core' as const },
          { name: '共速（压缩最短）速度', latex: 'v_{\\text{共}} = \\frac{m_A v_0}{m_A + m_B}', level: 'important' as const },
        ],
    gaokaoPoints: isConnected
      ? [
          { text: '弹簧压缩至最短及拉伸至最长（共速）时，弹性势能均达到最大值，系统动能最小', importance: 'core' as const },
          { text: '系统在质心参考系下做简谐振动，两球速度围绕质心速度 v_G 周期性摆动', importance: 'gaokao' as const },
          { text: '弹簧每一次恢复原长时，两球速度达到振动中的最大或最小值，且弹性势能为零', importance: 'hard' as const },
        ]
      : [
          { text: '弹簧压缩量最大（共速）时，系统弹性势能最大，动能最小', importance: 'core' as const },
          { text: '弹簧恢复原长（且即将分离）时，两滑块速度差最大，能量全部转化为动能', importance: 'gaokao' as const },
          { text: '若弹簧不与滑块粘连，恢复原长即为两滑块的分离临界点', importance: 'hard' as const },
        ],
  }
}
