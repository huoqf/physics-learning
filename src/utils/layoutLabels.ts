/**
 * 轻量标签避让工具 — 解决 SVG 场景中多个 <text> 标签位置重叠问题
 *
 * 设计原则：
 * 1. 纯函数，无副作用，输入期望位置输出调整后位置
 * 2. 按 priority 降序排列，高优先级先占位，低优先级自动偏移
 * 3. 候选偏移顺序固定，避免动画帧间抖动
 * 4. 估算 bbox 基于 fontSize 和字符数，不依赖 DOM 测量
 */

export interface LabelSlot {
  /** 期望 X 坐标（文本锚点位置） */
  x: number
  /** 期望 Y 坐标（文本基线位置） */
  y: number
  /** 标签文本 */
  text: string
  /** 字号（像素） */
  fontSize: number
  /** 文本锚点，默认 'middle' */
  anchor?: 'start' | 'middle' | 'end'
  /** 优先级，数值越大越优先保持原位，默认 0 */
  priority?: number
}

export interface LayoutBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export interface LayoutOptions {
  bounds?: LayoutBounds
  padding?: number
}

interface BBox {
  left: number
  top: number
  right: number
  bottom: number
}

function textBBox(x: number, y: number, text: string, fontSize: number, anchor: string): BBox {
  const w = text.length * fontSize * 0.6 + 4
  const h = fontSize * 1.4
  let left: number
  if (anchor === 'start') left = x
  else if (anchor === 'end') left = x - w
  else left = x - w / 2
  return { left, top: y - h, right: left + w, bottom: y + h * 0.3 }
}

function overlaps(a: BBox, b: BBox, pad: number): boolean {
  return !(
    a.right + pad <= b.left ||
    b.right + pad <= a.left ||
    a.bottom + pad <= b.top ||
    b.bottom + pad <= a.top
  )
}

function clampY(y: number, bbox: BBox, bounds?: LayoutBounds): number {
  if (!bounds) return y
  const height = bbox.bottom - bbox.top
  const minY = bounds.top + height
  const maxY = bounds.bottom
  return Math.max(minY, Math.min(maxY, y))
}

const OFFSETS = [
  { dx: 0, dy: 0 },
  { dx: 0, dy: -2 },
  { dx: 0, dy: 2 },
  { dx: 0, dy: -3.5 },
  { dx: 0, dy: 3.5 },
  { dx: 1, dy: -2.5 },
  { dx: -1, dy: -2.5 },
]

export function layoutLabels(
  labels: LabelSlot[],
  options?: LayoutOptions,
): { x: number; y: number }[] {
  const pad = options?.padding ?? 4
  const bounds = options?.bounds

  const sorted = labels
    .map((label, i) => ({ label, idx: i, pri: label.priority ?? 0 }))
    .sort((a, b) => b.pri - a.pri)

  const placed: BBox[] = []
  const out: { x: number; y: number }[] = new Array(labels.length)

  for (const { label, idx } of sorted) {
    const anchor = label.anchor ?? 'middle'
    const unit = label.fontSize

    let bestY = label.y
    let found = false

    for (const off of OFFSETS) {
      const tryY = label.y + off.dy * unit
      const tryX = label.x + off.dx * unit
      const bbox = textBBox(tryX, tryY, label.text, label.fontSize, anchor)
      const clampedY = clampY(tryY, bbox, bounds)
      const finalBbox = textBBox(tryX, clampedY, label.text, label.fontSize, anchor)

      if (!placed.some((p) => overlaps(finalBbox, p, pad))) {
        bestY = clampedY
        placed.push(finalBbox)
        found = true
        break
      }
    }

    if (!found) {
      const bbox = textBBox(label.x, label.y, label.text, label.fontSize, anchor)
      placed.push(bbox)
    }

    out[idx] = { x: label.x, y: bestY }
  }

  return out
}
