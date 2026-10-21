/**
 * 兜底看板参数名的守卫测试。
 *
 * 背景：右屏看板在物理量构建器加载前会用参数列表兜底。旧实现靠一张
 * "裸键 → 中文名"的全域映射表猜标签，于是木板长度 `L` 被显示成「电感 L」、
 * 输电变比 `k` 被显示成「劲度系数 k」。这里锁死"只认本动画自己声明的名字"。
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { buildParamVocabulary } from '@/data/paramVocabulary'
import {
  ANIMATION_COUNT,
  ensureExtendedRegistry,
  getAllAnimationIds,
  getAnimationConfig,
} from '@/data/animationRegistry'
import { buildPhysicsQuantities } from '@/data/physicsQuantities'

/** 按真实注册表为某个动画建立词表（与 AnimationPage 的调用方式一致） */
function vocabOf(animId: string, params: Record<string, number>) {
  const config = getAnimationConfig(animId)
  if (!config) throw new Error(`注册表里没有 ${animId}`)
  const paramMeta = config.buildParamMeta ? config.buildParamMeta(params) : (config.paramMeta ?? [])
  return buildParamVocabulary(paramMeta, config.controlMeta, params)
}

const BLOCK_BOARD_PARAMS = { m: 1, M: 3, mu1: 0.3, mu2: 0.05, v0: 5, L: 2.5 }

describe('paramVocabulary：参数名只认该动画自己的声明', () => {
  beforeAll(async () => {
    await ensureExtendedRegistry()
  })

  it('板块模型：L 是木板长度，绝不出现「电感」', () => {
    const vocab = vocabOf('anim-block-board', BLOCK_BOARD_PARAMS)
    expect(vocab.get('L')?.label).toBe('木板长度')
    expect([...vocab.values()].some((e) => e.label.includes('电感'))).toBe(false)
  })

  it('板块模型：摩擦因数与初速度沿用 paramMeta 的完整标签与单位', () => {
    const vocab = vocabOf('anim-block-board', BLOCK_BOARD_PARAMS)
    expect(vocab.get('mu1')?.label).toBe('板面摩擦因数 μ₁')
    expect(vocab.get('mu2')?.label).toBe('地面摩擦因数 μ₂')
    expect(vocab.get('v0')).toMatchObject({ label: '初速度 v₀', unit: 'm/s' })
  })

  it('远距离输电：k 是降压变比，绝不出现「劲度系数」', () => {
    const vocab = vocabOf('anim-power-transmission', { mode: 1, U2: 11, P1: 100, r: 10, k: 0.02, N: 10 })
    expect(vocab.get('k')?.label).toContain('降压变比')
    expect([...vocab.values()].some((e) => e.label.includes('劲度系数'))).toBe(false)
  })

  it('远距离输电：基础模式下进阶参数按 showIf 隐藏', () => {
    const basic = vocabOf('anim-power-transmission', { mode: 0, U2: 11, P1: 100, r: 10, k: 0.02, N: 10 })
    expect(basic.has('N')).toBe(false)
    expect(basic.has('k')).toBe(false)
    expect(basic.get('U2')?.unit).toBe('kV')
  })

  it('没声明中文名的模式档位不进词表（否则又会吐出英文键）', () => {
    const vocab = vocabOf('anim-oblique-throw', {
      v0: 20, angle: 45, g: 9.8, t: 0, advancedMode: 0, viewMode: 0,
      showPrevTrajectory: 1, airResistance: 0, showVacuumCompare: 1,
    })
    expect(vocab.get('angle')).toMatchObject({ label: '抛射角 θ', unit: '°' })
    expect(vocab.has('advancedMode')).toBe(false)
    expect(vocab.has('viewMode')).toBe(false)
    expect(vocab.has('showPrevTrajectory')).toBe(false)
    // 空气阻力受 advancedMode 控制，基础模式下隐藏
    expect(vocab.has('airResistance')).toBe(false)
  })

  it('斜抛切到阻力对比模式后，空气阻力才出现在词表里', () => {
    const vocab = vocabOf('anim-oblique-throw', { v0: 20, angle: 45, g: 9.8, advancedMode: 1, airResistance: 0.08 })
    expect(vocab.get('airResistance')).toMatchObject({ label: '空气阻力 k', unit: 'kg/m' })
  })
})

