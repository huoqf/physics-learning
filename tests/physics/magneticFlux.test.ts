import { describe, it, expect, beforeAll } from 'vitest'
import {
  WIRE_FRAME_GRAVITY_N,
  TAP_LENGTHS_M,
  FLUX_FIELD_LINE_COUNT,
  computeBFieldRatioExperiment,
  computeMagneticFluxState,
} from '@/physics'
import { buildPhysicsQuantities, preloadQuantityBuilder } from '@/data/physicsQuantities'

describe('computeBFieldRatioExperiment（控制变量比值定义法探究 B）', () => {
  it('垂直放置（θ_IB=90°）时，改变 I 与 L 后比值 F/(IL) 恒等于 B', () => {
    const r1 = computeBFieldRatioExperiment({ B: 1.2, I: 1.5, L: 0.10, thetaIB: 90 })
    const r2 = computeBFieldRatioExperiment({ B: 1.2, I: 3.5, L: 0.25, thetaIB: 90 })

    expect(r1.ampereForceF).toBeCloseTo(1.2 * 1.5 * 0.10, 6)
    expect(r2.ampereForceF).toBeCloseTo(1.2 * 3.5 * 0.25, 6)
    expect(r1.measuredRatio).toBeCloseTo(1.2, 6)
    expect(r2.measuredRatio).toBeCloseTo(1.2, 6)
    expect(r1.springReadingT).toBeCloseTo(WIRE_FRAME_GRAVITY_N + r1.ampereForceF, 6)
  })

  it('非垂直放置（θ_IB=30°）时，测得垂直分量 B_⊥ = B·sin30° = 0.5B', () => {
    const res = computeBFieldRatioExperiment({ B: 1.6, I: 2.0, L: 0.20, thetaIB: 30 })
    expect(res.B_perp).toBeCloseTo(0.8, 6)
    expect(res.ampereForceF).toBeCloseTo(0.8 * 2.0 * 0.20, 6)
    expect(res.measuredRatio).toBeCloseTo(0.8, 6)
  })

  it('平行放置（θ_IB=0°, I∥B）时，安培力与斜率均为 0，测力计只显示自重', () => {
    const res = computeBFieldRatioExperiment({ B: 1.5, I: 3.0, L: 0.20, thetaIB: 0 })
    expect(res.B_perp).toBeCloseTo(0, 6)
    expect(res.ampereForceF).toBeCloseTo(0, 6)
    expect(res.measuredRatio).toBeCloseTo(0, 6)
    expect(res.slopeFIL).toBeCloseTo(0, 6)
    expect(res.springReadingT).toBeCloseTo(WIRE_FRAME_GRAVITY_N, 6)
  })

  it('F–I、F–L、F–(IL) 三种斜率严格满足理论闭环，且生成 5 档抽头采样点', () => {
    const res = computeBFieldRatioExperiment({ B: 1.4, I: 2.5, L: 0.15, thetaIB: 60 })
    const sin60 = Math.sin((60 * Math.PI) / 180)

    expect(res.slopeFI).toBeCloseTo(1.4 * 0.15 * sin60, 6)
    expect(res.slopeFL).toBeCloseTo(1.4 * 2.5 * sin60, 6)
    expect(res.slopeFIL).toBeCloseTo(1.4 * sin60, 6)

    // 曲线端点验证（线性过原点）
    expect(res.fiPoints[0]).toEqual({ x: 0, y: 0 })
    expect(res.fiPoints[1].x).toBe(5.0)
    expect(res.fiPoints[1].y).toBeCloseTo(res.slopeFI * 5.0, 6)

    expect(res.flPoints[1].x).toBe(0.30)
    expect(res.flPoints[1].y).toBeCloseTo(res.slopeFL * 0.30, 6)

    expect(res.filPoints[1].x).toBe(1.50)
    expect(res.filPoints[1].y).toBeCloseTo(res.slopeFIL * 1.50, 6)

    // 5 档抽头点验证
    expect(res.tapSamples).toHaveLength(TAP_LENGTHS_M.length)
    for (let i = 0; i < TAP_LENGTHS_M.length; i++) {
      const pt = res.tapSamples[i]
      expect(pt.L).toBe(TAP_LENGTHS_M[i])
      expect(pt.x).toBeCloseTo(2.5 * TAP_LENGTHS_M[i], 6)
      expect(pt.F).toBeCloseTo(1.4 * 2.5 * TAP_LENGTHS_M[i] * sin60, 6)
    }
  })
})

