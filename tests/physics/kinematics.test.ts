import { describe, it, expect } from 'vitest'
import {
  calculateAverageVelocity,
  calculateVariableAcceleration,
  calculateSecantSlope,
  calculateTangentSlope,
  calculateInstantaneousVelocity,
} from '@/physics'
import type { VariableMotionModel, VariableMotionParams } from '@/physics'

describe('calculateAverageVelocity', () => {
  it('应正确计算匀速运动的平均速度', () => {
    const result = calculateAverageVelocity(0, 20, 0, 4)
    expect(result.vBar).toBeCloseTo(5, 10)
    expect(result.deltaX).toBe(20)
    expect(result.deltaT).toBe(4)
  })

  it('应正确计算变速运动的平均速度', () => {
    const result = calculateAverageVelocity(0, 30, 0, 5)
    expect(result.vBar).toBeCloseTo(6, 10)
  })

  it('Δt=0 时平均速度应为 0', () => {
    const result = calculateAverageVelocity(5, 10, 3, 3)
    expect(result.vBar).toBe(0)
    expect(result.deltaT).toBe(0)
  })
})

describe('calculateVariableAcceleration', () => {
  describe('force-increasing 模型', () => {
    const params: VariableMotionParams = { k: 2, v0: 0 }

    it('t=0 时 x=0, v=0, a=0', () => {
      const r = calculateVariableAcceleration('force-increasing', params, 0)
      expect(r.x).toBeCloseTo(0, 10)
      expect(r.v).toBeCloseTo(0, 10)
      expect(r.a).toBeCloseTo(0, 10)
    })

    it('t=3, k=2 时 a=k·t=6', () => {
      const r = calculateVariableAcceleration('force-increasing', params, 3)
      expect(r.a).toBeCloseTo(6, 10)
      expect(r.v).toBeCloseTo(9, 10)   // ½·2·9 = 9
      expect(r.x).toBeCloseTo(9, 10)   // 2·27/6 = 9
    })

    it('有初速度 v0 时应叠加', () => {
      const r = calculateVariableAcceleration('force-increasing', { k: 1, v0: 3 }, 2)
      expect(r.v).toBeCloseTo(5, 10)   // 3 + ½·1·4 = 5
      expect(r.x).toBeCloseTo(7.333, 2) // 3·2 + 1·8/6 ≈ 7.333
    })
  })

  describe('shm 模型', () => {
    const params: VariableMotionParams = { A: 5, omega: 2 }

    it('t=0 时 x=0, v=Aω, a=0', () => {
      const r = calculateVariableAcceleration('shm', params, 0)
      expect(r.x).toBeCloseTo(0, 10)
      expect(r.v).toBeCloseTo(10, 10) // Aω = 5·2 = 10
      expect(r.a).toBeCloseTo(0, 10)
    })

    it('t=π/(2ω) 时 x=A, v=0, a=-Aω²', () => {
      const t = Math.PI / (2 * 2) // π/4
      const r = calculateVariableAcceleration('shm', params, t)
      expect(r.x).toBeCloseTo(5, 5)
      expect(r.v).toBeCloseTo(0, 5)
      expect(r.a).toBeCloseTo(-20, 5) // -Aω² = -5·4 = -20
    })

    it('应满足简谐振动的能量守恒 ½mv² + ½mω²x² = ½mA²ω²', () => {
      for (const t of [0, 0.5, 1, 1.5, 2]) {
        const r = calculateVariableAcceleration('shm', params, t)
        const E = 0.5 * r.v * r.v + 0.5 * (params.omega ?? 2) ** 2 * r.x * r.x
        expect(E).toBeCloseTo(0.5 * (params.A ?? 5) ** 2 * (params.omega ?? 2) ** 2, 8)
      }
    })
  })

  describe('multi-stage 模型', () => {
    const params: VariableMotionParams = { v0: 0, a1: 2, vMax: 6, a3: 3, t1: 3, t2Duration: 2, tStop: 2, a5: 3 }

    it('阶段1：正向加速 t=2 时 v=4, x=4', () => {
      const r = calculateVariableAcceleration('multi-stage', params, 2)
      expect(r.v).toBeCloseTo(4, 10)
      expect(r.x).toBeCloseTo(4, 10) // ½·2·4 = 4
      expect(r.a).toBeCloseTo(2, 10)
    })

    it('阶段1末 t=3 时 v=6', () => {
      const r = calculateVariableAcceleration('multi-stage', params, 3)
      expect(r.v).toBeCloseTo(6, 10)
      expect(r.a).toBeCloseTo(2, 10)
    })

    it('阶段2：正向匀速 t=4 时 v=6, a=0', () => {
      const r = calculateVariableAcceleration('multi-stage', params, 4)
      expect(r.v).toBeCloseTo(6, 10)
      expect(r.a).toBeCloseTo(0, 10)
    })

    it('阶段3：正向减速 t=6 时速度递减', () => {
      // t1=3, t2=2, 匀速段结束于 t=5, 减速段从 t>5 开始
      const r5_5 = calculateVariableAcceleration('multi-stage', params, 5.5)
      const r6 = calculateVariableAcceleration('multi-stage', params, 6)
      expect(r5_5.v).toBeGreaterThan(r6.v)
      expect(r5_5.a).toBeLessThan(0)
    })

    it('阶段4：卸货停留 v=0, x 不变', () => {
      // t1=3, t2=2, t3=vMax/a3=6/3=2, 停留从 t=7 开始
      const r7_5 = calculateVariableAcceleration('multi-stage', params, 7.5)
      const r8 = calculateVariableAcceleration('multi-stage', params, 8)
      expect(r7_5.v).toBeCloseTo(0, 10)
      expect(r8.v).toBeCloseTo(0, 10)
      expect(r7_5.x).toBeCloseTo(r8.x, 10)
      expect(r7_5.a).toBeCloseTo(0, 10)
    })

    it('阶段5：快速返回速度为负', () => {
      // 停留结束于 t=9, 返回段从 t>9 开始
      const r10 = calculateVariableAcceleration('multi-stage', params, 10)
      expect(r10.v).toBeLessThan(0)
      expect(r10.a).toBeLessThan(0)
      expect(r10.x).toBeGreaterThan(0) // 还没回到起点
    })

    it('全程结束后回到起点 x=0, v=0', () => {
      // 足够大的时间
      const r = calculateVariableAcceleration('multi-stage', params, 20)
      expect(r.v).toBeCloseTo(0, 10)
      expect(r.x).toBeCloseTo(0, 10)
    })

    it('位移先增后减，路程单调递增', () => {
      const r5 = calculateVariableAcceleration('multi-stage', params, 5)
      const r9 = calculateVariableAcceleration('multi-stage', params, 9)
      const r11 = calculateVariableAcceleration('multi-stage', params, 11)
      // 位移：阶段2 > 阶段4（停留时位移最大）> 阶段5（位移减小）
      expect(r9.x).toBeGreaterThan(r11.x) // 返回段位移减小
    })
  })
})

