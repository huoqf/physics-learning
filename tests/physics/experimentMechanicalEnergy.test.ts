import { describe, expect, it } from 'vitest'

import {
  CONSECUTIVE_INTERVAL,
  FREEFALL_MAX_M,
  SPRING_MAX_MEASURABLE_EXTENSION_M,
  buildTapeCountingDots,
  countingPeriod,
  hookeSeries,
  isZeroInitialVelocityTape,
  verifyMechanicalEnergy,
} from '@/physics/experimentMechanics'

/**
 * 验证机械能守恒（竖直自由下落打点）—— 物理口径守卫。
 *
 * 这组断言的存在理由：该实验两个最容易写错的地方都不会抛异常、也不会让页面白屏，
 * 只会安静地教错——
 * ① 用逐差法（全程平均加速度）代替中间时刻速度法求某点瞬时速度；
 * ② 把「ΔEₖ 略小于 ΔEₚ」写成「大于」或写成「相等」。
 * 只有数值断言能拦住这两类错误，故此处逐项钉死。
 */

const PX_PER_M = 300
const FREQ = 50
const T = countingPeriod(FREQ) // 0.1 s
const MASS = 0.2
const G = 9.8

/** 生成一条从静止自由下落的纸带（time 足够长以产生多个计数点） */
function buildFreeFallTape(accel: number, time = 0.5): number[] {
  return buildTapeCountingDots({
    v0: 0,
    a: accel,
    time,
    freq: FREQ,
    pxPerMeter: PX_PER_M,
    xMax: 10, // 测试期不吃轨道钳制
  })
}

describe('verifyMechanicalEnergy · 纸带反算势能与动能', () => {
  it('无阻力（a = g）时 ΔEₖ 与 ΔEₚ 严格相等', () => {
    const points = verifyMechanicalEnergy({
      dotsPx: buildFreeFallTape(G),
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: MASS,
      gravity: G,
    })

    expect(points.length).toBeGreaterThanOrEqual(3)
    for (const p of points) {
      // 理想情况下相对偏差只能是浮点残差
      expect(Math.abs(p.relDeviation)).toBeLessThan(1e-9)
    }
  })

  it('中间时刻速度法给出的 vₙ 与解析式 v = a·tₙ 一致（不是逐差法的全程平均加速度）', () => {
    const points = verifyMechanicalEnergy({
      dotsPx: buildFreeFallTape(G),
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: MASS,
      gravity: G,
    })

    for (const p of points) {
      const analytic = G * (p.index * T) // v = a·tₙ
      expect(p.v).toBeCloseTo(analytic, 6)
    }

    // 首点（n=1）必须是 0.98 m/s；若误用逐差法会得到另一个值
    expect(points[0].v).toBeCloseTo(0.98, 6)
  })

  it('首点与末点不产出速度（缺前段/后段），返回点数 = 纸带点数 − 2', () => {
    const dots = buildFreeFallTape(G)
    const points = verifyMechanicalEnergy({
      dotsPx: dots,
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: MASS,
      gravity: G,
    })

    expect(points.length).toBe(dots.length - 2)
    expect(points[0].index).toBe(1)
    expect(points[points.length - 1].index).toBe(dots.length - 2)
  })

  it('有阻力（实测 a < g）时 ΔEₖ 必小于 ΔEₚ，且相对偏差恰等于加速度折减比例', () => {
    const frictionRatio = 0.1 // 实测加速度为 g 的 90%
    const points = verifyMechanicalEnergy({
      dotsPx: buildFreeFallTape(G * (1 - frictionRatio)),
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: MASS,
      gravity: G,
    })

    expect(points.length).toBeGreaterThan(0)
    for (const p of points) {
      // 符号方向：动能增量小于势能减少量（阻力做功为正消耗）
      expect(p.deltaEk).toBeLessThan(p.deltaEp)
      expect(p.relDeviation).toBeLessThan(0)
      // 数量关系：偏差 = −(1−a/g) = −frictionRatio
      expect(p.relDeviation).toBeCloseTo(-frictionRatio, 6)
    }
  })

  it('下落高度 hₙ 由纸带实测间距累加，与 ½a t² 的解析值一致', () => {
    const points = verifyMechanicalEnergy({
      dotsPx: buildFreeFallTape(G),
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: MASS,
      gravity: G,
    })

    for (const p of points) {
      const tn = p.index * T
      expect(p.h).toBeCloseTo(0.5 * G * tn * tn, 6)
    }
  })

  it('质量只影响 ΔEₚ 与 ΔEₖ 的绝对量，不改变相对偏差（质量可约去）', () => {
    const tape = buildFreeFallTape(G * 0.95)
    const light = verifyMechanicalEnergy({
      dotsPx: tape,
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: 0.1,
      gravity: G,
    })
    const heavy = verifyMechanicalEnergy({
      dotsPx: tape,
      pxPerMeter: PX_PER_M,
      countingPeriodS: T,
      mass: 0.5,
      gravity: G,
    })

    expect(light.length).toBe(heavy.length)
    light.forEach((p, i) => {
      expect(p.relDeviation).toBeCloseTo(heavy[i].relDeviation, 12)
      // 绝对量按质量比放大 5 倍
      expect(heavy[i].deltaEk / p.deltaEk).toBeCloseTo(5, 6)
    })
  })

  it('边界：点数不足 3 或参数非法时返回空数组，不抛异常也不编造数值', () => {
    expect(
      verifyMechanicalEnergy({ dotsPx: [], pxPerMeter: PX_PER_M, countingPeriodS: T, mass: MASS })
    ).toEqual([])
    expect(
      verifyMechanicalEnergy({ dotsPx: [10, 5], pxPerMeter: PX_PER_M, countingPeriodS: T, mass: MASS })
    ).toEqual([])
    expect(
      verifyMechanicalEnergy({
        dotsPx: [10, 5, 1],
        pxPerMeter: 0,
        countingPeriodS: T,
        mass: MASS,
      })
    ).toEqual([])
    expect(
      verifyMechanicalEnergy({
        dotsPx: [10, 5, 1],
        pxPerMeter: PX_PER_M,
        countingPeriodS: 0,
        mass: MASS,
      })
    ).toEqual([])
  })
})

