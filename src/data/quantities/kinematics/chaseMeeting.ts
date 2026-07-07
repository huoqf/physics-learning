import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculatePoliceChase, calculateMeeting } from '../../../physics'

interface Params {
  chaseMode: number
  vA: number
  deltaX0: number
  t0: number
  aB: number
  vMax: number
  vL: number
  aB_meet: number
}

const DEFAULTS: ParamDefs<Params> = {
  chaseMode: { default: 0 },
  vA: { default: 35 },
  deltaX0: { default: 80 },
  t0: { default: 1 },
  aB: { default: 6 },
  vMax: { default: 40 },
  vL: { default: 200 },
  aB_meet: { default: 2 },
}

export function handleChaseMeeting(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-chase-meeting') return null
  const p = normalizeParams(params, DEFAULTS)
  const chaseMode = p.chaseMode ?? 0

  if (chaseMode === 0) {
    // 追及模式
    const vA = p.vA ?? 35
    const deltaX0 = p.deltaX0 ?? 80
    const t0 = p.t0 ?? 1
    const aB = p.aB ?? 6
    const vMax = p.vMax ?? 40

    const state = calculatePoliceChase(vA, deltaX0, t0, aB, vMax, time)
    const tEqual = t0 + vA / aB
    const tMeetText = state.tMeet !== null ? `${state.tMeet.toFixed(2)}` : '尚未追上'

    return {
      quantities: [
        ...base,
        { label: '轿车位置 xₐ', value: state.xA.toFixed(2), unit: 'm' },
        { label: '警车位置 xᵦ', value: state.xB.toFixed(2), unit: 'm' },
        { label: '当前车距 Δx', value: state.deltaX.toFixed(2), unit: 'm' },
        { label: '共速时刻 t', value: tEqual.toFixed(2), unit: 's' },
        { label: '追上时刻 t', value: tMeetText, unit: 's' },
      ],
      formulas: [
        { name: '轿车位移', latex: `x_A = v_A \\cdot t`, level: 'core' },
        { name: '共速时刻', latex: `t = t_0 + \\frac{v_A}{a_B}`, level: 'core', condition: '警车加速期内' },
      ],
      gaokaoPoints: [
        { text: 'x-t 图交点看相遇，斜率看速度；不可与 v-t 图混淆', importance: 'core' as const },
        { text: '速度相等是距离具有极值的临界点，此时两车间距最大', importance: 'gaokao' as const },
        { text: '警车做匀加速运动时，其 x-t 对应二次函数抛物线', importance: 'hard' as const },
      ],
    }
  } else {
    // 相遇模式
    const vA = p.vA ?? 20
    const vL = p.vL ?? 200
    const aB = p.aB_meet ?? 2

    const state = calculateMeeting(vA, vL, aB, time)
    const tMeetText = state.tMeet !== null ? `${state.tMeet.toFixed(2)}` : '尚未相遇'

    return {
      quantities: [
        ...base,
        { label: '甲车位置 xₐ', value: state.xA.toFixed(2), unit: 'm' },
        { label: '乙车位置 xᵦ', value: state.xB.toFixed(2), unit: 'm' },
        { label: '两车间距 Δx', value: state.deltaX.toFixed(2), unit: 'm' },
        { label: '相遇时刻 t', value: tMeetText, unit: 's' },
      ],
      formulas: [
        { name: '甲车位移', latex: `x_A = v_A \\cdot t`, level: 'core' },
        { name: '乙车位移', latex: `x_B = L - \\frac{1}{2} a_B t^2`, level: 'core' },
        { name: '相遇条件', latex: `v_A \\cdot t = L - \\frac{1}{2} a_B t^2`, level: 'core' },
      ],
      gaokaoPoints: [
        { text: '相向而行时，两车位移之和等于初始距离即为相遇', importance: 'core' as const },
        { text: 'x-t 图交点表示两车在同一时刻到达同一位置', importance: 'gaokao' as const },
        { text: '若乙车匀速，则相遇时间 t = L/(vₐ+vᵦ)', importance: 'hard' as const },
      ],
    }
  }
}
