import { describe, expect, it } from 'vitest'
import { computeStrobeTimes } from '../strobe'

describe('computeStrobeTimes', () => {
  it('按固定步长返回 [0, currentTime] 内的频闪采样时刻', () => {
    expect(computeStrobeTimes(0, 0.1)).toEqual([])
    expect(computeStrobeTimes(0.35, 0.1)).toEqual([0, 0.1, 0.2, 0.3])
  })

  it('超过 maxSamples 上限时保留临近 currentTime 的最近样本', () => {
    const res = computeStrobeTimes(2.0, 0.1, 5)
    expect(res).toEqual([1.6, 1.7, 1.8, 1.9, 2.0])
  })
})
