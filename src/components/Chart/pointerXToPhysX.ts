/**
 * 图表指针坐标 → 物理 X 值（纯函数）。
 *
 * 图表里同时存在三套横坐标：CSS 像素（指针）、SVG 用户单位（绘图区几何）、物理量（xDomain）。
 * 把指针位置换算成物理 X **必须扣除坐标轴留白**（左边距 + 右轴/标签区），否则拖拽点会整体
 * 偏向刻度线左侧——卡片越窄、留白占比越大，偏差越明显。
 *
 * 这套换算此前散落在各页面的手写实现里：圆心卡片用布局常量 40/15 px 近似真实图区，
 * 引力/卫星页直接拿整张卡片宽度当横轴，两者都会把点击位置映射到错误的物理值。
 * 本模块将其收口为唯一实现，由图表组件在内部调用，调用方只接收物理量。
 */

export interface PointerXToPhysXInput {
  /** 指针相对 SVG 元素左边界的 CSS 像素偏移 */
  offsetX: number
  /** SVG 元素的 CSS 宽度（getBoundingClientRect().width） */
  rectWidth: number
  /** SVG 用户单位宽度（width 属性 / viewBox 宽度） */
  viewWidth: number
  /** 绘图区左边界（用户单位，等于左轴留白） */
  plotLeft: number
  /** 绘图区宽度（用户单位，不含左右留白） */
  plotWidth: number
  /** X 轴物理范围 */
  domain: readonly [number, number]
}

export interface PhysXHit {
  /** 指针处的物理 X（已限制在 domain 内，便于拖拽越界时贴边） */
  x: number
  /** 指针是否落在绘图区内（落在轴留白/刻度标签区时为 false） */
  inside: boolean
}

/**
 * 换算指针位置对应的物理 X。
 * 几何退化（容器宽为 0、绘图区宽为 0 等）时返回 null，调用方应忽略本次事件。
 */
export function pointerXToPhysX(input: PointerXToPhysXInput): PhysXHit | null {
  const { offsetX, rectWidth, viewWidth, plotLeft, plotWidth, domain } = input
  if (!Number.isFinite(offsetX)) return null
  if (!(rectWidth > 0) || !(viewWidth > 0) || !(plotWidth > 0)) return null

  const [lo, hi] = domain
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null

  // CSS 像素 → SVG 用户单位（svg 带 w-full/h-full，实际 CSS 宽度可能与 width 属性不等）
  const userX = offsetX * (viewWidth / rectWidth)
  const frac = (userX - plotLeft) / plotWidth
  const raw = lo + frac * (hi - lo)

  return {
    x: Math.min(hi, Math.max(lo, raw)),
    inside: frac >= 0 && frac <= 1,
  }
}
