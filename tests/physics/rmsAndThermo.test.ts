import { describe, it, expect } from 'vitest'
import {
  getEffectiveCurrent,
  getTheoreticalThermalState,
  isNearPeriodEnd,
  checkEquivalence,
} from '@/physics/rmsCalculator'
import {
  calculateIdealGas,
  calculateInternalEnergy,
  calculateThermoProcess,
} from '@/physics/thermodynamics'
import {
  M_O2,
  M_N2,
  calcMaxwellSpeedPDF,
  calcMostProbableSpeed,
  calcAverageSpeed,
  calcRmsSpeed,
  generateMaxwellCurves,
} from '@/physics/maxwellDistribution'

describe('physics/rmsCalculator · 交变电流有效值与热效应', () => {
  it('四种波形理论有效值与整数周期发热量严格对齐 Q_ac = I_eff² · R · t', () => {
    const R = 10
    const period = 2
    const Im = 4
    const tEnd = 6 // 3 个完整周期

    const cases = [
      { type: 'sine' as const, expectedIeff: Im / Math.SQRT2 },
      { type: 'half_sine' as const, expectedIeff: Im / 2 },
      { type: 'square' as const, expectedIeff: Im },
      { type: 'pulse' as const, duty: 0.25, expectedIeff: Im * Math.sqrt(0.25) },
    ]

    for (const c of cases) {
      const params = { type: c.type, Im, R, period, dcCurrent: c.expectedIeff, duty: c.duty }
      const iEff = getEffectiveCurrent(params)
      expect(iEff).toBeCloseTo(c.expectedIeff, 10)

      const res = getTheoreticalThermalState(tEnd, params)
      expect(res.Q_ac).toBeCloseTo(res.Q_dc, 9)
      expect(res.T_ac).toBeCloseTo(res.T_dc, 9)
      expect(res.I_eff).toBeCloseTo(iEff, 10)
    }

    // half_sine 后半周期截止，热量保持平台期不变
    const halfAtHalfPeriod = getTheoreticalThermalState(1.0, {
      type: 'half_sine', Im, R, period, dcCurrent: 2,
    })
    const halfAtThreeQuarter = getTheoreticalThermalState(1.5, {
      type: 'half_sine', Im, R, period, dcCurrent: 2,
    })
    expect(halfAtThreeQuarter.Q_ac).toBeCloseTo(halfAtHalfPeriod.Q_ac, 10)

    // duty clamp 与默认兜底
    expect(getEffectiveCurrent({ type: 'pulse', Im: 10, R: 1, period: 1, dcCurrent: 1 })).toBeCloseTo(5, 10) // NaN/undefined -> 0.25
    expect(getEffectiveCurrent({ type: 'pulse', Im: 10, R: 1, period: 1, dcCurrent: 1, duty: 0.001 })).toBeCloseTo(10 * Math.sqrt(0.05), 10)
    expect(getEffectiveCurrent({ type: 'pulse', Im: 10, R: 1, period: 1, dcCurrent: 1, duty: 2 })).toBeCloseTo(10 * Math.sqrt(0.95), 10)
  })

  it('周期终点窗口与等效判定条件', () => {
    expect(isNearPeriodEnd(2.0, 2)).toBe(true)
    expect(isNearPeriodEnd(1.98, 2)).toBe(true)
    expect(isNearPeriodEnd(1.0, 2)).toBe(false)

    expect(checkEquivalence(2.83, Math.SQRT2 * 2, 4.0, 2)).toBe(true)
    expect(checkEquivalence(2.83, Math.SQRT2 * 2, 1.0, 2)).toBe(false)
    expect(checkEquivalence(2.0, Math.SQRT2 * 2, 4.0, 2)).toBe(false)
  })
})

