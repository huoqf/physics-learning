import { describe, expect, it } from 'vitest'
import {
  calculateForceMotionState,
  getForceMotionDefaultChartType,
  sampleForceMotionChart,
} from '@/physics'

describe('calculateForceMotionState', () => {
  it('匀加速直线：F合恒定，a=F/m，竖直位移满足 ½at²', () => {
    const state = calculateForceMotionState({ mode: 1, chartType: 1, v0: 0, theta: 90, m: 2, env1: 20 }, 3)

    expect(state.mode).toBe('uniform-accel-line')
    expect(state.F).toBeCloseTo(20, 8)
    expect(state.a).toBeCloseTo(10, 8)
    expect(state.y).toBeCloseTo(45, 8)
    expect(state.x).toBeCloseTo(0, 8)
  })

  it('简谐运动：恢复力 F=-kx，四分之一周期附近速度趋近 0', () => {
    const params = { mode: 7, chartType: 0, v0: 4, theta: 0, m: 1, env1: 16 }
    const omega = 4
    const t = Math.PI / (2 * omega)
    const state = calculateForceMotionState(params, t)

    expect(state.mode).toBe('simple-harmonic')
    expect(state.Fx).toBeCloseTo(-16 * state.x, 8)
    expect(state.v).toBeCloseTo(0, 8)
    expect(state.chartValueX).toBeCloseTo(state.x, 8)
  })

  it('线性变力：F=κt，速度按二次函数增长', () => {
    const state = calculateForceMotionState({ mode: 8, chartType: 2, v0: 2, theta: 0, m: 4, env1: 8 }, 3)

    expect(state.mode).toBe('linear-variable-force')
    expect(state.F).toBeCloseTo(24, 8)
    expect(state.a).toBeCloseTo(6, 8)
    expect(state.v).toBeCloseTo(11, 8)
    expect(state.x).toBeCloseTo(15, 8)
  })

  it('终端速度模式（drag）：速度逼近收尾速度 F_drive/kf，加速度逼近 0', () => {
    const params = { mode: 9, chartType: 1, v0: 0, theta: 0, m: 80, env1: 100, env2: 10, env3: 1 }
    const state = calculateForceMotionState(params, 50)

    expect(state.mode).toBe('terminal-variable-force')
    expect(state.terminalVelocity).toBeCloseTo(10, 8)
    expect(state.v).toBeCloseTo(10, 1)
    expect(Math.abs(state.a)).toBeLessThan(0.1)
  })

  it('图表切换：chartValueF/V/X 随 chartType 正确变化', () => {
    const base = { mode: 8, v0: 1, theta: 0, m: 2, env1: 4 }

    expect(calculateForceMotionState({ ...base, chartType: 0 }, 2).chartValueF).toBeCloseTo(8, 5)
    expect(calculateForceMotionState({ ...base, chartType: 1 }, 2).chartValueV).toBeCloseTo(5, 8)
    expect(calculateForceMotionState({ ...base, chartType: 2 }, 2).chartValueX).toBeCloseTo(4.667, 3)
  })

  it('平衡状态：F合=0，a=0，v恒定', () => {
    const state = calculateForceMotionState({ mode: 0, chartType: 0, v0: 5, theta: 30, m: 2 }, 3)

    expect(state.mode).toBe('balance')
    expect(state.F).toBeCloseTo(0, 8)
    expect(state.a).toBeCloseTo(0, 8)
    expect(state.vx).toBeCloseTo(5 * Math.cos(Math.PI / 6), 8)
    expect(state.vy).toBeCloseTo(5 * Math.sin(Math.PI / 6), 8)
    expect(state.x).toBeCloseTo(state.vx * 3, 8)
    expect(state.y).toBeCloseTo(state.vy * 3, 8)
    expect(state.isTerminal).toBe(true)
  })

  it('匀减速直线：刹车陷阱，v=0后停止运动', () => {
    const state = calculateForceMotionState({ mode: 2, chartType: 1, v0: 10, theta: 0, m: 2, env1: 10 }, 5)

    expect(state.mode).toBe('uniform-decel-line')
    expect(state.v).toBeCloseTo(0, 1)
    expect(state.isTerminal).toBe(true)
    expect(state.pauseReason).toBe('brake')
  })

  it('匀减速直线：未停止时速度线性减小', () => {
    const state = calculateForceMotionState({ mode: 2, chartType: 1, v0: 10, theta: 0, m: 2, env1: 20 }, 0.5)

    expect(state.mode).toBe('uniform-decel-line')
    expect(state.v).toBeCloseTo(5, 8)
    expect(state.isTerminal).toBe(false)
  })

  it('匀变速曲线（斜抛）：水平匀速，竖直受重力', () => {
    const v0 = 20
    const theta = 45
    const g = 10
    const m = 1
    const t = 1

    const state = calculateForceMotionState({ mode: 3, chartType: 0, v0, theta, m, env1: g }, t)

    expect(state.mode).toBe('constant-angle-curve')
    expect(state.vx).toBeCloseTo(v0 * Math.cos(Math.PI / 4), 8)
    expect(state.ay).toBeCloseTo(-g, 8)
    expect(state.Fy).toBeCloseTo(-m * g, 8)
    expect(state.Fx).toBeCloseTo(0, 8)
    expect(state.x).toBeCloseTo(v0 * Math.cos(Math.PI / 4) * t, 8)
    expect(state.y).toBeCloseTo(v0 * Math.sin(Math.PI / 4) * t - 0.5 * g * t * t, 8)
  })

  it('类平抛运动：v0垂直于恒力方向，力有x分量时vx增大', () => {
    const v0 = 10
    const F = 20
    const m = 2
    const theta = 45
    const t = 2

    const state = calculateForceMotionState({ mode: 4, chartType: 0, v0, theta, m, env1: F }, t)

    expect(state.mode).toBe('projectile-like')
    const ax = (F * Math.cos(Math.PI / 4)) / m
    const ay = (F * Math.sin(Math.PI / 4)) / m
    expect(state.vx).toBeCloseTo(v0 + ax * t, 8)
    expect(state.vy).toBeCloseTo(ay * t, 8)
    expect(state.x).toBeCloseTo(v0 * t + 0.5 * ax * t * t, 8)
    expect(state.y).toBeCloseTo(0.5 * ay * t * t, 8)
  })

  it('匀速圆周：v大小恒定，向心力 = mv²/R', () => {
    const v0 = 10
    const R = 5
    const m = 2

    const state = calculateForceMotionState({ mode: 5, chartType: 0, v0, theta: 0, m, env1: R }, 2)

    expect(state.mode).toBe('uniform-circular')
    expect(state.v).toBeCloseTo(v0, 8)
    expect(state.F).toBeCloseTo(m * v0 * v0 / R, 8)
    expect(state.work).toBeCloseTo(0, 8)
  })

  it('匀速圆周：轨迹为圆', () => {
    const v0 = 6
    const R = 3
    const m = 1
    const omega = v0 / R

    const state = calculateForceMotionState({ mode: 5, chartType: 0, v0, theta: 0, m, env1: R }, Math.PI / (2 * omega))

    expect(state.x).toBeCloseTo(0, 8)
    expect(state.y).toBeCloseTo(R, 8)
  })

  it('变速圆周（绳模型）：能量守恒 v² = v0² - 2gΔy', () => {
    const R = 2
    const m = 1
    const v0 = 5

    const state = calculateForceMotionState({ mode: 6, chartType: 0, v0, theta: 0, m, env1: R, env2: 0 }, 1)

    expect(state.mode).toBe('variable-circular')
    const g = 9.8
    const deltaH = state.y - (-R)
    expect(0.5 * m * state.v * state.v + m * g * deltaH).toBeCloseTo(0.5 * m * v0 * v0, 0)
  })

  it('变速圆周（杆模型）：杆约束不松弛，能量守恒', () => {
    const R = 2
    const m = 1
    const v0 = 10

    const state = calculateForceMotionState({ mode: 6, chartType: 0, v0, theta: 0, m, env1: R, env2: 1 }, 0.5)

    expect(state.mode).toBe('variable-circular')
    expect(state.isTerminal).toBe(false)
    const expectedKE = 0.5 * m * v0 * v0
    const actualKE = 0.5 * m * state.v * state.v
    expect(state.work).toBeCloseTo(actualKE - expectedKE, 0)
  })

  it('终端速度模式（power）：恒定功率启动，v逼近P/f', () => {
    const params = { mode: 9, chartType: 1, v0: 0, theta: 0, m: 1000, env1: 60000, env2: 2000, env3: 0 }
    const state = calculateForceMotionState(params, 200)

    expect(state.mode).toBe('terminal-variable-force')
    expect(state.terminalVelocity).toBeCloseTo(30, 8)
    expect(state.v).toBeCloseTo(30, 1)
    expect(Math.abs(state.a)).toBeLessThan(0.5)
  })

  it('默认图表和采样结果应稳定', () => {
    expect(getForceMotionDefaultChartType(1)).toBe(0)
    expect(getForceMotionDefaultChartType(2)).toBe(0)
    expect(getForceMotionDefaultChartType(3)).toBe(0)

    const samples = sampleForceMotionChart({ mode: 1, chartType: 1, v0: 0, theta: 0, m: 1, env1: 10 }, 2, 5)
    expect(samples).toHaveLength(5)
    expect(samples[0].t).toBeCloseTo(0, 8)
    expect(samples[4].t).toBeCloseTo(2, 8)
  })
})
