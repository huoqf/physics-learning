import { describe, it, expect } from 'vitest'
import { alignCriticalTime, CRITICAL_TIME_STEP } from '../criticalTime'

const onGrid = (t: number) => Math.abs(Math.round(t * 100) - t * 100) < 1e-6

describe('alignCriticalTime — 刻度对齐', () => {
  it('任何方向的输出都落在 0.01 s 网格上', () => {
    for (const raw of [1.5306, 0.04986, 4.5961, 2.999999, 7.123456789]) {
      for (const align of ['after', 'before', 'nearest'] as const) {
        expect(onGrid(alignCriticalTime(raw, align)), `${raw} / ${align}`).toBe(true)
      }
    }
  })

  it('网格步长与进度条一致', () => {
    expect(CRITICAL_TIME_STEP).toBe(0.01)
  })
})

describe('alignCriticalTime — 方向语义', () => {
  it('after：相变点向右对齐，定格落在事件之后', () => {
    expect(alignCriticalTime(1.5306, 'after')).toBe(1.54)
    expect(alignCriticalTime(1.5300, 'after')).toBe(1.53)
  })

  it('before：离场点向左对齐，定格时物体还在场上', () => {
    expect(alignCriticalTime(4.5961, 'before')).toBe(4.59)
    expect(alignCriticalTime(4.6, 'before')).toBe(4.6)
  })

  it('nearest：读数点就近对齐，标签与画面差得最少', () => {
    expect(alignCriticalTime(0.0498, 'nearest')).toBe(0.05)
    expect(alignCriticalTime(0.0494, 'nearest')).toBe(0.05)
    expect(alignCriticalTime(0.0444, 'nearest')).toBe(0.04)
  })

  it('落在刻度上的时刻不会被推开一格（旧 ceil 写法的 off-by-one）', () => {
    // 旧实现 Math.ceil((t + 1e-9) * 100) 会把 1.53 推到 1.54
    expect(alignCriticalTime(1.53, 'after')).toBe(1.53)
    expect(alignCriticalTime(2.4, 'before')).toBe(2.4)
  })

  it('非有限值原样返回，交给调用方过滤', () => {
    expect(Number.isNaN(alignCriticalTime(Number.NaN))).toBe(true)
    expect(alignCriticalTime(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })
})