describe('isZeroInitialVelocityTape · 选带条件（首两点间距 ≈ 2 mm）', () => {
  it('自由下落首段间距 1.96 mm 判定为合格（初速为零）', () => {
    // h₁ = ½gT₀²，T₀ = 0.02 s ⇒ 1.96 mm
    const firstGap = 0.5 * G * 0.02 * 0.02
    expect(firstGap * 1000).toBeCloseTo(1.96, 2)
    expect(isZeroInitialVelocityTape(firstGap)).toBe(true)
  })

  it('首段间距 8 mm 判定为不合格（打首点时已有初速度）', () => {
    expect(isZeroInitialVelocityTape(0.008)).toBe(false)
  })

  it('容差内的 2.4 mm 仍判合格，2.9 mm 判不合格', () => {
    expect(isZeroInitialVelocityTape(0.0024)).toBe(true)
    expect(isZeroInitialVelocityTape(0.0029)).toBe(false)
  })
})

/**
 * 计数口径守卫：验证机械能守恒必须取【连续打点】T = T₀ = 0.02 s，
 * 不能沿用测加速度的 5T₀ = 0.1 s。
 *
 * 这类错误同样不会抛异常：页面上照样出现纸带、照样有 ΔEₚ/ΔEₖ 两列数值，
 * 只是点数从 18 塌成 4、可比对点从 16 塌成 2，且「首两点≈2 mm」的选带判据
 * 永远判不合格（4.9 cm ≠ 2 mm）。只有数值断言拦得住。
 */
describe('计数口径 · 连续打点 vs 每 5 点取 1', () => {
  const CONSEC_T = countingPeriod(FREQ, CONSECUTIVE_INTERVAL)

  it('连续打点的计数周期等于打点周期 T₀ = 0.02 s', () => {
    expect(CONSEC_T).toBeCloseTo(0.02, 6)
    expect(countingPeriod(FREQ)).toBeCloseTo(0.1, 6) // 默认仍是 5T₀，逐差法口径不变
  })

  it('0.6 m 纸带在连续打点下给出 18 个点、16 个可比对点', () => {
    const dots = buildTapeCountingDots({
      v0: 0,
      a: G,
      time: 1,
      freq: FREQ,
      countInterval: CONSECUTIVE_INTERVAL,
      pxPerMeter: 1,
      xMax: FREEFALL_MAX_M,
    })
    expect(dots.length).toBe(18)
    const points = verifyMechanicalEnergy({
      dotsPx: dots,
      pxPerMeter: 1,
      countingPeriodS: CONSEC_T,
      mass: MASS,
      gravity: G,
    })
    expect(points.length).toBe(16)
  })

  it('连续打点下首两点间距就是 1.96 mm，选带判据自然成立', () => {
    const dots = buildTapeCountingDots({
      v0: 0,
      a: G,
      time: 0.1,
      freq: FREQ,
      countInterval: CONSECUTIVE_INTERVAL,
      pxPerMeter: 1,
      xMax: FREEFALL_MAX_M,
    })
    const firstGapM = dots[0] - dots[1]
    expect(firstGapM * 1000).toBeCloseTo(1.96, 1)
    expect(isZeroInitialVelocityTape(firstGapM)).toBe(true)
  })

  it('若误用 5T₀，同一纸带只剩 4 个点且选带判据失效', () => {
    const dots = buildTapeCountingDots({
      v0: 0,
      a: G,
      time: 1,
      freq: FREQ,
      pxPerMeter: 1,
      xMax: FREEFALL_MAX_M,
    })
    expect(dots.length).toBe(4)
    // 计数点间距 4.9 cm：把它当「第 1、2 点间距」会误判为不合格
    expect(isZeroInitialVelocityTape(dots[0] - dots[1])).toBe(false)
  })
})

/**
 * 胡克定律序列的量程守卫：F–Δx 图不得画出竖尺读不出来的点。
 */
describe('hookeSeries · 可测伸长量上限', () => {
  it('默认参数下取满 6 个点，且都落在可测范围内', () => {
    const series = hookeSeries(0.2, 100, 6, SPRING_MAX_MEASURABLE_EXTENSION_M)
    expect(series.length).toBe(6)
    expect(series[series.length - 1].extension).toBeLessThanOrEqual(
      SPRING_MAX_MEASURABLE_EXTENSION_M
    )
  })

  it('软弹簧挂重钩码时序列被截断到 1 个点（至少保留当前这一次）', () => {
    // m = 0.3 kg、k = 20 N/m ⇒ 单个钩码就伸长 14.7 cm，已到量程上限
    const series = hookeSeries(0.3, 20, 6, SPRING_MAX_MEASURABLE_EXTENSION_M)
    expect(series.length).toBe(1)
    expect(series[0].extension).toBeCloseTo(SPRING_MAX_MEASURABLE_EXTENSION_M, 6)
  })

  it('序列始终过原点方向共线：F/Δx 恒等于 k', () => {
    const series = hookeSeries(0.05, 250, 6, SPRING_MAX_MEASURABLE_EXTENSION_M)
    for (const point of series) {
      expect(point.force / point.extension).toBeCloseTo(250, 6)
    }
  })
})
