import { describe, it, expect } from 'vitest'
import {
  solveClapeyron,
  computePVTratio,
  computeTotalKineticEnergy,
  generateIsothermFamily,
} from '../clapeyron'
import { GAS_CONSTANT } from '../constants'

// ── solveClapeyron（克拉珀龙方程：PV = nRT 三参量解算）────────────────

describe('solveClapeyron', () => {
  // ─ 求 P ─
  describe('求解压强 P', () => {
    it('已知 V=5e-3, T=300 → P = nRT/V', () => {
      const expected = (1 * GAS_CONSTANT * 300) / 5e-3
      expect(solveClapeyron({ key: 'V', value: 5e-3 }, { key: 'T', value: 300 }, 'P')).toBeCloseTo(expected, 6)
    })

    it('自定义 n=2', () => {
      const expected = (2 * GAS_CONSTANT * 400) / 1e-2
      expect(solveClapeyron({ key: 'V', value: 1e-2 }, { key: 'T', value: 400 }, 'P', 2)).toBeCloseTo(expected, 6)
    })

    it('参数顺序不影响结果（fixed1/fixed2 可交换）', () => {
      const a = solveClapeyron({ key: 'V', value: 5e-3 }, { key: 'T', value: 300 }, 'P')
      const b = solveClapeyron({ key: 'T', value: 300 }, { key: 'V', value: 5e-3 }, 'P')
      expect(a).toBeCloseTo(b, 10)
    })
  })

  // ─ 求 V ─
  describe('求解体积 V', () => {
    it('已知 P=1e5, T=300 → V = nRT/P', () => {
      const expected = (1 * GAS_CONSTANT * 300) / 1e5
      expect(solveClapeyron({ key: 'P', value: 1e5 }, { key: 'T', value: 300 }, 'V')).toBeCloseTo(expected, 6)
    })

    it('等压过程：温度翻倍体积翻倍', () => {
      const v1 = solveClapeyron({ key: 'P', value: 1e5 }, { key: 'T', value: 300 }, 'V')
      const v2 = solveClapeyron({ key: 'P', value: 1e5 }, { key: 'T', value: 600 }, 'V')
      expect(v2).toBeCloseTo(v1 * 2, 6)
    })
  })

  // ─ 求 T ─
  describe('求解温度 T', () => {
    it('已知 P=1e5, V=5e-3 → T = PV/(nR)', () => {
      const expected = (1e5 * 5e-3) / (1 * GAS_CONSTANT)
      expect(solveClapeyron({ key: 'P', value: 1e5 }, { key: 'V', value: 5e-3 }, 'T')).toBeCloseTo(expected, 6)
    })

    it('等容过程：压强翻倍温度翻倍', () => {
      const t1 = solveClapeyron({ key: 'P', value: 1e5 }, { key: 'V', value: 5e-3 }, 'T')
      const t2 = solveClapeyron({ key: 'P', value: 2e5 }, { key: 'V', value: 5e-3 }, 'T')
      expect(t2).toBeCloseTo(t1 * 2, 6)
    })
  })

  // ─ 边界条件 ─
  describe('边界条件', () => {
    it('V=0 求 P 返回 0', () => {
      expect(solveClapeyron({ key: 'V', value: 0 }, { key: 'T', value: 300 }, 'P')).toBe(0)
    })

    it('T=0 求 P 返回 0', () => {
      expect(solveClapeyron({ key: 'V', value: 5e-3 }, { key: 'T', value: 0 }, 'P')).toBe(0)
    })

    it('P=0 求 V 返回 0', () => {
      expect(solveClapeyron({ key: 'P', value: 0 }, { key: 'T', value: 300 }, 'V')).toBe(0)
    })

    it('V<0 求 T 返回 0', () => {
      expect(solveClapeyron({ key: 'P', value: 1e5 }, { key: 'V', value: -1 }, 'T')).toBe(0)
    })

    it('P<0 求 V 返回 0', () => {
      expect(solveClapeyron({ key: 'P', value: -1e5 }, { key: 'T', value: 300 }, 'V')).toBe(0)
    })
  })

  // ─ 循环一致性：PV = nRT ─
  describe('循环一致性', () => {
    it('P→V→T 回路还原', () => {
      const P0 = 1e5
      const T0 = 400
      const V0 = solveClapeyron({ key: 'P', value: P0 }, { key: 'T', value: T0 }, 'V')
      const T1 = solveClapeyron({ key: 'P', value: P0 }, { key: 'V', value: V0 }, 'T')
      expect(T1).toBeCloseTo(T0, 6)
    })

    it('V→P→T 回路还原', () => {
      const V0 = 5e-3
      const T0 = 350
      const P0 = solveClapeyron({ key: 'V', value: V0 }, { key: 'T', value: T0 }, 'P')
      const T1 = solveClapeyron({ key: 'P', value: P0 }, { key: 'V', value: V0 }, 'T')
      expect(T1).toBeCloseTo(T0, 6)
    })
  })
})

