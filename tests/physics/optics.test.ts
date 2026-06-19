import { describe, it, expect } from 'vitest'
import {
  calculateThinLens,
  calculateConjugatePositions,
} from '@/physics'

describe('calculateThinLens', () => {
  it('u > 2f 时成倒立缩小实像', () => {
    const { v, m, type, valid } = calculateThinLens(0.1, 0.3)
    expect(valid).toBe(true)
    expect(type).toBe('real-inverted')
    expect(v).toBeCloseTo(0.15, 10)
    expect(m).toBeCloseTo(0.5, 10)
  })

  it('u = 2f 时成倒立等大实像', () => {
    const { v, m, type, valid } = calculateThinLens(0.1, 0.2)
    expect(valid).toBe(true)
    expect(type).toBe('real-inverted')
    expect(v).toBeCloseTo(0.2, 10)
    expect(Math.abs(m)).toBeCloseTo(1, 10)
  })

  it('f < u < 2f 时成倒立放大实像', () => {
    const { v, m, type, valid } = calculateThinLens(0.1, 0.15)
    expect(valid).toBe(true)
    expect(type).toBe('real-inverted')
    expect(v).toBeCloseTo(0.3, 10)
    expect(Math.abs(m)).toBeCloseTo(2, 10)
  })

  it('u < f 时成正立放大虚像', () => {
    const { v, m, type, valid } = calculateThinLens(0.1, 0.05)
    expect(valid).toBe(true)
    expect(type).toBe('virtual-upright')
    expect(v).toBeLessThan(0)
    expect(Math.abs(m)).toBeGreaterThan(1)
  })

  it('凹透镜 (f < 0) 始终成虚像', () => {
    const { v, m, type, valid } = calculateThinLens(-0.1, 0.2)
    expect(valid).toBe(true)
    expect(type).toBe('virtual-upright')
    expect(v).toBeLessThan(0)
    expect(Math.abs(m)).toBeLessThan(1)
  })
})

describe('calculateConjugatePositions', () => {
  it('L = 4f 时 u₁ = u₂ = 2f（重合解）', () => {
    const { u1, v1, u2, v2, valid } = calculateConjugatePositions(0.4, 0.1)
    expect(valid).toBe(true)
    expect(u1).toBeCloseTo(0.2, 10)
    expect(v1).toBeCloseTo(0.2, 10)
    expect(u2).toBeCloseTo(0.2, 10)
    expect(v2).toBeCloseTo(0.2, 10)
  })

  it('L = 5f 时两组解满足透镜公式且对称', () => {
    const { u1, v1, u2, v2, valid } = calculateConjugatePositions(0.5, 0.1)
    expect(valid).toBe(true)
    // 验证透镜公式 1/u + 1/v = 1/f
    expect(1 / u1 + 1 / v1).toBeCloseTo(10, 10)
    expect(1 / u2 + 1 / v2).toBeCloseTo(10, 10)
    // 验证对称性：u1 = v2, u2 = v1
    expect(u1).toBeCloseTo(v2, 10)
    expect(v1).toBeCloseTo(u2, 10)
  })

  it('两组解满足 u + v = L', () => {
    const L = 0.6
    const f = 0.1
    const { u1, v1, u2, v2, valid } = calculateConjugatePositions(L, f)
    expect(valid).toBe(true)
    expect(u1 + v1).toBeCloseTo(L, 10)
    expect(u2 + v2).toBeCloseTo(L, 10)
  })

  it('L < 4f 时无解', () => {
    const { valid } = calculateConjugatePositions(0.3, 0.1)
    expect(valid).toBe(false)
  })

  it('L = 0 或 f = 0 时无解', () => {
    expect(calculateConjugatePositions(0, 0.1).valid).toBe(false)
    expect(calculateConjugatePositions(0.5, 0).valid).toBe(false)
  })
})
