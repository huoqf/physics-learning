import { describe, it, expect } from 'vitest'
import { placeBeside, clampAnchoredX } from '@/utils/labelFit'
import { estimateTextWidth, sparsifyTickLabels } from '@/utils/tickLayout'
import { getPointsUpToTime } from '@/utils/chartData'
import { getVisibleRows } from '@/utils/scrollingTable'

describe('utils/tickLayout · 文字宽度估算与刻度防重抽稀', () => {
  it('中文按 1em、ASCII 按 0.6em 估算宽度', () => {
    expect(estimateTextWidth('AB', 10)).toBeCloseTo(12, 10)
    expect(estimateTextWidth('电流', 10)).toBeCloseTo(20, 10)
    expect(estimateTextWidth('I=2A', 10)).toBeCloseTo(24, 10)
  })

  it('互相撞车的刻度抽稀，且必留项 keep: true 优先占坑不被挤掉', () => {
    const kept = sparsifyTickLabels([
      { label: '100', x: 100, y: 50, fontSize: 12 }, // 与后面的 keep 项撞车
      { label: '1500Ω', x: 104, y: 50, fontSize: 12, keep: true },
      { label: '', x: 200, y: 50, fontSize: 12 }, // 空串忽略
      { label: '0', x: 300, y: 50, fontSize: 12 }, // 独立不碰撞
    ])
    expect(kept).toEqual([1, 3])
  })
})

describe('utils/labelFit · 标注自动翻边与界内夹紧', () => {
  const bounds = { left: 0, right: 200 }

  it('惯用侧放得下时不翻边，靠边放不下时翻到另一侧', () => {
    const rightNormal = placeBeside({ x: 50, text: 'v=5', fontSize: 12, prefer: 'right', bounds })
    expect(rightNormal).toEqual({ x: 62, anchor: 'start' })

    // 图形在最右端，写右侧溢出 -> 翻到左侧 end 对齐
    const flipLeft = placeBeside({ x: 190, text: 'F_安=2.25N', fontSize: 12, prefer: 'right', bounds })
    expect(flipLeft).toEqual({ x: 178, anchor: 'end' })

    // 图形在最左端、prefer='left' 放不下 -> 翻到右侧 start 对齐
    const flipRight = placeBeside({ x: 10, text: 'F_安=2.25N', fontSize: 12, prefer: 'left', bounds })
    expect(flipRight).toEqual({ x: 22, anchor: 'start' })
  })

  it('两侧都放不下时取溢出更小侧并夹回安全边界内', () => {
    const tightBounds = { left: 0, right: 80 }
    // 文字宽 50.4px（< 可用宽 68px）；x=35 偏左故右侧溢出更小（start 锚点左移），x=45 偏右故左侧溢出更小（end 锚点右移）
    const resNearLeft = placeBeside({ x: 35, text: '1234567', fontSize: 12, prefer: 'left', bounds: tightBounds })
    expect(resNearLeft.anchor).toBe('start')
    expect(resNearLeft.x).toBeGreaterThanOrEqual(6)

    const resNearRight = placeBeside({ x: 45, text: '1234567', fontSize: 12, prefer: 'right', bounds: tightBounds })
    expect(resNearRight.anchor).toBe('end')
    expect(resNearRight.x).toBeLessThanOrEqual(74)

    // 文字宽超过整个画布时退回原始 anchor
    const huge = placeBeside({ x: 40, text: '123456789012345', fontSize: 12, prefer: 'right', bounds: tightBounds })
    expect(huge.anchor).toBe('start')
  })

  it('clampAnchoredX 不翻边只平移以保证轴名留在画布内', () => {
    // 左对齐贴右越界 -> 左移
    expect(clampAnchoredX(190, 'ABCD', 10, 'start', bounds, 4)).toBeCloseTo(172, 10)
    // 右对齐贴左越界 -> 右移
    expect(clampAnchoredX(10, 'ABCD', 10, 'end', bounds, 4)).toBeCloseTo(28, 10)
    // 居中在边界内不动
    expect(clampAnchoredX(100, 'ABCD', 10, 'middle', bounds, 4)).toBe(100)
  })
})

describe('utils/chartData & scrollingTable · 时序截断插值与滚动表', () => {
  it('getPointsUpToTime 空数组、首端、中间线性插值与超出末端截断', () => {
    expect(getPointsUpToTime([], 5)).toEqual([])
    const pts = [
      { t: 0, v: 0 },
      { t: 2, v: 10 },
      { t: 4, v: 20 },
    ]
    expect(getPointsUpToTime(pts, 0)).toEqual([{ t: 0, v: 0 }])
    expect(getPointsUpToTime(pts, 3)).toEqual([
      { t: 0, v: 0 },
      { t: 2, v: 10 },
      { t: 3, v: 15 },
    ])
    expect(getPointsUpToTime(pts, 6)).toEqual([
      { t: 0, v: 0 },
      { t: 2, v: 10 },
      { t: 4, v: 20 },
      { t: 6, v: 20 },
    ])
  })

  it('getVisibleRows 仅保留最后 maxRows 条并返回末尾高亮下标', () => {
    expect(getVisibleRows([], 5)).toEqual({ visibleRows: [], highlightIndex: -1 })
    expect(getVisibleRows([1, 2, 3, 4, 5], 3)).toEqual({
      visibleRows: [3, 4, 5],
      highlightIndex: 2,
    })
  })
})
