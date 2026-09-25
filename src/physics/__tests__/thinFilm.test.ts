import { describe, it, expect } from 'vitest'
import {
  calculateThinFilmInterference,
  calculateWedgeFringeSpacing,
  calculateNewtonRingRadius,
} from '../thinFilm'

describe('薄膜干涉与增透膜物理计算测试', () => {
  it('标准增透膜参数下应满足相消干涉（极小反射率）', () => {
    // 典型增透膜：λ = 550nm (绿光), n_film = 1.38 (MgF2), n_substrate = 1.52 (玻璃)
    // 理想膜厚 d = 550 / (4 * 1.38) ≈ 99.64 nm
    const d_ideal = 550 / (4 * 1.38)
    const res = calculateThinFilmInterference({
      wavelength_nm: 550,
      filmThickness_nm: d_ideal,
      n_film: 1.38,
      n_substrate: 1.52,
      theta_i_deg: 0,
    })

    // 两表面反射均有半波损失 (1.0 < 1.38 < 1.52)
    expect(res.hasHalfWaveLossTop).toBe(true)
    expect(res.hasHalfWaveLossBottom).toBe(true)
    expect(res.netHalfWaveLoss).toBe(false)

    // 几何光程差 2 * n * d = 2 * 1.38 * (550 / (4 * 1.38)) = 550 / 2 = 275 nm (恰好半个波长)
    expect(res.opticalPathDiff_nm).toBeCloseTo(275, 2)
    expect(res.reflectance).toBeLessThan(0.05)
    expect(res.isDestructive).toBe(true)
    expect(res.idealCoatingThickness_nm).toBeCloseTo(99.64, 1)
  })

  it('单表面半波损失情况下的相位差判定', () => {
    // 肥皂泡膜：n_air = 1.0, n_film = 1.33, n_back = 1.0 (空气)
    // 上表面 (1.0 -> 1.33) 有半波损失，下表面 (1.33 -> 1.0) 无半波损失，净半波损失为 true
    const res = calculateThinFilmInterference({
      wavelength_nm: 600,
      filmThickness_nm: 100,
      n_film: 1.33,
      n_substrate: 1.0,
      theta_i_deg: 0,
    })

    expect(res.hasHalfWaveLossTop).toBe(true)
    expect(res.hasHalfWaveLossBottom).toBe(false)
    expect(res.netHalfWaveLoss).toBe(true)
  })

  it('劈尖干涉条纹间距计算', () => {
    // λ = 600 nm, 劈尖倾角 alpha = 1e-4 rad, 空气劈尖 (n=1)
    // Δx = λ / (2 * alpha) = 600e-9 / (2 * 1e-4) = 3e-3 m = 3 mm
    const spacing = calculateWedgeFringeSpacing(600, 1e-4, 1.0)
    expect(spacing).toBeCloseTo(3.0, 2)
  })

  it('牛顿环第 4 级暗环半径计算', () => {
    // m = 4, R = 1.0 m, λ = 500 nm = 5e-7 m
    // r = sqrt(4 * 1.0 * 5e-7) = sqrt(2e-6) ≈ 0.001414 m = 1.414 mm
    const r4 = calculateNewtonRingRadius(4, 1.0, 500)
    expect(r4).toBeCloseTo(1.414, 2)
  })
})
