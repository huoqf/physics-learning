import { describe, it, expect } from 'vitest'
import { createRulerTicks } from '../PhysicsGround'

describe('createRulerTicks', () => {
  it('should return empty array if tickInterval <= 0', () => {
    expect(createRulerTicks([0, 10], 0)).toEqual([])
    expect(createRulerTicks([0, 10], -1)).toEqual([])
  })

  it('should generate major ticks for normal domain [0, 10]', () => {
    const ticks = createRulerTicks([0, 10], 2)
    expect(ticks.length).toBe(6) // 0, 2, 4, 6, 8, 10
    expect(ticks.map(t => t.value)).toEqual([0, 2, 4, 6, 8, 10])
    expect(ticks.every(t => !t.isMinor)).toBe(true)
  })

  it('should generate major ticks for non-zero start domain [2, 8]', () => {
    const ticks = createRulerTicks([2, 8], 2)
    expect(ticks.map(t => t.value)).toEqual([2, 4, 6, 8])
  })

  it('should handle fractional tickInterval (0.5)', () => {
    const ticks = createRulerTicks([0, 2], 0.5)
    expect(ticks.map(t => t.value)).toEqual([0, 0.5, 1, 1.5, 2])
  })

  it('should generate minor ticks correctly', () => {
    // 0 到 4，主间隔 2，1 个次级间隔 (因此次级在 1 和 3)
    const ticks = createRulerTicks([0, 4], 2, 1)
    
    // 我们期望的完全结果：0(M), 1(m), 2(M), 3(m), 4(M)
    expect(ticks.length).toBe(5)
    
    const values = ticks.map(t => t.value)
    expect(values).toEqual([0, 1, 2, 3, 4])

    // 检查哪些是 minor
    const minorFlags = ticks.map(t => t.isMinor)
    expect(minorFlags).toEqual([false, true, false, true, false])
  })

  it('should handle reversed domain [10, 0] seamlessly', () => {
    // createRulerTicks 内部应该根据 min 和 max 来计算，不受 domain 数组顺序影响
    const ticks = createRulerTicks([10, 0], 5)
    expect(ticks.map(t => t.value)).toEqual([0, 5, 10])
  })

  it('should handle non-aligned domains cleanly, e.g. [1, 5] interval 2', () => {
    const ticks = createRulerTicks([1, 5], 2)
    // 能够生成的刻度将是 2, 4
    expect(ticks.map(t => t.value)).toEqual([2, 4])
  })
})
