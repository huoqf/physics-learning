import { describe, expect, it } from 'vitest'
import { getLRRStateAtTime, precomputeLightRodRopeTrajectory } from '@/physics/lightRodRope'

const G = 9.8

function distance(x: number, y: number) {
  return Math.hypot(x, y)
}

describe('lightRodRope model', () => {
  it('mode=0 rigid light rod keeps both balls on fixed radii and conserves system energy', () => {
    const m1 = 1
    const m2 = 1.4
    const L = 1.2
    const theta0 = Math.PI / 3
    const points = precomputeLightRodRopeTrajectory(m1, m2, L, G, 0, 2, 0.02, theta0, 0)
    const initialEnergy = points[0].Etot

    expect(points.length).toBeGreaterThan(50)

    for (const p of points) {
      expect(p.thetaA).toBeCloseTo(p.thetaB, 10)
      expect(p.wA).toBeCloseTo(p.wB, 10)
      expect(distance(p.x_A_rel, p.y_A_rel)).toBeCloseTo(L / 2, 10)
      expect(distance(p.x_B_rel, p.y_B_rel)).toBeCloseTo(L, 10)
      expect(p.powerA + p.powerB).toBeCloseTo(0, 10)
      expect(p.Etot).toBeCloseTo(initialEnergy, 2)
      expect(p.isSlackA).toBe(false)
      expect(p.isSlackB).toBe(false)
    }
  })

  it('mode=1 pulley rope keeps total rope length and reaches bottom with a stop reason', () => {
    const L = 1.2
    const theta0 = Math.PI / 3
    const totalRopeLength = 1.5 * L
    const points = precomputeLightRodRopeTrajectory(1, 1, L, G, 1, 3, 0.02, theta0, 0)

    expect(points.length).toBeGreaterThan(10)

    for (const p of points) {
      const rA = p.y_A_rel
      const rB = distance(p.x_B_rel, p.y_B_rel)
      expect(rA + rB).toBeCloseTo(totalRopeLength, 6)
      expect(p.T_A).toBeCloseTo(p.T_B, 8)
      expect(p.T_A).toBeGreaterThanOrEqual(0)
      expect(p.isSlackA).toBe(false)
      expect(p.isSlackB).toBe(false)
    }

    const last = points[points.length - 1]
    expect(last.stopReason).toBe('reach_bottom')
    expect(last.thetaB).toBeCloseTo(Math.PI / 2, 10)
  })

  it('mode=2 serial rope keeps constrained distances bounded during PBD simulation', () => {
    const L = 1.2
    const theta0 = Math.PI / 3
    const segmentLength = L / 2
    const points = precomputeLightRodRopeTrajectory(1, 1, L, G, 2, 2, 0.02, theta0, 0)

    expect(points.length).toBeGreaterThan(50)

    for (const p of points) {
      const oa = distance(p.x_A_rel, p.y_A_rel)
      const ab = distance(p.x_B_rel - p.x_A_rel, p.y_B_rel - p.y_A_rel)
      expect(oa).toBeLessThanOrEqual(segmentLength + 0.02)
      expect(ab).toBeLessThanOrEqual(segmentLength + 0.12)
      expect(Number.isFinite(p.Etot)).toBe(true)
      expect(Number.isFinite(p.T_A)).toBe(true)
      expect(Number.isFinite(p.T_B)).toBe(true)
    }
  })

  it('interpolates continuous fields and preserves discrete flags from adjacent samples', () => {
    const points = precomputeLightRodRopeTrajectory(1, 1, 1.2, G, 0, 1, 0.02, Math.PI / 4, 0)
    const p0 = points[4]
    const p1 = points[5]
    const midT = (p0.t + p1.t) / 2
    const state = getLRRStateAtTime(points, midT)

    expect(state.t).toBe(midT)
    expect(state.thetaA).toBeCloseTo((p0.thetaA + p1.thetaA) / 2, 10)
    expect(state.thetaB).toBeCloseTo((p0.thetaB + p1.thetaB) / 2, 10)
    expect(state.Etot).toBeCloseTo((p0.Etot + p1.Etot) / 2, 10)
    expect(state.isSlackA).toBe(p1.isSlackA)
    expect(state.isSlackB).toBe(p1.isSlackB)
  })
})
