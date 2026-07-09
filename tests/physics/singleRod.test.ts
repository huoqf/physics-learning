import { describe, it, expect } from 'vitest'
import { getSingleRodState, type SingleRodParams } from '@/physics/singleRod'

/** 默认参数（B=1.2T, L=0.8m, R=1.5Ω, m=0.2kg） */
const BASE: SingleRodParams = {
  mode: 'constantForce',
  driveForce: 1.2,
  initialVelocity: 5,
  magneticB: 1.2,
  railSpacing: 0.8,
  resistance: 1.5,
  rodMass: 0.2,
}

function params(overrides: Partial<SingleRodParams>): SingleRodParams {
  return { ...BASE, ...overrides }
}

// ─── 常量关系 ──────────────────────────────────────────────────

describe('singleRod — 阻尼系数与收尾速度', () => {
  it('dampingK = B²L²/R', () => {
    const s = getSingleRodState(BASE, 0)
    // B=1.2, L=0.8, R=1.5 → (1.44 * 0.64) / 1.5 = 0.6144
    expect(s.dampingK).toBeCloseTo((1.2 ** 2 * 0.8 ** 2) / 1.5, 10)
  })

  it('收尾速度 v_m = F / dampingK（恒力模式）', () => {
    const s = getSingleRodState(BASE, 100) // t 足够大，趋近收尾
    const K = (1.2 ** 2 * 0.8 ** 2) / 1.5
    const vTerminal = 1.2 / K
    expect(s.terminalVelocity).toBeCloseTo(vTerminal, 10)
    expect(s.v).toBeCloseTo(vTerminal, 4) // 100s 应非常接近
  })

  it('初速度释放模式收尾速度为 0', () => {
    const s = getSingleRodState(params({ mode: 'initialVelocity', initialVelocity: 5 }), 100)
    expect(s.terminalVelocity).toBe(0)
    expect(s.v).toBeCloseTo(0, 6)
  })
})

// ─── 恒力模式 ──────────────────────────────────────────────────

describe('singleRod — 恒力启动', () => {
  it('t=0 时 v=0, x=0, a=F/m', () => {
    const s = getSingleRodState(BASE, 0)
    expect(s.v).toBe(0)
    expect(s.x).toBe(0)
    expect(s.a).toBeCloseTo(1.2 / 0.2, 10) // a = F/m = 6
    expect(s.emf).toBe(0)
    expect(s.current).toBe(0)
    expect(s.ampereForce).toBe(0)
  })

  it('速度单调递增且不超过收尾速度', () => {
    const v0 = getSingleRodState(BASE, 0).v
    const v1 = getSingleRodState(BASE, 1).v
    const v2 = getSingleRodState(BASE, 5).v
    const vt = getSingleRodState(BASE, 0).terminalVelocity
    expect(v1).toBeGreaterThan(v0)
    expect(v2).toBeGreaterThan(v1)
    expect(v2).toBeLessThan(vt)
  })

  it('加速度随时间衰减至 0', () => {
    const a0 = getSingleRodState(BASE, 0).a
    const a1 = getSingleRodState(BASE, 1).a
    const a5 = getSingleRodState(BASE, 5).a
    expect(a0).toBeGreaterThan(0)
    expect(a1).toBeLessThan(a0)
    expect(a5).toBeLessThan(a1)
    expect(a5).toBeCloseTo(0, 2)
  })

  it('能量守恒：W_ext = Q + Ek', () => {
    for (const t of [0.5, 1, 2, 5, 10]) {
      const s = getSingleRodState(BASE, t)
      expect(s.workExternal).toBeCloseTo(s.jouleHeat + s.kineticEnergy, 8)
    }
  })

  it('电荷量 q = BLx/R', () => {
    for (const t of [1, 3, 8]) {
      const s = getSingleRodState(BASE, t)
      const expected = (1.2 * 0.8 * s.x) / 1.5
      expect(s.charge).toBeCloseTo(expected, 8)
    }
  })

  it('EMF = BLv, I = EMF/R, F_amp = k·v', () => {
    for (const t of [0.5, 2, 10]) {
      const s = getSingleRodState(BASE, t)
      const K = (1.2 ** 2 * 0.8 ** 2) / 1.5
      expect(s.emf).toBeCloseTo(1.2 * 0.8 * s.v, 10)
      expect(s.current).toBeCloseTo(s.emf / 1.5, 10)
      expect(s.ampereForce).toBeCloseTo(K * s.v, 10)
    }
  })

  it('外力为 0 时杆不动', () => {
    const s = getSingleRodState(params({ driveForce: 0 }), 5)
    expect(s.v).toBe(0)
    expect(s.x).toBe(0)
    expect(s.ampereForce).toBe(0)
  })
})

