import { describe, expect, it } from 'vitest'
import { GRAVITY } from '../constants'
import {
  NEWTON_TRACK_MAX_M,
  buildNewtonSecondCurves,
  computeNewtonSecondMotion,
  computeNewtonSecondState,
} from '../experimentNewtonSecond'

describe('experimentNewtonSecond · 探究加速度与力、质量的关系物理模型', () => {
  it('恰好平衡摩擦力且 m ≪ M 时：实测加速度接近 mg/M', () => {
    const res = computeNewtonSecondState({
      mode: 0,
      M_cart: 0.8,
      m_hook: 0.02,
      balanceMode: 0,
    })
    expect(res.a_real).toBeCloseTo((0.02 * GRAVITY) / 0.82, 6)
    expect(res.a_real / res.a_ideal).toBeGreaterThan(0.97)
    expect(res.tensionRatioPercent).toBeGreaterThan(97)
  })

  it('当槽码质量不再远小于小车质量时：真实加速度显著低于 mg/M（a-F 图线向下弯曲）', () => {
    const res = computeNewtonSecondState({
      mode: 0,
      M_cart: 0.3,
      m_hook: 0.3,
      balanceMode: 0,
    })
    // m = M 时真实加速度 = 0.5 g，仅为理想值 g 的 50%
    expect(res.a_real).toBeCloseTo(0.5 * GRAVITY, 6)
    expect(res.a_real).toBeCloseTo(res.a_ideal * 0.5, 6)
    expect(res.tension).toBeCloseTo(0.3 * (GRAVITY - 0.5 * GRAVITY), 6)

    const curves = buildNewtonSecondCurves({
      mode: 0,
      M_cart: 0.3,
      m_hook: 0.3,
      balanceMode: 0,
    })
    const lastMeas = curves.measuredPoints[curves.measuredPoints.length - 1]
    const lastIdeal = curves.idealPoints[curves.idealPoints.length - 1]
    expect(lastMeas.y).toBeLessThan(lastIdeal.y)
  })

  it('未平衡摩擦力（balanceMode=1）：小推力时启动不了，a-F 图有正横轴截距', () => {
    const stSmall = computeNewtonSecondState({
      mode: 0,
      M_cart: 0.5,
      m_hook: 0.01, // 0.01 < 0.04 * 0.5 = 0.02
      balanceMode: 1,
    })
    expect(stSmall.a_real).toBe(0)

    const stLarge = computeNewtonSecondState({
      mode: 0,
      M_cart: 0.5,
      m_hook: 0.1,
      balanceMode: 1,
    })
    expect(stLarge.a_real).toBeGreaterThan(0)
    expect(stLarge.a_real).toBeLessThan((0.1 * GRAVITY) / 0.6)
  })

  it('平衡过度（balanceMode=2）：即使不挂槽码小车仍有正向加速度（纵轴正截距）', () => {
    const stZeroHook = computeNewtonSecondState({
      mode: 0,
      M_cart: 0.4,
      m_hook: 0,
      balanceMode: 2,
    })
    expect(stZeroHook.a_real).toBeGreaterThan(0)
  })

  it('纸带逐差法测得加速度与系统真实加速度 a_real 严格自洽', () => {
    const state = computeNewtonSecondState({
      M_cart: 0.4,
      m_hook: 0.08,
      balanceMode: 0,
    })
    const motion = computeNewtonSecondMotion(state.a_real, 0.8, 300, 50)
    expect(motion.tapeDots.length).toBeGreaterThanOrEqual(7)
    expect(motion.aCalculated).not.toBeNull()
    expect(motion.aCalculated!).toBeCloseTo(state.a_real, 2)
    expect(motion.x).toBeLessThanOrEqual(NEWTON_TRACK_MAX_M)
  })
})
