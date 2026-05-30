import { describe, it, expect } from 'vitest'
import {
  calculateRestitutionCollision,
  calculateElasticCollision,
} from '@/physics'

describe('calculateRestitutionCollision', () => {
  it('e=1 时应与弹性碰撞结果一致', () => {
    const r = calculateRestitutionCollision(2, 5, 3, -2, 1)
    const e = calculateElasticCollision(2, 5, 3, -2)
    expect(r.v1f).toBeCloseTo(e.v1f, 10)
    expect(r.v2f).toBeCloseTo(e.v2f, 10)
  })

  it('e=0 时两物体碰后共速（完全非弹性）', () => {
    const r = calculateRestitutionCollision(2, 5, 3, 0, 0)
    expect(r.v1f).toBeCloseTo(r.v2f, 10)
    expect(r.v1f).toBeCloseTo((2 * 5) / 5, 10) // (m1 v1)/(m1+m2)=2
  })

  it('应满足动量守恒（碰前=碰后）', () => {
    const r = calculateRestitutionCollision(2, 5, 3, 0, 0.8)
    expect(r.pAfter).toBeCloseTo(r.pBefore, 10)
    expect(r.pBefore).toBeCloseTo(10, 10)
  })
})
