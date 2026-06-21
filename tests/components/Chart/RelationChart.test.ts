import { describe, it, expect } from 'vitest'
import { interpolateY } from '@/components/Chart/interpolation'

describe('RelationChart · interpolateY', () => {
  it('空数组返回 null', () => {
    expect(interpolateY([], 1)).toBeNull()
  })

  it('单点直接返回该点 y（不外推）', () => {
    const pts = [{ x: 5, y: 42 }]
    expect(interpolateY(pts, 0)).toBe(42)
    expect(interpolateY(pts, 5)).toBe(42)
    expect(interpolateY(pts, 100)).toBe(42)
  })

  it('左端点之前夹紧到最左 y', () => {
    const pts = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]
    expect(interpolateY(pts, 0.5)).toBe(10)
    expect(interpolateY(pts, -100)).toBe(10)
  })

  it('右端点之后夹紧到最右 y', () => {
    const pts = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]
    expect(interpolateY(pts, 3.5)).toBe(30)
    expect(interpolateY(pts, 100)).toBe(30)
  })

  it('精确命中节点时返回该节点 y', () => {
    const pts = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]
    expect(interpolateY(pts, 1)).toBe(10)
    expect(interpolateY(pts, 2)).toBe(20)
    expect(interpolateY(pts, 3)).toBe(30)
  })

  it('区间中点线性插值', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 100 },
    ]
    expect(interpolateY(pts, 5)).toBeCloseTo(50, 10)
    expect(interpolateY(pts, 2.5)).toBeCloseTo(25, 10)
    expect(interpolateY(pts, 7.5)).toBeCloseTo(75, 10)
  })

  it('非均匀间距：分段线性正确', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 10, y: 10 },
    ]
    expect(interpolateY(pts, 0.5)).toBeCloseTo(0.5, 10)
    // (1,1)→(10,10) 区间中点：x=5.5 → y=5.5
    expect(interpolateY(pts, 5.5)).toBeCloseTo(5.5, 10)
  })

  it('负斜率曲线：y 递减时插值方向正确', () => {
    const pts = [
      { x: 0, y: 100 },
      { x: 10, y: 0 },
    ]
    expect(interpolateY(pts, 5)).toBeCloseTo(50, 10)
    expect(interpolateY(pts, 2)).toBeCloseTo(80, 10)
  })

  it('y 可正可负：穿越零点', () => {
    const pts = [
      { x: 0, y: -10 },
      { x: 10, y: 10 },
    ]
    expect(interpolateY(pts, 0)).toBe(-10)
    expect(interpolateY(pts, 5)).toBeCloseTo(0, 10)
    expect(interpolateY(pts, 10)).toBe(10)
  })

  it('稠密样本（200 点）二分定位正确', () => {
    // y = x²，在 [0, 10] 上 200 个均匀样本
    const pts = Array.from({ length: 201 }, (_, i) => {
      const x = i * 0.05
      return { x, y: x * x }
    })
    // 中点 x=5：精确节点应是 25；插值应该非常接近 25
    expect(interpolateY(pts, 5)).toBeCloseTo(25, 8)
    // 区间内非节点位置 x=3.123：分段线性会略偏离真值，但应介于相邻节点之间
    const y = interpolateY(pts, 3.123)!
    const x0 = 3.10, x1 = 3.15
    expect(y).toBeGreaterThanOrEqual(Math.min(x0 * x0, x1 * x1))
    expect(y).toBeLessThanOrEqual(Math.max(x0 * x0, x1 * x1))
  })
})
