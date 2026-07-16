import { describe, it, expect } from 'vitest'
import {
  computeBoylePressure,
  computeGayLussacVolume,
  computeCharlesPressure,
  generateIsothermPoints,
  generateIsobarPoints,
  generateIsochorPoints,
} from '../gasLaws'
import { GAS_CONSTANT } from '../constants'

// ── computeBoylePressure（玻意耳定律：等温过程 P = nRT/V）──────────────

describe('computeBoylePressure', () => {
  it('标准状态：n=1, T=300K, V=5e-3 m³', () => {
    const expected = (1 * GAS_CONSTANT * 300) / 5e-3
    expect(computeBoylePressure(5e-3, 300)).toBeCloseTo(expected, 6)
  })

  it('自定义物质的量 n=2', () => {
    const expected = (2 * GAS_CONSTANT * 400) / 1e-2
    expect(computeBoylePressure(1e-2, 400, 2)).toBeCloseTo(expected, 6)
  })

  it('PV = nRT 恒定：温度不变时，体积减半压强翻倍', () => {
    const p1 = computeBoylePressure(5e-3, 300)
    const p2 = computeBoylePressure(2.5e-3, 300)
    expect(p2).toBeCloseTo(p1 * 2, 6)
  })

  it('V = 0 返回 0', () => {
    expect(computeBoylePressure(0, 300)).toBe(0)
  })

  it('V < 0 返回 0', () => {
    expect(computeBoylePressure(-1, 300)).toBe(0)
  })

  it('T = 0 返回 0', () => {
    expect(computeBoylePressure(5e-3, 0)).toBe(0)
  })

  it('T < 0 返回 0', () => {
    expect(computeBoylePressure(5e-3, -100)).toBe(0)
  })
})

// ── computeGayLussacVolume（盖-吕萨克定律：等压过程 V = nRT/P）────────

describe('computeGayLussacVolume', () => {
  it('标准状态：n=1, T=300K, P=1e5 Pa', () => {
    const expected = (1 * GAS_CONSTANT * 300) / 1e5
    expect(computeGayLussacVolume(300, 1e5)).toBeCloseTo(expected, 6)
  })

  it('自定义物质的量 n=0.5', () => {
    const expected = (0.5 * GAS_CONSTANT * 600) / 2e5
    expect(computeGayLussacVolume(600, 2e5, 0.5)).toBeCloseTo(expected, 6)
  })

  it('等压过程：温度翻倍体积翻倍', () => {
    const v1 = computeGayLussacVolume(300, 1e5)
    const v2 = computeGayLussacVolume(600, 1e5)
    expect(v2).toBeCloseTo(v1 * 2, 6)
  })

  it('T = 0 返回 0', () => {
    expect(computeGayLussacVolume(0, 1e5)).toBe(0)
  })

  it('T < 0 返回 0', () => {
    expect(computeGayLussacVolume(-200, 1e5)).toBe(0)
  })

  it('P = 0 返回 0', () => {
    expect(computeGayLussacVolume(300, 0)).toBe(0)
  })

  it('P < 0 返回 0', () => {
    expect(computeGayLussacVolume(300, -1e5)).toBe(0)
  })
})

// ── computeCharlesPressure（查理定律：等容过程 P = nRT/V）──────────────

describe('computeCharlesPressure', () => {
  it('标准状态：n=1, T=300K, V=5e-3 m³', () => {
    const expected = (1 * GAS_CONSTANT * 300) / 5e-3
    expect(computeCharlesPressure(300, 5e-3)).toBeCloseTo(expected, 6)
  })

  it('等容过程：温度翻倍压强翻倍', () => {
    const p1 = computeCharlesPressure(300, 5e-3)
    const p2 = computeCharlesPressure(600, 5e-3)
    expect(p2).toBeCloseTo(p1 * 2, 6)
  })

  it('与 computeBoylePressure 结果一致（公式相同，物理含义不同）', () => {
    const V = 5e-3
    const T = 300
    expect(computeCharlesPressure(T, V)).toBeCloseTo(computeBoylePressure(V, T), 10)
  })

  it('T = 0 返回 0', () => {
    expect(computeCharlesPressure(0, 5e-3)).toBe(0)
  })

  it('V = 0 返回 0', () => {
    expect(computeCharlesPressure(300, 0)).toBe(0)
  })

  it('V < 0 返回 0', () => {
    expect(computeCharlesPressure(300, -1)).toBe(0)
  })
})

// ── generateIsothermPoints（等温线：P-V 双曲线）───────────────────────

describe('generateIsothermPoints', () => {
  it('返回 count+1 个数据点', () => {
    const points = generateIsothermPoints(300, 1, 1e-4, 1e-2, 50)
    expect(points).toHaveLength(51)
  })

  it('首尾点体积等于 vMin 和 vMax', () => {
    const points = generateIsothermPoints(300, 1, 1e-4, 1e-2)
    expect(points[0].v).toBe(1e-4)
    expect(points[points.length - 1].v).toBe(1e-2)
  })

  it('所有点满足 PV = nRT（等温约束）', () => {
    const T = 300
    const n = 1
    const nRT = n * GAS_CONSTANT * T
    const points = generateIsothermPoints(T, n, 1e-4, 1e-2, 50)
    for (const pt of points) {
      expect(pt.v * pt.p).toBeCloseTo(nRT, 0)
    }
  })

  it('体积增大时压强单调递减', () => {
    const points = generateIsothermPoints(300, 1, 1e-4, 1e-2, 50)
    for (let i = 1; i < points.length; i++) {
      expect(points[i].p).toBeLessThan(points[i - 1].p)
    }
  })

  it('自定义 count=10 返回 11 个点', () => {
    expect(generateIsothermPoints(300, 1, 1e-4, 1e-2, 10)).toHaveLength(11)
  })
})

