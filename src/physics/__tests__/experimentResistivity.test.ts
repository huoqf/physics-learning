import { describe, it, expect } from 'vitest'
import {
  calcTheoreticalResistance,
  calcMeasuredResistance,
  calcResistivityFromSlope,
} from '../experimentResistivity'

describe('测量金属丝电阻率纯物理计算单测', () => {
  it('真实理论电阻与圆面积关系准确', () => {
    // rho = 1.0e-6 Ω·m, L = 0.5 m, d = 0.5 mm = 5e-4 m
    // S = pi * (5e-4)^2 / 4 = 1.9634954e-7 m^2
    // R = 1.0e-6 * 0.5 / 1.9634954e-7 = 2.546479 Ω
    const R = calcTheoreticalResistance(1.0e-6, 0.5, 5e-4)
    expect(R).toBeCloseTo(2.546479, 4)
  })

  it('电流表外接法系统误差：测量值小于真实值', () => {
    const Rx = 5.0 // 待测电阻 5 Ω
    const RV = 3000 // 电压表内阻 3000 Ω
    const RA = 0.5 // 电流表内阻 0.5 Ω

    const R_meas_out = calcMeasuredResistance(Rx, 0, RV, RA)
    // R_meas = 5 * 3000 / 3005 ≈ 4.99168 Ω
    expect(R_meas_out).toBeLessThan(Rx)
    expect(R_meas_out).toBeCloseTo(4.99168, 3)
  })

  it('电流表内接法系统误差：测量值大于真实值', () => {
    const Rx = 5.0
    const RV = 3000
    const RA = 0.5

    const R_meas_in = calcMeasuredResistance(Rx, 1, RV, RA)
    // R_meas = 5.0 + 0.5 = 5.5 Ω
    expect(R_meas_in).toBeGreaterThan(Rx)
    expect(R_meas_in).toBe(5.5)
  })

  it('由 R-L 图像斜率反推电阻率计算正确', () => {
    // R = rho * 4L / (pi * d^2) => slope = 4 * rho / (pi * d^2)
    // 当 rho = 1.0e-6, d = 5e-4 时：
    // slope = 4 * 1.0e-6 / (pi * 25e-8) = 4 / (0.25 * pi) = 16 / pi ≈ 5.092958 Ω/m
    const d = 5e-4
    const expectedSlope = 16 / Math.PI
    const rhoCalculated = calcResistivityFromSlope(expectedSlope, d)
    expect(rhoCalculated).toBeCloseTo(1.0e-6, 9)
  })
})
