/**
 * labelFit —— 「贴着图形写的标注」永远落在画布内
 *
 * 场景里大量标注是这么定位的：`x = rodDesign.px - 35, textAnchor: 'end'`
 * （在导体棒左侧 35px 处右对齐地写 `F_安 = 2.25 N`）。这套写法默认
 * 「图形左边永远有空」——而这句话只在图形位于画面中部时成立：
 *
 *   - 导体棒从 x=0 起步时，它左边就是画布左边缘，整行字被推出画布；
 *   - 同理图形走到右端时，右侧的标注被右边缘推出去。
 *
 * 这类问题压字守卫查不出来：被推出去的字和谁都不重叠，它只是不在画面里
 * （见 §2.7 的「被裁」判据）。逐处把坐标改小也治不了本，因为图形是会动的。
 *
 * 解法是让标注自己带「有没有位置」的判断：优先放在惯用侧，放不下就翻到另一侧，
 * 两侧都放不下才夹回界内（此时宁可压住图形，也不能跑到画布外消失）。
 *
 * 注意宽度用的是估算（`estimateTextWidth`，与刻度抽稀同一口径），
 * 比 `getBBox` 多留一点余量，宁可早一点翻边，也不要卡在边缘上。
 */

import { estimateTextWidth } from './tickLayout'

export interface HorizontalBounds {
  left: number
  right: number
}

export interface PlaceBesideOptions {
  /** 图形上的锚点 x */
  x: number
  /** 标注文字（用来估宽） */
  text: string
  /** 字号（与渲染时的 fontSize 一致） */
  fontSize: number
  /** 惯用侧：标注默认写在图形的右边还是左边 */
  prefer: 'right' | 'left'
  /** 画布（或可视区）横向边界 */
  bounds: HorizontalBounds
  /** 标注与图形之间的间隙，默认 12 */
  gap?: number
  /** 距画布边界的安全距，默认 6 */
  pad?: number
}

export interface PlacedLabel {
  x: number
  anchor: 'start' | 'end'
}

/**
 * 求「在图形旁边写一行字」的 x 与 textAnchor。
 *
 * 返回值直接喂给 `<text x={...} textAnchor={...}>`，不要再自己加偏移。
 */
export function placeBeside({
  x,
  text,
  fontSize,
  prefer,
  bounds,
  gap = 12,
  pad = 6,
}: PlaceBesideOptions): PlacedLabel {
  const w = estimateTextWidth(text, fontSize)

  const candidates: (PlacedLabel & { left: number; right: number })[] = [
    { x: x + gap, anchor: 'start', left: x + gap, right: x + gap + w },
    { x: x - gap, anchor: 'end', left: x - gap - w, right: x - gap },
  ]
  const ordered = prefer === 'right' ? candidates : [candidates[1], candidates[0]]

  for (const c of ordered) {
    if (c.left >= bounds.left + pad && c.right <= bounds.right - pad) {
      return { x: c.x, anchor: c.anchor }
    }
  }

  // 两侧都放不下：取溢出更小的一侧，再整体夹回界内
  // （比画布还宽的标注，夹回来至少能看见开头/结尾的一部分）
  const [best] = [...ordered].sort(
    (a, b) =>
      Math.max(0, bounds.left + pad - a.left) + Math.max(0, a.right - (bounds.right - pad)) -
      (Math.max(0, bounds.left + pad - b.left) + Math.max(0, b.right - (bounds.right - pad))),
  )
  const overflowLeft = Math.max(0, bounds.left + pad - best.left)
  const overflowRight = Math.max(0, best.right - (bounds.right - pad))
  if (overflowLeft > 0 && overflowRight <= 0) {
    return { x: best.x + overflowLeft, anchor: best.anchor }
  }
  if (overflowRight > 0 && overflowLeft <= 0) {
    return { x: best.x - overflowRight, anchor: best.anchor }
  }
  return { x: best.x, anchor: best.anchor }
}

/**
 * 把一行以 `anchor` 定位的文字夹回 [left, right] 内（不翻转，只平移）。
 *
 * 用于「位置由物理量决定、不能翻边」的轴名/刻度类标注：它们必须待在自己的
 * 那个位置附近，翻到另一侧会指错对象，只能平移。
 */
export function clampAnchoredX(
  x: number,
  text: string,
  fontSize: number,
  anchor: 'start' | 'middle' | 'end',
  bounds: HorizontalBounds,
  pad = 4,
): number {
  const w = estimateTextWidth(text, fontSize)
  const inkLeft = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
  if (inkLeft < bounds.left + pad) return x + (bounds.left + pad - inkLeft)
  const inkRight = inkLeft + w
  if (inkRight > bounds.right - pad) return x - (inkRight - (bounds.right - pad))
  return x
}
