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
