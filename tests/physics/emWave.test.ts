import { describe, it, expect } from 'vitest'
import {
  EM_SPECTRUM_BANDS,
  formatFrequency,
  formatWavelength,
  frequencyFromWavelength,
  getSpectrumBand,
  wavelengthFromFrequency,
} from '@/physics/emWave'
import { SPEED_OF_LIGHT } from '@/physics/constants'

describe('emWave · c = λf 换算', () => {
  it('λ = c / f 与 f = c / λ 互为逆运算', () => {
    for (const f of [3e6, 3e10, 3e13, 5.45e14, 1.5e15, 3e17, 3e20]) {
      const back = frequencyFromWavelength(wavelengthFromFrequency(f))
      // 用相对误差判据：f 跨到 10²⁰ 时 float64 的 ULP 已远大于 1e-6，
      // 绝对容差 toBeCloseTo(f, 6) 在此量级无意义。
      expect(back / f).toBeCloseTo(1, 6)
    }
  })

  it('波长与频率单调反向（波长越长 → 频率越低）', () => {
    const freqs = EM_SPECTRUM_BANDS.map((b) => frequencyFromWavelength(b.representativeLambda))
    for (let i = 0; i < freqs.length - 1; i++) {
      // 谱段数组按波长由长到短排列 ⇒ 频率应严格递增
      expect(freqs[i + 1]).toBeGreaterThan(freqs[i])
    }
  })

  it('非法输入抛错（λ ≤ 0 或 f ≤ 0 无物理意义）', () => {
    expect(() => frequencyFromWavelength(0)).toThrow()
    expect(() => frequencyFromWavelength(-1)).toThrow()
    expect(() => wavelengthFromFrequency(0)).toThrow()
  })
})

describe('emWave · 电磁波谱数据', () => {
  it('共 7 个谱段，key 唯一', () => {
    expect(EM_SPECTRUM_BANDS).toHaveLength(7)
    expect(new Set(EM_SPECTRUM_BANDS.map((b) => b.key)).size).toBe(7)
  })

  it('相邻谱段首尾相接：无缝隙、无重叠', () => {
    for (let i = 0; i < EM_SPECTRUM_BANDS.length - 1; i++) {
      expect(EM_SPECTRUM_BANDS[i].lambdaMin).toBeCloseTo(EM_SPECTRUM_BANDS[i + 1].lambdaMax, 15)
    }
  })

  it('代表性波长严格落在本谱段区间内，且随谱段序号递减', () => {
    for (const band of EM_SPECTRUM_BANDS) {
      expect(band.representativeLambda).toBeGreaterThanOrEqual(band.lambdaMin)
      expect(band.representativeLambda).toBeLessThan(band.lambdaMax)
    }
    for (let i = 0; i < EM_SPECTRUM_BANDS.length - 1; i++) {
      expect(EM_SPECTRUM_BANDS[i].representativeLambda).toBeGreaterThan(
        EM_SPECTRUM_BANDS[i + 1].representativeLambda,
      )
    }
  })

  it('getSpectrumBand 越界夹紧到边界（不返回 undefined）', () => {
    expect(getSpectrumBand(-5).key).toBe('radio')
    expect(getSpectrumBand(99).key).toBe('gamma')
  })
})

describe('emWave · formatWavelength', () => {
  it('按量级自动选择 pm / nm / μm / mm / m', () => {
    expect(formatWavelength(1e-12)).toBe('1.00 pm')
    expect(formatWavelength(550e-9)).toBe('550 nm')
    expect(formatWavelength(1e-5)).toBe('10.0 μm')
    expect(formatWavelength(1e-2)).toBe('10.0 mm')
    expect(formatWavelength(100)).toBe('100 m')
  })

  it('0.1 m 以上一律用 m（不写成 mm），与高中书写习惯一致', () => {
    expect(formatWavelength(0.3)).toBe('0.300 m')
  })

  it('非法输入返回占位符', () => {
    expect(formatWavelength(0)).toBe('—')
    expect(formatWavelength(-1)).toBe('—')
    expect(formatWavelength(Number.POSITIVE_INFINITY)).toBe('—')
  })
})

describe('emWave · formatFrequency（回归锁）', () => {
  /**
   * 曾经的缺陷：只有 Hz/kHz/MHz/GHz 四档，X 射线（1 nm → 3×10¹⁷ Hz）
   * 被显示成 JavaScript 指数记法「3.00e+8 GHz」，γ 射线同样。
   */
  it('7 个谱段的代表性频率都产出规范读数', () => {
    expect(formatFrequency(frequencyFromWavelength(100))).toBe('3.00 MHz') // 无线电波 100 m
    expect(formatFrequency(frequencyFromWavelength(1e-2))).toBe('30.0 GHz') // 微波 1 cm
    expect(formatFrequency(frequencyFromWavelength(1e-5))).toBe('30.0 THz') // 红外 10 μm
    expect(formatFrequency(frequencyFromWavelength(550e-9))).toBe('545 THz') // 可见光 550 nm
    expect(formatFrequency(frequencyFromWavelength(200e-9))).toBe('1.50 × 10¹⁵ Hz') // 紫外 200 nm
    expect(formatFrequency(frequencyFromWavelength(1e-9))).toBe('3.00 × 10¹⁷ Hz') // X 射线 1 nm
    expect(formatFrequency(frequencyFromWavelength(1e-12))).toBe('3.00 × 10²⁰ Hz') // γ 射线 1 pm
  })

  it('高频段使用上标科学记数法，而不是 JS 的 e+17 记法', () => {
    for (const band of EM_SPECTRUM_BANDS) {
      const text = formatFrequency(frequencyFromWavelength(band.representativeLambda))
      expect(text).not.toMatch(/e[+-]\d/i)
    }
  })

  it('各档边界（恰好等于档位阈值时取更高一档）', () => {
    expect(formatFrequency(1e3)).toBe('1.00 kHz')
    expect(formatFrequency(1e6)).toBe('1.00 MHz')
    expect(formatFrequency(1e9)).toBe('1.00 GHz')
    expect(formatFrequency(1e12)).toBe('1.00 THz')
    expect(formatFrequency(1e15)).toBe('1.00 × 10¹⁵ Hz')
  })

  it('R1 临界升档（如 999.9 平滑进档，杜绝 1.00e+3 失范泄漏）', () => {
    expect(formatFrequency(999.9)).toBe('1.00 kHz')
    expect(formatFrequency(999900)).toBe('1.00 MHz')
    expect(formatFrequency(999.9e6)).toBe('1.00 GHz')
    expect(formatFrequency(999.9e9)).toBe('1.00 THz')
    expect(formatWavelength(0.9999e-6)).toBe('1.00 μm')
    expect(formatWavelength(999.9)).toBe('1.00 km')
  })

  it('违规输入返回占位符', () => {
    expect(formatFrequency(0)).toBe('—')
    expect(formatFrequency(-1)).toBe('—')
    expect(formatFrequency(Number.NaN)).toBe('—')
  })

  it('c 取 3.0×10⁸ m/s（与物理层常量同源）', () => {
    expect(frequencyFromWavelength(1)).toBe(SPEED_OF_LIGHT)
  })
})
