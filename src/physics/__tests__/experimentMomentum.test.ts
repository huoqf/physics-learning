import { describe, it, expect } from 'vitest'
import {
  computeMomentumExperiment,
  computeMomentumExperimentDuration,
  computeTrackSlidersAtTime,
  experimentDurationFromResult,
  momentumExperimentInputFromParams,
  MOMENTUM_EXP_DEFAULTS,
  MOMENTUM_EXP_DURATION_BOUNDS,
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

    // 4. 极端时间到达导轨两端缓冲挡块平稳停止限位（P1-A 双滑块刚体追及停靠）
    const at5s = computeTrackSlidersAtTime(5.0, res)
    expect(at5s.x1).toBeCloseTo(res.trackLength - 2 * res.sliderLength, 4) // 0.96m
    expect(at5s.x2).toBeCloseTo(res.trackLength - res.sliderLength, 4) // 1.08m
    expect(at5s.v1).toBe(0)
    expect(at5s.v2).toBe(0)
    expect(at5s.x1 + res.sliderLength).toBeLessThanOrEqual(at5s.x2 + 1e-5)

    const atFarFuture = computeTrackSlidersAtTime(10.0, res)
    expect(atFarFuture.x1).toBeCloseTo(res.trackLength - 2 * res.sliderLength, 4)
    expect(atFarFuture.x2).toBeCloseTo(res.trackLength - res.sliderLength, 4)
    expect(atFarFuture.v1).toBe(0)
    expect(atFarFuture.v2).toBe(0)
  })

  it('同向碰撞后滑块 1 穿过光电门 2 时光电门 2 正确激活响应并记录各自读数 (P1-B 完整闭环)', () => {
    const res = computeMomentumExperiment({
      m1: 0.4,
      m2: 0.2,
      v1: 0.8,
      v2: 0.0,
      plateWidth_mm: 20.0,
      collisionType: 0,
    })

    // 1. 滑块 2 穿门 2 期间 (t≈0.67s)：门 2 亮起，表头显示滑块 2 读数 (0.01875s)
    const tMidGate2S2 = (res.t_gate2_enter + res.t_gate2_leave) / 2
    const atGate2S2 = computeTrackSlidersAtTime(tMidGate2S2, res)
    expect(atGate2S2.gate2Active).toBe(true)
    expect(atGate2S2.gate2S2Time).toBeGreaterThan(0)
    expect(atGate2S2.gate2S1Time).toBe(0) // 滑块 1 尚未到达门 2
    expect(atGate2S2.gate2DisplayTime).toBeCloseTo(atGate2S2.gate2S2Time, 4)

    // 2. 滑块 1 同向穿门 2 期间 (t≈1.71s)：门 2 亮起，表头准确切换为滑块 1 读数 (约 0.075s，非滑块 2 的 0.0187s)
    expect(res.t_gate2_s1_enter).toBeLessThan(Infinity)
    const tMidGate2S1 = (res.t_gate2_s1_enter + res.t_gate2_s1_leave) / 2
    const atGate2S1 = computeTrackSlidersAtTime(tMidGate2S1, res)
    expect(atGate2S1.gate2Active).toBe(true)
    expect(atGate2S1.gate2S2Time).toBeCloseTo(res.dt2_after_measured, 4) // 保留滑块 2 历史读数
    expect(atGate2S1.gate2S1Time).toBeGreaterThan(0) // 动态记录滑块 1 读数
    // 关键校验：正在穿门的表头必须反映滑块 1 的挡光时间，绝对不能锁定为滑块 2 的旧读数
    expect(atGate2S1.gate2DisplayTime).toBeGreaterThan(res.dt2_after_measured)

    // 3. 滑块 1 穿门 2 离开后：门 2 双滑块读数均锁定留存，供学生核算对比
    const atAfterGate2S1 = computeTrackSlidersAtTime(res.t_gate2_s1_leave + 0.1, res)
    expect(atAfterGate2S1.gate2Active).toBe(false)
    expect(atAfterGate2S1.gate2S2Time).toBeCloseTo(res.dt2_after_measured, 4)
    expect(atAfterGate2S1.gate2S1Time).toBeCloseTo(res.dt1_after_measured, 4)
    expect(atAfterGate2S1.gate2DisplayTime).toBeCloseTo(res.dt1_after_measured, 4)
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
    expect(atAfterG1.gate1BeforeTime).toBeCloseTo(res.dt1_before_measured, 4)
    expect(atAfterG1.gate1ReboundTime).toBe(0)

    // 碰撞并反弹回穿门 1 之后
    const atAfterRebound = computeTrackSlidersAtTime(res.t_gate1_rebound_leave + 0.05, res)
    expect(atAfterRebound.gate1BeforeTime).toBeCloseTo(res.dt1_before_measured, 4)
    expect(atAfterRebound.gate1ReboundTime).toBeCloseTo(res.dt1_after_measured, 4)
    expect(atAfterRebound.gate1DisplayTime).toBeCloseTo(res.dt1_after_measured, 4)

    // 最终两滑块分别停靠于导轨左右两端
    const atFinal = computeTrackSlidersAtTime(5.0, res)
    expect(atFinal.x1).toBeCloseTo(0.0, 4) // 左挡块
    expect(atFinal.x2).toBeCloseTo(res.trackLength - res.sliderLength, 4) // 右挡块 1.08m
    expect(atFinal.v1).toBe(0)
    expect(atFinal.v2).toBe(0)
  })

  it('光电门测速误差闭环：由实测时间反算速度与真实动量守恒相对偏差 (P1-C)', () => {
    // 1. 无误差基准：偏差严格为 0
    const resZeroErr = computeMomentumExperiment({
      m1: 0.4,
      m2: 0.2,
      v1: 0.8,
      v2: 0.0,
      timing_err: 0.0,
    })
    expect(resZeroErr.momentumErrorPercent).toBe(0)
    expect(resZeroErr.v1_measured).toBeCloseTo(0.8, 5)

    // 2. 引入 +0.5ms 光电门 2 计时误差：门 2 测速发生系统偏移，动量守恒产生真实相对偏差
    const resWithErr = computeMomentumExperiment({
      m1: 0.4,
      m2: 0.2,
      v1: 0.8,
      v2: 0.0,
      timing_err: 0.5, // +0.5ms
    })
    // 碰前门 1 作为基准测速门：dt1 = 0.025s, v1_测 = 0.8 m/s
    expect(resWithErr.dt1_before_measured).toBeCloseTo(0.025, 4)
    expect(resWithErr.v1_measured).toBeCloseTo(0.8, 5)

    // 碰后门 2 存在 +0.5ms 计时偏差：
    // 理论 dt2 = 0.02 / 1.0667 = 0.01875s
    // 实测 dt2_测 = 0.01875 + 0.0005 = 0.01925s
    expect(resWithErr.dt2_after_measured).toBeCloseTo(0.01925, 5)
    // 倒算实测速度 v2'_测 偏小
    expect(resWithErr.v2_after_measured).toBeLessThan(resWithErr.v2_after)
    // 动量守恒相对偏差显著非零（约 -1.95%），真实反映实验误差
    expect(resWithErr.momentumErrorPercent).not.toBe(0)
    expect(Math.abs(resWithErr.momentumErrorPercent)).toBeGreaterThan(0.5)
  })

  it('完全非弹性粘合碰撞下光电门 2 表头读数稳定锁定共速时间，滑块 1 紧随穿门时不发生跳闪重置', () => {
    const res = computeMomentumExperiment({
      m1: 0.3,
      m2: 0.3,
      v1: 1.0,
      v2: 0.0,
      plateWidth_mm: 20.0,
      collisionType: 1, // 粘合
    })

    // 滑块 2 穿过门 2 离开后
    const tAfterGate2S2 = res.t_gate2_leave + 0.02
    const atAfterS2 = computeTrackSlidersAtTime(tAfterGate2S2, res)
    expect(atAfterS2.gate2DisplayTime).toBeCloseTo(res.dt2_after_measured, 4)

    // 滑块 1 紧随其后穿过门 2 期间
    const tMidGate2S1 = (res.t_gate2_s1_enter + res.t_gate2_s1_leave) / 2
    const atMidS1 = computeTrackSlidersAtTime(tMidGate2S1, res)
    expect(atMidS1.gate2Active).toBe(true)
    // 表头读数稳定保持粘合共速，绝不回退归零或跳闪
    expect(atMidS1.gate2DisplayTime).toBeCloseTo(res.dt2_after_measured, 4)
  })

  it('左屏参数 → 物理输入映射唯一：键名、默认值与 v₂≡0 均由 SSOT 决定', () => {
    // 1. 空参数回落到物理层默认常量
    expect(momentumExperimentInputFromParams()).toEqual({
      m1: MOMENTUM_EXP_DEFAULTS.m1,
      m2: MOMENTUM_EXP_DEFAULTS.m2,
      v1: MOMENTUM_EXP_DEFAULTS.v1,
      v2: MOMENTUM_EXP_DEFAULTS.v2,
      plateWidth_mm: MOMENTUM_EXP_DEFAULTS.plateWidth_mm,
      collisionType: MOMENTUM_EXP_DEFAULTS.collisionType,
      timing_err: MOMENTUM_EXP_DEFAULTS.timing_err,
    })

    // 2. 高考实验模式目标滑块碰前静止：v₂ 恒为 0（与输入的 m2_exp 无关）
    const mapped = momentumExperimentInputFromParams({
      m1_exp: 0.7,
      m2_exp: 0.35,
      v1_exp: 1.2,
      plateWidth_mm: 12,
      collisionType_exp: 1,
      timing_err: -0.4,
    })
    expect(mapped).toEqual({
      m1: 0.7,
      m2: 0.35,
      v1: 1.2,
      v2: 0,
      plateWidth_mm: 12,
      collisionType: 1,
      timing_err: -0.4,
    })

    // 3. 非 1 的 collisionType_exp 一律归零（弹性），与 computeMomentumExperiment 内部规整一致
    expect(momentumExperimentInputFromParams({ collisionType_exp: 7 }).collisionType).toBe(0)
  })

  it('实验时长 (SSOT) 覆盖末次挡光事件并钳制在 [5, 30] s', () => {
    const { min, max } = MOMENTUM_EXP_DURATION_BOUNDS

    // 1. 默认档：末次挡光为滑块 1 同向穿门 2（1.75s）→ ceil(3.25) = 4，被下限抬到 5
    expect(computeMomentumExperimentDuration(momentumExperimentInputFromParams({}))).toBe(5)

    // 2. 慢速档 v₁=0.2：滑块 1 穿门 2 结束于 7.00s → ceil(8.5) = 9（不能被误判为 5）
    const slow = computeMomentumExperimentDuration(
      momentumExperimentInputFromParams({ m1_exp: 0.4, m2_exp: 0.2, v1_exp: 0.2 }),
    )
    expect(slow).toBe(9)

    // 3. 极端慢速档：被上限 30 钳制
    const extreme = computeMomentumExperimentDuration(
      momentumExperimentInputFromParams({ m1_exp: 0.9, m2_exp: 0.8, v1_exp: 0.2 }),
    )
    expect(extreme).toBe(max)

    // 4. 高速档：末次挡光很早，被下限 5 抬升
    const fast = computeMomentumExperimentDuration(
      momentumExperimentInputFromParams({ m1_exp: 0.4, m2_exp: 0.2, v1_exp: 2.0 }),
    )
    expect(fast).toBe(min)

    // 5. 时长必须晚于所有光电门事件的离开时刻，否则末次挡光演示不可达
    for (const input of [
      { m1_exp: 0.4, m2_exp: 0.2, v1_exp: 0.8 },
      { m1_exp: 0.4, m2_exp: 0.2, v1_exp: 0.2 },
      { m1_exp: 0.3, m2_exp: 0.3, v1_exp: 0.9, collisionType_exp: 1 },
      { m1_exp: 0.2, m2_exp: 0.6, v1_exp: 0.8 },
    ]) {
      const physicsInput = momentumExperimentInputFromParams(input)
      const res = computeMomentumExperiment(physicsInput)
      const duration = computeMomentumExperimentDuration(physicsInput)
      const lastGateLeave = Math.max(
        Number.isFinite(res.t_gate2_leave) ? res.t_gate2_leave : 0,
        Number.isFinite(res.t_gate1_rebound_leave) ? res.t_gate1_rebound_leave : 0,
        Number.isFinite(res.t_gate2_s1_leave) ? res.t_gate2_s1_leave : 0,
      )
      const reachable = duration === max || duration >= lastGateLeave
      expect(reachable, `参数 ${JSON.stringify(input)} 下时长 ${duration}s 早于末次挡光 ${lastGateLeave}s`).toBe(true)
    }
  })

  it('experimentDurationFromResult 与 computeMomentumExperimentDuration 结果一致（同源守卫）', () => {
    for (const input of [
      {},
      { m1: 0.4, m2: 0.2, v1: 0.2 },
      { m1: 0.9, m2: 0.8, v1: 0.2 },
      { m1: 0.3, m2: 0.3, v1: 0.9, collisionType: 1 },
      { m1: 0.2, m2: 0.6, v1: 0.8 },
    ]) {
      expect(experimentDurationFromResult(computeMomentumExperiment(input))).toBe(
        computeMomentumExperimentDuration(input),
      )
    }
  })
})
