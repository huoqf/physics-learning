import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'

interface BulletBlockParams {
  m: number
  M: number
  v0: number
  f: number
  L: number
  mode: number
}

const DEFAULTS: ParamDefs<BulletBlockParams> = {
  m: { default: 0.05 },
  M: { default: 1.0 },
  v0: { default: 200 },
  f: { default: 500 },
  L: { default: 0.2 },
  mode: { default: 0 },
}

export function handleBulletBlock(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-bullet-block') return null

  const p = normalizeParams(params, DEFAULTS)
  const m = p.m ?? 0.05
  const M = p.M ?? 1.0
  const v0 = p.v0 ?? 200
  const f = p.f ?? 500
  const L = p.L ?? 0.2
  const mode = p.mode ?? 0

  const vCommon = (m * v0) / (m + M)
  const aBullet = -f / m
  const aBlock = f / M
  const tSync = v0 / (Math.abs(aBullet) + aBlock)
  const deltaXSync = v0 * tSync + 0.5 * (aBullet - aBlock) * tSync * tSync
  const Ek0 = 0.5 * m * v0 * v0
  const QMax = Ek0 - 0.5 * (m + M) * vCommon * vCommon

  const quantities: PhysicsQuantity[] = [
    ...base,
    { label: '运动模式', value: mode === 1 ? '穿透模式' : '留存模式', unit: '' },
    { label: '系统总动量', value: (m * v0).toFixed(1), unit: 'kg·m/s', highlight: 'positive' },
    { label: '子弹动能', value: Ek0.toFixed(0), unit: 'J' },
    { label: '木块动能', value: '0', unit: 'J' },
  ]

  if (mode === 0) {
    // 留存模式
    quantities.push(
      { label: '共速速度', value: vCommon.toFixed(2), unit: 'm/s', highlight: 'positive' },
      { label: '达共速时间', value: tSync.toFixed(4), unit: 's' },
      { label: '相对位移 Δx', value: deltaXSync.toFixed(3), unit: 'm' },
      { label: '内能 Q', value: QMax.toFixed(1), unit: 'J', highlight: 'extreme' },
    )
  } else {
    // 穿透模式：估算穿出状态（若 L < deltaXSync）
    const A = 0.5 * (f / m + f / M)
    const disc = v0 * v0 - 4 * A * L
    if (disc >= 0 && L < deltaXSync) {
      const sqrtDisc = Math.sqrt(disc)
      const tExit = (v0 - sqrtDisc) / (2 * A)
      const vBulletExit = v0 + aBullet * tExit
      const vBlockExit = aBlock * tExit
      const QExit = f * L
      quantities.push(
        { label: '穿出时刻', value: tExit.toFixed(4), unit: 's' },
        { label: '穿出子弹速度', value: vBulletExit.toFixed(2), unit: 'm/s' },
        { label: '穿出木块速度', value: vBlockExit.toFixed(2), unit: 'm/s' },
        { label: '内能 Q', value: QExit.toFixed(1), unit: 'J', highlight: 'extreme' },
      )
    } else {
      quantities.push(
        { label: '状态结论', value: '木块过厚，实际无法穿透', unit: '', highlight: 'negative' },
        { label: '共速速度', value: vCommon.toFixed(2), unit: 'm/s' },
        { label: '内能 Q', value: QMax.toFixed(1), unit: 'J', highlight: 'extreme' },
      )
    }
  }

  return {
    quantities,
    formulas: [
      {
        name: '动量守恒',
        latex: 'mv_0 = (m+M)v_{\\text{共}}',
        level: 'core',
      },
      {
        name: '摩擦生热',
        latex: 'Q = f \\cdot \\Delta x_{\\text{相对}} = \\frac{1}{2}mv_0^2 - \\frac{1}{2}(m+M)v_{\\text{共}}^2',
        level: 'important',
      },
    ],
    gaokaoPoints: [
      {
        text: '两物体共速时，相对位移最大，系统损失的机械能最多',
        importance: 'core',
      },
      {
        text: '计算摩擦生热必须使用相对位移 Δx_相对，而非任何一者对地的位移',
        importance: 'gaokao',
      },
      {
        text: '穿透/留存取决于相对位移与木块厚度的关系，是动量守恒与能量转化的综合考查',
        importance: 'gaokao',
      },
    ],
  }
}
