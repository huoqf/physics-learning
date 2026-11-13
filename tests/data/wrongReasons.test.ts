import { describe, it, expect } from 'vitest'
import {
  WRONG_REASONS,
  WRONG_REASON_IDS,
  WRONG_REASON_LABELS,
  buildBenchmarkUrl,
} from '@/data/wrongReasons'
import {
  ensureExtendedRegistry,
  getAnimationConfigAsync,
} from '@/data/animationRegistry'
import { resolveDeepLinkTime } from '@/utils/animationDeepLink'

/**
 * 错因标杆守卫。
 *
 * 目的：杜绝「无效深链」——错因卡片上的「去打靶」按钮如果指向一个不存在的
 * 动画、或一个超出动画时长的时刻，学生点进去只会看到静止的错误画面。
 * 这里对每个标杆同时校验：动画存在、参数键存在、定格时刻落在 (0, maxTime]。
 */
describe('wrongReasons · 错因标杆一致性', () => {
  it('恰好 7 个错因，id 唯一且标签已登记', () => {
    expect(WRONG_REASONS.length).toBe(7)
    expect(new Set(WRONG_REASON_IDS).size).toBe(7)
    for (const reason of WRONG_REASONS) {
      expect(WRONG_REASON_LABELS[reason.id]).toBe(reason.label)
      expect(reason.label.length).toBeGreaterThan(0)
      expect(reason.behavior.length).toBeGreaterThan(10)
      expect(reason.benchmark.highlight.length).toBeGreaterThan(10)
    }
  })

  it('每个标杆动画都真实存在', async () => {
    await ensureExtendedRegistry()
    for (const reason of WRONG_REASONS) {
      const config = await getAnimationConfigAsync(reason.benchmark.animId)
      expect(config, `错因「${reason.label}」的标杆动画不存在：${reason.benchmark.animId}`).toBeDefined()
    }
  })

  it('标杆定格时刻落在 (0, maxTime] 内，且不与 critical 同时缺省', async () => {
    await ensureExtendedRegistry()
    for (const reason of WRONG_REASONS) {
      const { benchmark } = reason
      const config = await getAnimationConfigAsync(benchmark.animId)
      const params = { ...(config!.defaultParams as Record<string, number>), ...benchmark.presetParams }
      const maxTime =
        (typeof config!.maxTime === 'function' ? config!.maxTime(params) : config!.maxTime) ?? 30

      if (benchmark.critical) {
        expect(benchmark.t, `「${reason.label}」同时给了 critical 与 t，语义会打架`).toBeUndefined()
        // 该动画必须真的声明了临界时刻，且解析出的真实定格时刻落在 (0, maxTime] 内
        expect(
          config!.criticalTimes,
          `「${reason.label}」用了 critical 定位，但 ${benchmark.animId} 未声明 criticalTimes`,
        ).toBeDefined()
        const target = resolveDeepLinkTime({
          tParam: null,
          criticalParam: benchmark.critical,
          criticalTimes: config!.criticalTimes,
          params,
          maxTime,
        })
        expect(target, `「${reason.label}」的 critical=${benchmark.critical} 未能解析到有效时刻`).not.toBeNull()
        expect(target!.time).toBeGreaterThan(0)
        expect(target!.time).toBeLessThanOrEqual(maxTime)
      } else {
        expect(benchmark.t, `「${reason.label}」缺少定格时刻`).toBeDefined()
        expect(benchmark.t!).toBeGreaterThan(0)
        expect(benchmark.t!).toBeLessThanOrEqual(maxTime)
      }
    }
  })

  it('标杆参数键必须是该动画声明过的参数（防止静默丢弃）', async () => {
    await ensureExtendedRegistry()
    for (const reason of WRONG_REASONS) {
      const { benchmark } = reason
      if (!benchmark.presetParams) continue
      const config = await getAnimationConfigAsync(benchmark.animId)
      const declared = new Set(Object.keys(config!.defaultParams as Record<string, number>))
      for (const key of Object.keys(benchmark.presetParams)) {
        expect(declared.has(key), `「${reason.label}」的 ${benchmark.animId} 缺少参数 ${key}`).toBe(true)
      }
    }
  })

  it('深链统一走 ?params=<JSON>，且只带一个定格参数', () => {
    for (const reason of WRONG_REASONS) {
      const url = buildBenchmarkUrl(reason)
      expect(url.startsWith(`/animation/${reason.benchmark.animId}`)).toBe(true)
      const query = new URLSearchParams(url.split('?')[1] ?? '')
      const hasT = query.has('t')
      const hasCritical = query.has('critical')
      expect(hasT !== hasCritical, `「${reason.label}」深链的定格参数应二选一：${url}`).toBe(true)
      if (reason.benchmark.presetParams) {
        expect(query.has('params')).toBe(true)
        expect(() => JSON.parse(query.get('params')!)).not.toThrow()
      }
    }
  })

  it('深链必须带 ?reason=，否则动画页无法说清「你在看哪个错因的哪一帧」', () => {
    for (const reason of WRONG_REASONS) {
      const query = new URLSearchParams(buildBenchmarkUrl(reason).split('?')[1] ?? '')
      expect(query.get('reason'), `「${reason.label}」的深链缺少 reason`).toBe(reason.id)
    }
  })

  /**
   * 回归锁：implicit-condition 的标杆帧必须贴着剪断那一刻。
   *
   * 事故背景：该动画物理层（precomputeCutRopeTrajectory）把 isCut=1、tCutStart=0
   * 写死，整条时间轴从「已剪断」起算 —— 即 t 就是「剪断后第几秒」。原值 1.0s
   * 落在 B 球落地（≈0.54s）之后近半秒，画面是「球砸在地上」，文案却写「细绳消失
   * 的瞬间」。当时全绿，因为唯一守卫只校验 t ∈ (0, maxTime]。
   *
   * 为什么不做成通用规则：「瞬间」类文案与「距事件多近」之间没有机器可判的关系
   * （vector-sign 的「碰后瞬间」在 1.7s 就完全合理，事件本身发生在 1.68s），
   * 套通用阈值必然误杀。所以这里只锁这一个已知会踩坑的动画，代价是范围窄，
   * 换来的是不会因为新标杆而假红。
   */
  it('implicit-condition 定格必须贴着剪断瞬间（t ≤ 0.1s）', async () => {
    await ensureExtendedRegistry()
    const reason = WRONG_REASONS.find((r) => r.id === 'implicit-condition')
    expect(reason, '错因 implicit-condition 已不存在，本回归锁应随之调整').toBeDefined()
    const { benchmark } = reason!
    const config = await getAnimationConfigAsync(benchmark.animId)
    const params = { ...(config!.defaultParams as Record<string, number>), ...benchmark.presetParams }
    const maxTime =
      (typeof config!.maxTime === 'function' ? config!.maxTime(params) : config!.maxTime) ?? 30
    const resolved = resolveDeepLinkTime({
      tParam: benchmark.t != null ? String(benchmark.t) : null,
      criticalParam: benchmark.critical ?? null,
      criticalTimes: config!.criticalTimes,
      params,
      maxTime,
    })
    expect(resolved).not.toBeNull()
    expect(
      resolved!.time,
      '剪断后 0.54s B 球就落地了，t 一大画面就不是「瞬间」了',
    ).toBeLessThanOrEqual(0.1)
  })
})
