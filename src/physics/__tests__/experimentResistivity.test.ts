import { describe, it, expect } from 'vitest'
import {
  calcTheoreticalResistance,
  calcMeasuredResistance,
  calcResistivityFromSlope,
  solveResistivityExperiment,
  RESISTIVITY_NICHROME,
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

describe('电阻率实验求解器（看板 / hook / R-L 图共用单一可信源）单测', () => {
  const base = { L: 0.5, d_mm: 0.6, R_slider: 20 }

  it('外接法：斜率法与单点法反推的 ρ 完全一致，且略小于真实值', () => {
    const r = solveResistivityExperiment({ ...base, wiring: 0 })
    // 两种途径反推 ρ 必须同源（这正是原先 k_ideal 造成的"ρ 恒为 1.000"缺陷）
    expect(r.rho_from_slope).toBeCloseTo(r.rho_meas, 12)
    expect(r.rho_from_slope).toBeLessThan(RESISTIVITY_NICHROME)
    expect(r.Rx_meas).toBeLessThan(r.Rx_real)
  })

  it('内接法：斜率法自动消掉截距误差（ρ 回到真值），单点法则偏大', () => {
    const r = solveResistivityExperiment({ ...base, wiring: 1 })
    // 内接法 R_测 = R + R_A，斜率不含截距 ⇒ 斜率法 ρ = 真值
    expect(r.k_meas).toBeCloseTo(r.k_real, 12)
    expect(r.rho_from_slope).toBeCloseTo(RESISTIVITY_NICHROME, 12)
    // 而单点法把 R_A 全部算进 ρ，明显偏大
    expect(r.rho_meas).toBeGreaterThan(RESISTIVITY_NICHROME * 1.2)
  })

  it('变阻器阻值只改变电表读数，不改变 R-L 图线斜率', () => {
    const low = solveResistivityExperiment({ ...base, wiring: 0, R_slider: 5 })
    const high = solveResistivityExperiment({ ...base, wiring: 0, R_slider: 50 })
    expect(low.currentA).toBeGreaterThan(high.currentA)
    expect(low.voltageV).toBeGreaterThan(high.voltageV)
    expect(low.k_meas).toBeCloseTo(high.k_meas, 12)
    expect(low.rho_from_slope).toBeCloseTo(high.rho_from_slope, 15)
  })

  it('电表读数满足 U = I·R_测，且量程覆盖读数', () => {
    for (const R_slider of [5, 20, 50]) {
      const r = solveResistivityExperiment({ ...base, wiring: 0, R_slider })
      expect(r.voltageV).toBeCloseTo(r.currentA * r.Rx_meas, 12)
      expect(r.currentA).toBeLessThanOrEqual(r.ammeterRange)
      expect(r.voltageV).toBeLessThanOrEqual(r.voltmeterRange)
    }
  })

  it('L 与 d 超出参数区间时自动钳制，避免求出非物理结果', () => {
    const r = solveResistivityExperiment({ L: 5, d_mm: 0, wiring: 0, R_slider: 20 })
    expect(r.L).toBe(0.8)
    expect(r.d_mm).toBe(0.2)
    expect(r.Rx_real).toBeGreaterThan(0)
    expect(Number.isFinite(r.rho_from_slope)).toBe(true)
  })
})
