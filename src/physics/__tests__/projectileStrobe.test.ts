import { describe, it, expect } from 'vitest'
import { computeProjectileStrobe } from '../projectileStrobe'

/**
 * 频闪打点的判据全部是"照片上量得出来的量"：
 *   水平间距恒定、竖直间距成 1:3:5、逐差恒为 gT²。
 * 测试直接断言这三个可测量，而不是复述公式。
 */
describe('projectileStrobe physics', () => {
  const v0x = 10
  const g = 9.8
  const T = 0.2

  it('打点时刻为 T 的整数倍，位置符合平抛参数方程', () => {
    const s = computeProjectileStrobe(v0x, g, T, 1.0)
    // 0, 0.2, 0.4, 0.6, 0.8, 1.0 → 6 个点
    expect(s.marks).toHaveLength(6)
    for (const m of s.marks) {
      expect(m.t).toBeCloseTo(m.k * T, 10)
      expect(m.x).toBeCloseTo(v0x * m.t, 10)
      expect(m.y).toBeCloseTo(0.5 * g * m.t * m.t, 10)
    }
    // 第一个点就是抛出瞬间
    expect(s.marks[0].x).toBe(0)
    expect(s.marks[0].y).toBe(0)
    expect(s.marks[0].dyPrev).toBeNull()
  })

  it('水平间距恒定 Δx = v₀T（水平方向匀速的直接证据）', () => {
    const s = computeProjectileStrobe(v0x, g, T, 1.0)
    expect(s.dx).toBeCloseTo(v0x * T, 12)
    for (let k = 1; k < s.marks.length; k++) {
      const dx = s.marks[k].x - s.marks[k - 1].x
      expect(dx).toBeCloseTo(v0x * T, 10)
    }
  })

  it('竖直间距成 1:3:5（初速为零的匀加速的直接证据）', () => {
    const s = computeProjectileStrobe(v0x, g, T, 1.0)
    const firstDy = s.marks[1].dyPrev as number
    expect(firstDy).toBeCloseTo(0.5 * g * T * T, 12)

    // 相邻竖直间距之比 = 1 : 3 : 5 : 7 …
    for (let k = 1; k < s.marks.length; k++) {
      const dy = s.marks[k].dyPrev as number
      expect(dy / firstDy).toBeCloseTo(2 * k - 1, 10)
    }
    expect(s.ratios.slice(0, 3)).toEqual([1, 3, 5])
  })

  it('逐差恒为 gT²（频闪照片测重力加速度的依据）', () => {
    const s = computeProjectileStrobe(v0x, g, T, 1.0)
    expect(s.diffOfDy).toBeCloseTo(g * T * T, 12)
    expect(s.diffOfDy).toBeCloseTo(0.392, 6)

    for (let k = 2; k < s.marks.length; k++) {
      const diff = (s.marks[k].dyPrev as number) - (s.marks[k - 1].dyPrev as number)
      expect(diff).toBeCloseTo(g * T * T, 10)
    }
  })

  it('只输出已播放时刻之前的打点；恰好在整数倍时最后一帧不漏', () => {
    // 0.55s：只有 0 / 0.2 / 0.4 三个点
    expect(computeProjectileStrobe(v0x, g, T, 0.55).marks).toHaveLength(3)
    // 0.6s 恰好是整数倍，必须包含 0.6 这一帧
    expect(computeProjectileStrobe(v0x, g, T, 0.6).marks).toHaveLength(4)
    // 负时间不外推
    const t0 = computeProjectileStrobe(v0x, g, T, -1)
    expect(t0.marks).toHaveLength(1)
    expect(t0.marks[0].t).toBe(0)
  })

  it('周期变小 → 点数变多、逐差变小；g 增大 → 逐差增大', () => {
    const dense = computeProjectileStrobe(v0x, g, 0.1, 1.0)
    const coarse = computeProjectileStrobe(v0x, g, 0.4, 1.0)
    expect(dense.marks.length).toBeGreaterThan(coarse.marks.length)
    expect(dense.diffOfDy).toBeLessThan(coarse.diffOfDy)

    const bigG = computeProjectileStrobe(v0x, 9.8 * 2, T, 1.0)
    expect(bigG.diffOfDy).toBeCloseTo(2 * g * T * T, 10)
  })
})
