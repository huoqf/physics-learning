import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBulbVAPhysics } from '../hooks/useBulbVAPhysics'

describe('useBulbVAPhysics', () => {
  it('分压式接法滑片处于底端时，小灯泡两端电压接近 0', () => {
    const { result } = renderHook(() =>
      useBulbVAPhysics({
        circuitMode: 0, // 分压式
        meterMode: 0, // 外接法
        sliderRatio: 0.001,
        E: 6.0,
      })
    )

    expect(result.current.U_meas).toBeLessThan(0.05)
    expect(result.current.bulbPower).toBeLessThan(0.01)
  })

  it('小灯泡具有典型非线性电阻特性：电压越高，等效阻值越大（温升电阻）', () => {
    const { result: lowV } = renderHook(() =>
      useBulbVAPhysics({
        circuitMode: 0,
        meterMode: 0,
        sliderRatio: 0.2, // 低电压
        E: 6.0,
      })
    )

    const { result: highV } = renderHook(() =>
      useBulbVAPhysics({
        circuitMode: 0,
        meterMode: 0,
        sliderRatio: 0.9, // 高电压
        E: 6.0,
      })
    )

    expect(highV.current.R_real).toBeGreaterThan(lowV.current.R_real)
    // 冷态阻值约 2.5~5Ω，高温阻值约 10~15Ω
    expect(highV.current.R_real).toBeGreaterThan(8.0)
  })

  it('电表接法对比：小电阻测定时外接法误差远小于内接法', () => {
    const { result: ext } = renderHook(() =>
      useBulbVAPhysics({
        circuitMode: 0,
        meterMode: 0, // 外接法
        sliderRatio: 0.7,
        E: 6.0,
      })
    )

    const { result: int } = renderHook(() =>
      useBulbVAPhysics({
        circuitMode: 0,
        meterMode: 1, // 内接法
        sliderRatio: 0.7,
        E: 6.0,
      })
    )

    // 外接法相对误差的绝对值极小 (< 1%)
    expect(Math.abs(ext.current.relError)).toBeLessThan(1.0)
    // 内接法因包含电流表分压，相对误差显著偏大 (> 5%)
    expect(int.current.relError).toBeGreaterThan(5.0)
  })

  it('负载线开启时能够成功计算工作点交点', () => {
    const { result } = renderHook(() =>
      useBulbVAPhysics({
        circuitMode: 0,
        meterMode: 0,
        sliderRatio: 0.5,
        showLoadLine: true,
        E_load: 3.5,
        r_load: 5.0,
      })
    )

    expect(result.current.workPoint.U).toBeGreaterThan(1.0)
    expect(result.current.workPoint.U).toBeLessThan(3.5)
    expect(result.current.workPoint.I).toBeGreaterThan(0.1)
  })
})
