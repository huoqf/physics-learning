import { describe, it, expect } from 'vitest'
import { getCoilPolarity } from '@/physics/magnetism/polarity'

describe('getCoilPolarity', () => {
  it('当电流为正时（current > 0），判定左端为 N 极，右端为 S 极', () => {
    const res = getCoilPolarity(1.5)
    expect(res.isLeftNorth).toBe(true)
    expect(res.leftPole).toBe('N')
    expect(res.rightPole).toBe('S')
    expect(res.hasCurrent).toBe(true)
  })

  it('当电流为负时（current < 0），判定左端为 S 极，右端为 N 极', () => {
    const res = getCoilPolarity(-2.0)
    expect(res.isLeftNorth).toBe(false)
    expect(res.leftPole).toBe('S')
    expect(res.rightPole).toBe('N')
    expect(res.hasCurrent).toBe(true)
  })

  it('当电流在零阈值内时（Math.abs(current) < 1e-4），无极性且 hasCurrent 为 false', () => {
    const resZero = getCoilPolarity(0)
    expect(resZero.isLeftNorth).toBe(false)
    expect(resZero.leftPole).toBe('none')
    expect(resZero.rightPole).toBe('none')
    expect(resZero.hasCurrent).toBe(false)

    const resEps = getCoilPolarity(1e-5)
    expect(resEps.hasCurrent).toBe(false)
  })
})
