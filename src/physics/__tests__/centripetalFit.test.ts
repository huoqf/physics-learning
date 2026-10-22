import { describe, it, expect } from 'vitest'
import { computeCentripetalFit, sampleFitLine } from '../centripetalFit'

/**
 * F–ω² 实验图层的判据：
 *   - 斜率 = m·r（物理结论）
 *   - 拟合斜率必须由采样点算出来，且与理论值相差在测量误差量级内
 *   - 质量加倍 / 半径加倍 → 斜率同比变化（控制变量法的量化表述）
 */
describe('centripetalFit physics', () => {
  const m = 2
  const r = 3

  it('理论斜率 k = m·r，ω² 可控上限 = (vMax/r)²', () => {
    const fit = computeCentripetalFit(m, r, { vMin: 1, vMax: 10 })
    expect(fit.slope).toBeCloseTo(6, 12)
    expect(fit.omegaSqMax).toBeCloseTo((10 / 3) ** 2, 12)
  })

  it('采样点满足 ω² = (v/r)²，测量值在理论值 ±2% 内', () => {
    const fit = computeCentripetalFit(m, r, { vMin: 1, vMax: 10 })
    expect(fit.samples).toHaveLength(5)
    for (const s of fit.samples) {
      expect(s.omegaSq).toBeCloseTo((s.v / r) ** 2, 12)
      expect(s.fTheory).toBeCloseTo(fit.slope * s.omegaSq, 12)
      const relErr = Math.abs(s.fMeasured / s.fTheory - 1)
      expect(relErr).toBeLessThan(0.02)
    }
    // 采样覆盖整个线速度区间
    expect(fit.samples[0].v).toBeCloseTo(1, 12)
    expect(fit.samples[4].v).toBeCloseTo(10, 12)
  })

  it('拟合斜率由采样点做过原点最小二乘得到，而不是直接抄 m·r', () => {
    const fit = computeCentripetalFit(m, r, { vMin: 1, vMax: 10 })
    // 独立复算一遍 Σ(xy)/Σ(x²)
    let sxy = 0
    let sxx = 0
    for (const s of fit.samples) {
      sxy += s.omegaSq * s.fMeasured
      sxx += s.omegaSq * s.omegaSq
    }
    expect(fit.fitSlope).toBeCloseTo(sxy / sxx, 12)
    // 有残差 ⇒ 拟合斜率不会恰好等于理论斜率，但应非常接近
    expect(fit.fitSlope).not.toBeCloseTo(fit.slope, 6)
    expect(Math.abs(fit.slopeError)).toBeLessThan(0.02)
    expect(fit.slopeError).toBeCloseTo(fit.fitSlope / fit.slope - 1, 12)
  })

  it('采样是可复现的（固定残差序列，不用随机数）', () => {
    const a = computeCentripetalFit(m, r)
    const b = computeCentripetalFit(m, r)
    expect(a.samples.map((s) => s.fMeasured)).toEqual(b.samples.map((s) => s.fMeasured))
  })

  it('对照线斜率 = 2m·r；质量或半径加倍都让斜率翻倍', () => {
    const fit = computeCentripetalFit(m, r)
    expect(fit.compareSlope).toBeCloseTo(2 * m * r, 12)

    expect(computeCentripetalFit(2 * m, r).slope).toBeCloseTo(2 * fit.slope, 12)
    expect(computeCentripetalFit(m, 2 * r).slope).toBeCloseTo(2 * fit.slope, 12)
  })

  it('拟合直线采样：过原点，终点落在 (ω²max, k_fit·ω²max)', () => {
    const fit = computeCentripetalFit(m, r)
    const line = sampleFitLine(fit, 10)
    expect(line[0]).toEqual({ x: 0, y: 0 })
    const last = line[line.length - 1]
    expect(last.x).toBeCloseTo(fit.omegaSqMax, 12)
    expect(last.y).toBeCloseTo(fit.fitSlope * fit.omegaSqMax, 10)
    // 全程单调递增且斜率恒定
    for (let i = 1; i < line.length; i++) {
      const k = line[i].y / line[i].x
      expect(k).toBeCloseTo(fit.fitSlope, 10)
    }
  })
})
