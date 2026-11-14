import type { CriticalTimePoint } from '@/data/types'

/**
 * 临界时刻的刻度对齐（播放条网格 = 0.01 s）。
 *
 * 为什么要对齐：进度滑块的步长是 0.01 s，临界点标记与「一键定格」都把时刻写进
 * 同一个 time 状态。标记若落在网格之外，点标记与拖滑块会得到两个不同的帧，
 * 学生看到画面与标签对不上。
 *
 * 为什么要方向：`toFixed(2)` 也能落到网格上，但它四舍五入，落到事件哪一侧是
 * 随机的 —— 而定格帧能不能自证，恰恰取决于这一点：
 *
 *   · 相变点（共速、抛体最高点、电荷为零）→ **向右** after
 *     落在事件之前，画面还是变化前的旧状态：摩擦力没突变、vy 还没归零，
 *     标签说的那件事在画面里根本没发生。
 *   · 离场点（离开传送带、落地、滑出木板）→ **向左** before
 *     落在事件之后，物块已经不在画面里，定格等于定格了一个空场。
 *   · 读数点（t = τ、T/4 这类「看此刻的值」）→ **就近** nearest
 *     两侧是同一状态的邻域，取最近的一格标签才最准。
 */

/** 进度条滑块步长，与本文件所有对齐结果的网格一致 */
export const CRITICAL_TIME_STEP = 0.01

export type CriticalAlign = 'after' | 'before' | 'nearest'

/**
 * 把一个物理上算出来的临界时刻对齐到播放条网格。
 *
 * @param t 原始时刻（秒），允许非有限值（原样返回，调用方自行过滤）
 * @param align 对齐方向，默认 after（相变点）
 * @returns 落在 0.01 s 网格上的时刻（秒）
 */
export function alignCriticalTime(t: number, align: CriticalAlign = 'after'): number {
  if (!Number.isFinite(t)) return t
  const scaled = t / CRITICAL_TIME_STEP
  /*
   * after 减一点、before 加一点，再取整：
   * 恰好落在刻度上的时刻（1.53 这种）不该被推开一格 —— 153.0000001 会被 ceil
   * 推到 154，而 152.9999999 才留在 153。反过来 for before 同理。
   */
  const EPS = 1e-9
  const steps =
    align === 'after'
      ? Math.ceil(scaled - EPS)
      : align === 'before'
        ? Math.floor(scaled + EPS)
        : Math.round(scaled)
  // 用 steps / 100 而不是 steps * 0.01：后者会带出 1.5300000000000002 这类尾数
  return steps / 100
}

export interface RawCriticalPoint {
  rawTime: number
  label: string
  align?: CriticalAlign
  variant?: CriticalTimePoint['variant']
  autoPause?: boolean
}

/**
 * 统一将原始物理时刻列表对齐到 0.01s 网格、过滤 (0, maxTime] 有效区间、
 * 按时间升序排序并合并间距不足 minGap 秒的重合时刻（保留优先级更高的前者）。
 */
export function finalizeCriticalPoints(
  rawPoints: RawCriticalPoint[],
  maxTime: number,
  minGap = 0.02,
): CriticalTimePoint[] {
  const mapped: CriticalTimePoint[] = []
  for (const pt of rawPoints) {
    if (!Number.isFinite(pt.rawTime) || pt.rawTime <= 0) continue
    const aligned = alignCriticalTime(pt.rawTime, pt.align ?? 'after')
    if (!Number.isFinite(aligned) || aligned <= 0) continue
    if (maxTime > 0 && aligned > maxTime + 1e-9) continue
    mapped.push({
      time: aligned,
      label: pt.label,
      variant: pt.variant,
      autoPause: pt.autoPause,
    })
  }
  mapped.sort((a, b) => a.time - b.time)
  const deduped: CriticalTimePoint[] = []
  for (const pt of mapped) {
    const prev = deduped[deduped.length - 1]
    if (prev && Math.abs(pt.time - prev.time) < minGap) {
      if (pt.autoPause && !prev.autoPause) {
        deduped[deduped.length - 1] = pt
      }
      continue
    }
    deduped.push(pt)
  }
  return deduped
}
