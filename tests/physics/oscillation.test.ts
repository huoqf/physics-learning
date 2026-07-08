import { describe, it, expect } from 'vitest'
import {
  computeAngularFrequency,
  computeSHMState,
  computeSHMEnergy,
} from '@/physics/oscillation'

describe('computeAngularFrequency', () => {
  it('ω = 2π / T', () => {
    expect(computeAngularFrequency(2)).toBeCloseTo(Math.PI, 9)
    expect(computeAngularFrequency(1)).toBeCloseTo(2 * Math.PI, 9)
  })
  it('非正周期返回 0', () => {
    expect(computeAngularFrequency(0)).toBe(0)
    expect(computeAngularFrequency(-1)).toBe(0)
  })
})

describe('computeSHMState', () => {
  const A = 0.06
  const omega = Math.PI // T = 2s

  it('相位 0：x=A, v=0, a=-Aω²', () => {
    const s = computeSHMState(A, omega, 0)
    expect(s.displacement).toBeCloseTo(A, 9)
    expect(s.velocity).toBeCloseTo(0, 9)
    expect(s.acceleration).toBeCloseTo(-A * omega * omega, 9)
  })

  it('相位 π/2：x=0, v=-Aω, a=0', () => {
    const s = computeSHMState(A, omega, Math.PI / 2)
    expect(s.displacement).toBeCloseTo(0, 9)
    expect(s.velocity).toBeCloseTo(-A * omega, 9)
    expect(s.acceleration).toBeCloseTo(0, 9)
  })

  it('加速度满足 a = -ω²·x', () => {
    const s = computeSHMState(A, omega, 1.2)
    expect(s.acceleration).toBeCloseTo(-omega * omega * s.displacement, 9)
  })
})

describe('computeSHMEnergy', () => {
  const m = 1.0
  const A = 0.06
  const omega = Math.PI

  it('总机械能 E = ½ m ω² A²', () => {
    const e = computeSHMEnergy(m, A, omega, 0.03)
    expect(e.total).toBeCloseTo(0.5 * m * omega * omega * A * A, 9)
  })

  it('平衡位置：动能最大、势能为 0', () => {
    const e = computeSHMEnergy(m, A, omega, 0)
    expect(e.potential).toBeCloseTo(0, 9)
    expect(e.kinetic).toBeCloseTo(e.total, 9)
  })

  it('最大位移处：势能最大、动能为 0', () => {
    const e = computeSHMEnergy(m, A, omega, A)
    expect(e.kinetic).toBeCloseTo(0, 9)
    expect(e.potential).toBeCloseTo(e.total, 9)
  })

  it('能量守恒：K + U = E', () => {
    const e = computeSHMEnergy(m, A, omega, 0.02)
    expect(e.kinetic + e.potential).toBeCloseTo(e.total, 9)
  })
})
