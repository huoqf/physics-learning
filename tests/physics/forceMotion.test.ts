import { describe, expect, it } from 'vitest'
import {
  calculateForceMotionState,
  getForceMotionDefaultChartType,
  sampleForceMotionChart,
} from '@/physics'

describe('calculateForceMotionState', () => {
  it('无人机投放：合外力恒为 mg，下落位移满足 1/2gt²', () => {
    const state = calculateForceMotionState({ scene: 0, chartType: 1, v0: 10, theta: 0, m: 2, env: 10 }, 3)

    expect(state.scene).toBe('drone-drop')
    expect(state.F).toBeCloseTo(20, 8)
    expect(state.a).toBeCloseTo(10, 8)
    expect(state.y).toBeCloseTo(45, 8)
    expect(state.x).toBeCloseTo(30, 8)
  })

  it('弹簧滑块：恢复力满足 F=-kx，四分之一周期附近速度趋近 0', () => {
    const params = { scene: 1, chartType: 0, v0: 4, theta: 0, m: 1, env: 16 }
    const omega = 4
    const t = Math.PI / (2 * omega)
    const state = calculateForceMotionState(params, t)

    expect(state.scene).toBe('spring-cart')
    expect(state.F).toBeCloseTo(-16 * state.x, 8)
    expect(state.v).toBeCloseTo(0, 8)
    expect(state.chartValue).toBeCloseTo(state.x, 8)
  })

  it('电磁弹射：F=κt，速度按二次函数增长', () => {
    const state = calculateForceMotionState({ scene: 2, chartType: 2, v0: 2, theta: 0, m: 4, env: 8 }, 3)

    expect(state.scene).toBe('rail-launch')
    expect(state.F).toBeCloseTo(24, 8)
    expect(state.a).toBeCloseTo(6, 8)
    expect(state.v).toBeCloseTo(11, 8)
    expect(state.x).toBeCloseTo(15, 8)
  })

  it('跳伞收尾：速度逼近终端速度 mg/b，加速度逼近 0', () => {
    const params = { scene: 3, chartType: 1, v0: 0, theta: 0, m: 80, env: 8 }
    const state = calculateForceMotionState(params, 100)

    expect(state.scene).toBe('skydiver')
    expect(state.terminalVelocity).toBeCloseTo(98, 8)
    expect(state.v).toBeCloseTo(98, 2)
    expect(Math.abs(state.a)).toBeLessThan(0.01)
  })

  it('图表切换：chartValue 随 chartType 正确变化', () => {
    const base = { scene: 2, v0: 1, theta: 0, m: 2, env: 4 }

    expect(calculateForceMotionState({ ...base, chartType: 0 }, 2).chartValue).toBeCloseTo(4.666667, 5)
    expect(calculateForceMotionState({ ...base, chartType: 1 }, 2).chartValue).toBeCloseTo(5, 8)
    expect(calculateForceMotionState({ ...base, chartType: 2 }, 2).chartValue).toBeCloseTo(4, 8)
    expect(calculateForceMotionState({ ...base, chartType: 3 }, 2).chartValue).toBeCloseTo(8, 8)
  })

  it('默认图表和采样结果应稳定', () => {
    expect(getForceMotionDefaultChartType(1)).toBe(0)
    expect(getForceMotionDefaultChartType(2)).toBe(2)
    expect(getForceMotionDefaultChartType(3)).toBe(1)

    const samples = sampleForceMotionChart({ scene: 0, chartType: 1, v0: 0, theta: 0, m: 1, env: 10 }, 2, 5)
    expect(samples).toHaveLength(5)
    expect(samples[0].t).toBeCloseTo(0, 8)
    expect(samples[4].t).toBeCloseTo(2, 8)
  })
})
