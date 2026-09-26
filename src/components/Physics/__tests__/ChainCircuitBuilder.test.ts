import { describe, it, expect } from 'vitest'
import { calculateCircuitState } from '@/physics'

describe('ChainCircuitBuilder: calculateCircuitState', () => {
  it('分压式接法：滑片在最左端时待测支路电压趋近于 0', () => {
    const res = calculateCircuitState({
      circuitType: 'voltage-divider',
      meterWiring: 'external',
      sliderRatio: 0.001,
      E: 6.0,
      r: 0.5,
      R_slider_max: 20,
      Rx: 5.0,
      RV: 3000,
      RA: 0.5,
    })

    // 分压式滑块到底端，电压应该极低（接近 0）
    expect(res.U_meas).toBeLessThan(0.05)
    expect(res.I_meas).toBeLessThan(0.01)
  })

  it('分压式接法：滑片在最右端时待测支路电压达到最大', () => {
    const res = calculateCircuitState({
      circuitType: 'voltage-divider',
      meterWiring: 'external',
      sliderRatio: 0.999,
      E: 6.0,
      r: 0.5,
      R_slider_max: 20,
      Rx: 5.0,
      RV: 3000,
      RA: 0.5,
    })

    // 分压式滑块到顶端，电压接近电源路端电压 (~4-5V)
    expect(res.U_meas).toBeGreaterThan(4.0)
    expect(res.I_meas).toBeGreaterThan(0.5)
  })

  it('限流式接法：最小电压不能调至 0V，且滑片在左端接入最大阻值实现开机限流保护', () => {
    const resProtect = calculateCircuitState({
      circuitType: 'current-limiting',
      meterWiring: 'external',
      sliderRatio: 0.001, // 变阻器接入全部阻值 (一上一下，B 端至最左滑片)
      E: 6.0,
      r: 0.5,
      R_slider_max: 20,
      Rx: 5.0,
      RV: 3000,
      RA: 0.5,
    })

    const resMax = calculateCircuitState({
      circuitType: 'current-limiting',
      meterWiring: 'external',
      sliderRatio: 0.999, // 滑片滑至右端 B，变阻器接入阻值趋近 0
      E: 6.0,
      r: 0.5,
      R_slider_max: 20,
      Rx: 5.0,
      RV: 3000,
      RA: 0.5,
    })

    // 限流接法无法将电压降到 0
    expect(resProtect.U_meas).toBeGreaterThan(0.8)
    // 左端开机保护：电流处于最小值，显著小于右端满流状态
    expect(resProtect.I_meas).toBeLessThan(resMax.I_meas)
    expect(resMax.I_meas).toBeGreaterThan(0.8)
  })

  it('外接法测量小电阻：测得电阻值略小于真实值（电压表分流），但远优于内接法', () => {
    const Rx = 5.0
    const RA = 1.0 // 电流表内阻相对较大

    const resExt = calculateCircuitState({
      circuitType: 'voltage-divider',
      meterWiring: 'external',
      sliderRatio: 0.8,
      E: 6.0,
      Rx,
      RV: 2000,
      RA,
    })

    const resInt = calculateCircuitState({
      circuitType: 'voltage-divider',
      meterWiring: 'internal',
      sliderRatio: 0.8,
      E: 6.0,
      Rx,
      RV: 2000,
      RA,
    })

    // 外接法误差：因 RV 分流，测得阻值略偏小，但非常接近 Rx (5.0)
    expect(resExt.R_meas).toBeLessThan(Rx)
    expect(Math.abs(resExt.R_meas - Rx)).toBeLessThan(0.05)

    // 内接法误差：测得阻值包含 RA，显著偏大 (~6.0)
    expect(resInt.R_meas).toBeGreaterThan(Rx + 0.8)
  })

  it('断路时所有电压电流输出归零', () => {
    const res = calculateCircuitState({
      circuitType: 'voltage-divider',
      meterWiring: 'external',
      sliderRatio: 0.5,
      closed: false,
    })

    expect(res.U_meas).toBe(0)
    expect(res.I_meas).toBe(0)
    expect(res.R_meas).toBe(0)
  })
})
