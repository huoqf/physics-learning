import { describe, it, expect } from 'vitest'
import {
  snapAngle,
  snapForce,
  normalizeAngle360,
  normalizeAngle180,
} from '../snap'

describe('snapAngle', () => {
  it('snaps to 0° when within threshold', () => {
    expect(snapAngle(1.2)).toBe(0)
    expect(snapAngle(-1.2)).toBe(0)
  })

  it('snaps to 90° when within threshold', () => {
    expect(snapAngle(88)).toBe(90)
    expect(snapAngle(92)).toBe(90)
  })

  it('snaps to 45° when within threshold', () => {
    expect(snapAngle(46.5)).toBe(45)
  })

  it('returns original angle when beyond threshold', () => {
    expect(snapAngle(10)).toBe(10)
    expect(snapAngle(77)).toBe(77)
  })

  it('handles negative angles correctly', () => {
    expect(snapAngle(-30)).toBe(330)
    expect(snapAngle(-89)).toBe(270)
  })

  it('handles angles > 360 correctly', () => {
    expect(snapAngle(361)).toBe(0)
    expect(snapAngle(450)).toBe(90)
  })

  it('respects custom threshold', () => {
    expect(snapAngle(4, 5)).toBe(0)
    expect(snapAngle(4, 2)).toBe(4)
  })
})

describe('snapForce', () => {
  it('snaps to nearest 0.5 N step', () => {
    expect(snapForce(3.07)).toBe(3)
    expect(snapForce(3.43)).toBe(3.5)
  })

  it('snaps to 0.0 when close to zero', () => {
    expect(snapForce(0.06)).toBe(0)
  })

  it('returns original value when beyond threshold', () => {
    expect(snapForce(3.3)).toBe(3.3)
  })

  it('respects custom step', () => {
    expect(snapForce(2.15, 1, 0.2)).toBe(2)
  })

  it('clamps minimum to 0', () => {
    expect(snapForce(-0.06)).toBe(0)
  })
})

describe('normalizeAngle360', () => {
  it('normalizes positive angles', () => {
    expect(normalizeAngle360(0)).toBe(0)
    expect(normalizeAngle360(180)).toBe(180)
    expect(normalizeAngle360(360)).toBe(0)
  })

  it('normalizes negative angles', () => {
    expect(normalizeAngle360(-90)).toBe(270)
    expect(normalizeAngle360(-180)).toBe(180)
  })
})

describe('normalizeAngle180', () => {
  it('returns angle directly for [0, 180]', () => {
    expect(normalizeAngle180(0)).toBe(0)
    expect(normalizeAngle180(90)).toBe(90)
    expect(normalizeAngle180(180)).toBe(180)
  })

  it('mirrors angles > 180', () => {
    expect(normalizeAngle180(270)).toBe(90)
    expect(normalizeAngle180(300)).toBe(60)
  })
})
