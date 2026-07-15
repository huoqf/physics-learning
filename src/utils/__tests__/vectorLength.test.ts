import { describe, it, expect, vi } from 'vitest'
import { calculateVectorPixelLength } from '../vectorLength'

describe('calculateVectorPixelLength', () => {
  const maxLength = 100
  const refMag = 20
  const minLength = 14

  it('returns minLength when magnitude is 0', () => {
    expect(calculateVectorPixelLength(0, 'force', maxLength, refMag)).toBe(minLength)
  })

  it('returns minLength when refMagnitude is 0', () => {
    expect(calculateVectorPixelLength(10, 'force', maxLength, 0)).toBe(minLength)
  })

  it('returns minLength when magnitude is negative', () => {
    expect(calculateVectorPixelLength(-5, 'force', maxLength, refMag)).toBe(minLength)
  })

  it('scales proportionally for small magnitudes (ratio < 1)', () => {
    // mag=10, refMag=20, ratio=0.5, force weight=0.7
    // length = 0.5 * 100 * 0.7 = 35
    expect(calculateVectorPixelLength(10, 'force', maxLength, refMag)).toBe(35)
  })

  it('caps at maxLength for large magnitudes (ratio >= 1)', () => {
    // mag=50, refMag=20, ratio=2.0 but capped at 1.0
    // length = 1.0 * 100 * 0.7 = 70, but maxLength=100
    // Actually: min(ratio * maxLength * weight, maxLength) = min(70, 100) = 70
    expect(calculateVectorPixelLength(50, 'force', maxLength, refMag)).toBe(70)
  })

  it('caps strictly at maxLength even with weight > 1', () => {
    // velocity weight = 1.0, mag=100, refMag=20, ratio=5.0 capped at 1.0
    // length = 1.0 * 100 * 1.0 = 100
    expect(calculateVectorPixelLength(100, 'velocity', maxLength, refMag)).toBe(100)
  })

  it('applies different weights by vector type', () => {
    const mag = 10
    // force weight = 0.7 -> 0.5 * 100 * 0.7 = 35
    expect(calculateVectorPixelLength(mag, 'force', maxLength, refMag)).toBe(35)
    // velocity weight = 1.0 -> 0.5 * 100 * 1.0 = 50
    expect(calculateVectorPixelLength(mag, 'velocity', maxLength, refMag)).toBe(50)
  })

  it('uses custom minLength when provided', () => {
    expect(calculateVectorPixelLength(0, 'force', maxLength, refMag, 20)).toBe(20)
  })

  it('clamps between minLength and maxLength', () => {
    // Very small ratio should still be >= minLength
    const result = calculateVectorPixelLength(1, 'force', maxLength, refMag)
    expect(result).toBeGreaterThanOrEqual(minLength)
    expect(result).toBeLessThanOrEqual(maxLength)
  })

  it('warns when refMagnitude is 0', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    calculateVectorPixelLength(10, 'force', maxLength, 0)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('refMagnitude'),
    )
    warnSpy.mockRestore()
  })

  it('handles typical NewtonSecondAnimation values correctly', () => {
    // F = 30N, refMag = 60, maxLength = 120, weight = 0.7
    // ratio = 30/60 = 0.5, length = 0.5 * 120 * 0.7 = 42
    expect(calculateVectorPixelLength(30, 'force', 120, 60)).toBe(42)

    // v = 5m/s, refMag = 10, maxLength = 120, weight = 1.0
    // ratio = 5/10 = 0.5, length = 0.5 * 120 * 1.0 = 60
    expect(calculateVectorPixelLength(5, 'velocity', 120, 10)).toBe(60)

    // a = 10m/s², refMag = 20, maxLength = 120, weight = 0.8
    // ratio = 10/20 = 0.5, length = 0.5 * 120 * 0.8 = 48
    expect(calculateVectorPixelLength(10, 'acceleration', 120, 20)).toBe(48)
  })

  it('handles extreme acceleration without overflow', () => {
    // a = 100m/s² (m=0.5, F=50), refMag = 20
    // ratio = 100/20 = 5.0 capped at 1.0, weight = 0.8
    // length = 1.0 * 120 * 0.8 = 96
    expect(calculateVectorPixelLength(100, 'acceleration', 120, 20)).toBe(96)
  })
})
