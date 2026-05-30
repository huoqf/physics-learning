import { describe, it, expect } from 'vitest'
import {
  calculateElectricField,
  calculateElectricPotential,
  calculateCapacitor,
  calculateOhmLaw,
  calculateSeriesResistance,
  calculateParallelResistance,
  calculateClosedCircuit,
  calculateAmpereForce,
  calculateLorentzForce,
  calculateChargeInMagField,
  calculateFaradayEMF,
  calculateTransformer,
  calculateACRMS,
  calculateCoulombForce,
} from '@/physics'

const k = 9e9

describe('electromagnetism', () => {
  it('库仑力（复用 dynamics 实现）可从 @/physics 引入', () => {
    expect(calculateCoulombForce(k, 1e-6, 1e-6, 1).F).toBeCloseTo(9e9 * 1e-12, 10)
  })

  it('电场强度 E = kq/r²', () => {
    expect(calculateElectricField(k, 2e-6, 3).E).toBeCloseTo((k * 2e-6) / 9, 6)
  })

  it('电势 V = kq/r', () => {
    expect(calculateElectricPotential(k, 2e-6, 2).V).toBeCloseTo((k * 2e-6) / 2, 6)
  })

  it('平行板电容 C = εS/d', () => {
    expect(calculateCapacitor(8.85e-12, 0.5, 0.01).C).toBeCloseTo((8.85e-12 * 0.5) / 0.01, 15)
  })

  it('欧姆定律 I = U/R', () => {
    expect(calculateOhmLaw(12, 4).I).toBe(3)
  })

  it('串联电阻求和', () => {
    expect(calculateSeriesResistance([2, 3, 5]).R_total).toBe(10)
  })

  it('并联电阻：两个 6Ω 并联 = 3Ω', () => {
    expect(calculateParallelResistance([6, 6]).R_total).toBeCloseTo(3, 10)
  })

  it('并联电阻：空数组或含 0 返回 0', () => {
    expect(calculateParallelResistance([]).R_total).toBe(0)
    expect(calculateParallelResistance([0, 5]).R_total).toBe(0)
  })

  it('闭合电路：EMF=12 r=1 R=5 → I=2, U=10, η≈0.833', () => {
    const res = calculateClosedCircuit(12, 1, 5)
    expect(res.I).toBeCloseTo(2, 10)
    expect(res.U_terminal).toBeCloseTo(10, 10)
    expect(res.P_output).toBeCloseTo(20, 10)
    expect(res.P_total).toBeCloseTo(24, 10)
    expect(res.eta).toBeCloseTo(20 / 24, 10)
  })

  it('安培力 F = BIL·sinθ（θ=90° 取最大）', () => {
    expect(calculateAmpereForce(0.5, 2, 1, 90).F).toBeCloseTo(1, 10)
    expect(calculateAmpereForce(0.5, 2, 1, 0).F).toBeCloseTo(0, 10)
  })

  it('洛伦兹力 F = qvB·sinθ', () => {
    expect(calculateLorentzForce(1.6e-19, 1e6, 0.2, 90).F).toBeCloseTo(1.6e-19 * 1e6 * 0.2, 24)
  })

  it('带电粒子圆周：r=mv/(qB), T=2πm/(qB), ω=qB/m', () => {
    const res = calculateChargeInMagField(2, 4, 3, 0.5)
    expect(res.r).toBeCloseTo((4 * 3) / (2 * 0.5), 10)
    expect(res.T).toBeCloseTo((2 * Math.PI * 4) / (2 * 0.5), 10)
    expect(res.omega).toBeCloseTo((2 * 0.5) / 4, 10)
  })

  it('带电粒子圆周：除零保护', () => {
    expect(calculateChargeInMagField(0, 4, 3, 0).r).toBe(0)
    expect(calculateChargeInMagField(2, 0, 3, 0.5).omega).toBe(0)
  })

  it('法拉第电磁感应 EMF = N·dΦ/dt', () => {
    expect(calculateFaradayEMF(100, 0.02).EMF).toBeCloseTo(2, 10)
  })

  it('理想变压器：升压 n1=100 n2=200 U1=220 → U2=440, I2=I1/2', () => {
    const res = calculateTransformer(100, 200, 220, 4)
    expect(res.U2).toBeCloseTo(440, 10)
    expect(res.I2).toBeCloseTo(2, 10)
  })

  it('交流有效值 V_rms = V_peak/√2', () => {
    const res = calculateACRMS(311)
    expect(res.V_rms).toBeCloseTo(311 / Math.SQRT2, 6)
    expect(res.I_rms).toBeCloseTo(311 / Math.SQRT2, 6)
  })
})
