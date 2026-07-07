import { describe, it, expect } from 'vitest'
import { evaluateLoopSegment } from '@/physics'

describe('电磁感应线框匀速穿过有界磁场模型物理层测试', () => {
  it('窄线框 (d < D) 五大运动状态与电动势正确性', () => {
    const d = 0.04 // 4cm
    const D = 0.08 // 8cm
    const B = 1.0
    const L = 0.05
    const R = 0.5
    const v = 1.0

    // 1. 进场前 x < 0
    const before = evaluateLoopSegment(-0.01, d, D, B, L, R, v)
    expect(before.state).toBe('BEFORE')
    expect(before.emf).toBe(0)
    expect(before.currentI).toBe(0)

    // 2. 进场切割中 0 < x < d
    const entering = evaluateLoopSegment(0.02, d, D, B, L, R, v)
    expect(entering.state).toBe('ENTERING')
    expect(entering.emf).toBeCloseTo(B * L * v, 5)
    expect(entering.currentI).toBeGreaterThan(0) // 逆时针为正

    // 3. 完全浸入磁场内部 d <= x < D
    const totallyIn = evaluateLoopSegment(0.06, d, D, B, L, R, v)
    expect(totallyIn.state).toBe('TOTALLY_IN')
    expect(totallyIn.phi).toBeCloseTo(B * L * d, 5)
    expect(totallyIn.emf).toBe(0) // 前后两导线电动势抵消
    expect(totallyIn.currentI).toBe(0)
    expect(totallyIn.forceAmpere).toBe(0)

    // 4. 出场切割中 D <= x < D + d
    const leaving = evaluateLoopSegment(0.10, d, D, B, L, R, v)
    expect(leaving.state).toBe('LEAVING')
    expect(leaving.currentI).toBeLessThan(0) // 顺时针为负
    expect(leaving.forceAmpere).toBeCloseTo((B * L * v / R) * B * L, 5)

    // 5. 已离场 x >= D + d
    const after = evaluateLoopSegment(0.15, d, D, B, L, R, v)
    expect(after.state).toBe('AFTER')
    expect(after.emf).toBe(0)
  })

  it('宽线框 (d > D) 完全覆盖磁场状态正确性', () => {
    const d = 0.08 // 8cm
    const D = 0.04 // 4cm
    const B = 1.5
    const L = 0.05
    const R = 1.0
    const v = 2.0

    // 完全覆盖磁场 D <= x < d
    const totallyIn = evaluateLoopSegment(0.06, d, D, B, L, R, v)
    expect(totallyIn.state).toBe('TOTALLY_IN')
    expect(totallyIn.phi).toBeCloseTo(B * L * D, 5)
    expect(totallyIn.emf).toBe(0)
    expect(totallyIn.currentI).toBe(0)
  })
})
