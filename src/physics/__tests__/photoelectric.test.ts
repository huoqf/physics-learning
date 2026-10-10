import { describe, it, expect } from 'vitest'
import {
  calculateCutoffFrequency,
  calculateMaxKineticEnergy,
  calculateStoppingVoltage,
  calculateComptonWavelengthShift,
  calculateComptonScatteredWavelength,
  generateEkmNuCurve,
  frequencyToPhotonEnergy,
  PHOTOELECTRIC_METALS,
  CESIUM_WORK_FUNCTION,
  SODIUM_WORK_FUNCTION,
  DEFAULT_WORK_FUNCTION,
  COMPTON_WAVELENGTH_NM,
} from '../photoelectric'

describe('光电效应与康普顿散射纯物理计算单测', () => {
  it('光电效应截止频率与最大初动能计算正确', () => {
    // 铯逸出功 W0 = 1.9 eV
    const nu0 = calculateCutoffFrequency(CESIUM_WORK_FUNCTION)
    // nu0 ≈ 4.594 × 10^14 Hz
    expect(nu0).toBeCloseTo(4.594, 2)

    // 入射光子能量 hv = 3.0 eV > 1.9 eV
    const Ekm = calculateMaxKineticEnergy(3.0, CESIUM_WORK_FUNCTION)
    expect(Ekm).toBeCloseTo(1.1, 2)

    // 遏止电压数值上等于 Ekm
    const Uc = calculateStoppingVoltage(Ekm)
    expect(Uc).toBeCloseTo(1.1, 2)
  })

  it('金属逸出功表是唯一真源，且具名常量均取自该表', () => {
    // 表内逸出功严格递增（铯 < 钠 < 锌 < 钨），保证图上曲线不重合
    const w0s = PHOTOELECTRIC_METALS.map((m) => m.workFunction)
    for (let i = 1; i < w0s.length; i++) {
      expect(w0s[i]).toBeGreaterThan(w0s[i - 1])
    }
    expect(CESIUM_WORK_FUNCTION).toBe(PHOTOELECTRIC_METALS[0].workFunction)
    expect(SODIUM_WORK_FUNCTION).toBe(PHOTOELECTRIC_METALS[1].workFunction)
    expect(DEFAULT_WORK_FUNCTION).toBe(CESIUM_WORK_FUNCTION)
  })

  it('Ekm-ν 图线：实线段自横轴交点出发，虚线段延至纵轴 −W₀', () => {
    const W0 = CESIUM_WORK_FUNCTION
    const nuMax = 12
    const { solid, dashed } = generateEkmNuCurve(W0, nuMax)
    const nu0 = calculateCutoffFrequency(W0)

    // 实线段起点恰为横轴截距 (ν₀, 0)，且全程 Ekm ≥ 0
    expect(solid[0].x).toBeCloseTo(nu0, 6)
    expect(solid[0].y).toBeCloseTo(0, 9)
    expect(solid.every((p) => p.y >= -1e-9)).toBe(true)
    expect(solid[solid.length - 1].x).toBeCloseTo(nuMax, 6)

    // 虚线段终点的横坐标也是 ν₀（两段严格接在上），起点为纵轴反向截距 −W₀
    expect(dashed[dashed.length - 1].x).toBeCloseTo(nu0, 6)
    expect(dashed[dashed.length - 1].y).toBeCloseTo(0, 9)
    expect(dashed[0].x).toBeCloseTo(0, 6)
    expect(dashed[0].y).toBeCloseTo(-W0, 9)
    // 虚线段全程 Ekm < 0：绝不出现"ν < ν₀ 却 Ekm = 0"的假水平线
    expect(dashed.every((p) => p.y <= 1e-9)).toBe(true)
  })

  it('所有金属图线彼此平行（斜率均为 h），仅沿 ν 轴平移', () => {
    const nuMax = 12
    // 斜率：每 1×10¹⁴ Hz 的 Ekm 增量应等于 h·10¹⁴ (eV)
    const hPer1e14 = frequencyToPhotonEnergy(1)
    PHOTOELECTRIC_METALS.forEach((m) => {
      const { solid } = generateEkmNuCurve(m.workFunction, nuMax)
      expect(solid.length).toBeGreaterThan(1)
      const a = solid[0]
      const b = solid[solid.length - 1]
      expect((b.y - a.y) / (b.x - a.x)).toBeCloseTo(hPer1e14, 6)
    })
  })

  it('逸出功过大时该金属在图内不产生实线段', () => {
    // 钨 W₀ = 4.5 eV，若横轴只画到 6，则 hν_max = 2.48 eV < W₀
    const { solid, dashed } = generateEkmNuCurve(4.5, 6)
    expect(solid).toHaveLength(0)
    expect(dashed.length).toBeGreaterThan(0)
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
