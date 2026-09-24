import { describe, it, expect } from 'vitest'
import {
  calculateInductiveReactance,
  calculateCapacitiveReactance,
  calculateImpedance,
  calculateBranchCurrentAndPower,
  calculateResonanceFrequency,
} from '../acImpedance'

describe('acImpedance (纯物理计算单元测试)', () => {
  it('正确计算感抗 X_L = 2πfL', () => {
    // 50Hz, 0.5H -> 2 * π * 50 * 0.5 = 50π ≈ 157.0796 Ω
    const xl = calculateInductiveReactance(50, 0.5)
    expect(xl).toBeCloseTo(157.08, 1)

    // 边界：f=0 或 L=0 时感抗为 0
    expect(calculateInductiveReactance(0, 0.5)).toBe(0)
    expect(calculateInductiveReactance(50, 0)).toBe(0)
  })

  it('正确计算容抗 X_C = 1 / (2πfC)', () => {
    // 50Hz, 100μF (1e-4 F) -> 1 / (2 * π * 50 * 1e-4) = 100 / π ≈ 31.83 Ω
    const xc = calculateCapacitiveReactance(50, 1e-4)
    expect(xc).toBeCloseTo(31.83, 1)

    // 边界：直流 f=0 时容抗为无穷大
    expect(calculateCapacitiveReactance(0, 1e-4)).toBe(Number.POSITIVE_INFINITY)
  })

  it('正确计算综合阻抗 Z = √(R² + X²)', () => {
    // R=30, X=40 -> Z=50
    expect(calculateImpedance(30, 40)).toBeCloseTo(50, 4)
    expect(calculateImpedance(30, Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })

  it('正确计算支路有效值电流与灯泡消耗功率', () => {
    // 交流：U=100V, R=30Ω, X=40Ω -> Z=50Ω, I=2A, P=I²R=120W
    const resAC = calculateBranchCurrentAndPower(100, 30, 40, false)
    expect(resAC.current).toBeCloseTo(2, 4)
    expect(resAC.power).toBeCloseTo(120, 4)

    // 直流断路（容抗无穷大）：I=0, P=0
    const resDC_C = calculateBranchCurrentAndPower(100, 30, Number.POSITIVE_INFINITY, true)
    expect(resDC_C.current).toBe(0)
    expect(resDC_C.power).toBe(0)

    // 直流电感（假设线圈直流内阻 10Ω）：U=100V, R+r=40Ω -> I=2.5A, P=2.5²*30=187.5W
    const resDC_L = calculateBranchCurrentAndPower(100, 30, 0, true, 10)
    expect(resDC_L.current).toBeCloseTo(2.5, 4)
    expect(resDC_L.power).toBeCloseTo(187.5, 4)
  })

  it('正确计算谐振频率 f0 = 1 / (2π√(LC))', () => {
    // L=0.1H, C=10μF (1e-5 F) -> LC = 1e-6, √(LC)=1e-3, f0 = 1000 / (2π) ≈ 159.15 Hz
    const f0 = calculateResonanceFrequency(0.1, 1e-5)
    expect(f0).toBeCloseTo(159.15, 1)
  })
})
