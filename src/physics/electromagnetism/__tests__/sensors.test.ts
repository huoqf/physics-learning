import { describe, it, expect } from 'vitest'
import {
  calcPhotoresistorResistance,
  calcNTCResistance,
  calcHallVoltage,
  calcCapacitiveSensorCapacitance,
  evaluateSensorCircuit,
  evaluateCapacitiveSensor,
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

    // 常闭触点路灯模式 (NC):
    // 暗环境 (rSensor=30kΩ, rFixed=5kΩ) -> 电流小未吸合 -> 常闭触点闭合(亮灯)
    const resDark = evaluateSensorCircuit(30000, 5000, 5, 0.0005, 'NC')
    expect(resDark.isArmatureAttracted).toBe(false)
    expect(resDark.isTriggered).toBe(true)

    // 亮环境 (rSensor=500Ω, rFixed=5kΩ) -> 电流大吸合 -> 常闭触点断开(灭灯)
    const resBright = evaluateSensorCircuit(500, 5000, 5, 0.0005, 'NC')
    expect(resBright.isArmatureAttracted).toBe(true)
    expect(resBright.isTriggered).toBe(false)
  })

  it('evaluateSensorCircuit should use relay pull current verbatim (no silent fallback)', () => {
    // 继电器串联模式：threshold 即吸合电流 I_pull (A)，必须原样使用。
    // rTotal = 1000 + 1000 + 100(coil) = 2100Ω => I = 5 / 2100 ≈ 2.381 mA
    // 历史实现曾把 >= 0.1 的 threshold 静默替换为 0.0005 A，本用例锁定该行为已移除。
    const highPull = evaluateSensorCircuit(1000, 1000, 5, 0.1, 'NC')
    expect(highPull.current).toBeCloseTo(5 / 2100, 6)
    expect(highPull.isArmatureAttracted).toBe(false) // 2.38 mA < 100 mA
    expect(highPull.isTriggered).toBe(true) // 常闭：未吸合 -> 复位闭合

    const lowPull = evaluateSensorCircuit(1000, 1000, 5, 0.001, 'NC')
    expect(lowPull.isArmatureAttracted).toBe(true) // 2.38 mA >= 1 mA
    expect(lowPull.isTriggered).toBe(false) // 常闭：吸合 -> 拉开断开

    // NO 常开：吸合才导通报警
    const noMode = evaluateSensorCircuit(1000, 1000, 5, 0.001, 'NO')
    expect(noMode.isArmatureAttracted).toBe(true)
    expect(noMode.isTriggered).toBe(true)
  })

  it('calcCapacitiveSensorCapacitance and evaluateCapacitiveSensor should function accurately', () => {
    // C = εr * ε0 * S / d
    const c1 = calcCapacitiveSensorCapacitance(2.0, 50, 1.0) // d=2mm
    const c2 = calcCapacitiveSensorCapacitance(4.0, 50, 1.0) // d=4mm

    expect(c1).toBeGreaterThan(c2)
    expect(c1 / c2).toBeCloseTo(2.0, 1)

    // evaluateCapacitiveSensor: 阈值 1.8mm
    const safeRes = evaluateCapacitiveSensor(3.0)
    expect(safeRes.isExceeded).toBe(false)

    const alarmRes = evaluateCapacitiveSensor(1.5)
    expect(alarmRes.isExceeded).toBe(true)
  })

  it('calcHallVoltage threshold behavior should distinguish weak and strong magnetic field', () => {
    const I = 1.0 // 1.0 A
    const d = 0.0005 // 0.5 mm
    const rh = 2.5e-4

    // 强磁场 B = 1.2 T -> UH = 600 mV >= 400 mV (动作)
    const strongHall = calcHallVoltage(I, 1.2, d, 'electron', rh)
    expect(strongHall.uHall * 1000).toBeCloseTo(600, 1)
    expect(strongHall.uHall * 1000 >= 400).toBe(true)

    // 弱磁场 B = 0.4 T -> UH = 200 mV < 400 mV (未动作)
    const weakHall = calcHallVoltage(I, 0.4, d, 'electron', rh)
    expect(weakHall.uHall * 1000).toBeCloseTo(200, 1)
    expect(weakHall.uHall * 1000 >= 400).toBe(false)
  })
})
