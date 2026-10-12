import { describe, it, expect } from 'vitest'
import {
  computeMomentumExperiment,
  computeTrackSlidersAtTime,
  MOMENTUM_EXP_DEFAULTS,
} from '../experimentMomentum'

describe('高考实验：验证动量守恒定律 (experimentMomentum)', () => {
  it('默认弹性碰撞模式下动量与机械能严格守恒', () => {
    const res = computeMomentumExperiment({
      m1: 0.4,
      m2: 0.2,
      v1: 0.8,
      v2: 0.0,
      plateWidth_mm: 20.0,
      collisionType: 0,
    })

    // 碰前总动量 p_前 = 0.4 * 0.8 = 0.32 kg·m/s
    expect(res.p_total_before).toBeCloseTo(0.32, 5)
    // 碰后总动量与碰前相等，误差为 0
    expect(res.p_total_after).toBeCloseTo(0.32, 5)
    expect(res.momentumErrorPercent).toBeCloseTo(0, 5)

    // 弹性碰撞机械能无损失
    expect(res.Ek_loss).toBeCloseTo(0, 5)
    expect(res.Ek_after).toBeCloseTo(res.Ek_before, 5)

    // 挡光片测速：Δt = 0.02 / 0.8 = 0.025 s
    expect(res.dt1_before).toBeCloseTo(0.025, 4)

    // 质量比 2:1 弹性碰撞后速度分析
    // v1' = (0.4 - 0.2) / 0.6 * 0.8 = 0.2667 m/s
    // v2' = 2 * 0.4 / 0.6 * 0.8 = 1.0667 m/s
    expect(res.v1_after).toBeCloseTo(0.8 / 3, 4)
    expect(res.v2_after).toBeCloseTo(3.2 / 3, 4)
    expect(res.isRebounded).toBe(0)
  })

  it('完全非弹性碰撞模式下动量守恒但机械能损失最大', () => {
    const res = computeMomentumExperiment({
      m1: 0.3,
      m2: 0.3,
      v1: 1.0,
      v2: 0.0,
      plateWidth_mm: 20.0,
      collisionType: 1, // 粘合
    })

    // 碰前动量与碰后动量严格守恒
    expect(res.p_total_before).toBeCloseTo(0.3, 5)
    expect(res.p_total_after).toBeCloseTo(0.3, 5)
    expect(res.momentumErrorPercent).toBeCloseTo(0, 5)

    // 碰后共同速度 v' = 0.3 / 0.6 = 0.5 m/s
    expect(res.v1_after).toBeCloseTo(0.5, 4)
    expect(res.v2_after).toBeCloseTo(0.5, 4)

    // 碰前动能 Ek = 0.5 * 0.3 * 1 = 0.15 J
    // 碰后动能 Ek' = 0.5 * 0.6 * 0.25 = 0.075 J (损失恰好 50%)
    expect(res.Ek_loss).toBeCloseTo(0.075, 5)
    expect(res.Ek_lossPercent).toBeCloseTo(50.0, 3)
  })

  it('m1 < m2 弹性碰撞触发反弹，正确处理负速度与负动量矢量性', () => {
    const res = computeMomentumExperiment({
      m1: 0.2,
      m2: 0.6,
      v1: 1.0,
      v2: 0.0,
      plateWidth_mm: 20.0,
      collisionType: 0,
    })

    // v1' = (0.2 - 0.6) / 0.8 * 1.0 = -0.5 m/s (反弹向左)
    // v2' = 2 * 0.2 / 0.8 * 1.0 = 0.5 m/s
    expect(res.v1_after).toBeCloseTo(-0.5, 4)
    expect(res.v2_after).toBeCloseTo(0.5, 4)
    expect(res.isRebounded).toBe(1)

    // p1' = 0.2 * (-0.5) = -0.1 kg·m/s (负动量！)
    // p2' = 0.6 * 0.5 = 0.3 kg·m/s
    // p_total' = -0.1 + 0.3 = 0.2 kg·m/s = p_before
    expect(res.p1_after).toBeCloseTo(-0.1, 5)
    expect(res.p2_after).toBeCloseTo(0.3, 5)
    expect(res.p_total_after).toBeCloseTo(0.2, 5)

    // 反弹回穿光电门 1 挡光时间: Δt1' = 0.02 / 0.5 = 0.04 s
    expect(res.dt1_after).toBeCloseTo(0.04, 4)
  })

  it('动态运动状态计算函数在碰前、碰撞中和碰后表现平滑连续', () => {
    const res = computeMomentumExperiment(MOMENTUM_EXP_DEFAULTS)

    // 1. 初始时刻
    const at0 = computeTrackSlidersAtTime(0, res)
    expect(at0.x1).toBeCloseTo(res.slider1InitPos, 4)
    expect(at0.v1).toBe(res.v1)
    expect(at0.v2).toBe(0)
    expect(at0.gate1Active).toBe(false)

    // 2. 穿过光电门 1 时刻
    const tMidGate1 = (res.t_gate1_enter + res.t_gate1_leave) / 2
    const atGate1 = computeTrackSlidersAtTime(tMidGate1, res)
    expect(atGate1.gate1Active).toBe(true)

    // 3. 碰后两滑块继续分离（在撞上右端挡块前稳定滑行）
    const atAfter = computeTrackSlidersAtTime(res.t_collision + 0.2, res)
    expect(atAfter.v1).toBeCloseTo(res.v1_after, 4)
    expect(atAfter.v2).toBeCloseTo(res.v2_after, 4)
    expect(atAfter.x2).toBeGreaterThan(res.slider2InitPos)

    // 4. 极端时间到达导轨两端缓冲挡块平稳停止限位
    const atFarFuture = computeTrackSlidersAtTime(10.0, res)
    expect(atFarFuture.x2).toBeLessThanOrEqual(res.trackLength - res.sliderLength)
    expect(atFarFuture.v2).toBe(0)
  })

  it('反弹模式下光电门 1 正确记录碰前与反弹双挡光时间', () => {
    const res = computeMomentumExperiment({
      m1: 0.2,
      m2: 0.6,
      v1: 1.0,
      v2: 0.0,
      plateWidth_mm: 20.0,
      collisionType: 0,
    })

    // 碰前通过门 1 之后
    const atAfterG1 = computeTrackSlidersAtTime(res.t_gate1_leave + 0.05, res)
    expect(atAfterG1.gate1BeforeTime).toBeCloseTo(res.dt1_before, 4)
    expect(atAfterG1.gate1ReboundTime).toBe(0)

    // 碰撞并反弹回穿门 1 之后
    const atAfterRebound = computeTrackSlidersAtTime(res.t_gate1_rebound_leave + 0.05, res)
    expect(atAfterRebound.gate1BeforeTime).toBeCloseTo(res.dt1_before, 4)
    expect(atAfterRebound.gate1ReboundTime).toBeCloseTo(res.dt1_after, 4)
    expect(atAfterRebound.gate1DisplayTime).toBeCloseTo(res.dt1_after, 4)
  })
})
