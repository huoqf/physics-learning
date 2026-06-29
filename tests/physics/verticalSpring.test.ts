import { describe, expect, it } from 'vitest'
import { getVSStateAtTime, precomputeVerticalSpringTrajectory } from '@/physics/verticalSpring'

const G = 9.8

function maxEnergyDrift(points: ReturnType<typeof precomputeVerticalSpringTrajectory>) {
  const initialEnergy = points[0]?.Etot ?? 0
  return Math.max(...points.map((p) => Math.abs(p.Ep + p.Epe + p.Ek - initialEnergy)))
}

describe('verticalSpring model', () => {
  it('mode=0 falling onto spring keeps mechanical energy and geometric milestones consistent', () => {
    const m = 0.5
    const k = 50
    const h = 0.8
    const points = precomputeVerticalSpringTrajectory(m, k, h, G, 6, 0.01, 0)

    expect(points.length).toBeGreaterThan(100)
    expect(maxEnergyDrift(points)).toBeLessThan(1e-8)

    const xEq = (m * G) / k
    const xD = xEq + Math.sqrt(xEq * xEq + (2 * G * h) / (k / m))
    const maxCompression = Math.max(...points.map((p) => p.x))

    expect(maxCompression).toBeCloseTo(xD, 2)

    const nearEquilibrium = points.reduce((best, p) =>
      Math.abs(p.x - xEq) < Math.abs(best.x - xEq) ? p : best,
    points[0])
    const maxSpeed = Math.max(...points.map((p) => Math.abs(p.v)))

    expect(Math.abs(nearEquilibrium.v)).toBeCloseTo(maxSpeed, 1)
    expect(Math.abs(nearEquilibrium.F_net)).toBeLessThan(0.2)
  })

  it('mode=1 release from natural length has xD=2mg/k and maximum speed at equilibrium', () => {
    const m = 0.5
    const k = 50
    const points = precomputeVerticalSpringTrajectory(m, k, 0.8, G, 4, 0.01, 1)

    const xEq = (m * G) / k
    const xD = 2 * xEq
    const maxExtension = Math.max(...points.map((p) => p.x))
    const maxSpeed = Math.max(...points.map((p) => Math.abs(p.v)))
    const nearEquilibrium = points.reduce((best, p) =>
      Math.abs(p.x - xEq) < Math.abs(best.x - xEq) ? p : best,
    points[0])

    expect(maxEnergyDrift(points)).toBeLessThan(1e-8)
    expect(maxExtension).toBeCloseTo(xD, 3)
    expect(Math.abs(nearEquilibrium.v)).toBeCloseTo(maxSpeed, 2)
    expect(Math.abs(nearEquilibrium.F_net)).toBeLessThan(0.1)
  })

  it('interpolates state linearly between precomputed samples', () => {
    const points = precomputeVerticalSpringTrajectory(0.5, 50, 0.8, G, 1, 0.02, 1)
    const p0 = points[5]
    const p1 = points[6]
    const midT = (p0.t + p1.t) / 2
    const state = getVSStateAtTime(points, midT)

    expect(state.t).toBe(midT)
    expect(state.x).toBeCloseTo((p0.x + p1.x) / 2, 10)
    expect(state.v).toBeCloseTo((p0.v + p1.v) / 2, 10)
    expect(state.Etot).toBeCloseTo((p0.Etot + p1.Etot) / 2, 10)
  })
})
