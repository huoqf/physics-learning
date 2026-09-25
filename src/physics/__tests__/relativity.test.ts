import { describe, it, expect } from 'vitest'
import {
  calcLorentzFactor,
  calcTimeDilation,
  calcLengthContraction,
  calcRelativisticEnergy,
  calcRelativisticVelocityAddition,
} from '../relativity'

describe('相对论纯物理函数单元测试', () => {
  it('洛伦兹因子计算准确无误', () => {
    // beta = 0 => gamma = 1
    expect(calcLorentzFactor(0)).toBeCloseTo(1, 6)

    // beta = 0.6 => gamma = 1 / sqrt(1 - 0.36) = 1 / 0.8 = 1.25
    expect(calcLorentzFactor(0.6)).toBeCloseTo(1.25, 6)

    // beta = 0.8 => gamma = 1 / sqrt(1 - 0.64) = 1 / 0.6 = 1.666667
    expect(calcLorentzFactor(0.8)).toBeCloseTo(5 / 3, 5)

    // beta = sqrt(3)/2 ≈ 0.866025 => gamma = 2
    expect(calcLorentzFactor(Math.sqrt(3) / 2)).toBeCloseTo(2, 5)
  })

  it('时间延缓计算符合动钟变慢规律', () => {
    const tau0 = 10 // 静止系经过 10 秒
    const beta = 0.6
    const t = calcTimeDilation(tau0, beta)
    // t = 10 * 1.25 = 12.5 秒
    expect(t).toBeCloseTo(12.5, 6)
  })

  it('长度收缩计算符合动尺变短规律', () => {
    const l0 = 100 // 飞船固有长度 100 米
    const beta = 0.6
    const l = calcLengthContraction(l0, beta)
    // l = 100 / 1.25 = 80 米
    expect(l).toBeCloseTo(80, 6)
  })

  it('质能方程与动能计算正确', () => {
    const m0 = 2 // 2 kg
    const beta = 0.6
    const c = 10 // 为测试简化 c
    const res = calcRelativisticEnergy(m0, beta, c)

    expect(res.gamma).toBeCloseTo(1.25, 6)
    expect(res.relativisticMass).toBeCloseTo(2.5, 6)
    expect(res.restEnergy).toBeCloseTo(2 * 100, 6) // m0 * c^2 = 200 J
    expect(res.totalEnergy).toBeCloseTo(2.5 * 100, 6) // m * c^2 = 250 J
    expect(res.kineticEnergy).toBeCloseTo(50, 6) // Ek = 250 - 200 = 50 J
  })

  it('相对论速度合成定理正确', () => {
    // 经典速度叠加：0.5 + 0.5 = 1.0 (光速)
    // 相对论合成：(0.5 + 0.5) / (1 + 0.25) = 1 / 1.25 = 0.8
    expect(calcRelativisticVelocityAddition(0.5, 0.5)).toBeCloseTo(0.8, 6)

    // 一个速度趋近光速 0.99，另一个 0.99
    // (0.99 + 0.99) / (1 + 0.99 * 0.99) < 1
    const highSpeed = calcRelativisticVelocityAddition(0.99, 0.99)
    expect(highSpeed).toBeLessThan(1)
    expect(highSpeed).toBeGreaterThan(0.99)
  })
})
