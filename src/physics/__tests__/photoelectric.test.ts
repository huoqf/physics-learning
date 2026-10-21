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
  calculatePhotocurrent,
  generateIUCurve,
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

  describe('光电流 I-U 模型连续性', () => {
    it('U → 0⁻ 与 U ≥ 0 的电流一致，曲线上不存在竖直跳变', () => {
      // 遏止电压越小，旧模型在 U=0 处的缺口越大（Uc=0.5V 时约 28.7%），
      // 因此必须逐档验证，而不是只看某一组参数。
      for (const Uc of [0.5, 0.58, 1.0, 1.5, 3.0]) {
        const Imax = 30
        const left = calculatePhotocurrent(-1e-9, Uc, Imax)
        const right = calculatePhotocurrent(0, Uc, Imax)
        expect(right).toBe(Imax)
        expect(left).toBeCloseTo(Imax, 6)
      }
    })

    it('遏止电压处电流为零，且整段单调不减', () => {
      const Uc = 1.5
      const Imax = 27
      expect(calculatePhotocurrent(-Uc, Uc, Imax)).toBe(0)
      expect(calculatePhotocurrent(-Uc - 0.5, Uc, Imax)).toBe(0)

      const pts = generateIUCurve(Uc, Imax, -3, 2, 200)
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i].y).toBeGreaterThanOrEqual(pts[i - 1].y - 1e-9)
        // 相邻采样点之间不允许出现跳变（饱和拐点是斜率转折，不是断点）
        expect(Math.abs(pts[i].y - pts[i - 1].y)).toBeLessThan(Imax * 0.1)
      }
      expect(pts[pts.length - 1].y).toBeCloseTo(Imax, 9)
    })

    it('遏止电压趋零时退化为线性段而不是 NaN', () => {
      const Imax = 20
      for (const Uc of [1e-12, 1e-10, 1e-8]) {
        const v = calculatePhotocurrent(-Uc / 2, Uc, Imax)
        expect(Number.isFinite(v)).toBe(true)
        expect(v).toBeCloseTo(Imax / 2, 4)
      }
    })

    it('不发生光电效应（Uc ≤ 0）时电流恒为零', () => {
      expect(calculatePhotocurrent(2, 0, 30)).toBe(0)
      expect(calculatePhotocurrent(-2, 0, 30)).toBe(0)
      expect(calculatePhotocurrent(-2, -1, 30)).toBe(0)
    })
  })
})
