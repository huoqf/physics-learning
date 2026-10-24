import { describe, it, expect } from 'vitest'
import { resolveVelocityRefs, peakOverRays, refFromPeak } from '../vectorRefs'
import { calculateVectorPixelLength } from '../vectorLength'
import { VECTOR_VISUAL_WEIGHT } from '../../theme/physics/vectorStyle'

/** 由 refMagnitude 反推「每 (m/s) 的像素长度」，用于验证两个矢量共用同一比例 */
function pxPerUnit(refMagnitude: number, maxLength = 100): number {
  // 取 ref 的一半作量值：落在 ratio<1 的线性段内，不触发 ratio≤1 截断
  const mag = refMagnitude * 0.5
  return calculateVectorPixelLength(mag, 'velocity', maxLength, refMagnitude) / mag
}

describe('resolveVelocityRefs', () => {
  it('分量与合矢量的基准保持权重反比（共用同一像素/量纲比例）', () => {
    const { main, component } = resolveVelocityRefs(17.2, 14)
    const weightRatio = VECTOR_VISUAL_WEIGHT.velocityX / VECTOR_VISUAL_WEIGHT.velocity
    expect(component / main).toBeCloseTo(weightRatio, 10)
  })

  it('两个基准都不小于各自全程峰值，避免 ratio≤1 截断', () => {
    const cases: Array<[number, number]> = [
      [17.2, 14], // 平抛 v₀=10
      [19.8, 14], // 平抛 v₀=14（两分量接近，仅按分量配会把合速度截断）
      [28.7, 25], // 平抛 v₀=25
      [20, 20 * Math.cos((45 * Math.PI) / 180)], // 斜抛 45°
      [20, 20 * Math.cos((10 * Math.PI) / 180)], // 斜抛 10°（vₓ 主导）
    ]
    for (const [peakSpeed, peakComponent] of cases) {
      const { main, component } = resolveVelocityRefs(peakSpeed, peakComponent)
      expect(main).toBeGreaterThanOrEqual(peakSpeed - 1e-9)
      expect(component).toBeGreaterThanOrEqual(peakComponent - 1e-9)
    }
  })

  it('三个箭头共用同一像素/速度比例（矢量三角形可闭合）', () => {
    const maxLength = 100
    const { main, component } = resolveVelocityRefs(17.2, 14)
    const kMain = pxPerUnit(main, maxLength)
    const magC = component * 0.5
    const kComponent = calculateVectorPixelLength(magC, 'velocityX', maxLength, component) / magC
    expect(kComponent).toBeCloseTo(kMain, 10)
  })

  it('平抛 v₀=14 时取 0.8·|v| 作下限，合速度基准恰好等于 |v|', () => {
    const peakSpeed = Math.hypot(14, 14) // 19.799
    const { main, component } = resolveVelocityRefs(peakSpeed, 14)
    expect(component).toBeCloseTo(peakSpeed * 0.8, 6)
    expect(main).toBeCloseTo(peakSpeed, 6)
  })

  it('斜抛 45° 时分量峰值低于 0.8·v₀，基准回落到 0.8·v₀，合速度基准即 v₀', () => {
    const v0 = 20
    const peakComponent = v0 * Math.cos((45 * Math.PI) / 180) // 14.14 < 16
    const { main, component } = resolveVelocityRefs(v0, peakComponent)
    expect(component).toBeCloseTo(16, 6)
    expect(main).toBeCloseTo(20, 6)
  })

  it('退化工况（峰值 0）不会返回 0，避免 minLength 回退与告警', () => {
    const { main, component } = resolveVelocityRefs(0, 0)
    expect(component).toBeGreaterThan(0)
    expect(main).toBeGreaterThan(0)
    expect(Number.isFinite(main)).toBe(true)
  })

  it('非有限峰值被忽略，不退化成 NaN/Infinity', () => {
    const { main, component } = resolveVelocityRefs(Number.POSITIVE_INFINITY, 12)
    expect(Number.isFinite(main)).toBe(true)
    expect(Number.isFinite(component)).toBe(true)
    expect(component).toBeCloseTo(12, 10)
  })
})

describe('peakOverRays', () => {
  // F = B²L²v/R：与 cutting-emf 同构，用来验证「角点 160 倍」的退化
  const ampere = (p: Record<string, number>) => (p.B ** 2 * p.L ** 2 * p.v) / p.R
  const base = { B: 1.5, L: 1.0, v: 2.0, R: 2.0 }

  it('单滑杆扫描取各滑杆端点上的最大值，而不是全角点', () => {
    // v=5 → 5.625；B=3 → 9；L=2 → 9；R=0.5 → 9
    expect(peakOverRays(ampere, base, { v: [-5, 5], B: [-3, 3], L: [0.5, 2], R: [0.5, 5] })).toBeCloseTo(9, 10)
    // 全角点（9·4·5/0.5=360）比单滑杆扫描大 40 倍，据此定基准会把默认帧压成亚像素
    expect(ampere({ ...base, B: 3, L: 2, v: 5, R: 0.5 })).toBeCloseTo(360, 6)
  })

  it('基准点本身参与比较（滑杆中间位置可以是最大值）', () => {
    const peakAtCenter = (p: Record<string, number>) => -((p.x - 5) ** 2) + 30
    expect(peakOverRays(peakAtCenter, { x: 5 }, { x: [0, 10] })).toBeCloseTo(30, 10)
  })

  it('取绝对值：负向量值与正向量值等价', () => {
    expect(peakOverRays((p) => p.x, { x: -1 }, { x: [-8, 2] })).toBeCloseTo(8, 10)
  })

  it('NaN / Infinity 采样被丢弃，不退化成 NaN 峰值', () => {
    const peak = peakOverRays((p) => (p.x === 0 ? NaN : p.x), { x: 1 }, { x: [0, 4] })
    expect(peak).toBeCloseTo(4, 10)
    const inf = peakOverRays((p) => (p.x === 0 ? Number.POSITIVE_INFINITY : p.x), { x: 1 }, { x: [0, 4] })
    expect(inf).toBeCloseTo(4, 10)
  })

  it('量程为空时返回基准点的量值', () => {
    expect(peakOverRays((p) => p.x, { x: 3 }, {})).toBeCloseTo(3, 10)
  })

  it('refFromPeak 使峰值箭头恰好落在 0.9 满量程', () => {
    const peak = peakOverRays(ampere, base, { v: [-5, 5] })
    const ref = refFromPeak(peak)
    expect(calculateVectorPixelLength(peak, 'appliedForce', 100, ref)).toBeCloseTo(
      0.9 * 100 * VECTOR_VISUAL_WEIGHT.appliedForce,
      10,
    )
    // 默认帧（基准点）留出可读余量：既不为 0，也不越界
    const def = calculateVectorPixelLength(ampere(base), 'appliedForce', 100, ref)
    expect(def).toBeGreaterThan(0.15 * 100 * VECTOR_VISUAL_WEIGHT.appliedForce)
    expect(def).toBeLessThan(0.9 * 100 * VECTOR_VISUAL_WEIGHT.appliedForce)
  })
})
