import { describe, it, expect } from 'vitest'
import {
  calculateSandboxState,
  calculateCycleState,
  deltaUtoDeltaT,
  temperatureToSpeedScale,
  C_SYS,
  SANDBOX_T0,
  CYCLE_DURATION,
} from '../firstLaw'

describe('calculateSandboxState (热力学第一定律沙箱模式)', () => {
  it('初态 (W=0, Q=0, adiabatic=false)：处于基准温度与体积', () => {
    const state = calculateSandboxState(0, 0, false)
    expect(state.T).toBeCloseTo(SANDBOX_T0, 2)
    expect(state.V).toBeCloseTo(0.001, 5) // SANDBOX_V0 = 1 L (0.001 m³)
    expect(state.W).toBe(0)
    expect(state.Q).toBe(0)
    expect(state.deltaU).toBe(0)
    expect(state.P).toBeCloseTo(state.T / (3 * state.V), 2)
  })

  it('等容吸热 (W=0, Q=50 J)：ΔU = Q 严格守恒，温度升高，体积保持', () => {
    const state = calculateSandboxState(0, 50, false)
    expect(state.deltaU).toBe(50)
    expect(state.Q).toBe(50)
    expect(state.W).toBe(0)
    // T = T0 + Q / C_SYS = 300 + 50 / 0.5 = 400 K
    expect(state.T).toBeCloseTo(400, 2)
    // 绝热做功为0，体积保持初态 1 L
    expect(state.V).toBeCloseTo(0.001, 5)
  })

  it('绝热压缩做功 (W=20 J, Q=0, adiabatic=true)：ΔU = W，温度升高，体积缩小', () => {
    const state = calculateSandboxState(20, 0, true)
    expect(state.deltaU).toBe(20)
    expect(state.W).toBe(20)
    expect(state.Q).toBe(0)
    // T = 300 + 20 / 0.5 = 340 K
    expect(state.T).toBeCloseTo(340, 2)
    // 绝热压缩体积必须小于初始 1 L
    expect(state.V).toBeLessThan(0.001)
  })

  it('绝热开关生效：即使传入 Q=50，若 adiabatic=true，有效吸热 Q=0', () => {
    const state = calculateSandboxState(10, 50, true)
    expect(state.Q).toBe(0)
    expect(state.deltaU).toBe(10)
    expect(state.T).toBeCloseTo(SANDBOX_T0 + 10 / C_SYS, 2)
  })

  it('一般复合过程：ΔU = W + Q 恒成立', () => {
    const state = calculateSandboxState(-24, 50, false)
    expect(state.W).toBe(-24)
    expect(state.Q).toBe(50)
    expect(state.deltaU).toBe(26)
    expect(state.T).toBeCloseTo(SANDBOX_T0 + 26 / C_SYS, 2)
  })
})

describe('calculateCycleState (顺时针正向热机循环)', () => {
  it('时间周期性循环：time 与 time + CYCLE_DURATION 状态严格一致', () => {
    const s1 = calculateCycleState(2.5)
    const s2 = calculateCycleState(2.5 + CYCLE_DURATION)
    expect(s1.currentStepIndex).toBe(s2.currentStepIndex)
    expect(s1.P).toBeCloseTo(s2.P, 4)
    expect(s1.V).toBeCloseTo(s2.V, 4)
    expect(s1.T).toBeCloseTo(s2.T, 4)
  })

  it('状态点 A 闭合初态 (t = 0)：V = 1 L, P = 100 kPa, T = 300 K', () => {
    const s = calculateCycleState(0)
    expect(s.currentStepIndex).toBe(0)
    expect(s.V).toBeCloseTo(0.001, 5)
    expect(s.P).toBeCloseTo(1.0e5, 0)
    expect(s.T).toBeCloseTo(300, 1)
  })

  it('热机全循环各步做功与热量严格自洽', () => {
    // 顺时针正向热机理论值：
    // ① 等容升压 A(1L, 100k) -> B(1L, 200k): W = 0 J, Q = 150 J, ΔU = 150 J
    // ② 等压膨胀 B(1L, 200k) -> C(2L, 200k): W = -200 J, Q = 500 J, ΔU = 300 J
    // ③ 等容降压 C(2L, 200k) -> D(2L, 100k): W = 0 J, Q = -300 J, ΔU = -300 J
    // ④ 等压压缩 D(2L, 100k) -> A(1L, 100k): W = +100 J, Q = -250 J, ΔU = -150 J

    // 取每一阶段结束前临界点（接近该步末态）
    const stepDuration = CYCLE_DURATION / 4

    // 步骤 0 末态
    const s0End = calculateCycleState(stepDuration - 1e-4)
    expect(s0End.currentStepIndex).toBe(0)
    expect(s0End.W).toBeCloseTo(0, 1)
    expect(s0End.Q).toBeCloseTo(150, 1)
    expect(s0End.deltaU).toBeCloseTo(150, 1)

    // 步骤 1 末态
    const s1End = calculateCycleState(stepDuration * 2 - 1e-4)
    expect(s1End.currentStepIndex).toBe(1)
    expect(s1End.W).toBeCloseTo(-200, 1)
    expect(s1End.Q).toBeCloseTo(650, 1) // 150 + 500
    expect(s1End.deltaU).toBeCloseTo(450, 1) // 150 + 300

    // 步骤 2 末态
    const s2End = calculateCycleState(stepDuration * 3 - 1e-4)
    expect(s2End.currentStepIndex).toBe(2)
    expect(s2End.W).toBeCloseTo(-200, 1)
    expect(s2End.Q).toBeCloseTo(350, 1) // 650 - 300
    expect(s2End.deltaU).toBeCloseTo(150, 1) // 450 - 300

    // 步骤 3 末态（全循环一周）
    const s3End = calculateCycleState(stepDuration * 4 - 1e-4)
    expect(s3End.currentStepIndex).toBe(3)
    // 净做功 W_net = -200 + 100 = -100 J
    expect(s3End.W).toBeCloseTo(-100, 1)
    // 净吸热 Q_net = 350 - 250 = +100 J
    expect(s3End.Q).toBeCloseTo(100, 1)
    // 净内能增量 ΔU_net = 0 J (闭合回路)
    expect(s3End.deltaU).toBeCloseTo(0, 1)

    // 热机对外净正功严格等于 p-V 闭合矩形面积：ΔP * ΔV = 100 kPa * 1 L = 100 J
    const rectArea = (200 - 100) * 1e3 * (2.0 - 1.0) * 1e-3
    expect(Math.abs(s3End.W)).toBeCloseTo(rectArea, 2)
  })
})

describe('辅助物理函数', () => {
  it('deltaUtoDeltaT 温度增量与热容对应', () => {
    expect(deltaUtoDeltaT(50)).toBeCloseTo(50 / C_SYS, 4)
    expect(deltaUtoDeltaT(0)).toBe(0)
    expect(deltaUtoDeltaT(50, -1)).toBe(0)
  })

  it('temperatureToSpeedScale 速度与根号T成正比', () => {
    const scale300 = temperatureToSpeedScale(300)
    const scale1200 = temperatureToSpeedScale(1200)
    expect(scale1200).toBeCloseTo(scale300 * 2, 4) // sqrt(1200/300) = 2
  })
})
