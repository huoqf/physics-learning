import { describe, it, expect } from 'vitest'
import {
  calculateCutoffFrequency,
  calculateMaxKineticEnergy,
  calculateStoppingVoltage,
  calculateComptonWavelengthShift,
  calculateComptonScatteredWavelength,
  COMPTON_WAVELENGTH_NM,
} from '../photoelectric'

describe('光电效应与康普顿散射纯物理计算单测', () => {
  it('光电效应截止频率与最大初动能计算正确', () => {
    // 铯逸出功 W0 = 2.14 eV
    const nu0 = calculateCutoffFrequency(2.14)
    // nu0 ≈ 5.174 × 10^14 Hz
    expect(nu0).toBeCloseTo(5.174, 2)

    // 入射光子能量 hv = 3.0 eV > 2.14 eV
    const Ekm = calculateMaxKineticEnergy(3.0, 2.14)
    expect(Ekm).toBeCloseTo(0.86, 2)

    // 遏止电压数值上等于 Ekm
    const Uc = calculateStoppingVoltage(Ekm)
    expect(Uc).toBeCloseTo(0.86, 2)
  })

  it('康普顿散射波长偏移与散射角关系正确', () => {
    // theta = 0 度 => cos(0) = 1 => deltaLambda = 0
    expect(calculateComptonWavelengthShift(0)).toBeCloseTo(0, 8)

    // theta = 90 度 => cos(90) = 0 => deltaLambda = lambda_c ≈ 0.00242631 nm
    expect(calculateComptonWavelengthShift(90)).toBeCloseTo(COMPTON_WAVELENGTH_NM, 8)

    // theta = 180 度 (背向散射) => cos(180) = -1 => deltaLambda = 2 * lambda_c
    expect(calculateComptonWavelengthShift(180)).toBeCloseTo(2 * COMPTON_WAVELENGTH_NM, 8)

    // 初始波长 0.02 nm，在 90 度散射后波长拉长
    const scattered = calculateComptonScatteredWavelength(0.02, 90)
    expect(scattered).toBeCloseTo(0.02 + COMPTON_WAVELENGTH_NM, 8)
  })
})
