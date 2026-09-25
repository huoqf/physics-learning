import { describe, it, expect } from 'vitest'
import {
  calculateOhmReading,
  calculateVoltageReading,
} from '../experimentMultimeter'

describe('多用电表核心物理模型计算 (experimentMultimeter)', () => {
  it('欧姆挡：开路时指针停在最左端（偏转比为0，角度为-45°，读数为∞）', () => {
    const res = calculateOhmReading(10, 100, 0, false)
    expect(res.deflectionRatio).toBe(0)
    expect(res.pointerAngleDeg).toBe(-45)
    expect(res.readingValue).toBe(Infinity)
  })

  it('欧姆挡：短接（Rx=0）精准调零时指针指最右端满偏（欧姆刻度 0，偏转角 +45°）', () => {
    const res = calculateOhmReading(10, 0, 0, true)
    expect(res.deflectionRatio).toBeCloseTo(1.0, 3)
    expect(res.pointerAngleDeg).toBeCloseTo(45, 1)
    expect(res.readingValue).toBe(0)
  })

  it('欧姆挡：当中值刻度时（Rx = R_mid = 15 × 倍率），指针恰好偏转至中央（ratio=0.5，角度 0°）', () => {
    // ×10 挡中值电阻为 150 Ω
    const res = calculateOhmReading(10, 150, 0, true)
    expect(res.deflectionRatio).toBeCloseTo(0.5, 3)
    expect(res.pointerAngleDeg).toBeCloseTo(0, 1)
    expect(res.readingValue).toBeCloseTo(150, 1)
    expect(res.rMid).toBe(150)
    expect(res.advice).toBe('ok')
  })

  it('欧姆挡高考换挡决策：偏角过小 (ratio < 0.2) 靠近刻度盘左侧，应建议换更大倍率', () => {
    // ×10 挡测 2000 Ω (远远大于中值 150 Ω)
    const res = calculateOhmReading(10, 2000, 0, true)
    expect(res.deflectionRatio).toBeLessThan(0.2)
    expect(res.advice).toBe('switch_larger')
  })

  it('欧姆挡高考换挡决策：偏角过大 (ratio > 0.8) 靠近刻度盘右侧，应建议换更小倍率', () => {
    // ×100 挡测 10 Ω (远小于中值 1500 Ω)
    const res = calculateOhmReading(100, 10, 0, true)
    expect(res.deflectionRatio).toBeGreaterThan(0.8)
    expect(res.advice).toBe('switch_smaller')
  })

  it('欧姆调零偏差：未调零时应提示调零', () => {
    const res = calculateOhmReading(10, 150, 10, true)
    expect(res.advice).toBe('adjust_zero')
  })

  it('直流电压挡：输入 5V 于 10V 量程，指针精准偏转至正中 0°', () => {
    const res = calculateVoltageReading(5, 10, true)
    expect(res.deflectionRatio).toBeCloseTo(0.5, 3)
    expect(res.pointerAngleDeg).toBeCloseTo(0, 1)
    expect(res.readingValue).toBeCloseTo(5.0, 2)
  })
})
