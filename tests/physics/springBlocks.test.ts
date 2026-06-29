import { describe, it, expect } from 'vitest'
import { precomputeSpringBlocks } from '../../src/physics/momentumApplication/springBlocks'

describe('弹簧双滑块物理模型单元测试', () => {
  it('非固连模式 (connectionMode=0) - 等质量碰撞应发生速度交换', () => {
    const mA = 2
    const mB = 2
    const v0 = 4
    const k = 20
    const L0 = 1.5
    const xB0 = 3.5
    const duration = 5.0
    const dt = 0.002

    const states = precomputeSpringBlocks(mA, mB, v0, k, L0, xB0, duration, dt, 0)
    
    // 验证初始状态
    expect(states[0].vA).toBeCloseTo(v0, 4)
    expect(states[0].vB).toBeCloseTo(0, 4)
    
    // 获取碰撞后的末态（t = 4.5s 时，应该早已分离）
    const finalState = states.find(s => s.t > 4.5)
    expect(finalState).toBeDefined()
    if (finalState) {
      // 等质量弹性碰撞，非固连分离后发生速度交换：A 速度接近 0，B 速度接近 v0
      expect(finalState.vA).toBeCloseTo(0, 2)
      expect(finalState.vB).toBeCloseTo(v0, 2)
      
      // 验证分离后形变量 delta 恒为 0
      expect(finalState.delta).toBe(0)
    }

    // 验证整个过程中的动量守恒
    states.forEach(s => {
      const p = mA * s.vA + mB * s.vB
      expect(p).toBeCloseTo(mA * v0, 3)
    })
  })

  it('固连模式 (connectionMode=1) - 验证简谐振动与能量动量守恒', () => {
    const mA = 2
    const mB = 3
    const v0 = 5
    const k = 25
    const L0 = 1.5
    const xB0 = 3.5
    const duration = 5.0
    const dt = 0.002

    const states = precomputeSpringBlocks(mA, mB, v0, k, L0, xB0, duration, dt, 1)

    // 1. 验证整个过程中动量严格守恒
    states.forEach(s => {
      const p = mA * s.vA + mB * s.vB
      expect(p).toBeCloseTo(mA * v0, 3)
    })

    // 2. 验证整个过程中总能量严格守恒
    const initialEnergy = 0.5 * mA * v0 * v0
    states.forEach(s => {
      expect(s.Etotal).toBeCloseTo(initialEnergy, 3)
    })

    // 3. 验证存在拉伸状态 (delta < 0)
    const stretchStates = states.filter(s => s.delta < -0.01)
    expect(stretchStates.length).toBeGreaterThan(0)

    // 4. 验证拉伸最长时（delta 极小值）的速度符合共速速度
    const minDeltaState = states.reduce((min, s) => s.delta < min.delta ? s : min, states[0])
    const vCommon = (mA * v0) / (mA + mB)
    expect(minDeltaState.vA).toBeCloseTo(vCommon, 1)
    expect(minDeltaState.vB).toBeCloseTo(vCommon, 1)
  })
})
