import { describe, it, expect } from 'vitest'
import { pointerXToPhysX } from '../pointerXToPhysX'

/** 圆心卡片实测几何：SVG 用户宽 650，实际 CSS 宽被容器压到 520 */
const BASE = {
  rectWidth: 520,
  viewWidth: 650,
  plotLeft: 50,
  plotWidth: 570,
  domain: [0, 33.33] as const,
}
/** 用户单位 → CSS 像素的换算系数（650/520 = 1.25） */
const toCss = (userX: number) => userX / 1.25

describe('pointerXToPhysX', () => {
  it('绘图区左边界对应 domain 下界，右边界对应上界', () => {
    const left = pointerXToPhysX({ ...BASE, offsetX: toCss(50) })
    expect(left).not.toBeNull()
    expect(left!.x).toBeCloseTo(0, 10)
    expect(left!.inside).toBe(true)

    const right = pointerXToPhysX({ ...BASE, offsetX: toCss(50 + 570) })
    expect(right!.x).toBeCloseTo(33.33, 10)
    expect(right!.inside).toBe(true)
  })

  it('绘图区中点给出 domain 中点（扣除轴留白后的真正中点）', () => {
    const mid = pointerXToPhysX({ ...BASE, offsetX: toCss(50 + 570 / 2) })
    expect(mid!.x).toBeCloseTo(33.33 / 2, 10)
    expect(mid!.inside).toBe(true)
  })

  it('按 rectWidth/viewWidth 比例换算，不假设 CSS 宽等于 SVG 用户宽', () => {
    // 同一用户单位位置，在 CSS 宽被压缩后应给出同一个物理值
    const a = pointerXToPhysX({ ...BASE, rectWidth: 650, offsetX: 335 })
    const b = pointerXToPhysX({ ...BASE, rectWidth: 520, offsetX: toCss(335) })
    expect(a!.x).toBeCloseTo(b!.x, 10)
  })

  it('落在左轴留白内：inside=false 且贴住下界', () => {
    const hit = pointerXToPhysX({ ...BASE, offsetX: toCss(20) })
    expect(hit!.inside).toBe(false)
    expect(hit!.x).toBe(0)
  })

  it('拖出绘图区右侧：inside=false 且贴上界（供拖拽贴边继续）', () => {
    const hit = pointerXToPhysX({ ...BASE, offsetX: toCss(50 + 570 + 30) })
    expect(hit!.inside).toBe(false)
    expect(hit!.x).toBeCloseTo(33.33, 10)
  })

  it('支持非零下界与负区间', () => {
    const hit = pointerXToPhysX({
      ...BASE,
      plotLeft: 40,
      plotWidth: 560,
      domain: [-10, 10],
      offsetX: toCss(40 + 280),
    })
    expect(hit!.x).toBeCloseTo(0, 10)
    expect(hit!.inside).toBe(true)
  })

  it('几何退化时返回 null，调用方应忽略该事件', () => {
    expect(pointerXToPhysX({ ...BASE, offsetX: 10, rectWidth: 0 })).toBeNull()
    expect(pointerXToPhysX({ ...BASE, offsetX: 10, viewWidth: 0 })).toBeNull()
    expect(pointerXToPhysX({ ...BASE, offsetX: 10, plotWidth: 0 })).toBeNull()
    expect(pointerXToPhysX({ ...BASE, offsetX: Number.NaN })).toBeNull()
  })
})