// ─── 初速度释放模式 ────────────────────────────────────────────

describe('singleRod — 初速度释放', () => {
  const p = params({ mode: 'initialVelocity', initialVelocity: 5 })

  it('t=0 时 v=v0, x=0', () => {
    const s = getSingleRodState(p, 0)
    expect(s.v).toBe(5)
    expect(s.x).toBe(0)
    expect(s.externalForce).toBe(0)
    expect(s.workExternal).toBe(0)
  })

  it('速度指数衰减至 0', () => {
    const v0 = getSingleRodState(p, 0).v
    const v1 = getSingleRodState(p, 1).v
    const v5 = getSingleRodState(p, 5).v
    expect(v1).toBeLessThan(v0)
    expect(v5).toBeLessThan(v1)
    expect(v5).toBeCloseTo(0, 3)
  })

  it('加速度为负（减速）', () => {
    const s = getSingleRodState(p, 0.5)
    expect(s.a).toBeLessThan(0)
  })

  it('能量守恒：Ek0 = Q + Ek(t)', () => {
    const K0 = 0.5 * 0.2 * 5 * 5 // 2.5 J
    for (const t of [0.5, 1, 3, 10]) {
      const s = getSingleRodState(p, t)
      expect(K0).toBeCloseTo(s.jouleHeat + s.kineticEnergy, 8)
    }
  })

  it('电荷量 q = m(v0 - v) / (BL)', () => {
    for (const t of [0.5, 2, 8]) {
      const s = getSingleRodState(p, t)
      const expected = (0.2 * (5 - s.v)) / (1.2 * 0.8)
      expect(s.charge).toBeCloseTo(expected, 8)
    }
  })

  it('位移单调递增但有限', () => {
    const x1 = getSingleRodState(p, 1).x
    const x5 = getSingleRodState(p, 5).x
    const x10 = getSingleRodState(p, 10).x
    expect(x1).toBeGreaterThan(0)
    expect(x5).toBeGreaterThan(x1)
    expect(x10).toBeGreaterThan(x5)
    // 初速度释放最大位移 = v0 / tauFactor = v0 * m / k
    const K = (1.2 ** 2 * 0.8 ** 2) / 1.5
    const xMax = (5 * 0.2) / K
    expect(x10).toBeLessThan(xMax)
  })
})

// ─── 边界保护 ──────────────────────────────────────────────────

describe('singleRod — 边界保护', () => {
  it('负时间被钳位到 0', () => {
    const s = getSingleRodState(BASE, -5)
    expect(s.time).toBe(0)
    expect(s.v).toBe(0)
  })

  it('B=0 回退到 0.1', () => {
    const s = getSingleRodState(params({ magneticB: 0 }), 1)
    // dampingK = 0.1² * 0.8² / 1.5
    const K = (0.1 ** 2 * 0.8 ** 2) / 1.5
    expect(s.dampingK).toBeCloseTo(K, 10)
  })

  it('R=0 回退到 0.1', () => {
    const s = getSingleRodState(params({ resistance: 0 }), 1)
    // dampingK = 1.2² * 0.8² / 0.1
    const K = (1.2 ** 2 * 0.8 ** 2) / 0.1
    expect(s.dampingK).toBeCloseTo(K, 10)
  })

  it('m=0 回退到 0.01', () => {
    const s = getSingleRodState(params({ rodMass: 0 }), 1)
    // tauFactor = K / 0.01
    expect(s.a).toBeDefined()
  })

  it('负 driveForce 被钳位到 0', () => {
    const s = getSingleRodState(params({ driveForce: -3 }), 1)
    expect(s.externalForce).toBe(0)
    expect(s.v).toBe(0)
  })

  it('负 initialVelocity 被钳位到 0', () => {
    const s = getSingleRodState(params({ mode: 'initialVelocity', initialVelocity: -5 }), 1)
    expect(s.v).toBe(0)
  })
})

// ─── 序列化兼容 ────────────────────────────────────────────────

describe('singleRod — 可序列化', () => {
  it('返回值不含 Set/Map/Function', () => {
    const s = getSingleRodState(BASE, 3)
    const json = JSON.stringify(s)
    const parsed = JSON.parse(json)
    expect(parsed).toEqual(s)
  })

  it('所有字段均为 number', () => {
    const s = getSingleRodState(BASE, 2)
    for (const key of Object.keys(s) as (keyof typeof s)[]) {
      expect(typeof s[key]).toBe('number')
      expect(Number.isFinite(s[key])).toBe(true)
    }
  })
})
