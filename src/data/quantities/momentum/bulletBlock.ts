import type { PhysicsPanelData, PhysicsQuantity, ParamDefs } from '../types'
import { normalizeParams } from '../types'
import {
  getBulletBlockState,
  getBulletBlockTimeline,
  getCriticalVelocity,
  type BulletBlockMode,
  type BulletBlockParam,
} from '@/physics'

/**
 * 子弹打木块（anim-bullet-block）右屏看板。
 *
 * 单一真源：模式判定（v₀ vs v_crit）、时间线（t_sync / t_exit / 穿出速度）、
 * 相对位移、摩擦生热全部来自 `@/physics/bulletBlock`，与中屏 `useBulletBlockPhysics`
 * 调同一组函数。本文件只负责"把物理量翻译成看板文案"。
 *
 * 历史教训：这里曾自己解一遍二次方程求穿出时刻、又用 `deltaXSync > L` 另判穿透，
 * 与物理层的 `getCriticalVelocity` 构成两套判据 —— 改一个参数区间就可能只对了一半。
 */

interface BulletBlockParams {
  m: number
  M: number
  v0: number
  f: number
  L: number
}

/** 与 registry `mechanics-momentum.ts` 的 defaultParams 对齐（仅 params 缺失时兜底） */
const DEFAULTS: ParamDefs<BulletBlockParams> = {
  m: { default: 0.1 },
  M: { default: 0.4 },
  v0: { default: 30 },
  f: { default: 10 },
  L: { default: 0.5 },
}

export function handleBulletBlock(
  animId: string,
  params: Record<string, number>,
  _time: number,
  base: PhysicsQuantity[],
): PhysicsPanelData | null {
  if (animId !== 'anim-bullet-block') return null

  const p = normalizeParams(params, DEFAULTS)
  const param: BulletBlockParam = { m: p.m, M: p.M, v0: p.v0, f: p.f, L: p.L }

  // 模式判据与中屏完全一致：超过临界初速度才穿透
  const mode: BulletBlockMode = param.v0 > getCriticalVelocity(param) ? 'penetrate' : 'retain'
  const timeline = getBulletBlockTimeline(param, mode)
  // t=0 取初态（子弹初动能），t=tMax 取终态（内能、末速度），都不在本文件另算
  const initial = getBulletBlockState(param, 0, mode)
  const final = getBulletBlockState(param, timeline.tMax, mode)

  /** 穿透模式但数值上未真正穿出（极端参数）时退化为留存展示 */
  const isPenetrate = mode === 'penetrate' && Number.isFinite(timeline.tExit)

  const quantities: PhysicsQuantity[] = [
    ...base,
    {
      label: '运动模式',
      value: isPenetrate ? '穿透模式' : '留存模式',
      unit: '',
      highlight: isPenetrate ? 'extreme' : 'positive',
    },
    { label: '系统总动量', value: (param.m * param.v0).toFixed(1), unit: 'kg·m/s', highlight: 'positive' },
    { label: '子弹初动能', value: initial.EkBullet.toFixed(1), unit: 'J' },
  ]

  let formulas: Array<{ name: string; latex: string; level: 'core' | 'important'; note?: string }> = []

  if (isPenetrate) {
    quantities.push(
      { label: '穿出时刻', value: timeline.tExit.toFixed(4), unit: 's' },
      { label: '穿出子弹速度', value: timeline.vExitBullet.toFixed(2), unit: 'm/s', highlight: 'positive' },
      { label: '穿出木块速度', value: timeline.vExitBlock.toFixed(2), unit: 'm/s', highlight: 'positive' },
      { label: '摩擦生热 Q', value: final.Q.toFixed(1), unit: 'J', highlight: 'extreme' },
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
      { label: '共速速度', value: timeline.vSync.toFixed(2), unit: 'm/s', highlight: 'positive' },
      { label: '达共速时间', value: timeline.tSync.toFixed(4), unit: 's' },
      { label: '相对位移 Δx', value: timeline.deltaXSync.toFixed(3), unit: 'm' },
      { label: '摩擦生热 Q', value: final.Q.toFixed(1), unit: 'J', highlight: 'extreme' },
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