// ── generateIsobarPoints（等压线：V-T 过原点直线）──────────────────────

describe('generateIsobarPoints', () => {
  it('返回 count+1 个数据点', () => {
    const points = generateIsobarPoints(1e5, 1, 200, 600, 50)
    expect(points).toHaveLength(51)
  })

  it('首尾点温度等于 tMin 和 tMax', () => {
    const points = generateIsobarPoints(1e5, 1, 200, 600)
    expect(points[0].t).toBe(200)
    expect(points[points.length - 1].t).toBe(600)
  })

  it('所有点满足 V/T = nR/P（等压约束）', () => {
    const P = 1e5
    const n = 1
    const nRoverP = (n * GAS_CONSTANT) / P
    const points = generateIsobarPoints(P, n, 200, 600, 50)
    for (const pt of points) {
      expect(pt.v / pt.t).toBeCloseTo(nRoverP, 6)
    }
  })

  it('温度升高时体积单调递增', () => {
    const points = generateIsobarPoints(1e5, 1, 200, 600, 50)
    for (let i = 1; i < points.length; i++) {
      expect(points[i].v).toBeGreaterThan(points[i - 1].v)
    }
  })

  it('V-T 图过原点：外推至 T=0 时 V=0', () => {
    const P = 1e5
    const n = 1
    const points = generateIsobarPoints(P, n, 200, 600)
    // 线性外推
    const slope = (points[1].v - points[0].v) / (points[1].t - points[0].t)
    const vAtZero = points[0].v - slope * points[0].t
    expect(vAtZero).toBeCloseTo(0, 10)
  })
})

// ── generateIsochorPoints（等容线：P-T 过原点直线）──────────────────────

describe('generateIsochorPoints', () => {
  it('返回 count+1 个数据点', () => {
    const points = generateIsochorPoints(5e-3, 1, 200, 600, 50)
    expect(points).toHaveLength(51)
  })

  it('首尾点温度等于 tMin 和 tMax', () => {
    const points = generateIsochorPoints(5e-3, 1, 200, 600)
    expect(points[0].t).toBe(200)
    expect(points[points.length - 1].t).toBe(600)
  })

  it('所有点满足 P/T = nR/V（等容约束）', () => {
    const V = 5e-3
    const n = 1
    const nRoverV = (n * GAS_CONSTANT) / V
    const points = generateIsochorPoints(V, n, 200, 600, 50)
    for (const pt of points) {
      expect(pt.p / pt.t).toBeCloseTo(nRoverV, 6)
    }
  })

  it('温度升高时压强单调递增', () => {
    const points = generateIsochorPoints(5e-3, 1, 200, 600, 50)
    for (let i = 1; i < points.length; i++) {
      expect(points[i].p).toBeGreaterThan(points[i - 1].p)
    }
  })

  it('P-T 图过原点：外推至 T=0 时 P=0', () => {
    const V = 5e-3
    const n = 1
    const points = generateIsochorPoints(V, n, 200, 600)
    const slope = (points[1].p - points[0].p) / (points[1].t - points[0].t)
    const pAtZero = points[0].p - slope * points[0].t
    expect(pAtZero).toBeCloseTo(0, 8)
  })
})

// ── 跨函数一致性 ─────────────────────────────────────────────────────

describe('跨函数一致性', () => {
  it('等温线首点 = computeBoylePressure(vMin, T)', () => {
    const T = 300
    const vMin = 1e-4
    const points = generateIsothermPoints(T, 1, vMin, 1e-2)
    expect(points[0].p).toBeCloseTo(computeBoylePressure(vMin, T), 10)
  })

  it('等压线末点 = computeGayLussacVolume(tMax, P)', () => {
    const P = 1e5
    const tMax = 600
    const points = generateIsobarPoints(P, 1, 200, tMax)
    expect(points[points.length - 1].v).toBeCloseTo(computeGayLussacVolume(tMax, P), 10)
  })

  it('等容线末点 = computeCharlesPressure(tMax, V)', () => {
    const V = 5e-3
    const tMax = 600
    const points = generateIsochorPoints(V, 1, 200, tMax)
    expect(points[points.length - 1].p).toBeCloseTo(computeCharlesPressure(tMax, V), 10)
  })

  it('三种曲线在相同状态下 P、V、T 关系自洽', () => {
    const T = 300
    const V = 5e-3
    const n = 1
    const P_boyle = computeBoylePressure(V, T, n)
    const P_charles = computeCharlesPressure(T, V, n)
    // 两者公式相同，结果应一致
    expect(P_boyle).toBeCloseTo(P_charles, 10)
    // 用该压强反算体积应还原
    const V_gayLussac = computeGayLussacVolume(T, P_boyle, n)
    expect(V_gayLussac).toBeCloseTo(V, 10)
  })
})
