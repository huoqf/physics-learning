import { describe, it, expect } from 'vitest'
import {
  computePendulumExperiment,
  PENDULUM_EXP_DEFAULTS,
  SIMPLE_PENDULUM_DEFAULT_PARAMS,
} from '../experimentPendulum'

describe('高考实验：用单摆测重力加速度 (experimentPendulum)', () => {
  it('默认基准参数下有效摆长与重力加速度计算准确', () => {
    const res = computePendulumExperiment()

    // 摆长 L = l + d/2 = 0.985 + 0.010 = 0.995 m
    expect(res.l_line).toBeCloseTo(0.985, 4)
    expect(res.d_m).toBeCloseTo(0.02, 4)
    expect(res.r_m).toBeCloseTo(0.01, 4)
    expect(res.effectiveLength).toBeCloseTo(0.995, 4)

    // 周期 T = 2π√(0.995 / 9.8) ≈ 2.0016 s
    expect(res.theoreticalPeriod).toBeCloseTo(2.0016, 3)
    expect(res.measuredPeriod).toBeCloseTo(res.theoreticalPeriod, 4)

    // 无计时误差时测得 g 与真值一致
    expect(res.measuredG).toBeCloseTo(9.8, 3)
    expect(res.errorDeltaG).toBeCloseTo(0, 4)
    expect(res.relativeErrorPercent).toBeCloseTo(0, 3)

    // 实测斜率与理论斜率在无误差时一致
    expect(res.slopeT2_L_measured).toBeCloseTo(res.slopeT2_L, 4)
    expect((4 * Math.PI * Math.PI) / res.slopeT2_L_measured).toBeCloseTo(res.measuredG, 4)
  })

  it('计时误差对测得 g 的敏感度与实测斜率自洽闭环', () => {
    // 假设 40 次全振动累计慢停了 0.4 秒（测得时间偏大，测得周期偏大，反求 g 偏小）
    const res = computePendulumExperiment({
      l_line: 1.0,
      d_mm: 20.0,
      n_cycles: 40,
      g_true: 9.8,
      timing_err: 0.4,
    })

    expect(res.measuredTotalTime).toBeGreaterThan(res.idealTotalTime)
    expect(res.measuredPeriod).toBeGreaterThan(res.theoreticalPeriod)
    expect(res.measuredG).toBeLessThan(9.8)
    expect(res.relativeErrorPercent).toBeLessThan(0)

    // 关键自洽性：实测斜率 k_测 = 4π² / g_测
    expect((4 * Math.PI * Math.PI) / res.slopeT2_L_measured).toBeCloseTo(res.measuredG, 5)
    // 计时偏大导致周期偏大，T²-L 实测斜率大于理论斜率
    expect(res.slopeT2_L_measured).toBeGreaterThan(res.slopeT2_L)
  })

  it('漏加球半径（误用线长 l）导致 g 测量值系统性偏小', () => {
    const res = computePendulumExperiment({
      l_line: 0.98,
      d_mm: 20.0, // r = 0.01m
      g_true: 9.8,
      timing_err: 0,
    })

    // 有效摆长 L = 0.99m，线长 l = 0.98m
    // g_wrong = 4π²·l / T² = g_true · (l / L) = 9.8 · (0.98 / 0.99) ≈ 9.701 m/s²
    expect(res.wrongG_withoutRadius).toBeLessThan(res.trueG)
    expect(res.wrongRelativeErrorPercent).toBeCloseTo(((0.98 - 0.99) / 0.99) * 100, 2)
  })

  it('T²-L 理论斜率与 T²-l 截距及 θ₀ 小角偏差检验', () => {
    const g_true = 9.800
    const res = computePendulumExperiment({
      l_line: 1.0,
      d_mm: 20.0,
      g_true,
      theta0: 4,
    })

    const expectedSlope = (4 * Math.PI * Math.PI) / g_true
    expect(res.slopeT2_L).toBeCloseTo(expectedSlope, 4)

    // 截距 b = 4π²r / g
    const expectedIntercept = (4 * Math.PI * Math.PI * res.r_m) / g_true
    expect(res.interceptT2_l).toBeCloseTo(expectedIntercept, 4)

    // θ₀=4° 时小角近似误差微小 (约为 0.03%)
    expect(res.smallAngleErrorPercent).toBeLessThan(0.05)
    expect(res.smallAngleErrorPercent).toBeGreaterThan(0)

    // 检查参考比对点数据单调递增
    expect(res.comparisonPoints.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < res.comparisonPoints.length; i++) {
      expect(res.comparisonPoints[i].L).toBeGreaterThanOrEqual(res.comparisonPoints[i - 1].L)
      expect(res.comparisonPoints[i].T2_theory).toBeGreaterThanOrEqual(
        res.comparisonPoints[i - 1].T2_theory,
      )
    }
  })

  it('默认参数 SSOT 常量导出完整自洽', () => {
    expect(SIMPLE_PENDULUM_DEFAULT_PARAMS.l_line).toBe(PENDULUM_EXP_DEFAULTS.l_line)
    expect(SIMPLE_PENDULUM_DEFAULT_PARAMS.d_mm).toBe(PENDULUM_EXP_DEFAULTS.d_mm)
    expect(SIMPLE_PENDULUM_DEFAULT_PARAMS.n_cycles).toBe(PENDULUM_EXP_DEFAULTS.n_cycles)
    expect(SIMPLE_PENDULUM_DEFAULT_PARAMS.timing_err).toBe(PENDULUM_EXP_DEFAULTS.timing_err)
  })

  it('散点由多组独立测量模拟产生，包含微小读数涨落而非单一代数共线假点', () => {
    const res = computePendulumExperiment()
    const slopes = res.comparisonPoints.map((p) => p.T2_measured / p.L)
    const minSlope = Math.min(...slopes)
    const maxSlope = Math.max(...slopes)
    expect(maxSlope - minSlope).toBeGreaterThan(0.001)
  })
})

