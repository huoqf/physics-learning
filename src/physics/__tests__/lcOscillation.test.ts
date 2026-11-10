import { describe, it, expect } from 'vitest'
import {
  calculateLCConstants,
  calculateCapacitanceWithGap,
  calculateLCFrequency,
  calculateRadioResonance,
  calculateRadioTuning,
  lcChargeAt,
  lcCurrentAt,
  lcVoltageAt,
  lcCurrentRateAt,
  lcInductorEmfMagnitudeAt,
  lcOscillationStage,
  lcElectricEnergy,
  lcMagneticEnergy,
  sampleLCWaveformRange,
  LC_DEFAULT_PARAMS,
  LC_CURVE_TIME_WINDOW,
} from '../lcOscillation'

describe('LC 振荡与无线电调谐物理模型', () => {
  it('计算理想 LC 回路周期与频率', () => {
    const res = calculateLCConstants({
      L: LC_DEFAULT_PARAMS.L,
      C: LC_DEFAULT_PARAMS.C,
      Q0: LC_DEFAULT_PARAMS.Q0,
    })
    expect(res.T).toBeCloseTo(2 * Math.PI * Math.sqrt(0.4 * 0.4), 4)
    expect(res.f).toBeCloseTo(1 / res.T, 4)
    expect(res.eTotal).toBeCloseTo(1 / (2 * 0.4), 4)
  })

  it('极板间距拉开使电容反比减小 (C ∝ 1/d)', () => {
    const baseC = 1.0
    const cClose = calculateCapacitanceWithGap(baseC, 0.5)
    const cFar = calculateCapacitanceWithGap(baseC, 2.0)
    expect(cClose).toBe(2.0)
    expect(cFar).toBe(0.5)
  })

  it('无线电接收回路调谐电谐振响应', () => {
    const fTx = 100e6 // 100 MHz
    // 恰好谐振
    const tunedRes = calculateRadioResonance(fTx, fTx, 14)
    expect(tunedRes.response).toBeCloseTo(1.0, 3)
    expect(tunedRes.isTuned).toBe(true)

    // 严重偏离发射频率（失谐）
    const detunedRes = calculateRadioResonance(fTx, 70e6, 14)
    expect(detunedRes.response).toBeLessThan(0.3)
    expect(detunedRes.isTuned).toBe(false)
  })

  it('LC 固有频率随电容增大而降低', () => {
    const L = 1e-6
    const f1 = calculateLCFrequency(L, 1e-6)
    const f2 = calculateLCFrequency(L, 4e-6)
    expect(f2).toBeCloseTo(f1 / 2, 4)
  })

  it('calculateRadioTuning 统一调谐口径与临界阈值判定', () => {
    const fTx = 100e6
    // 1. 完全对准 (cRx = 1.0)
    const exact = calculateRadioTuning(fTx, 1.0, 14)
    expect(exact.fRx).toBeCloseTo(fTx, 1)
    expect(exact.response).toBeCloseTo(1.0, 3)
    expect(exact.isTuned).toBe(true)

    // 2. 审查复现点：cRx = 1.10 时 fRx = 95.3 MHz，失谐 4.7 MHz，响应度约 0.60，必须判定为未谐振 (false)
    const detuned11 = calculateRadioTuning(fTx, 1.1, 14)
    expect(detuned11.fRx).toBeCloseTo(95.346e6, -4)
    expect(detuned11.response).toBeLessThan(0.7)
    expect(detuned11.isTuned).toBe(false)

    // 3. 微调容差范围：cRx = 1.02 时（失谐约 1 MHz），响应度应超过 0.85 阈值
    const near = calculateRadioTuning(fTx, 1.02, 14)
    expect(near.response).toBeGreaterThan(0.85)
    expect(near.isTuned).toBe(true)
  })

  it.each([false, true])('q/i 满足统一约定 i=-dq/dt（damped=%s）', (damped) => {
    const params = { ...LC_DEFAULT_PARAMS, damped }
    const { T } = calculateLCConstants(params)
    const t = 0.37
    const h = 1e-5
    const numericalCurrent = -(lcChargeAt(params, t + h) - lcChargeAt(params, t - h)) / (2 * h)

    expect(lcChargeAt(params, 0)).toBeCloseTo(params.Q0, 10)
    expect(lcCurrentAt(params, 0)).toBe(0)
    expect(lcCurrentAt(params, t)).toBeCloseTo(numericalCurrent, 6)
    expect(T).toBeCloseTo(2 * Math.PI * Math.sqrt(params.L * params.C), 10)
  })

  it('理想 LC 在 T/4 达到电流正向峰值且总电磁能守恒', () => {
    const params = { ...LC_DEFAULT_PARAMS, damped: false }
    const { T, iMax, eTotal } = calculateLCConstants(params)

    expect(lcChargeAt(params, T / 4)).toBe(0)
    expect(lcCurrentAt(params, T / 4)).toBeCloseTo(iMax, 10)
    for (const t of [0, T / 8, T / 4, T / 2, T]) {
      const energy = lcElectricEnergy(lcChargeAt(params, t), params.C)
        + lcMagneticEnergy(lcCurrentAt(params, t), params.L)
      expect(energy).toBeCloseTo(eTotal, 8)
    }
  })

  it('弱阻尼把减少的电磁能等量转化为内能', () => {
    const params = { ...LC_DEFAULT_PARAMS, damped: true }
    const { eTotal } = calculateLCConstants(params)
    let previousHeat = 0
    for (const t of [0, 0.4, 0.8, 1.2, 2.0]) {
      const electromagnetic = lcElectricEnergy(lcChargeAt(params, t), params.C)
        + lcMagneticEnergy(lcCurrentAt(params, t), params.L)
      const heat = eTotal - electromagnetic
      expect(heat).toBeGreaterThanOrEqual(previousHeat - 1e-10)
      expect(electromagnetic + heat).toBeCloseTo(eTotal, 10)
      previousHeat = heat
    }
    expect(previousHeat).toBeGreaterThan(0)
  })

  it('改变初始电荷 Q₀ 只改变振幅与能量，不改变固有周期 T 与频率 f', () => {
    const c1 = calculateLCConstants({ L: 0.8, C: 0.5, Q0: 0.5 })
    const c2 = calculateLCConstants({ L: 0.8, C: 0.5, Q0: 4.0 })
    expect(c2.T).toBe(c1.T)
    expect(c2.f).toBe(c1.f)
    expect(c2.iMax / c1.iMax).toBeCloseTo(8, 10)
    expect(c2.eTotal / c1.eTotal).toBeCloseTo(64, 10)
  })

  it('可见时间窗采样在大 L/C 工况下仍保持满密度采样且端点精确', () => {
    const bigParams = { L: 4, C: 8, Q0: 2, damped: false } // 2T ≈ 71.1 s
    const tStart = 10
    const tEnd = tStart + LC_CURVE_TIME_WINDOW
    const samples = sampleLCWaveformRange(bigParams, tStart, tEnd, 240)
    expect(samples).toHaveLength(241)
    expect(samples[0].t).toBe(tStart)
    expect(samples[240].t).toBe(tEnd)
    expect(samples[240].q).toBe(lcChargeAt(bigParams, tEnd))
    expect(samples[240].i).toBe(lcCurrentAt(bigParams, tEnd))
  })

  it('能量变化周期 T_E = T/2，且满足电压/自感电动势极值互补与四阶段判据', () => {
    const params = { ...LC_DEFAULT_PARAMS, damped: false }
    const { T, energyPeriod } = calculateLCConstants(params)
    expect(energyPeriod).toBeCloseTo(T / 2, 12)

    // t = 0: q 最大、i = 0 时极板电压 u_C 与自感电动势 |e_L| 均最大
    expect(lcVoltageAt(params, 0)).toBeCloseTo(params.Q0 / params.C, 12)
    expect(lcInductorEmfMagnitudeAt(params, 0)).toBeCloseTo(params.Q0 / params.C, 12)
    expect(lcCurrentRateAt(params, 0)).toBeCloseTo(params.Q0 / (params.L * params.C), 12)

    // t = T/4: 电流峰值时 q = 0, u_C = 0, |e_L| = 0
    expect(lcVoltageAt(params, T / 4)).toBe(0)
    expect(lcInductorEmfMagnitudeAt(params, T / 4)).toBe(0)

    // 四阶段判据
    expect(lcOscillationStage(params, T / 8).stage).toContain('正向放电')
    expect(lcOscillationStage(params, (3 * T) / 8).stage).toContain('反向充电')
    expect(lcOscillationStage(params, (5 * T) / 8).stage).toContain('反向放电')
    expect(lcOscillationStage(params, (7 * T) / 8).stage).toContain('正向充电')
  })
})
