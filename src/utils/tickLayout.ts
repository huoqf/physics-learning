/**
 * tickLayout — 刻度标签「按实际宽度抽稀」的共享件
 *
 * 为什么需要：本项目多数刻度是「按物理量均匀选点」画出来的——物理上均匀，
 * 屏幕上却不均匀。非线性刻度尤其致命：
 *   - 欧姆表 `R = 1500/(1500+x)`，`x` 从 5k 到 100k 的整段只占 3° 弧长，
 *     `50k` / `100k` / `∞` 三个标签叠在一起（`anim-multimeter-ohm`）；
 *   - `DialMeter` 的 `0 / 250 / 500` 在 50px 盘面上只有 2° 间距。
 * 这类问题**不能靠删信息解决，也不能靠挪坐标**——刻度位置由物理决定，挪了就是错的。
 * 正确做法跟真实器材一致：**能画下的才画，画不下的不画**。MF-47 的欧姆档本来
 * 就只标少数几个值，中间大量刻度只有刻线没有数字。
 *
 * 判据用**轴对齐矩形相交**而不是"两点距离"：标签沿弧线排布时，相邻两个可能
 * 只差 2px 但方向不同；用圆心距离判会同时漏掉"横向挤"和"纵向叠"两种情况。
 *
 * ⚠️ 必须能指定「必留项」（中值刻度、端点值）。欧姆表的 `1500Ω` 是中值电阻，
 * 是欧姆表原理的核心读数，抽稀时不能被挤掉——它比旁边的 `2k` 重要得多。
 */

/** 估算一段文字的像素宽度：等宽字体下拉丁 0.6em、CJK 1em（与 RelationChart 同一口径） */
export function estimateTextWidth(text: string, fontSize: number): number {
  return [...text].reduce(
    (w, ch) => w + (/[\u2E80-\u9FFF\uFF00-\uFFEF]/.test(ch) ? fontSize : fontSize * 0.6),
    0,
  )
}

export interface TickLabel {
  /** 标签文案（空串表示这个刻度本来就不出数字，直接跳过） */
  label: string
  /** 标签中心点的设计坐标 */
  x: number
  y: number
  /** 字号（设计坐标单位） */
  fontSize: number
  /** 必留：优先级最高，先占位，后续标签绕开它 */
  keep?: boolean
}

/**
 * 按矩形相交抽稀刻度标签，返回**保留下来的下标**（保持原顺序）。
 *
 * @param items 标签列表（顺序即绘制顺序，也决定同优先级下的保留倾向：靠前优先）
 * @param gap   两个标签墨迹之间至少要留的像素距离，默认 3
 */
export function sparsifyTickLabels(items: TickLabel[], gap = 3): number[] {
  const kept: number[] = []
  const boxes: { left: number; right: number; top: number; bottom: number }[] = []

  const tryPlace = (i: number): boolean => {
    const it = items[i]
    if (!it.label) return false
    const w = estimateTextWidth(it.label, it.fontSize)
    // 文字外框高约 1.3 倍字号，取半高做上下边界（与 §2.7 的判定口径一致）
    const h = it.fontSize * 1.3
    const box = {
      left: it.x - w / 2 - gap / 2,
      right: it.x + w / 2 + gap / 2,
      top: it.y - h / 2 - gap / 2,
      bottom: it.y + h / 2 + gap / 2,
    }
    const hit = boxes.some(
      (b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top,
    )
    if (hit) return false
    boxes.push(box)
    kept.push(i)
    return true
  }

  // 第一轮：必留项先占位（它们挤掉别人，而不是被别人挤掉）
  items.forEach((it, i) => {
    if (it.keep) tryPlace(i)
  })
  // 第二轮：其余按原顺序尽量保留
  items.forEach((it, i) => {
    if (!it.keep) tryPlace(i)
  })

  return kept.sort((a, b) => a - b)
}
