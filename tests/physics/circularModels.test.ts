import { describe, it, expect } from 'vitest'
import {
  calculateConicalPendulumState,
  calculateDiskRotationState,
  calculateDiskSlippingState,
} from '@/physics/circularModels'

describe('calculateConicalPendulumState', () => {
  it('应在角速度小于临界值时保持不摆起', () => {
    // g=9.8, L=1.0m => minOmega = sqrt(9.8/1) ≈ 3.13 rad/s
    // 设 omega = 2 rad/s < 3.13 rad/s
    const state = calculateConicalPendulumState(2.0, 1.0, 1.0, 9.8)
    expect(state.stable).toBe(false)
    expect(state.thetaRad).toBe(0)
    expect(state.radius).toBe(0)
    expect(state.tension).toBeCloseTo(9.8, 5)
  })

  it('应在角速度大于临界值时计算出正确的摆角与半径', () => {
    // 设 omega = 5 rad/s > 3.13 rad/s
    // cos(theta) = 9.8 / (25 * 1.0) = 0.392
    // thetaRad = acos(0.392) ≈ 1.168 rad (66.92°)
    // radius = 1.0 * sin(theta) = sqrt(1 - 0.392^2) ≈ 0.9199 m
    const state = calculateConicalPendulumState(5.0, 1.0, 1.0, 9.8)
    expect(state.stable).toBe(true)
    expect(state.thetaDeg).toBeCloseTo(66.92, 1)
    expect(state.radius).toBeCloseTo(0.9199, 3)
    expect(state.tension).toBeCloseTo(9.8 / 0.392, 3) // 25N
  })
})

describe('calculateDiskRotationState', () => {
  it('应正确计算圆盘上静摩擦状态', () => {
    // omega = 2, r = 0.8, mu = 0.4, m = 1.0, g = 9.8
    // F_required = m * omega^2 * r = 1 * 4 * 0.8 = 3.2 N
    // F_max = mu * m * g = 0.4 * 1 * 9.8 = 3.92 N
    // 3.2 < 3.92 => 未打滑
    const state = calculateDiskRotationState(2.0, 0.8, 0.4, 1.0, 9.8)
    expect(state.slipping).toBe(false)
    expect(state.requiredForce).toBeCloseTo(3.2, 5)
    expect(state.maxStaticFriction).toBeCloseTo(3.92, 5)
    expect(state.frictionRatio).toBeCloseTo(3.2 / 3.92, 4)
  })

  it('应正确判断打滑状态', () => {
    // omega = 3, r = 0.8, mu = 0.4, m = 1.0, g = 9.8
    // F_required = 1 * 9 * 0.8 = 7.2 N > 3.92 N => 打滑
    const state = calculateDiskRotationState(3.0, 0.8, 0.4, 1.0, 9.8)
    expect(state.slipping).toBe(true)
  })
})

describe('calculateDiskSlippingState', () => {
  it('未打滑时轨迹应为同心圆', () => {
    const state = calculateDiskSlippingState(0.5, 2.0, 0.8, 0.4, 1.0, 2.0, 9.8)
    expect(state.isFlownOut).toBe(false)
    expect(state.radius).toBeCloseTo(0.8, 5)
    expect(state.z).toBe(0)
    expect(state.normalForce).toBe(9.8)
  })

  it('打滑阶段物体应向外滑行', () => {
    // 临界 omega_crit = sqrt(0.4 * 9.8 / 0.8) = 2.213 rad/s
    // 设定 omega = 4 rad/s (打滑)
    const state = calculateDiskSlippingState(0.2, 4.0, 0.8, 0.4, 1.0, 2.0, 9.8)
    expect(state.isFlownOut).toBe(false)
    expect(state.radius).toBeGreaterThan(0.8) // 半径向外增大
    expect(state.z).toBe(0)
  })

  it('超出圆盘后物体应脱离并下落', () => {
    // 飞出后 z 应该小于 0，且支持力和摩擦力为 0
    const state = calculateDiskSlippingState(1.4, 6.0, 0.8, 0.4, 1.0, 2.0, 9.8)
    expect(state.isFlownOut).toBe(true)
    expect(state.z).toBeLessThan(0) // 自由落体下落
    expect(state.normalForce).toBe(0)
    expect(state.friction).toBe(0)
  })
})
