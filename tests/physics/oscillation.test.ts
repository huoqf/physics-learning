import { describe, it, expect } from 'vitest'
import {
  computeAngularFrequency,
  computeSHMState,
  computeSHMEnergy,
  computeRealPendulumPeriod,
  generateRealPendulumTrajectory,
  getPendulumStateFromTrajectory,
} from '@/physics/oscillation'

describe('computeAngularFrequency', () => {
  it('ω = 2π / T', () => {
    expect(computeAngularFrequency(2)).toBeCloseTo(Math.PI, 9)
    expect(computeAngularFrequency(1)).toBeCloseTo(2 * Math.PI, 9)
  })
  it('非正周期返回 0', () => {
    expect(computeAngularFrequency(0)).toBe(0)
    expect(computeAngularFrequency(-1)).toBe(0)
  })
})

describe('computeSHMState', () => {
  const A = 0.06
  const omega = Math.PI // T = 2s

  it('相位 0：x=A, v=0, a=-Aω²', () => {
    const s = computeSHMState(A, omega, 0)
    expect(s.displacement).toBeCloseTo(A, 9)
    expect(s.velocity).toBeCloseTo(0, 9)
    expect(s.acceleration).toBeCloseTo(-A * omega * omega, 9)
  })

  it('相位 π/2：x=0, v=-Aω, a=0', () => {
    const s = computeSHMState(A, omega, Math.PI / 2)
    expect(s.displacement).toBeCloseTo(0, 9)
    expect(s.velocity).toBeCloseTo(-A * omega, 9)
    expect(s.acceleration).toBeCloseTo(0, 9)
  })

  it('加速度满足 a = -ω²·x', () => {
    const s = computeSHMState(A, omega, 1.2)
    expect(s.acceleration).toBeCloseTo(-omega * omega * s.displacement, 9)
  })
})

describe('computeSHMEnergy', () => {
  const m = 1.0
  const A = 0.06
  const omega = Math.PI

  it('总机械能 E = ½ m ω² A²', () => {
    const e = computeSHMEnergy(m, A, omega, 0.03)
    expect(e.total).toBeCloseTo(0.5 * m * omega * omega * A * A, 9)
  })

  it('平衡位置：动能最大、势能为 0', () => {
    const e = computeSHMEnergy(m, A, omega, 0)
    expect(e.potential).toBeCloseTo(0, 9)
    expect(e.kinetic).toBeCloseTo(e.total, 9)
  })

  it('最大位移处：势能最大、动能为 0', () => {
    const e = computeSHMEnergy(m, A, omega, A)
    expect(e.kinetic).toBeCloseTo(0, 9)
    expect(e.potential).toBeCloseTo(e.total, 9)
  })

  it('能量守恒：K + U = E', () => {
    const e = computeSHMEnergy(m, A, omega, 0.02)
    expect(e.kinetic + e.potential).toBeCloseTo(e.total, 9)
  })
})

describe('大角单摆非线性运动计算', () => {
  const L = 1.0
  const g = 9.8
  const T0 = 2 * Math.PI * Math.sqrt(L / g)

  it('大角周期随最大摆角增大而非线性变长', () => {
    const T_small = computeRealPendulumPeriod(L, g, 2)
    const T_large = computeRealPendulumPeriod(L, g, 60)

    // 极小摆角下真实周期极其接近简谐周期 T0（允许 0.1% 误差）
    expect(T_small).toBeCloseTo(T0, 2)
    // 60度下真实周期明显变长 (偏差约 7.3%)
    expect(T_large).toBeGreaterThan(T0 * 1.07)
    expect(T_large).toBeLessThan(T0 * 1.08)
  })

  it('预计算轨迹表首尾闭合且单调变动', () => {
    const traj = generateRealPendulumTrajectory(L, g, 45, 100)
    expect(traj.length).toBe(101)
    
    const th0Rad = (45 * Math.PI) / 180
    // 初始位置为最大摆角且静止释放
    expect(traj[0].angle).toBeCloseTo(th0Rad, 9)
    expect(traj[0].angularVelocity).toBeCloseTo(0, 9)
    
    // 最后一个点与初始点完全重合以实现完美周期闭合
    expect(traj[100].angle).toBeCloseTo(th0Rad, 9)
    expect(traj[100].angularVelocity).toBeCloseTo(0, 9)
  })

  it('轨迹线性插值能获取正确状态', () => {
    const T_real = computeRealPendulumPeriod(L, g, 30)
    const omegaReal = computeAngularFrequency(T_real)
    const traj = generateRealPendulumTrajectory(L, g, 30, 200)

    // t=0, phi=0 时，摆角应为最大值 30°
    const st0 = getPendulumStateFromTrajectory(traj, T_real, 0, 0, omegaReal)
    expect(st0.angle).toBeCloseTo((30 * Math.PI) / 180, 5)
    expect(st0.angularVelocity).toBeCloseTo(0, 5)

    // 在半个周期 T_real / 2 处，摆球摆至另一侧最大值 -30°
    const stHalf = getPendulumStateFromTrajectory(traj, T_real, T_real / 2, 0, omegaReal)
    expect(stHalf.angle).toBeCloseTo((-30 * Math.PI) / 180, 3)
    expect(stHalf.angularVelocity).toBeCloseTo(0, 3)
  })
})

