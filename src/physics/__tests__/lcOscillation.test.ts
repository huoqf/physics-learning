import { describe, it, expect } from 'vitest'
import {
  calculateLCConstants,
  calculateCapacitanceWithGap,
  calculateLCFrequency,
  calculateRadioResonance,
  LC_DEFAULT_PARAMS,
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
})