describe('physics/thermodynamics · 理想气体定律与热力学第一定律', () => {
  it('理想气体三大实验定律与综合态方程求解', () => {
    // 玻意耳定律 (T 恒定)：p1*V1 = p2*V2
    const boyle = calculateIdealGas(100, 2, 300, undefined, 4, 300)
    expect(boyle.law).toBe('boyle')
    expect(boyle.p2).toBeCloseTo(50, 10)

    // 查理定律 (V 恒定)：p1/T1 = p2/T2
    const charles = calculateIdealGas(100, 2, 300, 150, 2, undefined)
    expect(charles.law).toBe('charles')
    expect(charles.T2).toBeCloseTo(450, 10)

    // 盖-吕萨克定律 (p 恒定)：V1/T1 = V2/T2
    const gl = calculateIdealGas(100, 2, 300, 100, undefined, 600)
    expect(gl.law).toBe('gay-lussac')
    expect(gl.V2).toBeCloseTo(4, 10)

    // 综合方程
    const comb = calculateIdealGas(100, 2, 300, 200, undefined, 600)
    expect(comb.law).toBe('combined')
    expect(comb.V2).toBeCloseTo(2, 10)
  })

  it('热力学第一定律 ΔU = Q + W 与三类典型过程', () => {
    expect(calculateInternalEnergy(500, -200).deltaU).toBe(300)

    const isoT = calculateThermoProcess({ process: 'isothermal', n: 1, T: 300, V1: 1, V2: 2 })
    expect(isoT.deltaU).toBe(0)
    expect(isoT.W).toBeLessThan(0) // 膨胀对外做功
    expect(isoT.Q).toBeCloseTo(-isoT.W, 10)

    const isoV = calculateThermoProcess({ process: 'isochoric', n: 2, T: 300, T2: 400, V1: 1, V2: 1 })
    expect(isoV.W).toBe(0)
    expect(isoV.Q).toBeCloseTo(isoV.deltaU, 10)

    const isoP = calculateThermoProcess({ process: 'isobaric', n: 1, T: 300, T2: 400, V1: 1, V2: 1.5, p: 1e5 })
    expect(isoP.W).toBeCloseTo(-5e4, 10)
    expect(isoP.Q).toBeGreaterThan(isoP.deltaU)
  })
})

describe('physics/maxwellDistribution · 麦克斯韦速率分布律', () => {
  it('三大特征速率排序恒满足 v_p < v_avg < v_rms 且比例关系精确', () => {
    const T = 300
    const vp = calcMostProbableSpeed(T, M_O2)
    const vavg = calcAverageSpeed(T, M_O2)
    const vrms = calcRmsSpeed(T, M_O2)

    expect(vp).toBeLessThan(vavg)
    expect(vavg).toBeLessThan(vrms)
    expect(vavg / vp).toBeCloseTo(2 / Math.sqrt(Math.PI), 10)
    expect(vrms / vp).toBeCloseTo(Math.sqrt(1.5), 10)

    // 较轻分子 (N2) 特征速率高于 O2
    expect(calcMostProbableSpeed(T, M_N2)).toBeGreaterThan(vp)
  })

  it('PDF 满足非负、在 v=v_p 处取极大值、全区间积分近似为 1', () => {
    expect(calcMaxwellSpeedPDF(-10, 300)).toBe(0)
    expect(calcMaxwellSpeedPDF(100, 0)).toBe(0)
    expect(calcMaxwellSpeedPDF(0, 300)).toBe(0)

    const vp = calcMostProbableSpeed(300, M_O2)
    expect(calcMaxwellSpeedPDF(vp, 300, M_O2)).toBeGreaterThan(calcMaxwellSpeedPDF(vp * 0.8, 300, M_O2))
    expect(calcMaxwellSpeedPDF(vp, 300, M_O2)).toBeGreaterThan(calcMaxwellSpeedPDF(vp * 1.2, 300, M_O2))

    // 数值积分归一化校验：∫ f(v) dv ≈ 1
    const curves = generateMaxwellCurves(300, 600, 2500, 250, M_O2)
    const dv = 2500 / 250
    const integral1 = curves.reduce((s, p) => s + p.f1 * dv, 0)
    const integral2 = curves.reduce((s, p) => s + (p.f2 ?? 0) * dv, 0)
    expect(integral1).toBeCloseTo(1, 2)
    expect(integral2).toBeCloseTo(1, 2)
  })
})
