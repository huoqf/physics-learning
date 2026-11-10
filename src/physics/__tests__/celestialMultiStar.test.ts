import { describe, it, expect } from 'vitest'
import {
  GRAVITATIONAL_CONSTANT,
  SOLAR_MASS,
  SECONDS_PER_DAY,
} from '../constants'
import {
  calculateBinaryStars,
  calculateTripleStars,
  evaluateBinaryStarsState,
  evaluateTripleStarsState,
  sampleBinaryStarsCurves,
  sampleTripleStarsCurves,
  multiStarMaxAnimTime,
  MULTI_STAR_DISTANCE_UNIT_M,
  MULTI_STAR_TIME_SCALE,
  MULTI_STAR_DEFAULT_PARAMS,
  CELESTIAL_MULTI_STAR_RANGES,
  MULTI_STAR_CHART_BOUNDS,
} from '../celestial'

describe('双星与三星系统物理模型（真实 SI 单位与闭环守恒校验）', () => {
  it('双星守恒与力学闭环：r₁+r₂=L、m₁r₁=m₂r₂、F=m₁ω²r₁=m₂ω²r₂、质心不动且总动量为零', () => {
    const L = 8.0 * MULTI_STAR_DISTANCE_UNIT_M
    const massRatio = 3.0
    const b = calculateBinaryStars(L, massRatio)

    expect(b.m1 + b.m2).toBeCloseTo(10 * SOLAR_MASS, -15)
    expect(b.r1 + b.r2).toBeCloseTo(L, 1)
    expect(b.m1 * b.r1).toBeCloseTo(b.m2 * b.r2, -15)

    // F = m₁ ω² r₁ = m₂ ω² r₂ = G m₁ m₂ / L²
    expect(b.F).toBeCloseTo(b.m1 * b.omega * b.omega * b.r1, -15)
    expect(b.F).toBeCloseTo(b.m2 * b.omega * b.omega * b.r2, -15)
    expect(b.F).toBeCloseTo((GRAVITATIONAL_CONSTANT * b.m1 * b.m2) / (L * L), -15)

    // 默认质量比=1 时，默认周期约 45.18 d
    const defaultB = calculateBinaryStars(L, 1.0)
    expect(defaultB.T / SECONDS_PER_DAY).toBeCloseTo(45.18, 1)
    // 质量比不改变双星周期（总质量不变）
    expect(b.T).toBeCloseTo(defaultB.T, 5)

    // 多时刻检验质心不动与总动量为零（相对误差 < 1e-12）
    const massScale = 10 * SOLAR_MASS
    const momScale = massScale * Math.max(b.v1, b.v2)
    for (const frac of [0, 0.13, 0.25, 0.41, 0.67, 0.89]) {
      const s = evaluateBinaryStarsState(L, massRatio, frac * b.T)
      expect(Math.abs(s.m1 * s.pos1.x + s.m2 * s.pos2.x) / (massScale * L)).toBeLessThan(1e-12)
      expect(Math.abs(s.m1 * s.pos1.y + s.m2 * s.pos2.y) / (massScale * L)).toBeLessThan(1e-12)
      expect(Math.abs(s.m1 * s.vel1.x + s.m2 * s.vel2.x) / momScale).toBeLessThan(1e-12)
      expect(Math.abs(s.m1 * s.vel1.y + s.m2 * s.vel2.y) / momScale).toBeLessThan(1e-12)
      // 两星实时距离恒为 L
      expect(Math.hypot(s.pos1.x - s.pos2.x, s.pos1.y - s.pos2.y)).toBeCloseTo(L, 1)
    }
  })

  it('三星等边三角形特例：间距恒为 L、相位互差 120°、合力与周期公式自洽', () => {
    const L = 8.0 * MULTI_STAR_DISTANCE_UNIT_M
    const m = 5.0 * SOLAR_MASS
    const tr = calculateTripleStars(L)

    expect(tr.r).toBeCloseTo(L / Math.sqrt(3), 1)
    expect(tr.fNet).toBeCloseTo((Math.sqrt(3) * GRAVITATIONAL_CONSTANT * m * m) / (L * L), -15)
    expect(tr.T).toBeCloseTo(2 * Math.PI * Math.sqrt((L * L * L) / (3 * GRAVITATIONAL_CONSTANT * m)), 1)
    expect(tr.T / SECONDS_PER_DAY).toBeCloseTo(36.89, 1)

    for (const frac of [0, 0.17, 0.38, 0.72]) {
      const s = evaluateTripleStarsState(L, frac * tr.T)
      const d12 = Math.hypot(s.pos1.x - s.pos2.x, s.pos1.y - s.pos2.y)
      const d23 = Math.hypot(s.pos2.x - s.pos3.x, s.pos2.y - s.pos3.y)
      const d31 = Math.hypot(s.pos3.x - s.pos1.x, s.pos3.y - s.pos1.y)
      expect(d12).toBeCloseTo(L, 1)
      expect(d23).toBeCloseTo(L, 1)
      expect(d31).toBeCloseTo(L, 1)

      // 相位互差 120°（向量夹角余弦 = -0.5）
      const dot12 = s.pos1.x * s.pos2.x + s.pos1.y * s.pos2.y
      expect(dot12 / (tr.r * tr.r)).toBeCloseTo(-0.5, 10)

      // 分引力矢量合成严格等于星 1 合力矢量（相对误差 < 1e-12）
      expect(Math.abs(s.force12Vec.x + s.force13Vec.x - s.forceNetVec1.x) / tr.fNet).toBeLessThan(1e-12)
      expect(Math.abs(s.force12Vec.y + s.force13Vec.y - s.forceNetVec1.y) / tr.fNet).toBeLessThan(1e-12)

      // 质心静止、总动量为零
      expect(Math.abs(s.pos1.x + s.pos2.x + s.pos3.x) / L).toBeLessThan(1e-12)
      expect(Math.abs(s.pos1.y + s.pos2.y + s.pos3.y) / L).toBeLessThan(1e-12)
      expect(Math.abs(s.vel1.x + s.vel2.x + s.vel3.x) / tr.v).toBeLessThan(1e-12)
      expect(Math.abs(s.vel1.y + s.vel2.y + s.vel3.y) / tr.v).toBeLessThan(1e-12)
    }
  })

  it('图表采样与场景状态同一时刻严格一致，且默认循环播放恰好覆盖完整周期', () => {
    const L = MULTI_STAR_DEFAULT_PARAMS.L * MULTI_STAR_DISTANCE_UNIT_M
    const ratio = 2.0

    // 双星采样与状态一致性
    const binarySamples = sampleBinaryStarsCurves(L, ratio, 40)
    const midB = binarySamples[15]
    const stateB = evaluateBinaryStarsState(L, ratio, midB.tDays * SECONDS_PER_DAY)
    expect(midB.x1).toBeCloseTo(stateB.pos1.x / MULTI_STAR_DISTANCE_UNIT_M, 10)
    expect(midB.x2).toBeCloseTo(stateB.pos2.x / MULTI_STAR_DISTANCE_UNIT_M, 10)
    expect(midB.vx1).toBeCloseTo(stateB.vel1.x / 1000, 10)
    expect(midB.vx2).toBeCloseTo(stateB.vel2.x / 1000, 10)

    // 三星采样与状态一致性
    const tripleSamples = sampleTripleStarsCurves(L, 40)
    const midT = tripleSamples[19]
    const stateT = evaluateTripleStarsState(L, midT.tDays * SECONDS_PER_DAY)
    expect(midT.x1).toBeCloseTo(stateT.pos1.x / MULTI_STAR_DISTANCE_UNIT_M, 10)
    expect(midT.x3).toBeCloseTo(stateT.pos3.x / MULTI_STAR_DISTANCE_UNIT_M, 10)
    expect(midT.vx3).toBeCloseTo(stateT.vel3.x / 1000, 10)

    // 循环 maxTime 恰好对应 2π 完整一圈
    for (const mode of [0, 1]) {
      for (const lVal of [CELESTIAL_MULTI_STAR_RANGES.L.min, 8.0, CELESTIAL_MULTI_STAR_RANGES.L.max]) {
        const animT = multiStarMaxAnimTime({ mode, L: lVal, massRatio: 1.0 })
        const physT = animT * MULTI_STAR_TIME_SCALE
        if (mode === 0) {
          const sEnd = evaluateBinaryStarsState(lVal * MULTI_STAR_DISTANCE_UNIT_M, 1.0, physT)
          expect(sEnd.theta).toBeCloseTo(2 * Math.PI, 10)
          expect(sEnd.T / SECONDS_PER_DAY).toBeLessThanOrEqual(MULTI_STAR_CHART_BOUNDS.TMax)
        } else {
          const sEnd = evaluateTripleStarsState(lVal * MULTI_STAR_DISTANCE_UNIT_M, physT)
          expect(sEnd.theta).toBeCloseTo(2 * Math.PI, 10)
          expect(sEnd.T / SECONDS_PER_DAY).toBeLessThanOrEqual(MULTI_STAR_CHART_BOUNDS.TMax)
        }
      }
    }
  })
})
