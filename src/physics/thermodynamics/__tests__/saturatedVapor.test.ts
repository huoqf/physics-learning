import { describe, it, expect } from 'vitest'
import {
  calculateSaturatedVaporPressure,
  calculateRelativeHumidity,
  calculatePhaseFlux,
} from '../saturatedVapor'

describe('saturatedVapor 物理纯函数计算测试', () => {
  it('不同典型温度下的饱和汽压满足物理常识', () => {
    // 0℃ 时约为 611 Pa
    expect(calculateSaturatedVaporPressure(0)).toBeCloseTo(610.78, 0)
    // 20℃ 时约为 2.34 kPa (2338 Pa)
    expect(calculateSaturatedVaporPressure(20)).toBeGreaterThan(2300)
    expect(calculateSaturatedVaporPressure(20)).toBeLessThan(2400)
    // 100℃ 时约为 101.3 kPa (标准大气压)
    expect(calculateSaturatedVaporPressure(100)).toBeGreaterThan(100000)
    expect(calculateSaturatedVaporPressure(100)).toBeLessThan(103000)
  })

  it('相对湿度与露点计算正确判断未饱和与饱和状态', () => {
    // 25℃ 时 ps ≈ 3169 Pa
    // 若实际分压 p = 1584 Pa，RH ≈ 50%
    const res = calculateRelativeHumidity(1584, 25)
    expect(res.rh).toBeCloseTo(50.0, 0)
    expect(res.status).toBe('unsaturated')
    expect(res.dewPoint).toBeLessThan(25)

    // 若实际分压达到 ps，RH = 100%，处于饱和态
    const sat = calculateRelativeHumidity(res.ps, 25)
    expect(sat.rh).toBe(100)
    expect(sat.status).toBe('saturated')
    expect(sat.dewPoint).toBeCloseTo(25, 0)
  })

  it('动态平衡通量在 p = ps 时蒸发率严格等于凝结率', () => {
    const ps = calculateSaturatedVaporPressure(30)
    const flux = calculatePhaseFlux(ps, 30)
    expect(flux.isBalanced).toBe(true)
    expect(flux.netEvap).toBeCloseTo(0, 3)
  })
})
