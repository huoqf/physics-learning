import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateDualObjectComparison, calculatePoliceChase } from '../../../physics'

interface Params {
  advancedMode: number
  vA: number
  aB: number
  deltaT: number
  deltaX0: number
  t0: number
  vMax: number
}

const DEFAULTS: ParamDefs<Params> = {
  advancedMode: { default: 0 },
  vA: { default: 200 },
  aB: { default: 5 },
  deltaT: { default: 1 },
  deltaX0: { default: 50 },
  t0: { default: 1 },
  vMax: { default: 40 },
}

export function handleAcceleration(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-acceleration') return null
  const p = normalizeParams(params, DEFAULTS)
  const advancedMode = p.advancedMode ?? 0

  if (advancedMode === 0) {
    const vA = p.vA ?? 200
    const aB = p.aB ?? 5
    const deltaT = p.deltaT ?? 1
    const result = calculateDualObjectComparison(vA, aB, deltaT, time)
    return {
      quantities: [
        ...base,
        { label: '飞机 Δv_A', value: result.deltaVA, unit: 'm/s', highlight: 'zero' as const },
        { label: '跑车 Δv_B', value: result.deltaVB, unit: 'm/s', highlight: 'positive' as const },
        { label: '核心结论', value: result.conclusion, unit: '', highlight: 'extreme' as const },
      ],
      gaokaoPoints: [
        { text: '加速度大小反映速度变化的快慢，与速度大小无关', importance: 'core' as const },
        { text: '速度大加速度可以为零；速度为零加速度可以很大', importance: 'hard' as const },
        { text: '加速度由合外力决定，采用比值定义法', importance: 'basic' as const },
      ],
    }
  } else {
    const vA = p.vA ?? 30
    const deltaX0 = p.deltaX0 ?? 50
    const t0 = p.t0 ?? 1
    const aB = p.aB ?? 3
    const vMax = p.vMax ?? 40
    const state = calculatePoliceChase(vA, deltaX0, t0, aB, vMax, time)
    const tEqual = t0 + vA / aB
    const tMeetText = state.tMeet !== null ? `${state.tMeet.toFixed(2)}` : '尚未相遇'

    return {
      quantities: [
        ...base,
        { label: '轿车位置 xₐ', value: state.xA.toFixed(2), unit: 'm' },
        { label: '警车位置 xᵦ', value: state.xB.toFixed(2), unit: 'm' },
        { label: '当前车距 Δx', value: state.deltaX.toFixed(2), unit: 'm' },
        { label: '共速时刻 t', value: tEqual.toFixed(2), unit: 's' },
        { label: '相遇时刻 t', value: tMeetText, unit: 's' },
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
  }
}
