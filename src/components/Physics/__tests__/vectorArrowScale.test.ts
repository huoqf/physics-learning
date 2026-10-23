import { describe, it, expect } from 'vitest'
import { isNonUniformScale } from '../VectorArrow'

describe('isNonUniformScale', () => {
  it('只差 1 ULP 的两轴缩放不算非等比（等比场景的真实取值）', () => {
    // 这两个数就是斜抛页等比缩放时的实际输出：
    // 不同计算路径（visibleW/physicsW 与 visibleH/physicsH）得到的末位浮点不同
    expect(isNonUniformScale(9.285714285714285, 9.285714285714286)).toBe(false)
  })

  it('真正不等的两轴缩放判为非等比', () => {
    expect(isNonUniformScale(17.9, 23.5)).toBe(true)
    expect(isNonUniformScale(8.4, 9.29)).toBe(true)
  })

  it('用相对误差判据，与绝对量级无关', () => {
    expect(isNonUniformScale(100, 100.001)).toBe(true)
    expect(isNonUniformScale(100, 100.00005)).toBe(false)
    expect(isNonUniformScale(0.001, 0.001000001)).toBe(false)
  })

  it('0 与 0 视为等比，0 与非 0 视为非等比', () => {
    expect(isNonUniformScale(0, 0)).toBe(false)
    expect(isNonUniformScale(0, 5)).toBe(true)
  })
})
