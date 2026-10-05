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

  const vCommon = (m * v0) / (m + M)
  const aBullet = -f / m
  const aBlock = f / M
  const tSync = v0 / (Math.abs(aBullet) + aBlock)
  const deltaXSync = v0 * tSync + 0.5 * (aBullet - aBlock) * tSync * tSync
  const Ek0 = 0.5 * m * v0 * v0
  const QMax = Ek0 - 0.5 * (m + M) * vCommon * vCommon

  // 物理判定：根据相对滑动距离 deltaXSync 与木块厚度 L 自动决定模式（若外部显式传入 mode 则优先）
  const isPenetrate = ('mode' in params) ? (p.mode === 1) : (deltaXSync > L)

  const quantities: PhysicsQuantity[] = [
    ...base,
    { label: '运动模式', value: isPenetrate ? '穿透模式' : '留存模式', unit: '', highlight: isPenetrate ? 'extreme' : 'positive' },
    { label: '系统总动量', value: (m * v0).toFixed(1), unit: 'kg·m/s', highlight: 'positive' },
    { label: '子弹初动能', value: Ek0.toFixed(1), unit: 'J' },
  ]

  let formulas: Array<{ name: string; latex: string; level: 'core' | 'important'; note?: string }> = []

  if (!isPenetrate) {
    // 留存模式
    quantities.push(
      { label: '共速速度', value: vCommon.toFixed(2), unit: 'm/s', highlight: 'positive' },
      { label: '达共速时间', value: tSync.toFixed(4), unit: 's' },
      { label: '相对位移 Δx', value: deltaXSync.toFixed(3), unit: 'm' },
      { label: '摩擦生热 Q', value: QMax.toFixed(1), unit: 'J', highlight: 'extreme' },
    )
    formulas = [
      {
        name: '动量守恒',
        latex: 'm v_0 = (m + M) v_{\\text{共}}',
        level: 'core',
      },
      {
        name: '摩擦生热 (内能)',
        latex: 'Q = f \\cdot \\Delta x_{\\text{相对}} = \\frac{1}{2}m v_0^2 - \\frac{1}{2}(m + M) v_{\\text{共}}^2',
        level: 'important',
      },
    ]
  } else {
    // 穿透模式：计算穿出状态
    const A = 0.5 * (f / m + f / M)
    const disc = v0 * v0 - 4 * A * L
    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc)
      const tExit = (v0 - sqrtDisc) / (2 * A)
      const vBulletExit = Math.max(0, v0 + aBullet * tExit)
      const vBlockExit = aBlock * tExit
      const QExit = f * L
      quantities.push(
        { label: '穿出时刻', value: tExit.toFixed(4), unit: 's' },
        { label: '穿出子弹速度', value: vBulletExit.toFixed(2), unit: 'm/s', highlight: 'positive' },
        { label: '穿出木块速度', value: vBlockExit.toFixed(2), unit: 'm/s', highlight: 'positive' },
        { label: '摩擦生热 Q', value: QExit.toFixed(1), unit: 'J', highlight: 'extreme' },
      )
      formulas = [
        {
          name: '动量守恒',
          latex: 'm v_0 = m v_1 + M v_2',
          level: 'core',
        },
        {
          name: '能量转化 (摩擦生热)',
          latex: 'Q = f \\cdot L = \\frac{1}{2}m v_0^2 - \\left(\\frac{1}{2}m v_1^2 + \\frac{1}{2}M v_2^2\\right)',
          level: 'important',
        },
      ]
    } else {
      quantities.push(
        { label: '状态结论', value: '无法穿透', unit: '', highlight: 'negative' },
        { label: '共速速度', value: vCommon.toFixed(2), unit: 'm/s' },
        { label: '摩擦生热 Q', value: QMax.toFixed(1), unit: 'J', highlight: 'extreme' },
      )
      formulas = [
        {
          name: '动量守恒',
          latex: 'm v_0 = (m + M) v_{\\text{共}}',
          level: 'core',
        },
      ]
    }
  }

  return {
    quantities,
    formulas,
    gaokaoPoints: [
      {
        text: '两物体共速时相对位移达到最大值，也是能否击穿木块的临界判定点',
        importance: 'core',
      },
      {
        text: '摩擦生热必须使用相对位移：留存时 Q = f·Δx，穿透时 Q = f·L',
        importance: 'gaokao',
      },
      {
        text: '阻力对子弹做功 -f·s₁ 改变子弹动能；阻力对木块做功 f·s₂ 改变木块动能；两功之和即为损耗的机械能（内能）',
        importance: 'gaokao',
      },
    ],
  }
}
