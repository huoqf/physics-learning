import { describe, it, expect } from 'vitest'
import {
  calcTurnOnCurrent,
  calcTurnOffCurrent,
  checkFlashCondition,
  calcSelfInductanceEMF,
  calcEddyDampingOscillation,
} from '../selfInduction'

describe('selfInduction physics', () => {
  it('calcTurnOnCurrent should approach steady state E/R', () => {
    const E = 12
    const R = 6
    const L = 3
    // t=0 时电流为 0
    expect(calcTurnOnCurrent(0, E, R, L)).toBe(0)

    // t -> 无穷大时电流趋近 E/R = 2A
    const iInf = calcTurnOnCurrent(50, E, R, L)
    expect(iInf).toBeCloseTo(2.0, 4)

    // t = tau = L/R = 0.5s 时，I = 2 * (1 - 1/e) ≈ 2 * 0.63212 = 1.2642
    const iTau = calcTurnOnCurrent(0.5, E, R, L)
    expect(iTau).toBeCloseTo(2 * (1 - Math.exp(-1)), 3)
  })

  it('calcTurnOffCurrent should start at I0 = E/RL and decay', () => {
    const E = 10
    const RL = 2
    const RA = 8
    const L = 1
    // t=0 时初电流等于原线圈电流 E/RL = 5A
    const i0 = calcTurnOffCurrent(0, E, RL, RA, L)
    expect(i0).toBeCloseTo(5.0, 4)

    // 后续呈指数衰减
    const iLater = calcTurnOffCurrent(1.0, E, RL, RA, L)
    expect(iLater).toBeLessThan(5.0)
    expect(iLater).toBeGreaterThan(0)
  })

  it('checkFlashCondition should verify Gaokao criterion RL < RA', () => {
    // RL = 2, RA = 10 -> willFlash = true, ratio = 5
    const resFlash = checkFlashCondition(2, 10)
    expect(resFlash.willFlash).toBe(true)
    expect(resFlash.ratio).toBe(5)

    // RL = 10, RA = 2 -> willFlash = false
    const resNoFlash = checkFlashCondition(10, 2)
    expect(resNoFlash.willFlash).toBe(false)
  })

  it('calcSelfInductanceEMF should equal E at t=0', () => {
    const emf0 = calcSelfInductanceEMF(0, 12, 4, 2)
    expect(emf0).toBeCloseTo(12.0, 4)
  })

  it('calcEddyDampingOscillation should decay faster when not slotted', () => {
    const t = 2.0
    const theta0 = 0.5
    const B = 1.5

    const wholeSheet = calcEddyDampingOscillation(t, theta0, B, false)
    const slottedSheet = calcEddyDampingOscillation(t, theta0, B, true)

    // 整体片能量残留应显著少于开缝片
    expect(wholeSheet.energyRatio).toBeLessThan(slottedSheet.energyRatio)
    expect(Math.abs(wholeSheet.theta)).toBeLessThan(Math.abs(slottedSheet.theta))
  })
})
