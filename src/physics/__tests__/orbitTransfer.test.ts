import { describe, it, expect } from 'vitest'
import {
  computeHohmannElements,
  computeTransferState,
  isNearApoapsis,
  isNearPeriapsis,
  megaMetersToMeters,
} from '../orbitTransfer'
import { EARTH_MASS, EARTH_RADIUS, GRAVITATIONAL_CONSTANT } from '../constants'

const G = GRAVITATIONAL_CONSTANT
const M = EARTH_MASS

describe('computeHohmannElements', () => {
  const r1 = 7e6
  const r3 = 14e6
  const el = computeHohmannElements({ r1, r3, M, G })

  it('a = (r1+r3)/2, e = (r3-r1)/(r3+r1)', () => {
    expect(el.a).toBeCloseTo((r1 + r3) / 2, 6)
    expect(el.e).toBeCloseTo((r3 - r1) / (r3 + r1), 10)
  })

  it('v3 < v1（高轨更慢）', () => {
    expect(el.v3).toBeLessThan(el.v1)
    expect(el.v1).toBeCloseTo(Math.sqrt((G * M) / r1), 4)
    expect(el.v3).toBeCloseTo(Math.sqrt((G * M) / r3), 4)
  })

  it('双脉冲均为正（抬轨）', () => {
    expect(el.dV1).toBeGreaterThan(0)
    expect(el.dV2).toBeGreaterThan(0)
    expect(el.vp).toBeGreaterThan(el.v1)
    expect(el.v3).toBeGreaterThan(el.va)
  })

  it('开普勒：T²/a³ 对圆1与椭圆一致', () => {
    const k1 = (el.T1 * el.T1) / (r1 * r1 * r1)
    const k2 = (el.T2 * el.T2) / (el.a * el.a * el.a)
    expect(k2).toBeCloseTo(k1, 8)
  })

  it('非法半径返回 0', () => {
    const z = computeHohmannElements({ r1: 10, r3: 5 })
    expect(z.a).toBe(0)
    expect(z.dV1).toBe(0)
  })
})

describe('computeTransferState', () => {
  const r1 = 7e6
  const r3 = 14e6
  const p = { r1, r3, M, G }
  const el = computeHohmannElements(p)

  it('phase0：圆轨 r 恒定、η≈1', () => {
    const s = computeTransferState(p, 0, 100, 0, null)
    expect(s.r).toBeCloseTo(r1, 3)
    expect(s.v).toBeCloseTo(el.v1, 2)
    expect(s.eta).toBeCloseTo(1, 5)
  })

  it('phase1 点火瞬间近地点：r≈r1，v≈vp', () => {
    const s = computeTransferState(p, 1, 10, 10, null)
    expect(s.r).toBeCloseTo(r1, 0)
    expect(s.v).toBeCloseTo(el.vp, 0)
    expect(isNearPeriapsis(s.trueAnomaly, 0.2)).toBe(true)
  })

  it('phase1 半周期后接近远地点 r≈r3', () => {
    const tBurn1 = 0
    const s = computeTransferState(p, 1, el.halfTransferTime, tBurn1, null)
    expect(s.r).toBeCloseTo(r3, -4) // 容差 ~km 级
    expect(isNearApoapsis(s.trueAnomaly, 0.25)).toBe(true)
    expect(s.v).toBeLessThan(el.vp)
  })

  it('phase2：高圆 r≈r3、v≈v3', () => {
    const s = computeTransferState(p, 2, 1000, 0, 500)
    expect(s.r).toBeCloseTo(r3, 3)
    expect(s.v).toBeCloseTo(el.v3, 2)
    expect(s.eta).toBeCloseTo(1, 5)
  })
})

describe('helpers', () => {
  it('megaMetersToMeters', () => {
    expect(megaMetersToMeters(7)).toBeCloseTo(7e6, 0)
  })

  it('r1 应大于地球半径（教学默认）', () => {
    expect(7e6).toBeGreaterThan(EARTH_RADIUS)
  })
})