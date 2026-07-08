import { describe, it, expect } from 'vitest'
import {
  computeVelocitySelectorPassVelocity,
  computeVelocitySelectorBalance,
  computeCyclotronResonanceFrequency,
  computeCyclotronMaxEnergy,
  stepCyclotronSlit,
  computeSpectrometerRadius,
  computeElectricDeflection,
} from '@/physics/fieldsCascade'


const q = 6.0e-18
const m = 6.0e-23
const rMax = 0.5

describe('速度选择器', () => {
  it('通过速度 v₀ = E / B₁', () => {
    expect(computeVelocitySelectorPassVelocity(300, 0.2)).toBeCloseTo(1500, 9)
  })
  it('v = E/B₁ 时受力平衡', () => {
    const b = computeVelocitySelectorBalance(300, 0.2, 1500, q)
    expect(b.balanced).toBe(true)
    expect(b.electricForce).toBeCloseTo(b.magneticForce, 9)
  })
  it('v ≠ E/B₁ 时不平衡', () => {
    const b = computeVelocitySelectorBalance(300, 0.2, 1000, q)
    expect(b.balanced).toBe(false)
  })
})

describe('回旋加速器', () => {
  it('共振频率 f = qB / (2πm)', () => {
    const f = computeCyclotronResonanceFrequency(1.5, q, m)
    expect(f).toBeCloseTo((q * 1.5) / (2 * Math.PI * m), 9)
  })
  it('最大能量 E_k,max = q²B²R² / (2m)', () => {
    const e = computeCyclotronMaxEnergy(1.5, q, rMax, m)
    expect(e).toBeCloseTo((q * q * 1.5 * 1.5 * rMax * rMax) / (2 * m), 9)
  })
  it('共振时每次过缝恒 +qU', () => {
    const fMag = computeCyclotronResonanceFrequency(1.5, q, m)
    const s = stepCyclotronSlit(1e-15, rMax, 5000, fMag, 1e-4, q, m, 1.5)
    expect(s.deltaE).toBeCloseTo(q * 5000, 9)
    expect(s.phaseMatched).toBe(true)
  })
  it('失谐时过缝可减速（净加速趋零）', () => {
    const fMag = computeCyclotronResonanceFrequency(1.5, q, m)
    // t = 1/(2 fMag) ⇒ 2πΔf·t = π ⇒ cos = -1 ⇒ 减速
    const s = stepCyclotronSlit(1e-15, rMax, 5000, fMag * 2, 1 / (2 * fMag), q, m, 1.5)
    expect(s.deltaE).toBeLessThan(0)
  })
  it('半径达 R_max 即标记逃逸', () => {
    // 初动能已接近最大能量，下一步 +qU 后半径越过 R_max
    const s = stepCyclotronSlit(3e-13, rMax, 5000, 1e9, 0, q, m, 1.5)
    expect(s.nextRadius).toBeGreaterThanOrEqual(rMax)
    expect(s.isEscaped).toBe(true)
  })
})

describe('质谱仪与电偏转', () => {
  it('质谱半径 R = mv / (qB₂)', () => {
    const r = computeSpectrometerRadius(1500, 1.5, q, m)
    expect(r).toBeCloseTo(0.01, 6)
  })

  it('电偏转类平抛运动', () => {
    const L = 0.0333
    const d = 0.0187
    const E = 300
    const out = computeElectricDeflection(1500, E, L, d, q, m)
    
    // 加速度 a = qE/m = (6e-18 * 300) / 6e-23 = 3e7 m/s²
    // 时间 t = L / v0 = 0.0333 / 1500 = 2.22e-5 s
    // 位移 y = 0.5 * a * t^2 = 0.5 * 3e7 * (2.22e-5)^2 = 0.00739 m
    expect(out.yOffset).toBeCloseTo(0.00739, 4)
    // 此时 yOffset = 0.00739 < d/2 = 0.00935, 不应该撞板
    expect(out.hitsPlate).toBe(false)
  })
})

