import { describe, it, expect } from 'vitest'
import {
  precomputeConstantKETrajectory,
  precomputeCurvedTrackTrajectory,
  getKEStateAtTime,
} from '@/physics/kineticEnergy'

describe('precomputeConstantKETrajectory', () => {
  it('匀加速到目标位移后匀速', () => {
    const { points, t_c, v_c } = precomputeConstantKETrajectory(1, 0, 10, 5, 10, 0.02)
    expect(t_c).toBeGreaterThan(0)
    expect(v_c).toBeGreaterThan(0)
    const last = points[points.length - 1]
    expect(last.x).toBeGreaterThanOrEqual(10)
    expect(last.v).toBeCloseTo(v_c, 5)
  })

  it('v0 > 0 时 t_c 用匀速公式', () => {
    const { t_c, v_c } = precomputeConstantKETrajectory(1, 5, 0, 5, 15, 0.02)
    expect(t_c).toBeCloseTo(1, 1)
    expect(v_c).toBeCloseTo(5, 5)
  })

  it('a_const=0 且 v0=0 时速度恒零', () => {
    const { v_c, points } = precomputeConstantKETrajectory(1, 0, 0, 5, 10, 0.02)
    expect(v_c).toBe(0)
    expect(points[0].v).toBe(0)
    expect(points[0].F).toBe(0)
  })
})

describe('precomputeCurvedTrackTrajectory', () => {
  it('mu=0 时球滑到底部速度 > 0', () => {
    const result = precomputeCurvedTrackTrajectory(1, 0, 5, 0, 10, 0.02)
    expect(result.v_c).toBeGreaterThan(0)
    expect(result.t_c).toBeGreaterThan(0)
  })

  it('mu=0 时能量守恒：mgh = 0.5mv²（v0=0）', () => {
    const m = 1
    const R = 5
    const g = 9.8
    const result = precomputeCurvedTrackTrajectory(m, 0, R, 0, 10, 0.02)
    const expectedV = Math.sqrt(2 * g * R)
    expect(result.v_c).toBeCloseTo(expectedV, 0)
  })

  it('mu > 0 时摩擦做负功，v_c < mu=0 的值', () => {
    const withFriction = precomputeCurvedTrackTrajectory(1, 0, 5, 0.15, 10, 0.02)
    const noFriction = precomputeCurvedTrackTrajectory(1, 0, 5, 0, 10, 0.02)
    expect(withFriction.v_c).toBeLessThan(noFriction.v_c)
  })

  it('v0 > 0 时初动能叠加', () => {
    const v0 = 3
    const R = 5
    const m = 1
    const g = 9.8
    const result = precomputeCurvedTrackTrajectory(m, v0, R, 0, 10, 0.02)
    const expectedV = Math.sqrt(v0 * v0 + 2 * g * R)
    expect(result.v_c).toBeCloseTo(expectedV, 0)
  })

  it('水平段匀速：x 随时间线性增长', () => {
    const result = precomputeCurvedTrackTrajectory(1, 0, 5, 0, 15, 0.02)
    const phase1Points = result.points.filter(p => p.phase === 1)
    expect(phase1Points.length).toBeGreaterThan(5)
    const dx1 = phase1Points[1].x - phase1Points[0].x
    const dx2 = phase1Points[phase1Points.length - 1].x - phase1Points[phase1Points.length - 2].x
    expect(dx1).toBeCloseTo(dx2, 5)
  })

  it('h_max 始终等于 R', () => {
    const result = precomputeCurvedTrackTrajectory(1, 2, 5, 0.1, 10, 0.02)
    expect(result.h_max).toBe(5)
  })
})

describe('getKEStateAtTime', () => {
  it('空数组返回默认状态', () => {
    const state = getKEStateAtTime([], 5)
    expect(state.v).toBe(0)
    expect(state.x).toBe(0)
  })

  it('t 超出范围返回首/末状态', () => {
    const { points } = precomputeConstantKETrajectory(1, 0, 10, 5, 10, 0.1)
    const first = getKEStateAtTime(points, -1)
    const last = getKEStateAtTime(points, 100)
    expect(first.v).toBeCloseTo(points[0].v, 5)
    expect(last.v).toBeCloseTo(points[points.length - 1].v, 5)
  })

  it('线性插值精度：中间时刻的值在相邻两点之间', () => {
    const { points } = precomputeConstantKETrajectory(1, 0, 10, 5, 10, 0.02)
    const mid = getKEStateAtTime(points, 0.5)
    expect(mid.v).toBeGreaterThanOrEqual(0)
    expect(mid.x).toBeGreaterThanOrEqual(0)
    expect(mid.Ek).toBeGreaterThanOrEqual(0)
  })
})
