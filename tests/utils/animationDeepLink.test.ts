import { describe, it, expect } from 'vitest'
import {
  resolveDeepLinkTime,
  resolveDeepLinkHint,
  shouldShowFreezeHint,
  pickCriticalTimes,
  parseUrlParamOverrides,
} from '@/utils/animationDeepLink'
import type { CriticalTimePoint } from '@/data/types'

const ct = (time: number, label = `t${time}`): CriticalTimePoint => ({ time, label })

describe('animationDeepLink · 深链定格帧解析', () => {
  describe('pickCriticalTimes', () => {
    it('按时间升序返回，并丢弃非有限值（注册表里表示「窗口内不会发生」）', () => {
      const list = pickCriticalTimes([ct(2), ct(Infinity), ct(0.5), ct(NaN), ct(1.5)], {}, 10)
      expect(list.map((p) => p.time)).toEqual([0.5, 1.5, 2])
    })

    it('丢弃超出观察窗口与不大于 0 的时刻', () => {
      const list = pickCriticalTimes([ct(0), ct(-1), ct(5), ct(11)], {}, 10)
      expect(list.map((p) => p.time)).toEqual([5])
    })

    it('支持函数式 criticalTimes（随参数变化）', () => {
      const fn = (p: Record<string, number>) => [ct(p.v0 / 2), ct(p.v0)]
      expect(pickCriticalTimes(fn, { v0: 4 }, 10).map((p) => p.time)).toEqual([2, 4])
    })

    it('未声明时返回空数组', () => {
      expect(pickCriticalTimes(undefined, {}, 10)).toEqual([])
    })
  })

  describe('resolveDeepLinkTime', () => {
    it('无参数时返回 null（保持原有播放行为）', () => {
      expect(resolveDeepLinkTime({ tParam: null, criticalParam: null, params: {}, maxTime: 10 })).toBeNull()
    })

    it('?t= 显式秒数会 clamp 到 [0, maxTime]', () => {
      expect(
        resolveDeepLinkTime({ tParam: '1.84', criticalParam: null, params: {}, maxTime: 10 }),
      ).toEqual({ time: 1.84, source: 'explicit' })

      expect(
        resolveDeepLinkTime({ tParam: '999', criticalParam: null, params: {}, maxTime: 10 })?.time,
      ).toBe(10)

      expect(
        resolveDeepLinkTime({ tParam: '-3', criticalParam: null, params: {}, maxTime: 10 })?.time,
      ).toBe(0)
    })

    it('?t= 非法值返回 null', () => {
      expect(
        resolveDeepLinkTime({ tParam: 'abc', criticalParam: null, params: {}, maxTime: 10 }),
      ).toBeNull()
    })

    it('?critical=first / last 取排序后的首尾，并带上标签', () => {
      const criticalTimes = [ct(3, '共速'), ct(1, '滑离')]
      expect(
        resolveDeepLinkTime({ tParam: null, criticalParam: 'first', criticalTimes, params: {}, maxTime: 10 }),
      ).toEqual({ time: 1, source: 'critical', label: '滑离' })
      expect(
        resolveDeepLinkTime({ tParam: null, criticalParam: 'last', criticalTimes, params: {}, maxTime: 10 }),
      ).toEqual({ time: 3, source: 'critical', label: '共速' })
    })

    it('?critical=索引 越界时回退到 ?t=', () => {
      const criticalTimes = [ct(1)]
      expect(
        resolveDeepLinkTime({ tParam: '4', criticalParam: '5', criticalTimes, params: {}, maxTime: 10 }),
      ).toEqual({ time: 4, source: 'explicit' })
    })

    it('没有可用临界时刻时不会产生 NaN 定格', () => {
      expect(
        resolveDeepLinkTime({ tParam: null, criticalParam: 'first', criticalTimes: [ct(Infinity)], params: {}, maxTime: 10 }),
      ).toBeNull()
    })

    it('maxTime 非法时按 0 处理，不会产生越界时刻', () => {
      expect(
        resolveDeepLinkTime({ tParam: '5', criticalParam: null, params: {}, maxTime: NaN })?.time,
      ).toBe(0)
    })
  })

  describe('parseUrlParamOverrides · 顶层键值参数', () => {
    const defaults = { v0: 5, m: 1, t: 0 }

    it('只接受该动画 defaultParams 声明过的键', () => {
      expect(parseUrlParamOverrides('?v0=8&m=2&unknown=9', defaults)).toEqual({ v0: 8, m: 2 })
    })

    it('跳过保留键：?t= 是定格秒数，不是参数 t（曾把 t 灌进 params）', () => {
      expect(parseUrlParamOverrides('?t=1.84&params=%7B%7D&critical=last', defaults)).toEqual({})
    })

    it('跳过 ?reason=：它是错因 id，不是动画参数', () => {
      // 哪怕某个动画真有一个叫 reason 的参数，也不能被深链来的错因 id 覆盖
      const withReasonParam = { ...defaults, reason: 0 }
      expect(parseUrlParamOverrides('?reason=implicit-condition', withReasonParam)).toEqual({})
    })

    it('跳过非数值与非法数值', () => {
      expect(parseUrlParamOverrides('?v0=abc&m=Infinity', defaults)).toEqual({})
    })

    it('无查询串时返回空对象', () => {
      expect(parseUrlParamOverrides('', defaults)).toEqual({})
    })
  })

  describe('resolveDeepLinkHint · 定格提示文案', () => {
    it('没有定格时不给提示', () => {
      expect(resolveDeepLinkHint(null)).toBeNull()
    })

    it('定格在 0s 等于没定格，不给提示（?t=0 就是从头看）', () => {
      expect(resolveDeepLinkHint({ time: 0, source: 'explicit' })).toBeNull()
    })

    it('错因 highlight 优先于临界点自带 label', () => {
      const target = { time: 1.7, source: 'critical' as const, label: '共速' }
      expect(resolveDeepLinkHint(target, '碰后瞬间：先定正方向')?.note).toBe('碰后瞬间：先定正方向')
    })

    it('没有错因说明时退回临界点 label；显式 ?t= 没有 label 就只有时刻', () => {
      expect(resolveDeepLinkHint({ time: 1.7, source: 'critical', label: '共速' })?.note).toBe('共速')
      expect(resolveDeepLinkHint({ time: 0.02, source: 'explicit' })).toEqual({ time: 0.02, note: undefined })
    })
  })

  describe('shouldShowFreezeHint · 何时收起提示', () => {
    const hint = { time: 1.53, note: '刚好共速' }

    it('停在这一帧且暂停时显示', () => {
      expect(shouldShowFreezeHint(hint, 1.53, false)).toBe(hint)
    })

    it('一开始播放就收起（学生已经在看演化了）', () => {
      expect(shouldShowFreezeHint(hint, 1.53, true)).toBeNull()
    })

    it('拖动进度条离开这一帧就收起', () => {
      expect(shouldShowFreezeHint(hint, 1.54, false)).toBeNull()
      expect(shouldShowFreezeHint(hint, 0, false)).toBeNull()
    })

    it('两位小数显示相同即视为仍在同一帧（显示与判定必须同源）', () => {
      // 1.5304 在控制条上也显示为 1.53s，若此时把提示收掉，学生会以为点错了
      expect(shouldShowFreezeHint(hint, 1.5304, false)).toBe(hint)
    })

    it('没有提示时恒为 null', () => {
      expect(shouldShowFreezeHint(null, 1.53, false)).toBeNull()
    })
  })
})
