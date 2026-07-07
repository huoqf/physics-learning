import { describe, it, expect } from 'vitest'
import { computeDualRodsStateAtTime, calculateDualRodsTheoretical, stepDualRodsRK4 } from '@/physics'

describe('双杆电磁感应模型物理层测试', () => {
  it('自由双杆模式：任意时刻系统动量必须严格守恒', () => {
    const mA = 0.2
    const mB = 0.4
    const v0 = 6.0
    const B = 1.0
    const L = 0.5
    const R = 1.0

    const initialMomentum = mA * v0

    for (const t of [0, 0.5, 1.0, 3.0, 10.0]) {
      const state = computeDualRodsStateAtTime(t, 0, v0, 0, B, L, R, mA, mB)
      expect(state.totalMomentum).toBeCloseTo(initialMomentum, 9)
    }
  })

  it('自由双杆模式：时间无限长时，两棒最终收敛相交于理论共同速度', () => {
    const mA = 0.2
    const mB = 0.4
    const v0 = 6.0
    const B = 1.5
    const L = 1.0
    const R = 1.0

    const theo = calculateDualRodsTheoretical(0, v0, 0, B, L, R, mA, mB)
    const stateAtLongTime = computeDualRodsStateAtTime(20.0, 0, v0, 0, B, L, R, mA, mB)

    expect(stateAtLongTime.vA).toBeCloseTo(theo.vCommon!, 5)
    expect(stateAtLongTime.vB).toBeCloseTo(theo.vCommon!, 5)
    expect(stateAtLongTime.deltaV).toBeCloseTo(0, 5)
  })

  it('恒力驱动模式：时间无限长时，两棒稳定等加速，具有恒定速度差', () => {
    const mA = 0.3
    const mB = 0.6
    const F_ext = 3.6
    const B = 1.2
    const L = 0.5
    const R = 1.5

    const theo = calculateDualRodsTheoretical(1, 0, F_ext, B, L, R, mA, mB)
    const stateAtLongTime = computeDualRodsStateAtTime(25.0, 1, 0, F_ext, B, L, R, mA, mB)

    expect(stateAtLongTime.aA).toBeCloseTo(theo.aCommon, 5)
    expect(stateAtLongTime.aB).toBeCloseTo(theo.aCommon, 5)
    expect(stateAtLongTime.deltaV).toBeCloseTo(theo.deltaV, 5)
  })

  it('RK4 阶梯步进求解与解析解高度吻合且保持动量守恒', () => {
    const mA = 0.2
    const mB = 0.4
    const v0 = 5.0
    const B = 1.0
    const L = 0.5
    const R = 1.0
    const dt = 0.01

    let state = {
      xA: 0, xB: 0, vA: v0, vB: 0,
      emf: B * L * v0, currentI: (B * L * v0) / R, forceAmpere: B * ((B * L * v0) / R) * L,
      totalMomentum: mA * v0, kineticEnergy: 0.5 * mA * v0 * v0
    }

    for (let i = 0; i < 100; i++) {
      state = stepDualRodsRK4(state, 0, B, L, R, mA, mB, dt)
    }

    expect(state.totalMomentum).toBeCloseTo(mA * v0, 9)
    const analytical = computeDualRodsStateAtTime(1.0, 0, v0, 0, B, L, R, mA, mB)
    expect(state.vA).toBeCloseTo(analytical.vA, 3)
    expect(state.vB).toBeCloseTo(analytical.vB, 3)
  })
})
