import { describe, it, expect } from 'vitest'
import {
  calculateSaturatedVaporPressure,
  calculateRelativeHumidity,
  calculatePhaseFlux,
  calculateVaporPressureWithVolume,
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

  it('未饱和区间等温压缩遵循玻意耳定律 p ∝ 1/V', () => {
    // 25℃ ps ≈ 3169 Pa，取基准分压 1500 Pa（远未饱和）
    const half = calculateVaporPressureWithVolume(1500, 0.5, 25)
    const one = calculateVaporPressureWithVolume(1500, 1.0, 25)
    const two = calculateVaporPressureWithVolume(1500, 2.0, 25)

    expect(one.isSaturated).toBe(false)
    expect(one.p).toBeCloseTo(1500, 6)
    // 体积减半，压强加倍
    expect(half.p).toBeCloseTo(3000, 6)
    // 体积加倍，压强减半
    expect(two.p).toBeCloseTo(750, 6)
    // 全程未液化
    expect(half.vaporFraction).toBe(1)
    expect(two.vaporFraction).toBe(1)
  })

  it('达到饱和后继续压缩，压强锁定在 ps 且与体积无关', () => {
    const ps25 = calculateSaturatedVaporPressure(25)
    // 基准分压 4000 Pa 已超过 25℃ 的 ps
    const v1 = calculateVaporPressureWithVolume(4000, 1.0, 25)
    const v05 = calculateVaporPressureWithVolume(4000, 0.5, 25)
    const v02 = calculateVaporPressureWithVolume(4000, 0.2, 25)

    expect(v1.isSaturated).toBe(true)
    // 三种体积下压强均严格等于 ps，不随体积变化
    expect(v1.p).toBeCloseTo(ps25, 6)
    expect(v05.p).toBeCloseTo(ps25, 6)
    expect(v02.p).toBeCloseTo(ps25, 6)
    // 压缩越狠，液化比例越高（气相剩余蒸汽占比越小）
    expect(v1.vaporFraction).toBeGreaterThan(v05.vaporFraction)
    expect(v05.vaporFraction).toBeGreaterThan(v02.vaporFraction)
    // 气相物质的量占比 = ps / p_ideal
    expect(v05.vaporFraction).toBeCloseTo(ps25 / 8000, 6)
  })

  it('等温膨胀可使饱和态重新回到未饱和态（液态水重新汽化）', () => {
    // 25℃ 下基准分压 2000 Pa：V = 0.5 时 p_ideal = 4000 > ps → 饱和
    const compressed = calculateVaporPressureWithVolume(2000, 0.5, 25)
    // 膨胀到 V = 1.5 时 p_ideal = 1333 < ps → 回到未饱和，且气相占比恢复 1
    const expanded = calculateVaporPressureWithVolume(2000, 1.5, 25)

    expect(compressed.isSaturated).toBe(true)
    expect(compressed.vaporFraction).toBeLessThan(1)
    expect(expanded.isSaturated).toBe(false)
    expect(expanded.vaporFraction).toBe(1)
    expect(expanded.p).toBeCloseTo(2000 / 1.5, 6)
  })
})
