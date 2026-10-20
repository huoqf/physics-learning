/**
 * 参数词表 — 「参数键 → 中文名 + 单位」的唯一出处。
 *
 * 背景：右屏看板在物理量构建器异步加载完成前需要先渲染兜底内容。兜底内容
 * 必须只用**该动画自己声明过**的参数名，绝不能按裸键去猜：
 *
 * - 板块模型的 `L` 是木板长度，电磁振荡的 `L` 才是电感；
 * - 远距离输电的 `k` 是降压变比，简谐运动的 `k` 才是劲度系数。
 *
 * 任何"全局按键映射"都必然串域（历史上把 2.50 m 的木板长度显示成了「电感 L」、
 * 把 0.02 的变比显示成了「劲度系数 k」）。注册表里的 `paramMeta` / `controlMeta`
 * 本来就已经写好了每个键的中文名与单位，兜底直接读它即可，不要再另造一份。
 */
import type { ControlMeta, ParamMeta } from './types'

export interface ParamVocabEntry {
  label: string
  unit?: string
}

/** showIf / hideIf 的条件求值——左屏控件与右屏兜底共用这一份实现 */
export function matchesConditionValue(
  actual: number | undefined,
  expected: number | readonly number[],
): boolean {
  if (Array.isArray(expected)) {
    return actual != null && (expected as readonly number[]).includes(actual)
  }
  return actual === expected
}

interface ConditionalEntry {
  showIf?: string
  showIfValue?: number | readonly number[]
  hideIf?: string
  hideIfValue?: number | readonly number[]
}

/** 按 showIf / hideIf 判断条目在当前参数下是否可见 */
export function isEntryVisible(entry: ConditionalEntry, params: Record<string, number>): boolean {
  if (entry.showIf) {
    if (entry.showIfValue != null) {
      if (!matchesConditionValue(params[entry.showIf], entry.showIfValue)) return false
    } else if (!params[entry.showIf]) {
      return false
    }
  }
  if (entry.hideIf && entry.hideIfValue != null) {
    if (matchesConditionValue(params[entry.hideIf], entry.hideIfValue)) return false
  }
  return true
}

/**
 * 建立该动画的参数词表。
 *
 * 收录两类键：
 * - `paramMeta`：带 min/max 的连续可调物理参数，标签与单位最完整；
 * - 有中文名的 `segmented` / `modeGrid` 控件：离散的物理场景量（木板长度、电流方向、电荷符号…），
 *   它们的取值本身就是物理量，必须能显示。
 *
 * 不收录 `toggle` / `preset` / `tip` / `action` / `storeToggle`：这些是交互与显示开关，
 * 不属于物理量，塞进看板只是噪声。**没有声明 `label` 的 segmented 同样不收录**——
 * 例如斜抛的 `advancedMode` / `viewMode` 是模式档位而非物理量，拿键名当标签只会让
 * 看板重新长出英文。
 *
 * 词表里没有的键一律不进看板——它们是该动画的实现细节（`modelIdx`、`deltaT` 之类），
 * 对学生无意义。
 */
export function buildParamVocabulary(
  paramMeta: ParamMeta[] | undefined,
  controlMeta: ControlMeta[] | undefined,
  params: Record<string, number>,
): Map<string, ParamVocabEntry> {
  const vocab = new Map<string, ParamVocabEntry>()

  for (const meta of paramMeta ?? []) {
    if (!isEntryVisible(meta, params)) continue
    vocab.set(meta.key, { label: meta.label, unit: meta.unit })
  }

  for (const control of controlMeta ?? []) {
    if (control.type !== 'segmented' && control.type !== 'modeGrid') continue
    if (vocab.has(control.key)) continue
    if (!control.label) continue
    if (!isEntryVisible(control, params)) continue
    vocab.set(control.key, { label: control.label })
  }

  return vocab
}
