import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import { GRAVITY, calculateFreeFall } from '../../../physics'

interface Params {
  v0: number
  g: number
  advancedMode: number
  targetHeight: number
}

const DEFAULTS: ParamDefs<Params> = {
  v0: { default: 15 },
  g: { default: GRAVITY },
  advancedMode: { default: 0 },
  targetHeight: { default: 0 },
}

export function handleVerticalThrow(
  animId: string,
  params: Record<string, number>,
  time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-vertical-throw') return null
  const p = normalizeParams(params, DEFAULTS)

  const v0 = p.v0 ?? 15
  const g = p.g ?? GRAVITY
  const advancedMode = p.advancedMode ?? 0
  const targetHeight = p.targetHeight ?? 0
  const totalTime = (2 * v0) / g
  const { v } = calculateFreeFall(v0, -g, time)
  const isLanded = time >= totalTime && totalTime > 0
  const isAtPeak = !isLanded && Math.abs(v) < 0.3 && time > 0.05
  const phase = isLanded ? '落地' : isAtPeak ? '最高点' : v > 0 ? '上升' : v < 0 ? '下落' : '起抛'

  const baseFormulas: import('../types').Formula[] = [
    { name: '速度公式', latex: `v = v_0 - gt = ${v.toFixed(2)}\\;\\text{m/s}`, level: 'core', condition: '取向上为正方向' },
    { name: '速度-位移关系', latex: `v^2 - v_0^2 = -2gy`, level: 'important', condition: '取向上为正方向' },
  ]

  const advancedFormulas: import('../types').Formula[] = advancedMode ? [
    ...baseFormulas,
    { name: '位移方程', latex: `y = v_0 t - \\frac{1}{2}gt^2`, level: 'core', condition: '取向上为正方向' },
    { name: '求根公式', latex: `t = \\frac{v_0 \\pm \\sqrt{v_0^2 - 2gy}}{g}`, level: 'derived', note: '双解对应上升和下落两次经过同一高度' },
    { name: '相邻等时差', latex: `\\Delta y = gT^2`, level: 'important', condition: '匀变速直线运动' },
  ] : baseFormulas

  const targetGaokaoPoints: import('../types').GaokaoPoint[] = []
  if (advancedMode && targetHeight > 0) {
    const discriminant = v0 * v0 - 2 * g * targetHeight
    if (discriminant >= 0) {
      const t1 = (v0 - Math.sqrt(discriminant)) / g
      const t2 = (v0 + Math.sqrt(discriminant)) / g
      targetGaokaoPoints.push({
        text: `目标高度 y=${targetHeight.toFixed(1)}m：t₁=${t1.toFixed(2)}s（上升经过），t₂=${t2.toFixed(2)}s（下落经过）`,
        importance: 'gaokao' as const,
      })
    } else {
      targetGaokaoPoints.push({
        text: `目标高度 y=${targetHeight.toFixed(1)}m：无法到达（超过最大高度）`,
        importance: 'basic' as const,
      })
    }
  }

  if (isLanded) {
    targetGaokaoPoints.push({
      text: '对称性：上升时间 = 下落时间，落地速度 = 初速度（方向相反）',
      importance: 'core' as const,
    })
  }

  return {
    quantities: [
      ...base,
      { label: '运动阶段', value: phase, unit: '', highlight: isAtPeak ? 'extreme' : undefined },
    ],
    formulas: advancedFormulas,
    gaokaoPoints: [
      { text: '上升段与下落段关于最高点对称', importance: 'core' as const },
      ...(isAtPeak ? [{ text: '注意：v=0，但加速度 ≠ 0！', importance: 'hard' as const }] : []),
      ...targetGaokaoPoints,
    ],
  }
}