describe('computeMagneticFluxState（倾斜投影面积 S_⊥ 与磁通量 Φ）', () => {
  it('θ = 0° 正面垂直穿入时 S_⊥ = S, Φ = BS, ΔΦ = 0', () => {
    const res = computeMagneticFluxState({ B: 1.0, S: 0.4, thetaNormal: 0 })
    expect(res.projAreaSPerp).toBeCloseTo(0.4, 6)
    expect(res.phi).toBeCloseTo(0.4, 6)
    expect(res.deltaPhiFromZero).toBeCloseTo(0, 6)
    expect(res.fluxSide).toBe('front')
    expect(res.effectiveLineCount).toBe(FLUX_FIELD_LINE_COUNT)
  })

  it('θ = 30° 倾斜时穿入有效磁感线条数与几何投影 7 / 9 条一致', () => {
    const res = computeMagneticFluxState({ B: 1.0, S: 0.4, thetaNormal: 30 })
    expect(res.effectiveLineCount).toBe(7)
  })

  it('θ = 60° 倾斜时 α = 30°, S_⊥ = S·cos60° = 0.5S, Φ = 0.5BS 且穿入 5 条', () => {
    const res = computeMagneticFluxState({ B: 1.2, S: 0.4, thetaNormal: 60 })
    expect(res.planeAngleAbs).toBeCloseTo(30, 6)
    expect(res.projAreaSPerp).toBeCloseTo(0.2, 6)
    expect(res.phi).toBeCloseTo(0.24, 6)
    expect(res.deltaPhiFromZero).toBeCloseTo(-0.24, 6)
    expect(res.fluxSide).toBe('front')
    expect(res.effectiveLineCount).toBe(5)
  })

  it('θ = 90° 平行磁场时 S_⊥ = 0, Φ = 0, 有效穿入条数为 0', () => {
    const res = computeMagneticFluxState({ B: 1.2, S: 0.4, thetaNormal: 90 })
    expect(res.projAreaSPerp).toBeCloseTo(0, 6)
    expect(res.phi).toBeCloseTo(0, 6)
    expect(res.fluxSide).toBe('parallel')
    expect(res.effectiveLineCount).toBe(0)
  })

  it('θ = 120° 越过平行面向反面倾斜时 S_⊥ 取绝对值仍为 0.5S，而 Φ 为负值', () => {
    const res = computeMagneticFluxState({ B: 1.0, S: 0.4, thetaNormal: 120 })
    expect(res.projAreaSPerp).toBeCloseTo(0.2, 6)
    expect(res.signedProjArea).toBeCloseTo(-0.2, 6)
    expect(res.phi).toBeCloseTo(-0.2, 6)
    expect(res.fluxSide).toBe('back')
  })

  it('θ = 180° 翻转半周时 Φ = -BS, 相对初态变化量 ΔΦ = -2BS', () => {
    const res = computeMagneticFluxState({ B: 1.5, S: 0.4, thetaNormal: 180 })
    expect(res.projAreaSPerp).toBeCloseTo(0.4, 6)
    expect(res.phi).toBeCloseTo(-0.6, 6)
    expect(res.deltaPhiFromZero).toBeCloseTo(-1.2, 6)
    expect(res.fluxSide).toBe('back')
    expect(res.effectiveLineCount).toBe(FLUX_FIELD_LINE_COUNT)
  })

  it('curvePoints 应覆盖 0°~180° 共 61 个余弦采样点', () => {
    const res = computeMagneticFluxState({ B: 1.0, S: 0.4, thetaNormal: 30 })
    expect(res.curvePoints).toHaveLength(61)
    expect(res.curvePoints[0]).toEqual({ x: 0, y: 0.4 })
    expect(res.curvePoints[30].x).toBe(90)
    expect(res.curvePoints[30].y).toBeCloseTo(0, 6)
    expect(res.curvePoints[60].x).toBe(180)
    expect(res.curvePoints[60].y).toBeCloseTo(-0.4, 6)
  })
})

describe('buildPhysicsQuantities: anim-magnetic-field-flux 双模式看板输出', () => {
  beforeAll(async () => {
    await preloadQuantityBuilder('anim-magnetic-field-flux')
  })

  it('mode = 0 返回比值测 B 相关物理量、公式及比值结论', () => {
    const panel = buildPhysicsQuantities(
      'anim-magnetic-field-flux',
      { mode: 0, chartAxis: 2, B: 1.5, I: 2.0, L: 0.2, thetaIB: 90 },
      0,
    )
    const getVal = (symbol: string) =>
      panel.quantities.find((q) => q.symbol === symbol)?.value

    expect(getVal('F')).toBe('0.60')
    expect(getVal('T')).toBe('1.10')
    expect(getVal('F/(IL)')).toBe('1.50')
    expect(getVal('k')).toBe('1.50')
    expect(panel.formulas?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it('mode = 1 返回有效投影面积 S_⊥、磁通量 Φ 与 ΔΦ', () => {
    const panel = buildPhysicsQuantities(
      'anim-magnetic-field-flux',
      { mode: 1, B: 1.0, S: 0.4, thetaNormal: 180 },
      0,
    )
    const getVal = (symbol: string) =>
      panel.quantities.find((q) => q.symbol === symbol)?.value

    expect(getVal('S_⊥')).toBe('0.400')
    expect(getVal('Φ')).toBe('-0.400')
    expect(getVal('ΔΦ')).toBe('-0.800')
    expect(panel.formulas?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})
