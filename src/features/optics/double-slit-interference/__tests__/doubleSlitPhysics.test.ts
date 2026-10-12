import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { wavelengthToHex } from '@/physics/optics'
import {
  useDoubleSlitInterferencePhysics,
  DOUBLE_SLIT_BASE_READING_MM,
} from '../hooks/useDoubleSlitInterferencePhysics'

describe('双缝干涉物理与实验测量计算 (useDoubleSlitInterferencePhysics)', () => {
  it('标准实验默认参数下的量程安全性 (650nm, d=0.3mm, L=0.8m, n=4)', () => {
    const { result } = renderHook(() =>
      useDoubleSlitInterferencePhysics({
        wavelength: 650,
        slitDistance: 0.3,
        screenDistance: 0.8,
        targetFringe: 4,
        currentFringe: 1,
        handwheelOffset: 0,
      })
    )

    // Δx = (0.8 / 0.3) * 650 * 1e-3 = 1.7333 mm
    const expectedDeltaX = (0.8 / 0.3) * 650 * 1e-3
    expect(result.current.fringeSpacing).toBeCloseTo(expectedDeltaX, 4)
    expect(result.current.wavelengthColor).toBe(wavelengthToHex(650))

    // 读数范围在 1.5 ~ 9.0 mm 内，未超出 10mm 螺旋测微器量程
    expect(result.current.x1).toBeCloseTo(DOUBLE_SLIT_BASE_READING_MM + expectedDeltaX, 4)
    expect(result.current.xn).toBeCloseTo(DOUBLE_SLIT_BASE_READING_MM + 4 * expectedDeltaX, 4)
    expect(result.current.x1).toBeGreaterThan(1.5)
    expect(result.current.xn).toBeLessThan(10.0)
    expect(result.current.isOverRange).toBe(false)
  })

  it('极端参数引发超量程的判定防护 (d=0.1mm, L=2.0m)', () => {
    const { result } = renderHook(() =>
      useDoubleSlitInterferencePhysics({
        wavelength: 650,
        slitDistance: 0.1,
        screenDistance: 2.0,
        targetFringe: 4,
        currentFringe: 4,
        handwheelOffset: 0,
      })
    )

    // Δx = (2.0 / 0.1) * 650 * 1e-3 = 13.0 mm
    // x4 = 1.5 + 4 * 13.0 = 53.5 mm > 10.0 mm
    expect(result.current.fringeSpacing).toBeCloseTo(13.0, 4)
    expect(result.current.xn).toBeGreaterThan(10.0)
    expect(result.current.isOverRange).toBe(true)
  })

  it('非法/零参数输入的安全性防御 (防止除零与 NaN 崩溃)', () => {
    const { result } = renderHook(() =>
      useDoubleSlitInterferencePhysics({
        wavelength: 0,
        slitDistance: 0,
        screenDistance: 0,
      })
    )

    expect(Number.isFinite(result.current.fringeSpacing)).toBe(true)
    expect(Number.isFinite(result.current.measuredDeltaX)).toBe(true)
    expect(Number.isFinite(result.current.measuredWavelength)).toBe(true)
    expect(Number.isNaN(result.current.relativeErrorPercent)).toBe(false)
  })

  it('大负向偏置导致读数 < 0 时正确触发量程保护判定 (下界 N2 防护)', () => {
    const { result } = renderHook(() =>
      useDoubleSlitInterferencePhysics({
        wavelength: 600,
        slitDistance: 0.3,
        screenDistance: 0.8,
        targetFringe: 4,
        currentFringe: 1,
        handwheelOffset: -5.0, // 极端大负偏移导致当前读数 < 0
      })
    )

    expect(result.current.currentReading).toBeLessThan(0)
    expect(result.current.isOverRange).toBe(true)
  })

  it('手轮微调偏置进入测量读数并产生可测相对误差 (方案 A1 误差闭环)', () => {
    const offset = 0.035
    const { result } = renderHook(() =>
      useDoubleSlitInterferencePhysics({
        wavelength: 600,
        slitDistance: 0.3,
        screenDistance: 0.9,
        targetFringe: 4,
        currentFringe: 1,
        handwheelOffset: offset, // 偏置 0.035mm
      })
    )

    const expectedDeltaX = (0.9 / 0.3) * 600 * 1e-3 // 1.8 mm
    // activeFringe === 1，x1 读数包含 offset
    expect(result.current.x1).toBeCloseTo(DOUBLE_SLIT_BASE_READING_MM + expectedDeltaX + offset, 4)
    expect(result.current.xn).toBeCloseTo(DOUBLE_SLIT_BASE_READING_MM + 4 * expectedDeltaX, 4)
    expect(result.current.currentReading).toBeCloseTo(
      DOUBLE_SLIT_BASE_READING_MM + expectedDeltaX + offset,
      4
    )

    // 逐差间距测得值: |xn - x1| / 3 = (3 * expectedDeltaX - offset) / 3 = 1.8 - offset / 3
    const expectedMeasuredDeltaX = Math.abs(3 * expectedDeltaX - offset) / 3
    expect(result.current.measuredDeltaX).toBeCloseTo(expectedMeasuredDeltaX, 4)

    // 测得波长偏离真值 600nm
    expect(result.current.measuredWavelength).not.toBeCloseTo(600, 1)
    expect(result.current.relativeErrorPercent).toBeGreaterThan(0)
  })
})
