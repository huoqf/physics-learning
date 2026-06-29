import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { calculateAcceleratedMotion } from '../../../physics'

interface Params {
  v0: number
  a: number
  advancedMode: number
  flashPeriod: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0: { default: 0 },
  a: { default: 1.5 },
  advancedMode: { default: 0 },
  flashPeriod: { default: 1 },
}

export function handleUniformAcceleration(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-uniform-acceleration') return null
  const p = normalizeParams(params, DEFAULTS)

  const v0 = p.v0 ?? 0
  const a = p.a ?? 1.5
  const advancedMode = p.advancedMode ?? 0
  const { v, s } = calculateAcceleratedMotion(v0, a, time)

  if (advancedMode === 0) {
    const avgV = (v0 + v) / 2
    const vAtHalfT = v0 + a * (time / 2)
    const vSquared = v * v
    const v0Squared = v0 * v0
    const twoAS = 2 * a * s

    return {
      quantities: [
        ...base,
        { label: 'v²-v₀²', value: vSquared - v0Squared, unit: 'm²/s²' },
        { label: '2ax', value: twoAS, unit: 'm²/s²', highlight: Math.abs(vSquared - v0Squared - twoAS) < 0.01 ? 'zero' as const : undefined },
        { label: '平均速度 v̄', value: avgV, unit: 'm/s' },
        { label: 'v(t/2)', value: vAtHalfT, unit: 'm/s' },
        { label: 'v̄=v(t/2)?', value: Math.abs(avgV - vAtHalfT) < 0.01 ? '✓ 成立' : '✗', unit: '' },
      ],
      formulas: [
        { name: '速度位移关系', latex: `v^2 - v_0^2 = 2ax`, level: 'important', condition: '仅适用于匀变速直线运动' },
      ],
      gaokaoPoints: [
        { text: 'v-t 图象面积代表位移，图象斜率代表加速度大小', importance: 'core' as const },
        { text: '刹车问题中 v=0 后物体停止，不能盲目代公式——这是审题陷阱', importance: 'gaokao' as const },
        { text: '熟记 1:3:5:7 比例，仅适用于 v₀=0 的匀加速直线运动', importance: 'hard' as const },
      ],
    }
  } else {
    const T = p.flashPeriod ?? 1
    const deltaX = a * T * T
    const vAtHalfS = Math.sqrt((v0 * v0 + v * v) / 2)
    const vAtHalfT = (v0 + v) / 2
    const isAccelerating = v0 * a >= 0 && a !== 0

    const s1 = v0 * T + 0.5 * a * T * T
    const s3 = v0 * 3 * T + 0.5 * a * 9 * T * T
    const skipDiffA = (s3 - s1) / (2 * T * T)

    return {
      quantities: [
        ...base,
        { label: 'Δx = aT²', value: deltaX, unit: 'm', highlight: 'positive' as const },
        { label: 'v(s/2)', value: isFinite(vAtHalfS) ? vAtHalfS : 0, unit: 'm/s' },
        { label: 'v(t/2)', value: vAtHalfT, unit: 'm/s' },
        { label: 'v(s/2) vs v(t/2)', value: isAccelerating ? 'v(s/2) > v(t/2)' : 'v(s/2) < v(t/2)', unit: '' },
        { label: '隔项逐差 a', value: skipDiffA, unit: 'm/s²' },
      ],
      formulas: [
        { name: '逐差法', latex: `\\Delta x = aT^2 = ${a} \\times ${T}^2 = ${deltaX.toFixed(3)}\\;\\text{m}`, level: 'important', condition: '连续相等时间间隔' },
        { name: '隔项逐差', latex: `a = \\frac{x_3 - x_1}{2T^2}`, level: 'derived', note: '减小实验误差的优化方法' },
        { name: '中间位置速度', latex: `v_{s/2} = \\sqrt{\\frac{v_0^2+v^2}{2}}`, level: 'derived', condition: '匀变速直线运动' },
      ],
      gaokaoPoints: [
        { text: '连续相等时间位移差恒定（Δx=aT²）是判断匀变速的依据', importance: 'core' as const },
        { text: '中间时刻瞬时速度必等于全程平均速度，用于求加速度', importance: 'gaokao' as const },
        { text: '计算加速度建议用隔项逐差法 a=(x₃-x₁)/(2T²)，减小误差', importance: 'hard' as const },
      ],
    }
  }
}
