import { describe, expect, it } from 'vitest'
import { vectorEnd, pathFrom, getSpringPath } from '@/features/mechanics/force-motion/hooks/useForceMotionSandbox'

describe('vectorEnd', () => {
  it('返回指定长度的归一化端点', () => {
    const result = vectorEnd(50, 3, 4)
    expect(result.x).toBeCloseTo(30, 8)
    expect(result.y).toBeCloseTo(40, 8)
  })

  it('零向量返回原点', () => {
    const result = vectorEnd(50, 0, 0)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('极小向量视为零向量', () => {
    const result = vectorEnd(50, 1e-10, 1e-10)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })

  it('负方向向量正确处理', () => {
    const result = vectorEnd(20, -3, -4)
    expect(result.x).toBeCloseTo(-12, 8)
    expect(result.y).toBeCloseTo(-16, 8)
  })
})

describe('pathFrom', () => {
  it('单点生成 M 指令', () => {
    const d = pathFrom([{ cx: 100.3, cy: 200.7 }])
    expect(d).toBe('M 100.3 200.7')
  })

  it('多点生成 M + L 指令', () => {
    const d = pathFrom([
      { cx: 10, cy: 20 },
      { cx: 30, cy: 40 },
      { cx: 50, cy: 60 },
    ])
    expect(d).toBe('M 10.0 20.0 L 30.0 40.0 L 50.0 60.0')
  })

  it('坐标保留一位小数', () => {
    const d = pathFrom([{ cx: 1.234, cy: 5.678 }])
    expect(d).toContain('1.2')
    expect(d).toContain('5.7')
  })
})

describe('getSpringPath', () => {
  it('两点距离过近返回空串', () => {
    expect(getSpringPath(0, 0, 2, 2)).toBe('')
  })

  it('水平弹簧生成有效 path', () => {
    const d = getSpringPath(0, 0, 200, 0, 5, 6)
    expect(d).toContain('M')
    expect(d).toContain('L')
    expect(d.length).toBeGreaterThan(10)
  })

  it('垂直弹簧生成有效 path', () => {
    const d = getSpringPath(100, 0, 100, 200, 8, 4)
    expect(d).toContain('M')
    expect(d).toContain('L')
  })

  it('斜向弹簧生成有效 path', () => {
    const d = getSpringPath(10, 10, 110, 110, 6, 5)
    expect(d).toContain('M')
    expect(d.length).toBeGreaterThan(10)
  })

  it('turns 参数影响路径点数', () => {
    const d3 = getSpringPath(0, 0, 200, 0, 3, 6)
    const d10 = getSpringPath(0, 0, 200, 0, 10, 6)
    // 更多圈数 → 更多 L 指令
    expect(d10.split('L').length).toBeGreaterThan(d3.split('L').length)
  })
})
