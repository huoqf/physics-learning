import { describe, it, expect } from 'vitest'
import {
  computeWavelength,
  computeWavePeriod,
  computeWaveNumber,
  computeWaveAngularFrequency,
  computeWaveDisplacement,
  computeWaveParticleStates,
  computeSingleSlitIntensity,
  computeTwoSourcePathDifference,
  computeInterferenceCondition,
  computeTwoSourceScreenIntensity,
  sampleDiffractionField,
  sampleTwoSourceField,
  DEFAULT_WAVE_PARTICLE_COUNT,
  DEFAULT_TRACKED_PARTICLE_INDEX,
  type MechanicalWaveParams,
} from '../wave'

const continuous: MechanicalWaveParams = {
  amplitude: 0.02,
  frequency: 1,
  waveSpeed: 2,
  phase0: 0,
  mode: 0,
}

describe('computeWavelength / period / k / ω', () => {
  it('λ = v/f', () => {
    expect(computeWavelength(1, 2)).toBeCloseTo(2, 10)
    expect(computeWavelength(0, 2)).toBe(0)
    expect(computeWavelength(1, -1)).toBe(0)
  })

  it('T = 1/f', () => {
    expect(computeWavePeriod(2)).toBeCloseTo(0.5, 10)
    expect(computeWavePeriod(0)).toBe(0)
  })

  it('k = 2π/λ, ω = 2πf', () => {
    expect(computeWaveNumber(2)).toBeCloseTo(Math.PI, 10)
    expect(computeWaveAngularFrequency(1)).toBeCloseTo(2 * Math.PI, 10)
  })
})

describe('computeWaveDisplacement — continuous', () => {
  it('因果性：t < x/v → y = 0', () => {
    // x=2, v=2 → travel=1s
    expect(computeWaveDisplacement(2, 0.5, continuous)).toBe(0)
    expect(computeWaveDisplacement(2, 1 - 1e-9, continuous)).toBe(0)
  })

  it('到达后为正弦：x=0 时 y = A sin(ωt)', () => {
    const t = 0.25 // T=1, 1/4 周期 → sin(π/2)=1
    expect(computeWaveDisplacement(0, t, continuous)).toBeCloseTo(0.02, 10)
  })

  it('相位滞后：相邻点在同 t 不同相', () => {
    const t = 2
    const y0 = computeWaveDisplacement(0, t, continuous)
    const y1 = computeWaveDisplacement(0.5, t, continuous) // Δx = λ/4 when λ=2
    // λ=2, Δx=0.5 → Δφ = π/2 → y1 ≈ A cos(ωt) if y0 = A sin(ωt)
    expect(Math.abs(y0 - y1)).toBeGreaterThan(0.005)
  })
})

describe('computeWaveDisplacement — pulse', () => {
  const pulse: MechanicalWaveParams = { ...continuous, mode: 1 }

  it('扰动未到时为 0', () => {
    expect(computeWaveDisplacement(3, 0.1, pulse)).toBe(0)
  })

  it('包络峰值附近 |y| 有限且 ≤ A', () => {
    // 在 x=0, t≈tc 附近采样
    let maxAbs = 0
    for (let t = 0; t < 2; t += 0.02) {
      maxAbs = Math.max(maxAbs, Math.abs(computeWaveDisplacement(0, t, pulse)))
    }
    expect(maxAbs).toBeLessThanOrEqual(continuous.amplitude + 1e-9)
    expect(maxAbs).toBeGreaterThan(0)
  })
})

describe('computeWaveParticleStates', () => {
  it('默认 25 点，x 等间距，追踪索引合法', () => {
    const states = computeWaveParticleStates(1.5, continuous)
    expect(states).toHaveLength(DEFAULT_WAVE_PARTICLE_COUNT)
    expect(states[0].x).toBe(0)
    expect(states[0].index).toBe(0)
    expect(DEFAULT_TRACKED_PARTICLE_INDEX).toBeLessThan(states.length)
    // 质点只变 y，x 单调
    for (let i = 1; i < states.length; i++) {
      expect(states[i].x).toBeGreaterThan(states[i - 1].x)
    }
  })

  it('传波不传质：固定 index 的 x 不随 t 变', () => {
    const a = computeWaveParticleStates(0.5, continuous)
    const b = computeWaveParticleStates(1.5, continuous)
    const i = DEFAULT_TRACKED_PARTICLE_INDEX
    expect(a[i].x).toBe(b[i].x)
    // 一般 y 会变化（除非恰巧同相）
    expect(typeof b[i].y).toBe('number')
  })
})

describe('diffraction intensity', () => {
  it('中央 y=0 强度最大', () => {
    const I0 = computeSingleSlitIntensity(0, 0.001, 5e-4, 1)
    const I1 = computeSingleSlitIntensity(0.01, 0.001, 5e-4, 1)
    expect(I0).toBeCloseTo(1, 5)
    expect(I1).toBeLessThan(I0)
  })
})

describe('interference helpers', () => {
  it('path difference', () => {
    expect(computeTwoSourcePathDifference(1, 1.5)).toBeCloseTo(0.5, 10)
  })

  it('constructive when δ = nλ', () => {
    expect(computeInterferenceCondition(2, 1)).toBe('constructive')
    expect(computeInterferenceCondition(0.5, 1)).toBe('destructive')
  })

  it('two-source screen central max', () => {
    const I0 = computeTwoSourceScreenIntensity(0, 0.002, 5e-4, 1)
    expect(I0).toBeCloseTo(1, 5)
  })
})

describe('field samplers', () => {
  it('diffraction field finite', () => {
    const val = sampleDiffractionField(0.5, 0, 1, {
      slitWidth: 0.2,
      wavelength: 0.3,
      amplitude: 1,
      slitX: 0.2,
      waveSpeed: 1,
    })
    expect(Number.isFinite(val)).toBe(true)
  })

  it('two-source field finite', () => {
    const val = sampleTwoSourceField(1, 0, 2, {
      source1: { x: 0, y: -0.2 },
      source2: { x: 0, y: 0.2 },
      wavelength: 0.4,
      amplitude: 1,
      waveSpeed: 1,
    })
    expect(Number.isFinite(val)).toBe(true)
  })
})
