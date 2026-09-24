import { describe, it, expect } from 'vitest'
import {
  calcPhotoresistorResistance,
  calcNTCResistance,
  calcHallVoltage,
  evaluateSensorCircuit,
} from '../sensors'

describe('sensors physics', () => {
  it('calcPhotoresistorResistance should decrease as illuminance increases', () => {
    const darkR = calcPhotoresistorResistance(1) // 1 lux
    const brightR = calcPhotoresistorResistance(500) // 500 lux

    expect(darkR).toBeGreaterThan(brightR)
    expect(brightR).toBeLessThan(5000)
    expect(darkR).toBeGreaterThan(10000)
  })

  it('calcNTCResistance should decrease exponentially with temperature', () => {
    const rCold = calcNTCResistance(0) // 0℃
    const rRoom = calcNTCResistance(25) // 25℃ 标称 10k
    const rHot = calcNTCResistance(80) // 80℃

    expect(rRoom).toBeCloseTo(10000, 0)
    expect(rCold).toBeGreaterThan(rRoom)
    expect(rHot).toBeLessThan(rRoom)
  })

  it('calcHallVoltage should compute voltage and discern carrier polarity', () => {
    const I = 0.5 // 0.5A
    const B = 1.0 // 1.0T
    const d = 0.0005 // 0.5mm
    const rh = 2.5e-4

    // 电子型载流子 (N型)
    const nHall = calcHallVoltage(I, B, d, 'electron', rh)
    expect(nHall.uHall).toBeCloseTo((rh * I * B) / d, 4)
    expect(nHall.topPolarity).toBe('-')
    expect(nHall.bottomPolarity).toBe('+')

    // 空穴型载流子 (P型)
    const pHall = calcHallVoltage(I, B, d, 'hole', rh)
    expect(pHall.uHall).toBeCloseTo((rh * I * B) / d, 4)
    expect(pHall.topPolarity).toBe('+')
    expect(pHall.bottomPolarity).toBe('-')
  })

  it('evaluateSensorCircuit should calculate threshold triggering', () => {
    // 5V 供电，2.5V 门限
    // 下拉接分压：rSensor = 1000, rFixed = 1000 -> vOut = 2.5V -> 触发
    const resTrigger = evaluateSensorCircuit(1000, 1000, 5, 2.5, 'bottom')
    expect(resTrigger.vOut).toBeCloseTo(2.5, 2)
    expect(resTrigger.isTriggered).toBe(true)

    // rSensor = 500, rFixed = 1500 -> vOut = 1.25V < 2.5V -> 未触发
    const resNoTrigger = evaluateSensorCircuit(500, 1500, 5, 2.5, 'bottom')
    expect(resNoTrigger.vOut).toBeCloseTo(1.25, 2)
    expect(resNoTrigger.isTriggered).toBe(false)
  })
})
