import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  calculateManBoatState,
  getManBoatAutoMotion
} from '@/physics/momentumApplication'

interface ManBoatParams {
  m_person: number
  m_person2: number
  M_boat: number
  L_boat: number
  manBoatControl: number
  manBoatMode: number
  manRelS: number
  manVRel: number
}

const DEFAULTS: ParamDefs<ManBoatParams> = {
  m_person: { default: 50 },
  m_person2: { default: 60 },
  M_boat: { default: 150 },
  L_boat: { default: 4 },
  manBoatControl: { default: 0 },
  manBoatMode: { default: 0 },
  manRelS: { default: 0 },
  manVRel: { default: 0 },
}

export function handleManBoat(
  animId: string,
  params: Record<string, number>,
  _time: number,
  _base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-man-boat') return null
  const p = normalizeParams(params, DEFAULTS)

  const m1 = p.m_person
  const m2 = p.manBoatMode > 0 ? p.m_person2 : 0
  const M = p.M_boat
  const L = p.L_boat
  const manBoatControl = p.manBoatControl
  const manBoatMode = p.manBoatMode
  const manRelS = p.manRelS
  const manVRel = p.manVRel

  let s1 = manRelS
  let v1_rel = manVRel
  let s2 = L
  let v2_rel = 0

  if (manBoatControl === 0) {
    const motion = getManBoatAutoMotion(_time, L, 2.5, manBoatMode)
    s1 = motion.s1
    v1_rel = motion.v1_rel
    s2 = motion.s2
    v2_rel = motion.v2_rel
  } else {
    s1 = manRelS
    v1_rel = manVRel
    s2 = L
    v2_rel = 0
  }

  const st = calculateManBoatState(s1, v1_rel, s2, v2_rel, m1, m2, M, L)

  const x0_boat = -(m2 * L + M * L * 0.5) / (m1 + m2 + M)
  const x0_person1 = x0_boat + 0
  const x0_person2 = x0_boat + L

  const disp_person1 = st.x_person1 - x0_person1
  const disp_person2 = st.x_person2 - x0_person2
  const disp_boat = st.x_boat - x0_boat

  const p_person1 = m1 * st.v_person1
  const p_person2 = m2 * st.v_person2
  const p_boat = M * st.v_boat
  const p_total = p_person1 + p_person2 + p_boat

  const isDouble = manBoatMode > 0 && manBoatControl === 0

  const quantities: PhysicsQuantity[] = [
    { label: '人1绝对位置 x1', value: st.x_person1.toFixed(2), unit: 'm', highlight: 'positive' as const },
  ]

  if (isDouble) {
    quantities.push(
      { label: '人2绝对位置 x2', value: st.x_person2.toFixed(2), unit: 'm' }
    )
  }

  quantities.push(
    { label: '船左端位置 x_boat', value: st.x_boat.toFixed(2), unit: 'm', highlight: 'negative' as const },
    { label: '系统总质心 x_cm', value: st.x_cm.toFixed(3), unit: 'm', highlight: 'zero' as const },
    { label: '人1绝对速度 v1', value: st.v_person1.toFixed(2), unit: 'm/s' }
  )

  if (isDouble) {
    quantities.push(
      { label: '人2绝对速度 v2', value: st.v_person2.toFixed(2), unit: 'm/s' }
    )
  }

  quantities.push(
    { label: '船绝对速度 v_boat', value: st.v_boat.toFixed(2), unit: 'm/s' },
    { label: '人1绝对位移 s1', value: disp_person1.toFixed(2), unit: 'm', highlight: 'positive' as const }
  )

  if (isDouble) {
    quantities.push(
      { label: '人2绝对位移 s2', value: disp_person2.toFixed(2), unit: 'm' }
    )
  }

  quantities.push(
    { label: '船绝对位移 s_boat', value: disp_boat.toFixed(2), unit: 'm', highlight: 'negative' as const }
  )

  if (!isDouble) {
    quantities.push(
      { label: '人位移乘积 m1*s1', value: (m1 * Math.abs(disp_person1)).toFixed(1), unit: 'kg·m', highlight: 'extreme' as const },
      { label: '船位移乘积 M*s_boat', value: (M * Math.abs(disp_boat)).toFixed(1), unit: 'kg·m', highlight: 'extreme' as const }
    )
  } else {
    quantities.push(
      { label: '总动量 P_total', value: p_total.toFixed(3), unit: 'kg·m/s', highlight: 'zero' as const }
    )
  }

  const formulas = !isDouble
    ? [
        { name: '瞬时动量平衡', latex: 'm_1 v_1 + M v_{\\text{boat}} = 0', level: 'core' as const },
        { name: '位移守恒关系', latex: 'm_1 s_1 + M s_{\\text{boat}} = 0 \\implies m_1 s_1 = M |s_{\\text{boat}}|', level: 'core' as const },
        { name: '质心守恒公式', latex: 'x_{\\text{cm}} = \\frac{m_1 x_1 + M x_{\\text{boatCenter}}}{m_1 + M} = \\text{const}', level: 'important' as const },
      ]
    : [
        { name: '多物体瞬时动量守恒', latex: 'm_1 v_1 + m_2 v_2 + M v_{\\text{boat}} = 0', level: 'core' as const },
        { name: '多物体平均动量守恒', latex: 'm_1 \\Delta x_1 + m_2 \\Delta x_2 + M \\Delta x_{\\text{boat}} = 0', level: 'core' as const },
        { name: '总质心守恒公式', latex: 'x_{\\text{cm}} = \\frac{m_1 x_1 + m_2 x_2 + M x_{\\text{boatCenter}}}{m_1 + m_2 + M} = 0', level: 'important' as const },
      ]

  const gaokaoPoints = !isDouble
    ? [
        { text: '系统初始静止且水平方向无外力，系统的质心坐标绝对守恒', importance: 'core' as const },
        { text: '位移关系中的位移必须是以地面为参考系的绝对位移，满足 m1*s1 = M*s2', importance: 'gaokao' as const },
        { text: '位移与过程无关，不管人是加速、匀速还是中途停留，最终位移均相同', importance: 'gaokao' as const },
      ]
    : [
        { text: '双人相向走动交换位置时，若两者质量相同，则整个过程中船的位移为零', importance: 'core' as const },
        { text: '双人依次走动与同时走动效果相同，表明系统的状态仅由初始和末尾位置决定，与中间过程无关', importance: 'gaokao' as const },
        { text: '多物体的平均动量守恒公式，需要注意位移的矢量方向正负号，建立一维坐标轴计算', importance: 'gaokao' as const },
      ]

  return {
    quantities,
    formulas,
    gaokaoPoints
  }
}
