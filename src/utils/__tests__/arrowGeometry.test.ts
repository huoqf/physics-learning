import { describe, it, expect } from 'vitest'
import { resolveArrowGeometry } from '../arrowGeometry'

describe('resolveArrowGeometry', () => {
  it('常规尺寸与旧实现逐位一致（头部 0.28 / 上限 16 / 线宽 max(3, 4%)）', () => {
    const cases = [40, 60, 100, 137]
    for (const total of cases) {
      const legacyHead = Math.max(7, Math.min(16, total * 0.28))
      const legacyStroke = Math.max(3, total * 0.04)
      const g = resolveArrowGeometry(total)
      expect(g.headLen).toBe(legacyHead)
      expect(g.headWidth).toBe(legacyHead * 0.6)
      expect(g.strokeWidth).toBe(legacyStroke)
    }
  })

  it('长度 25px 是头部开始收缩的拐点（0.28·25 恰好等于旧下限 7）', () => {
    expect(resolveArrowGeometry(25).headLen).toBeCloseTo(7, 10)
    expect(resolveArrowGeometry(25.0001).headLen).toBeCloseTo(7.000028, 6)
    expect(resolveArrowGeometry(20).headLen).toBeLessThan(7)
  })

  it('短箭头头部等比缩小，不再被 7px 硬下限吞掉', () => {
    expect(resolveArrowGeometry(20).headLen).toBeCloseTo(5.6, 10)
    expect(resolveArrowGeometry(10).headLen).toBe(3)
    // 10px 箭头：头部 3px、箭杆 7px —— 仍有可读的杆段
    expect(resolveArrowGeometry(10).lineLen).toBeCloseTo(7, 10)
  })

  it('头部长度永不超过总长（否则三角底边会落到起点背后）', () => {
    for (let total = 0; total <= 200; total += 0.5) {
      const g = resolveArrowGeometry(total)
      expect(g.headLen).toBeLessThanOrEqual(g.totalLength + 1e-12)
      expect(g.lineLen).toBeGreaterThanOrEqual(0)
      expect(g.headLen + g.lineLen).toBeCloseTo(g.totalLength, 10)
    }
  })

  it('线宽随短箭头收细，并在 33.3px 处与旧平台值连续', () => {
    expect(resolveArrowGeometry(10).strokeWidth).toBeCloseTo(0.9, 10)
    expect(resolveArrowGeometry(20).strokeWidth).toBeCloseTo(1.8, 10)
    // 33.3…px 处 min(3, 0.09L) = 3，与旧公式 max(3, 0.04L) 重合
    const knee = 3 / 0.09
    expect(resolveArrowGeometry(knee).strokeWidth).toBeCloseTo(3, 10)
    expect(resolveArrowGeometry(knee * 1.5).strokeWidth).toBeCloseTo(3, 10)
    expect(resolveArrowGeometry(200).strokeWidth).toBeCloseTo(8, 10)
  })

  it('调用方显式指定的线宽优先于派生值', () => {
    expect(resolveArrowGeometry(10, 2.5).strokeWidth).toBe(2.5)
    expect(resolveArrowGeometry(200, 1).strokeWidth).toBe(1)
  })

  it('头部宽度不窄于线宽的 1.4 倍（否则圆头短杆没有方向）', () => {
    // 10px 箭头 + 2px 覆盖线宽：0.6·3 = 1.8 会被 2px 线宽压住，兜底到 2.8
    const g = resolveArrowGeometry(10, 2)
    expect(g.headLen).toBe(3)
    expect(g.headWidth).toBeCloseTo(2.8, 10)
    expect(g.headWidth / g.strokeWidth).toBeCloseTo(1.4, 10)
  })

  it('常规尺寸下该约束不生效（头部仍由 0.6·headLen 决定）', () => {
    for (const total of [40, 60, 100, 137]) {
      const g = resolveArrowGeometry(total)
      expect(g.headWidth).toBeCloseTo(g.headLen * 0.6, 10)
    }
  })

  it('亚像素箭头不会因线宽约束被撑成横向细线（头部宽不超过长 1.2 倍）', () => {
    // 0.625px 的竖直分速度 + 2px 覆盖线宽：不能出现 0.6 长 / 2.8 宽的水平横杠
    const g = resolveArrowGeometry(0.625, 2)
    expect(g.headLen).toBeCloseTo(0.625, 10)
    expect(g.headWidth).toBeCloseTo(0.75, 10)
    expect(g.headWidth).toBeLessThanOrEqual(g.headLen * 1.2 + 1e-12)
  })

  it('退化输入不产生负长度或 NaN', () => {
    for (const total of [0, -12, Number.NaN, Number.NEGATIVE_INFINITY]) {
      const g = resolveArrowGeometry(total)
      expect(g.totalLength).toBe(0)
      expect(g.headLen).toBe(0)
      expect(g.headWidth).toBe(0)
      expect(g.lineLen).toBe(0)
      expect(g.strokeWidth).toBe(0)
    }
  })
})