// ── computePVTratio（PV/T 比值守恒）──────────────────────────────────

describe('computePVTratio', () => {
  it('标准状态：P=1e5, V=5e-3, T=300 → PV/T = nR', () => {
    const expected = (1e5 * 5e-3) / 300
    expect(computePVTratio(1e5, 5e-3, 300)).toBeCloseTo(expected, 6)
  })

  it('n=1 时 PV/T = R', () => {
    const P = 2e5
    const V = 3e-3
    const T = (P * V) / (1 * GAS_CONSTANT)
    expect(computePVTratio(P, V, T)).toBeCloseTo(GAS_CONSTANT, 6)
  })

  it('等质量理想气体：不同状态下 PV/T 恒定', () => {
    const nR = 1 * GAS_CONSTANT
    // 各状态须满足 PV = nRT，即 PV/T = nR = 8.314
    const states = [
      { P: 1e5, V: nR * 300 / 1e5, T: 300 },
      { P: 2e5, V: nR * 400 / 2e5, T: 400 },
      { P: nR * 500 / 5e-3, V: 5e-3, T: 500 },
    ]
    for (const s of states) {
      expect(computePVTratio(s.P, s.V, s.T)).toBeCloseTo(nR, 6)
    }
  })

  it('T=0 返回 0', () => {
    expect(computePVTratio(1e5, 5e-3, 0)).toBe(0)
  })

  it('T<0 返回 0', () => {
    expect(computePVTratio(1e5, 5e-3, -300)).toBe(0)
  })
})

// ── computeTotalKineticEnergy（全分子总动能 E_k = 3/2 nRT）──────────

describe('computeTotalKineticEnergy', () => {
  it('T=300K, n=1 → E_k = 1.5 × R × 300', () => {
    const expected = 1.5 * 1 * GAS_CONSTANT * 300
    expect(computeTotalKineticEnergy(300)).toBeCloseTo(expected, 6)
  })

  it('n=2 时动能翻倍', () => {
    const e1 = computeTotalKineticEnergy(300, 1)
    const e2 = computeTotalKineticEnergy(300, 2)
    expect(e2).toBeCloseTo(e1 * 2, 6)
  })

  it('温度翻倍动能翻倍（等容过程）', () => {
    const e1 = computeTotalKineticEnergy(300)
    const e2 = computeTotalKineticEnergy(600)
    expect(e2).toBeCloseTo(e1 * 2, 6)
  })

  it('T=0 返回 0', () => {
    expect(computeTotalKineticEnergy(0)).toBe(0)
  })

  it('T<0 返回 0', () => {
    expect(computeTotalKineticEnergy(-100)).toBe(0)
  })
})

// ── generateIsothermFamily（等温线族）────────────────────────────────

describe('generateIsothermFamily', () => {
  const V_MIN = 1e-4
  const V_MAX = 1e-2

  it('返回数组长度等于温度数组长度', () => {
    const temps = [250, 300, 350]
    const family = generateIsothermFamily(temps, 1, V_MIN, V_MAX)
    expect(family).toHaveLength(3)
  })

  it('每条等温线包含正确的 T 值', () => {
    const temps = [250, 400, 600]
    const family = generateIsothermFamily(temps, 1, V_MIN, V_MAX)
    for (let i = 0; i < temps.length; i++) {
      expect(family[i].T).toBe(temps[i])
    }
  })

  it('每条等温线点数 = count + 1', () => {
    const family = generateIsothermFamily([300], 1, V_MIN, V_MAX, 80)
    expect(family[0].points).toHaveLength(81)
  })

  it('所有点满足 PV = nRT（等温约束）', () => {
    const T = 350
    const n = 1
    const nRT = n * GAS_CONSTANT * T
    const family = generateIsothermFamily([T], n, V_MIN, V_MAX, 50)
    for (const pt of family[0].points) {
      expect(pt.v * pt.p).toBeCloseTo(nRT, 0)
    }
  })

  it('高温等温线在相同体积下压强更高', () => {
    const family = generateIsothermFamily([300, 500], 1, V_MIN, V_MAX, 50)
    for (let i = 0; i <= 50; i++) {
      expect(family[1].points[i].p).toBeGreaterThan(family[0].points[i].p)
    }
  })

  it('空温度数组返回空数组', () => {
    expect(generateIsothermFamily([], 1, V_MIN, V_MAX)).toEqual([])
  })
})
