import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  precomputeCurvedSlot,
  interpolateCurvedSlot,
} from '@/physics/momentumApplication'

interface CurvedSlotParams {
  m_block: number
  M_slot: number
  R_slot: number
  isFixed: number
  slotShape: number
}

const DEFAULTS: ParamDefs<CurvedSlotParams> = {
  m_block: { default: 2 },
  M_slot: { default: 5 },
  R_slot: { default: 1.5 },
  isFixed: { default: 0 },
  slotShape: { default: 0 },
}

export function handleCurvedSlot(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-curved-slot') return null
  const p = normalizeParams(params, DEFAULTS)

  const m = p.m_block
  const M = p.M_slot
  const R = p.R_slot
  const isFixed = p.isFixed
  const slotShape = p.slotShape

  const states = precomputeCurvedSlot(m, M, R, 9.8, 6.0, 0.002, isFixed, slotShape)
  const st = interpolateCurvedSlot(states, _time)

  const v_block_bottom = isFixed
    ? -Math.sqrt(2 * 9.8 * R)
    : -Math.sqrt((2 * 9.8 * R * M) / (M + m))
  const v_slot_bottom = isFixed ? 0 : -(m / M) * v_block_bottom

  const N_bottom = isFixed ? m * 9.8 * 3 : m * 9.8 * (3 + (2 * m) / M)

  const s_m = isFixed ? R : (M * R) / (M + m)
  const s_M = isFixed ? 0 : (m * R) / (M + m)

  return {
    quantities: [
      { label: '滑块水平速度 vx', value: st.v_x.toFixed(2), unit: 'm/s', highlight: st.v_x < 0 ? 'negative' as const : undefined },
      { label: '弧形槽速度 Vx', value: st.v_X.toFixed(2), unit: 'm/s', highlight: st.v_X > 0 ? 'positive' as const : undefined },
      { label: '最低点滑块速度 v_min', value: v_block_bottom.toFixed(2), unit: 'm/s', highlight: 'negative' as const },
      { label: '最低点槽速度 V_max', value: v_slot_bottom.toFixed(2), unit: 'm/s', highlight: isFixed ? undefined : ('positive' as const) },
      { label: '滑块最大位移 sm', value: s_m.toFixed(2), unit: 'm', highlight: 'extreme' as const },
      { label: '圆弧槽最大位移 sM', value: s_M.toFixed(2), unit: 'm', highlight: isFixed ? undefined : ('extreme' as const) },
      { label: '瞬时挤压弹力 N', value: st.N.toFixed(1), unit: 'N', highlight: 'extreme' as const },
      { label: '最低点理论弹力 N_max', value: N_bottom.toFixed(1), unit: 'N', highlight: 'extreme' as const },
    ],
    formulas: [
      { name: '水平动量关系', latex: isFixed ? 'F_{外x} \\neq 0 (不守恒)' : 'm v_x + M V_x = 0', level: 'core' as const },
      { name: '系统机械能守恒', latex: 'mgR = \\frac{1}{2}m v_x^2 + \\frac{1}{2}M V_x^2', level: 'core' as const },
      { name: '位移守恒 (人船)', latex: isFixed ? 's_m = R' : 'm s_m = M s_M', level: 'important' as const },
      { name: '最低点弹力公式', latex: isFixed ? 'N = 3mg' : 'N = mg(3 + \\frac{2m}{M})', level: 'important' as const },
    ],
    gaokaoPoints: [
      { text: isFixed ? '固定轨道：水平外力不为零，动量不守恒，仅系统机械能守恒。' : '自由轨道：水平无外力，系统水平动量守恒，机械能守恒。', importance: 'core' as const },
      { text: '能量转换：滑块减少的重力势能，转化为滑块与槽的动能之和。', importance: 'gaokao' as const },
      { text: isFixed ? '最低点压力：滑块在此处速度最大，对轨道压力达最大值 3mg。' : '非惯性系压力：最低点加速度最大，支持力极值 N=mg(3+2m/M)。', importance: 'hard' as const },
    ],
  }
}
