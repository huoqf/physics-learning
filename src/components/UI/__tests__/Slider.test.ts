import { describe, it, expect } from 'vitest'
import { getStepDigits, formatByStep } from '../Slider'

describe('getStepDigits', () => {
  it('returns 0 for integer steps', () => {
    expect(getStepDigits(1)).toBe(0)
    expect(getStepDigits(10)).toBe(0)
  })

  it('counts decimal places', () => {
    expect(getStepDigits(0.1)).toBe(1)
    expect(getStepDigits(0.01)).toBe(2)
    expect(getStepDigits(0.001)).toBe(3)
    expect(getStepDigits(0.005)).toBe(3)
  })

  it('handles scientific notation', () => {
    expect(getStepDigits(1e-2)).toBe(2)
    expect(getStepDigits(1e-5)).toBe(5)
    expect(getStepDigits(5e-3)).toBe(3)
  })

  it('falls back to 1 for invalid steps', () => {
    expect(getStepDigits(0)).toBe(1)
    expect(getStepDigits(-1)).toBe(1)
    expect(getStepDigits(NaN)).toBe(1)
    expect(getStepDigits(Infinity)).toBe(1)
  })
})

describe('formatByStep', () => {
  it('formats with correct precision', () => {
    expect(formatByStep(0.123, 0.1)).toBe('0.1')
    expect(formatByStep(0.123, 0.01)).toBe('0.12')
    expect(formatByStep(0.1234, 0.001)).toBe('0.123')
  })

  it('caps at 4 decimal places', () => {
    expect(formatByStep(0.12345, 0.00001)).toBe('0.1235')
  })

  it('handles integer steps', () => {
    expect(formatByStep(5, 1)).toBe('5')
    expect(formatByStep(5.6, 1)).toBe('6')
  })

  it('handles scientific notation steps', () => {
    expect(formatByStep(0.00123, 1e-3)).toBe('0.001')
    // 1e-5 → 5 digits, but capped at 4 by toFixed
    expect(formatByStep(0.00123, 1e-5)).toBe('0.0012')
  })
})