describe('兜底看板：没有权威词表时宁可为空', () => {
  it('未知动画没有任何声明，兜底为空，不按键名瞎猜标签', () => {
    const panel = buildPhysicsQuantities('anim-does-not-exist', { foo: 1 }, 0)
    expect(panel.quantities).toHaveLength(0)
  })

  it('兜底只输出词表内的键，内部键一律不出现', () => {
    const vocab = new Map([
      ['L', { label: '木板长度' }],
      ['v0', { label: '初速度 v₀', unit: 'm/s' }],
    ])
    const panel = buildPhysicsQuantities(
      'anim-does-not-exist',
      { L: 2.5, v0: 5, advancedMode: 0, modelIdx: 1 },
      0,
      null,
      vocab,
    )
    const labels = panel.quantities.map((q) => q.label)
    expect(labels).toEqual(['木板长度', '初速度 v₀'])
    expect(panel.quantities[1].unit).toBe('m/s')
  })
})

/**
 * 全量守卫：新增动画时若漏配 paramMeta / controlMeta，兜底看板会整片空白。
 * 这条测试把"每个动画的兜底都必须有内容且标签全是中文"变成硬约束。
 */
describe('全量守卫：每个动画的兜底看板都不能空、不能吐英文键', () => {
  beforeAll(async () => {
    await ensureExtendedRegistry()
  })

  it('枚举型参数显示中文选项名，而不是被格式化成 6.00 / 0.00', async () => {
    await ensureExtendedRegistry()
    const config = getAnimationConfig('anim-multimeter')!
    const params = config.defaultParams as Record<string, number>
    const vocab = buildParamVocabulary(config.paramMeta, config.controlMeta, params)
    // 用不存在的 animId 强制走兜底分支（构建器缓存不会介入）
    const panel = buildPhysicsQuantities('anim-fallback-probe', params, 0, null, vocab)
    const get = (label: string) => panel.quantities.find((q) => q.label === label)?.value

    expect(get('电表挡位选择')).toBe('Ω ×1') // rangeIndex: 6
    expect(get('待测器件插座')).toBe('定值电阻') // componentType: 0
    // 连续参数仍按数值显示，且保留单位
    expect(get('待测定值阻值 Rx')).toBe(30)
    expect(panel.quantities.find((q) => q.label === '待测定值阻值 Rx')?.unit).toBe('Ω')
  })

  it('全站枚举参数都能翻成中文，且不会出现纯数字挡位', async () => {
    await ensureExtendedRegistry()
    const offenders: string[] = []

    for (const id of getAllAnimationIds()) {
      const config = getAnimationConfig(id)
      if (!config) continue
      const params = config.defaultParams as Record<string, number>
      const paramMeta = config.buildParamMeta
        ? config.buildParamMeta(params)
        : config.paramMeta ?? []
      const vocab = buildParamVocabulary(paramMeta, config.controlMeta, params)

      for (const [key, entry] of vocab) {
        if (!entry.options || params[key] == null) continue
        const matched = entry.options.find((o) => o.value === params[key])
        if (!matched) continue
        if (matched.label === key) offenders.push(`${id}:${key}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('124 个动画的默认参数都能解析出可读的中文名', () => {
    const ids = getAllAnimationIds()
    expect(ids).toHaveLength(ANIMATION_COUNT)

    const noVocabulary: string[] = []
    const bareKeyLabels: string[] = []

    for (const id of ids) {
      const config = getAnimationConfig(id)
      if (!config) continue
      const params = config.defaultParams as Record<string, number>
      const paramMeta = config.buildParamMeta
        ? config.buildParamMeta(params)
        : config.paramMeta ?? []
      const vocab = buildParamVocabulary(paramMeta, config.controlMeta, params)

      // 只统计参数确实存在、会真正显示出来的条目
      const shown = [...vocab.entries()].filter(([key]) => params[key] != null)
      if (shown.length === 0) noVocabulary.push(id)

      for (const [key, entry] of shown) {
        // 标签不能等于参数键本身（那就是英文裸奔）
        if (entry.label === key) bareKeyLabels.push(`${id}:${key}`)
      }
    }

    expect(noVocabulary).toEqual([])
    expect(bareKeyLabels).toEqual([])
  })
})
