import { describe, it, expect } from 'vitest'
import {
  computeRCTransient,
  sampleRCTransient,
  rcTauFromParams,
  rcWindowFromParams,
  RC_WINDOW_TAUS,
} from '../rcTransient'

/**
 * RC 暂态模型的判据全部来自物理约束，而不是"抄一遍公式"：
 *   - 特征值（t = τ 的 63.2% / 36.8%）
 *   - 单调性与极限
 *   - 面积 ∫i dt 与 q 恒等（这是面板"面积即电量"那句话的依据）
 *   - 能量守恒：充电全程电源做功 = 2 × 电场储能
 */
describe('rcTransient physics', () => {
  const E = 6
  const R = 10e3 // 10 kΩ
  const C = 200e-6 // 200 μF
  const TAU = R * C // 2 s

  it('时间常数只由 R、C 决定，参数化入口与 R·C 一致', () => {
    expect(computeRCTransient(E, R, C, 0, 'charge').tau).toBeCloseTo(TAU, 10)
    expect(rcTauFromParams({ R_t: 10, C_t: 200 })).toBeCloseTo(TAU, 10)
    // 改变电动势不改变 τ
    expect(computeRCTransient(100, R, C, 0, 'charge').tau).toBeCloseTo(TAU, 10)
    // kΩ·μF → ms：1 kΩ × 1 μF = 1 ms
    expect(rcTauFromParams({ R_t: 1, C_t: 1 })).toBeCloseTo(1e-3, 12)
  })

  it('充电：u_C 从 0 升到 E，i 从 E/R 衰减到 0', () => {
    const t0 = computeRCTransient(E, R, C, 0, 'charge')
    expect(t0.uC).toBeCloseTo(0, 10)
    expect(t0.i).toBeCloseTo(E / R, 10)
    expect(t0.progress).toBeCloseTo(0, 10)

    const tTau = computeRCTransient(E, R, C, TAU, 'charge')
    expect(tTau.uC).toBeCloseTo(E * (1 - Math.exp(-1)), 8)
    expect(tTau.uC / E).toBeCloseTo(0.632, 3)
    expect(tTau.i).toBeCloseTo((E / R) * Math.exp(-1), 12)

    // 5τ 时 u_C 为 E 的 99.33%（偏差 0.67%，约 0.04 V），不能按 3 位小数判等
    const t5 = computeRCTransient(E, R, C, 5 * TAU, 'charge')
    jest_almost(t5.uC, E, 1e-2)
    expect(t5.i).toBeLessThan((E / R) * 0.01)
    expect(t5.progress).toBeGreaterThan(0.993)
  })

  it('放电：u_C 从 E 衰减到 0，电流方向与充电相反（i < 0）', () => {
    const t0 = computeRCTransient(E, R, C, 0, 'discharge')
    expect(t0.uC).toBeCloseTo(E, 10)
    expect(t0.i).toBeCloseTo(-E / R, 10)
    expect(t0.i).toBeLessThan(0)

    const tTau = computeRCTransient(E, R, C, TAU, 'discharge')
    expect(tTau.uC).toBeCloseTo(E * Math.exp(-1), 8)
    expect(tTau.i / (E / R)).toBeCloseTo(-Math.exp(-1), 10)

    const t5 = computeRCTransient(E, R, C, 5 * TAU, 'discharge')
    expect(t5.uC).toBeLessThan(E * 0.01)
    expect(t5.q).toBeLessThan(C * E * 0.01)
  })

  it('面积恒等式：∫|i|dt === ΔQ === C·u_C（两种过程的增量同源）', () => {
    for (const phase of ['charge', 'discharge'] as const) {
      for (const t of [0.2, 0.5, 1, 2, 4, 8]) {
        const s = computeRCTransient(E, R, C, t, phase)
        const deltaQ = phase === 'charge' ? s.q : C * E - s.q
        expect(s.areaCharge).toBeCloseTo(deltaQ, 12)
      }
    }

    // 5τ 后面积应等于充满电量 CE（充电）或全部放完 CE（放电）；
    // 5τ 只到 99.33%（e⁻⁵ = 6.7‰），所以判据留 1% 而非机器精度
    const charged = computeRCTransient(E, R, C, 5 * TAU, 'charge')
    jest_almost(charged.areaCharge, C * E, 1e-2)
    const discharged = computeRCTransient(E, R, C, 5 * TAU, 'discharge')
    jest_almost(discharged.areaCharge, C * E, 1e-2)
  })

  it('单调性：两条曲线都不出现回摆', () => {
    const pts = sampleRCTransient(E, R, C, 'charge', 5 * TAU, 200)
    for (let k = 1; k < pts.length; k++) {
      expect(pts[k].uC).toBeGreaterThanOrEqual(pts[k - 1].uC)
      expect(pts[k].i).toBeLessThanOrEqual(pts[k - 1].i)
      expect(pts[k].t).toBeGreaterThan(pts[k - 1].t)
    }
  })

  it('能量守恒：充电全过程电源做功 CE² = 电场储能 + 电阻生热', () => {
    const Wsource = C * E * E
    const stored = computeRCTransient(E, R, C, 5 * TAU, 'charge').storedEnergy
    // 5τ 时电场储能已达 ½CE² 的 98.7%（u_C 达 99.33%，平方后 98.66%）
    jest_almost(stored, 0.5 * C * E * E, 2e-2)
    expect(stored / Wsource).toBeLessThan(0.5)
    expect(stored / Wsource).toBeGreaterThan(0.49)

    // 瞬时热功率 = i²R，t=0 时最大
    const p0 = computeRCTransient(E, R, C, 0, 'charge').heatPower
    expect(p0).toBeCloseTo((E * E) / R, 10)
  })

  it('窗口长度 = RC_WINDOW_TAUS · τ，且负时间被钳到 0（拖动进度条不会翻负）', () => {
    expect(rcWindowFromParams({ R_t: 10, C_t: 200 })).toBeCloseTo(RC_WINDOW_TAUS * TAU, 10)
    expect(computeRCTransient(E, R, C, -3, 'charge').uC).toBeCloseTo(0, 12)
    expect(computeRCTransient(E, R, C, -3, 'discharge').uC).toBeCloseTo(E, 12)
  })
})

/** 相对误差 1e-6 的近似断言（避免 toBeCloseTo 的位数在小量级上失真） */
function jest_almost(actual: number, expected: number, rel = 1e-6) {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(rel)
}
