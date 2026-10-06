import { describe, it, expect } from 'vitest'
import { getRheostatSymbolicGeometry } from '@/components/Physics'

describe('Rheostat Symbolic Geometry & Monotonicity (P0-1 守护)', () => {
  it('限流式接法下，阻值增大时滑片 x 坐标与有效接入段长度严格单调递增', () => {
    const width = 140
    const min = 0
    const max = 100
    const values = [0, 10, 25, 50, 75, 90, 100]

    const results = values.map((val) => getRheostatSymbolicGeometry(width, val, min, max))

    // 检查滑片坐标单调递增
    for (let i = 1; i < results.length; i++) {
      expect(results[i].symbolicWiperX).toBeGreaterThan(results[i - 1].symbolicWiperX)
      // 核心物理铁律：接入电阻丝长度必须单调递增
      expect(results[i].connectedLength).toBeGreaterThan(results[i - 1].connectedLength)
    }

    // 边界值断言
    const minGeom = results[0]
    const maxGeom = results[results.length - 1]

    expect(minGeom.ratio).toBe(0)
    expect(maxGeom.ratio).toBe(1)

    // min 时接入段为最短有效段 (接触点在最左侧)
    expect(minGeom.connectedLength).toBeCloseTo(6, 1)
    // max 时接入段为最长有效段 (接触点在最右侧)
    expect(maxGeom.connectedLength).toBeCloseTo(42, 1)
  })

  it('不同宽度缩放 (scale) 下均保持左右端口对称与拓扑自洽', () => {
    const geom120 = getRheostatSymbolicGeometry(120, 50, 0, 100)
    expect(geom120.scale).toBeCloseTo(120 / 140, 4)
    expect(geom120.termIn.x).toBeCloseTo(-73 * (120 / 140), 4)
    expect(geom120.termOut.x).toBeCloseTo(73 * (120 / 140), 4)
    expect(geom120.termIn.y).toBe(0)
    expect(geom120.termOut.y).toBe(0)
  })

  it('超出范围的阻值能被 ratio 正确截断在 [0, 1]', () => {
    const under = getRheostatSymbolicGeometry(140, -10, 0, 100)
    expect(under.ratio).toBe(0)

    const over = getRheostatSymbolicGeometry(140, 150, 0, 100)
    expect(over.ratio).toBe(1)
  })
})
