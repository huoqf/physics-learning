import { describe, it, expect } from 'vitest'
import {
  calculateSteadyStateResonance,
  calculateForcedVibrationState,
  generateResonanceCurvePoints,
} from '../forcedResonance'

describe('forcedResonance 物理纯函数计算', () => {
  it('计算固有频率与共振峰值', () => {
    // m = 1kg, k = 39.478 N/m (~4*pi^2), omega0 ≈ 2*pi ≈ 6.283 rad/s, f0 ≈ 1.0 Hz
    const m = 1.0
    const k = 4 * Math.PI * Math.PI // ~39.4784
    const gamma = 0.4
    const F0 = 2.0
    const f = 1.0

    const res = calculateSteadyStateResonance({ m, k, gamma, F0, f })

    expect(res.f0).toBeCloseTo(1.0, 2)
    expect(res.omega0).toBeCloseTo(2 * Math.PI, 2)
    expect(res.beta).toBeCloseTo(0.2, 3)

    // 弱阻尼下共振频率非常接近固有频率 f0
    expect(res.fRes).toBeCloseTo(1.0, 1)

    // 在 f = f0 处振幅显著大于偏离频率处
    const resOff = calculateSteadyStateResonance({ m, k, gamma, F0, f: 2.0 })
    expect(res.amplitude).toBeGreaterThan(resOff.amplitude * 3)
  })

  it('阻尼越小，共振峰越尖锐且幅值越大', () => {
    const base = { m: 1.0, k: 40, F0: 2.0, f: 1.006 }
    const smallDamping = calculateSteadyStateResonance({ ...base, gamma: 0.2 })
    const largeDamping = calculateSteadyStateResonance({ ...base, gamma: 1.0 })

    expect(smallDamping.amplitude).toBeGreaterThan(largeDamping.amplitude * 3)
  })

  it('受迫振动瞬时状态满足动力学合外力输出', () => {
    const config = { m: 1.0, k: 25, gamma: 0.5, F0: 5, f: 1.2 }
    const state = calculateForcedVibrationState(config, 1.5, 1)

    expect(Number.isFinite(state.x)).toBe(true)
    expect(Number.isFinite(state.v)).toBe(true)
    expect(Number.isFinite(state.elasticForce)).toBe(true)
    expect(Number.isFinite(state.dampingForce)).toBe(true)
    expect(state.elasticForce).toBeCloseTo(-25 * state.x, 4)
  })

  it('生成共振曲线包含预期数量采样点', () => {
    const points = generateResonanceCurvePoints(1.0, 40, 0.4, 2.0, 3.0, 50)
    expect(points).toHaveLength(50)
    expect(points[0].x).toBeGreaterThan(0)
    expect(points[49].x).toBeCloseTo(3.0, 2)
  })
})
