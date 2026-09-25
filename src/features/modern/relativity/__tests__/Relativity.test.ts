import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRelativityPhysics } from '../hooks/useRelativityPhysics'

describe('相对论 Hook 与状态计算集成测试', () => {
  it('正确计算洛伦兹因子与尺缩时延', () => {
    const { result } = renderHook(() =>
      useRelativityPhysics({
        beta: 0.8,
        m0: 1.0,
        time: 2.0,
        mode: 0,
        showGeometry: true,
      }),
    )

    // beta = 0.8 => gamma = 1.66667
    expect(result.current.beta).toBe(0.8)
    expect(result.current.gamma).toBeCloseTo(5 / 3, 4)

    // 固有长度 shipL0 = 180，动长 shipL = 180 / (5/3) = 108
    expect(result.current.shipL).toBeCloseTo(108, 2)

    // 勾股定理三角形高度与底边
    expect(result.current.triangleH).toBe(140)
    // base = H * beta * gamma = 140 * 0.8 * (5/3) = 186.6667
    expect(result.current.triangleBase).toBeCloseTo(186.6667, 3)

    // 地面时钟与飞船时钟转角
    // 地面时钟：time=2.0 => 2.0 * 60 = 120 度
    expect(result.current.groundClockAngle).toBeCloseTo(120, 2)
    // 飞船动钟变慢：time / gamma = 2.0 / (5/3) = 1.2 => 1.2 * 60 = 72 度
    expect(result.current.shipClockAngle).toBeCloseTo(72, 2)
  })

  it('边界保护：低速与极高速', () => {
    const { result: lowResult } = renderHook(() =>
      useRelativityPhysics({
        beta: 0.05,
        m0: 1.0,
        time: 1.0,
        mode: 0,
        showGeometry: false,
      }),
    )
    expect(lowResult.current.gamma).toBeCloseTo(1.00125, 4)

    const { result: highResult } = renderHook(() =>
      useRelativityPhysics({
        beta: 0.999, // 会被 clamp 到 0.95
        m0: 1.0,
        time: 1.0,
        mode: 1,
        showGeometry: true,
      }),
    )
    expect(highResult.current.beta).toBe(0.95)
    expect(highResult.current.gamma).toBeCloseTo(3.20256, 3)
  })
})
