import { describe, it, expect } from 'vitest'
import {
  calcLorentzFactor,
  calcTimeDilation,
  calcLengthContraction,
  calcRelativisticEnergy,
  calcRelativisticVelocityAddition,
  clampRelativityBeta,
  formatRelativityBeta,
  getRelativityCycleDuration,
  getRelativityMaxTime,
  calcLightClockState,
  calcSimultaneityState,
  calcConstantForceAccelState,
  calcNewtonianLimitMetrics,
  calcRelativisticAccelRatio,
  sampleConstantForceCurves,
  sampleLorentzCurve,
  sampleKineticEnergyCurves,
  getRelativityCriticalTimes,
  getRelativityTimeStages,
} from '../relativity'

describe('相对论纯物理函数单元测试', () => {
  it('洛伦兹因子计算准确无误', () => {
    expect(calcLorentzFactor(0)).toBeCloseTo(1, 6)
    expect(calcLorentzFactor(0.6)).toBeCloseTo(1.25, 6)
    expect(calcLorentzFactor(0.8)).toBeCloseTo(5 / 3, 5)
    expect(calcLorentzFactor(Math.sqrt(3) / 2)).toBeCloseTo(2, 5)
  })

  it('时间延缓计算符合动钟变慢规律', () => {
    expect(calcTimeDilation(10, 0.6)).toBeCloseTo(12.5, 6)
  })

  it('长度收缩计算符合动尺变短规律', () => {
    expect(calcLengthContraction(100, 0.6)).toBeCloseTo(80, 6)
  })

  it('质能方程与动能计算正确', () => {
    const res = calcRelativisticEnergy(2, 0.6, 10)
    expect(res.gamma).toBeCloseTo(1.25, 6)
    expect(res.relativisticMass).toBeCloseTo(2.5, 6)
    expect(res.restEnergy).toBeCloseTo(200, 6)
    expect(res.totalEnergy).toBeCloseTo(250, 6)
    expect(res.kineticEnergy).toBeCloseTo(50, 6)
  })

  it('相对论速度合成定理正确', () => {
    expect(calcRelativisticVelocityAddition(0.5, 0.5)).toBeCloseTo(0.8, 6)
    const highSpeed = calcRelativisticVelocityAddition(0.99, 0.99)
    expect(highSpeed).toBeLessThan(1)
    expect(highSpeed).toBeGreaterThan(0.99)
  })

  it('支持 β=0 低速极限、精度格式化与完整光钟周期计算', () => {
    expect(clampRelativityBeta(-0.2)).toBe(0)
    expect(clampRelativityBeta(0)).toBe(0)
    expect(clampRelativityBeta(0.99)).toBe(0.95)
    expect(formatRelativityBeta(0.6)).toBe('0.60')
    expect(formatRelativityBeta(0.866)).toBe('0.866')
    expect(formatRelativityBeta(0)).toBe('0.00')

    expect(getRelativityCycleDuration(0)).toBeCloseTo(2.0, 6)
    expect(getRelativityCycleDuration(0.6)).toBeCloseTo(2.5, 6)
    expect(getRelativityCycleDuration(0.8)).toBeCloseTo(10 / 3, 5)
  })

  it('光钟状态保证固有时同步且地面系光子合速度恒为 c', () => {
    const stateHalf = calcLightClockState(0.6, 1.25)
    expect(stateHalf.groundTime).toBeCloseTo(1.25, 6)
    expect(stateHalf.properTime).toBeCloseTo(1.0, 6)
    expect(stateHalf.pulseHeightRatio).toBeCloseTo(1.0, 6)
    expect(stateHalf.stage).toBe('top')

    const stateEnd = calcLightClockState(0.6, 2.5)
    expect(stateEnd.groundTime).toBeCloseTo(2.5, 6)
    expect(stateEnd.properTime).toBeCloseTo(2.0, 6)
    expect(stateEnd.pulseHeightRatio).toBeCloseTo(0, 6)
    expect(stateEnd.stage).toBe('returned')

    for (const b of [0, 0.3, 0.6, 0.8, 0.95]) {
      const s = calcLightClockState(b, 0.5)
      expect(Math.hypot(b, 1 / s.gamma)).toBeCloseTo(1, 6)
      expect(s.halfHypotWorld ** 2).toBeCloseTo(s.clockHeightWorld ** 2 + s.halfHorizWorld ** 2, 5)
    }
  })

  it('同时的相对性（mode 1）左右光程严格等速且先到后壁 A 再到前壁 B', () => {
    const zero = calcSimultaneityState(0, 1.0)
    expect(zero.tA).toBeCloseTo(1.0, 6)
    expect(zero.tB).toBeCloseTo(1.0, 6)
    expect(zero.deltaTab).toBeCloseTo(0, 6)
    expect(zero.stage).toBe('hit-both')

    // β = 0.6 => γ = 1.25; tA = 0.50 s, tB = 2.00 s
    const atHitA = calcSimultaneityState(0.6, 0.5)
    expect(atHitA.tA).toBeCloseTo(0.5, 6)
    expect(atHitA.tB).toBeCloseTo(2.0, 6)
    expect(atHitA.hitA).toBe(true)
    expect(atHitA.hitB).toBe(false)
    // t <= tA 时左右光束传播距离严格相等
    expect(Math.abs(atHitA.leftRayX)).toBeCloseTo(Math.abs(atHitA.rightRayX), 6)
    // 且右光束尚未抵达前壁 B
    expect(atHitA.rightRayX).toBeLessThan(atHitA.wallBX)

    const atHitB = calcSimultaneityState(0.6, 2.0)
    expect(atHitB.hitB).toBe(true)
    expect(atHitB.rightRayX).toBeCloseTo(atHitB.wallBX, 6)
  })

  it('恒力加速演化（mode 2/3）在经典预测超光速时相对论仍小于 c 且终点精确达标', () => {
    const mid = calcConstantForceAccelState(0.8, 1.0, 3.0)
    expect(mid.tCrossC).toBeCloseTo(3.0, 4)
    expect(mid.classicalBeta).toBeCloseTo(1.0, 4)
    expect(mid.currentBeta).toBeLessThan(1.0)

    const end = calcConstantForceAccelState(0.8, 1.0, 4.0)
    expect(end.currentBeta).toBeCloseTo(0.8, 6)
    expect(end.currentGamma).toBeCloseTo(5 / 3, 5)
    expect(end.classicalBeta).toBeCloseTo(4 / 3, 5)
  })

  it('牛顿力学低速极限与全 4 模式周期/临界点/阶段配置正确', () => {
    const low = calcNewtonianLimitMetrics(0.01)
    expect(low.regime).toBe('classical')
    expect(low.relativeDeviation).toBeLessThan(1e-4)

    expect(getRelativityMaxTime({ mode: 0, beta: 0.6 })).toBe(2.5)
    expect(getRelativityMaxTime({ mode: 1, beta: 0.6 })).toBe(2.0)
    expect(getRelativityMaxTime({ mode: 2, beta: 0.8 })).toBe(4.0)
    expect(getRelativityMaxTime({ mode: 3, beta: 0.8 })).toBe(4.0)

    const c0 = getRelativityCriticalTimes({ beta: 0.6, mode: 0 }, 2.5)
    expect(c0).toHaveLength(2)
    expect(c0[0].autoPause).toBe(true)
    expect(c0[1].autoPause).toBe(true)

    const c1 = getRelativityCriticalTimes({ beta: 0.6, mode: 1 }, 2.0)
    expect(c1).toHaveLength(2)
    expect(c1[0].label).toContain('后壁A')
    expect(c1[1].label).toContain('前壁B')

    const c2 = getRelativityCriticalTimes({ beta: 0.8, mode: 2 }, 4.0)
    expect(c2.some((p) => p.label.includes('经典预测达c'))).toBe(true)

    for (const mode of [0, 1, 2, 3]) {
      expect(getRelativityTimeStages({ beta: 0.6, mode }).length).toBeGreaterThan(0)
    }
  })

  it('恒力相对论加速度比 1/γ³ 与三类图表纯采样函数数值准确', () => {
    expect(calcRelativisticAccelRatio(0)).toBeCloseTo(1, 6)
    expect(calcRelativisticAccelRatio(0.6)).toBeCloseTo(1 / 1.25 ** 3, 6)

    const accelEnd = calcConstantForceAccelState(0.6, 1.0, 4.0)
    expect(accelEnd.accelRatio).toBeCloseTo(calcRelativisticAccelRatio(0.6), 6)

    const vtCurves = sampleConstantForceCurves(0.8, 20)
    expect(vtCurves.classical).toHaveLength(21)
    expect(vtCurves.relativistic).toHaveLength(21)
    expect(vtCurves.relativistic[20].y).toBeCloseTo(0.8, 5)
    expect(vtCurves.classical[20].y).toBeGreaterThan(1.0)
    expect(vtCurves.yMax).toBeGreaterThanOrEqual(1.25)

    const gammaCurve = sampleLorentzCurve(0.95, 24)
    expect(gammaCurve).toHaveLength(25)
    expect(gammaCurve[0].y).toBeCloseTo(1.0, 6)
    expect(gammaCurve[24].y).toBeCloseTo(calcLorentzFactor(0.95), 5)

    const ekCurves = sampleKineticEnergyCurves(2.0, 0.95, 20)
    expect(ekCurves.classical).toHaveLength(21)
    expect(ekCurves.relativistic).toHaveLength(21)
    expect(ekCurves.relativistic[20].y).toBeGreaterThan(ekCurves.classical[20].y)
  })
})
