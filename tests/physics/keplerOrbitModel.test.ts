/**
 * 开普勒轨道模型（以 a、e、中心天体质量 M 为输入）的回归测试。
 *
 * 这些测试对应 2026-10 的重构目标，每一条都直接钉住"页面能讲对什么"：
 *   1. k = a³/T² 只由中心天体质量决定 —— 拖 a 不动、拖 M 才动；
 *   2. 焦半径之和必须能用副焦点的真实坐标量出来等于 2a（不是 2a − r₁ 的移项恒真式）；
 *   3. 等时间扫过等面积 —— 数值累积的总面积必须收敛到 πab，且各段时间增量相等；
 *   4. 非法几何（b > a、近日点进恒星内部、e ≥ 1）在物理层就被挡住。
 */
import { describe, it, expect } from 'vitest'
import {
  KEPLER_SIM_G,
  arealVelocity,
  ellipseFromEccentricity,
  evaluateKeplerOrbit,
  orbitalPeriodFromMass,
  orbitLegality,
  sampleSweptArea,
  specificAngularMomentum,
} from '@/physics/celestial'

const A = 4.5
const E = 0.75
const M = 36
/** 恒星本体半径换算到物理单位（14 px / 32 design-unit per meter） */
const SUN_CLEARANCE = 14 / 32

describe('开普勒轨道模型：k = a³/T² 只与中心天体有关', () => {
  const kOf = (a: number, mass: number) =>
    Math.pow(a, 3) / Math.pow(orbitalPeriodFromMass(a, mass), 2)

  it('同一中心天体下，k 与半长轴无关', () => {
    const kSmall = kOf(2.5, M)
    const kMid = kOf(4.5, M)
    const kLarge = kOf(5.5, M)
    expect(kSmall).toBeCloseTo(kMid, 12)
    expect(kLarge).toBeCloseTo(kMid, 12)
  })

  it('k 与中心天体质量成正比：k = GM/4π²', () => {
    expect(kOf(4.5, M)).toBeCloseTo((KEPLER_SIM_G * M) / (4 * Math.PI * Math.PI), 12)
    expect(kOf(4.5, 2 * M)).toBeCloseTo(2 * kOf(4.5, M), 12)
    expect(kOf(4.5, M / 2)).toBeCloseTo(kOf(4.5, M) / 2, 12)
  })

  it('周期与偏心率无关（同一 a、同一中心天体）', () => {
    const t0 = orbitalPeriodFromMass(A, M)
    expect(evaluateKeplerOrbit(A, 0, M, 0).period).toBeCloseTo(t0, 12)
    expect(evaluateKeplerOrbit(A, 0.9, M, 0).period).toBeCloseTo(t0, 12)
  })
})

describe('第一定律：焦半径之和 = 2a（用副焦点真实坐标量）', () => {
  it('任意偏心率、任意时刻，hypot(r₁) + hypot(r₂) 都等于 2a', () => {
    for (const e of [0, 0.3, 0.75, 0.9]) {
      const { c } = ellipseFromEccentricity(A, e)
      const T = orbitalPeriodFromMass(A, M)
      for (let i = 0; i <= 12; i += 1) {
        const st = evaluateKeplerOrbit(A, e, M, (i / 12) * T)
        const r1 = Math.hypot(st.x - c, st.y)
        const r2 = Math.hypot(st.x + c, st.y)
        expect(r1 + r2).toBeCloseTo(2 * A, 9)
        // 求解器返回的 r 必须与"到太阳（右焦点）的实际距离"一致
        expect(r1).toBeCloseTo(st.r, 9)
      }
    }
  })

  it('b > a 在几何上不可表达（b 由 e 派生）', () => {
    for (const e of [0, 0.5, 0.85]) {
      const { b } = ellipseFromEccentricity(2.5, e)
      expect(b).toBeLessThanOrEqual(2.5)
    }
  })
})

describe('第二定律：等时间扫过等面积', () => {
  it('整周期累积面积收敛到 πab', () => {
    for (const e of [0, 0.3, 0.75, 0.9]) {
      const { b } = ellipseFromEccentricity(A, e)
      const trace = sampleSweptArea(A, e, M, 96)
      const total = trace[trace.length - 1].area
      // 实测相对误差 ≤ 1e-4（加密积分后）
      expect(total).toBeCloseTo(Math.PI * A * b, 2)
    }
  })

  it('等 Δt 的面积增量相等（实测单段偏差 < 0.1%）', () => {
    const trace = sampleSweptArea(A, E, M, 48)
    const deltas: number[] = []
    for (let i = 1; i < trace.length; i += 1) deltas.push(trace[i].area - trace[i - 1].area)
    const mean = deltas.reduce((s, v) => s + v, 0) / deltas.length
    for (const d of deltas) {
      expect(Math.abs(d - mean) / mean).toBeLessThan(0.002)
    }
  })

  it('面积速度满足 dS/dt = h/2（与数值累积的斜率一致）', () => {
    const h = specificAngularMomentum(A, E, M)
    expect(arealVelocity(A, E, M)).toBeCloseTo(h / 2, 12)
    // 数值斜率（整周期总面积 / 周期）
    const trace = sampleSweptArea(A, E, M, 96)
    const total = trace[trace.length - 1].area
    const period = orbitalPeriodFromMass(A, M)
    expect(total / period).toBeCloseTo(h / 2, 3)
  })
})

describe('第二定律推论：r_min·v_近日 = r_max·v_远日 = h', () => {
  it('近/远日点的 r·v 相等', () => {
    const { rMin, rMax } = ellipseFromEccentricity(A, E)
    const T = orbitalPeriodFromMass(A, M)
    const vPeri = evaluateKeplerOrbit(A, E, M, 0).v
    const vApo = evaluateKeplerOrbit(A, E, M, T / 2).v
    const h = specificAngularMomentum(A, E, M)
    expect(rMin * vPeri).toBeCloseTo(h, 9)
    expect(rMax * vApo).toBeCloseTo(h, 9)
    // 速度比 = 距离反比
    expect(vPeri / vApo).toBeCloseTo(rMax / rMin, 9)
  })
})

describe('轨道合法性在物理层被挡住', () => {
  it('近日点进入恒星本体时判为不合法', () => {
    const bad = orbitLegality(2.5, 0.85, SUN_CLEARANCE)
    expect(bad.ok).toBe(false)
    expect(bad.reason).toContain('近日点')
    expect(orbitLegality(4.5, 0.75, SUN_CLEARANCE).ok).toBe(true)
  })

  it('e ≥ 1 与负半长轴被拒', () => {
    expect(orbitLegality(4.5, 1.2).ok).toBe(false)
    expect(orbitLegality(-1, 0.5).ok).toBe(false)
  })

  it('默认参数组合合法', () => {
    expect(orbitLegality(4.5, 0.75, SUN_CLEARANCE).ok).toBe(true)
  })
})
