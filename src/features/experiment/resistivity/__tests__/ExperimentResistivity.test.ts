import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useExperimentResistivityPhysics } from '../hooks/useExperimentResistivityPhysics'

describe('金属丝电阻率实验 Hook 与状态计算集成测试', () => {
  it('外接法下物理量计算正确，测量电阻低于真实值', () => {
    const { result } = renderHook(() =>
      useExperimentResistivityPhysics({
        L: 0.5,
        d_mm: 0.6,
        wiring: 0, // 外接法
        R_slider: 20,
        showTheoretical: true,
      }),
    )

    expect(result.current.L).toBe(0.5)
    expect(result.current.d_mm).toBe(0.6)
    expect(result.current.wiring).toBe(0)

    // 真实电阻 > 0
    expect(result.current.Rx_real).toBeGreaterThan(0)
    // 外接法测量电阻略小于真实电阻
    expect(result.current.Rx_meas).toBeLessThan(result.current.Rx_real)
    expect(result.current.Rx_meas).toBeCloseTo(result.current.Rx_real, 1)

    // 电压与电流符合欧姆定律
    expect(result.current.voltageV).toBeCloseTo(
      result.current.currentA * result.current.Rx_meas,
      4,
    )
  })

  it('内接法下测量电阻高于真实值，截距包含电流表内阻', () => {
    const { result } = renderHook(() =>
      useExperimentResistivityPhysics({
        L: 0.5,
        d_mm: 0.6,
        wiring: 1, // 内接法
        R_slider: 20,
        showTheoretical: true,
      }),
    )

    // Rx_meas = Rx_real + RA (0.5Ω)
    expect(result.current.Rx_meas).toBeCloseTo(result.current.Rx_real + 0.5, 4)
    expect(result.current.Rx_meas).toBeGreaterThan(result.current.Rx_real)
  })
})