describe('calculateSecantSlope', () => {
  const params: VariableMotionParams = { A: 5, omega: 2 }

  it('Δt 很大时割线斜率与切线斜率差异明显', () => {
    const secant = calculateSecantSlope('shm', params, 0, 2)
    const tangent = calculateTangentSlope('shm', params, 0)
    expect(Math.abs(secant.slope - tangent)).toBeGreaterThan(0.1)
  })

  it('Δt→0 时割线斜率趋近切线斜率', () => {
    const secant = calculateSecantSlope('shm', params, 1, 0.0001)
    const tangent = calculateTangentSlope('shm', params, 1)
    expect(secant.slope).toBeCloseTo(tangent, 1)
  })

  it('匀速运动时割线斜率恒等于切线斜率', () => {
    // force-increasing with k=0 is uniform motion with v=v0
    const uniformParams: VariableMotionParams = { k: 0, v0: 5 }
    const secant = calculateSecantSlope('force-increasing', uniformParams, 2, 1)
    const tangent = calculateTangentSlope('force-increasing', uniformParams, 2)
    expect(secant.slope).toBeCloseTo(tangent, 10)
    expect(secant.slope).toBeCloseTo(5, 10)
  })
})

describe('calculateTangentSlope', () => {
  it('应等于瞬时速度', () => {
    const params: VariableMotionParams = { k: 1, v0: 0 }
    const tangent = calculateTangentSlope('force-increasing', params, 3)
    const state = calculateVariableAcceleration('force-increasing', params, 3)
    expect(tangent).toBeCloseTo(state.v, 10)
  })
})

describe('calculateInstantaneousVelocity', () => {
  const params: VariableMotionParams = { A: 5, omega: 2 }

  it('Δt→0 时残差趋近于 0', () => {
    const r1 = calculateInstantaneousVelocity('shm', params, 1, 1)
    const r2 = calculateInstantaneousVelocity('shm', params, 1, 0.01)
    const r3 = calculateInstantaneousVelocity('shm', params, 1, 0.001)
    expect(r1.residual).toBeGreaterThan(r2.residual)
    expect(r2.residual).toBeGreaterThan(r3.residual)
    expect(r3.residual).toBeLessThan(0.1)
  })

  it('匀速运动时残差恒为 0', () => {
    const uniformParams: VariableMotionParams = { k: 0, v0: 5 }
    const r = calculateInstantaneousVelocity('force-increasing', uniformParams, 2, 1)
    expect(r.residual).toBeCloseTo(0, 10)
    expect(r.vBar).toBeCloseTo(5, 10)
    expect(r.vInst).toBeCloseTo(5, 10)
  })
})
