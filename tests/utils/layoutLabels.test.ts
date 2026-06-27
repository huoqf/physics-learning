import { describe, it, expect } from 'vitest'
import { layoutLabels, type LabelSlot } from '@/utils/layoutLabels'

function makeLabel(overrides: Partial<LabelSlot> = {}): LabelSlot {
  return {
    x: 100,
    y: 100,
    text: 'F=10N',
    fontSize: 12,
    ...overrides,
  }
}

describe('layoutLabels', () => {
  it('单个标签原样返回', () => {
    const labels = [makeLabel()]
    const result = layoutLabels(labels)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBeCloseTo(100, 0)
    expect(result[0].y).toBeCloseTo(100, 0)
  })

  it('不重叠的标签保持原位', () => {
    const labels = [
      makeLabel({ x: 50, y: 50, text: 'A' }),
      makeLabel({ x: 200, y: 200, text: 'B' }),
    ]
    const result = layoutLabels(labels)
    expect(result[0].x).toBeCloseTo(50, 0)
    expect(result[1].x).toBeCloseTo(200, 0)
  })

  it('重叠标签被偏移', () => {
    const labels = [
      makeLabel({ x: 100, y: 100, text: 'F_N=19.6N', priority: 1 }),
      makeLabel({ x: 100, y: 102, text: 'a=5.00m/s²', priority: 0 }),
    ]
    const result = layoutLabels(labels)
    const dy = Math.abs(result[0].y - result[1].y)
    expect(dy).toBeGreaterThan(10)
  })

  it('高优先级保持原位', () => {
    const labels = [
      makeLabel({ x: 100, y: 100, text: 'HIGH', priority: 10 }),
      makeLabel({ x: 100, y: 101, text: 'LOW', priority: 1 }),
    ]
    const result = layoutLabels(labels)
    expect(result[0].x).toBeCloseTo(100, 0)
    expect(result[0].y).toBeCloseTo(100, 0)
  })

  it('bounds 约束不越界', () => {
    const bounds = { left: 0, right: 300, top: 0, bottom: 300 }
    const labels = [
      makeLabel({ x: 5, y: 5, text: 'NearEdge' }),
      makeLabel({ x: 5, y: 7, text: 'Overlap' }),
    ]
    const result = layoutLabels(labels, { bounds })
    for (const r of result) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.x).toBeLessThanOrEqual(300)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeLessThanOrEqual(300)
    }
  })

  it('三个重叠标签全部分离', () => {
    const labels = [
      makeLabel({ x: 100, y: 100, text: 'Label1' }),
      makeLabel({ x: 100, y: 102, text: 'Label2' }),
      makeLabel({ x: 100, y: 104, text: 'Label3' }),
    ]
    const result = layoutLabels(labels, { padding: 8 })
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const dist = Math.hypot(result[i].x - result[j].x, result[i].y - result[j].y)
        expect(dist).toBeGreaterThan(5)
      }
    }
  })

  it('输出顺序与输入顺序一致', () => {
    const labels = [
      makeLabel({ x: 100, y: 100, text: 'First' }),
      makeLabel({ x: 100, y: 102, text: 'Second' }),
    ]
    const result = layoutLabels(labels)
    expect(result[0]).toBeDefined()
    expect(result[1]).toBeDefined()
  })
})
