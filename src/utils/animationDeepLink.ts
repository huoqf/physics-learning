import type { CriticalTimePoint } from '@/data/types'

/**
 * 深链保留键：不作为动画参数解析。
 *
 * 这四个键有各自语义（`params` = JSON 参数包、`t` = 定格秒数、`critical` = 临界帧选择、
 * `reason` = 错因 id，用于在定格条上说明来意），它们出现在 URL 里绝不代表
 * "这个动画有一个同名参数"。全仓所有读取 URL 查询串的地方
 * （`AnimationPage`、`useAnimationLifecycle`）都必须用同一个集合过滤 —— 曾经两处各自
 * 实现，生命周期那侧漏了守卫，`?t=1.84` 就被当成参数 `t=1.84` 灌进了 params。
 */
export const RESERVED_QUERY_KEYS: ReadonlySet<string> = new Set([
  'params',
  't',
  'critical',
  'reason',
])

/**
 * 从查询串里取出「顶层键值形式」的动画参数覆盖（`?v0=5&m=1`）。
 *
 * 两道闸门缺一不可：
 *   ① 跳过保留键 —— `?t=1.84` 是定格秒数，不是"动画参数 t=1.84"；
 *   ② 只接受该动画 `defaultParams` 声明过的键 —— 任意查询串（`?foo=1`、统计用的
 *      `?utm_source=`）都不该污染参数表。
 *
 * 为什么抽成函数：这段逻辑原先在 `AnimationPage` 与 `useAnimationLifecycle` 各写一遍，
 * 生命周期那侧漏了 guard，`?t=` 就被当成参数灌进了 store。**同一条规则写两遍就会漏一遍**，
 * 所以只留这一个真源。
 */
export function parseUrlParamOverrides(
  search: string,
  defaultParams: Record<string, number>,
): Record<string, number> {
  const overrides: Record<string, number> = {}
  new URLSearchParams(search).forEach((value, key) => {
    if (RESERVED_QUERY_KEYS.has(key)) return
    if (!(key in defaultParams)) return
    const num = Number(value)
    if (Number.isFinite(num)) overrides[key] = num
  })
  return overrides
}

/**
 * 解析动画 URL 查询串中的全部参数覆盖（顶层键值 `?v0=5` + JSON `?params={...}`）。
 *
 * JSON 参数优先级高于顶层键值；未解析到有效 JSON 时只应用顶层键值，保证与历史链接兼容。
 */
export function resolveUrlMergedParams(
  search: string,
  defaultParams: Record<string, number>,
): {
  mergedParams: Record<string, number>
  hasOverrides: boolean
} {
  const flatParams = parseUrlParamOverrides(search, defaultParams)
  const sp = new URLSearchParams(search)
  const customParamsStr = sp.get('params')
  let jsonParams: Record<string, number> = {}
  if (customParamsStr) {
    try {
      const parsed = JSON.parse(decodeURIComponent(customParamsStr))
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            jsonParams[k] = v
          }
        }
      }
    } catch {
      // 忽略畸形 JSON 参数，降级走默认与平铺参数
    }
  }
  const hasOverrides = Object.keys(flatParams).length > 0 || Object.keys(jsonParams).length > 0
  return {
    mergedParams: { ...defaultParams, ...flatParams, ...jsonParams },
    hasOverrides,
  }
}

/**
 * 动画深链「定格帧」参数解析 —— 纯函数，无 React / Store 依赖。
 *
 * 为什么需要它：
 *   错因打靶台、错题本、真题解析都需要「这条动画的这个临界瞬间」——
 *   即一键跳到 `t = t_共速` 这样的定格帧。若靠组件间传 prop，
 *   每个入口都要改一遍动画页；用 URL 传参可让所有入口零耦合复用。
 *
 * 支持的查询参数（与既有 `?params=` 并存）：
 *   `?t=1.84`            → 定格到 1.84 s（自动暂停、自动 clamp 到时长内）
 *   `?critical=first`    → 定格到该动画声明的第一个临界时刻
 *   `?critical=last`     → 定格到最后一个临界时刻
 *   `?critical=2`        → 定格到第 3 个临界时刻（0 基索引，越界则忽略）
 *
 * 设计取舍：
 *   - `t` 必须 clamp 到 [0, maxTime]，否则进度条百分比与图表 domain 会越界；
 *   - 临界时刻统一按时间升序再取 first/last，避免注册表书写顺序影响语义；
 *   - 只有「有限、为正、且在时长内」的临界时刻才参与选择——注册表里的
 *     `Infinity`（事件在观察窗口内不发生）必须被丢弃，否则会停在一个永远到不了的时刻。
 */
export interface DeepLinkTimeResult {
  /** 定格时刻（秒），已 clamp 到 [0, maxTime] */
  time: number
  /** 定格语义来源，便于 UI 显示「已定格：恰好共速」 */
  source: 'explicit' | 'critical'
  /** 临界时刻自带的说明文案（source === 'critical' 时可能有） */
  label?: string
}

export interface ResolveDeepLinkTimeOptions {
  /** URL `?t=` 原始值 */
  tParam: string | null
  /** URL `?critical=` 原始值 */
  criticalParam: string | null
  /** 注册表声明的临界时刻（可为函数式） */
  criticalTimes?: CriticalTimePoint[] | ((params: Record<string, number>) => CriticalTimePoint[])
  /** 用于求值的参数（须为「合成后的最终参数」，不是 store 里的旧值） */
  params: Record<string, number>
  /** 当前动画最大时长（秒） */
  maxTime: number
}

/** 取出可用于定格的有效临界时刻（升序） */
export function pickCriticalTimes(
  criticalTimes: ResolveDeepLinkTimeOptions['criticalTimes'],
  params: Record<string, number>,
  maxTime: number,
): CriticalTimePoint[] {
  if (!criticalTimes) return []
  const list = typeof criticalTimes === 'function' ? criticalTimes(params) : criticalTimes
  if (!Array.isArray(list)) return []

  return list
    .filter((ct) => ct && Number.isFinite(ct.time) && ct.time > 0 && ct.time <= maxTime)
    .slice()
    .sort((a, b) => a.time - b.time)
}

/**
 * 解析深链定格时刻。
 *
 * @returns 需要定格时返回结果；无有效参数时返回 null（保持原有播放行为）
 */
export function resolveDeepLinkTime({
  tParam,
  criticalParam,
  criticalTimes,
  params,
  maxTime,
}: ResolveDeepLinkTimeOptions): DeepLinkTimeResult | null {
  const duration = Number.isFinite(maxTime) && maxTime > 0 ? maxTime : 0
  const clamp = (t: number) => Math.min(duration, Math.max(0, t))

  // ① 临界时刻优先（语义更强：'last' 在事件数变化时仍指向真正最后一个）
  if (criticalParam != null && criticalParam !== '') {
    const points = pickCriticalTimes(criticalTimes, params, duration)
    if (points.length > 0) {
      const idx =
        criticalParam === 'first'
          ? 0
          : criticalParam === 'last'
            ? points.length - 1
            : Number.parseInt(criticalParam, 10)
      if (Number.isInteger(idx) && idx >= 0 && idx < points.length) {
        return { time: points[idx].time, source: 'critical', label: points[idx].label }
      }
    }
  }

  // ② 显式秒数
  if (tParam != null && tParam !== '') {
    const parsed = Number.parseFloat(tParam)
    if (Number.isFinite(parsed)) {
      return { time: clamp(parsed), source: 'explicit' }
    }
  }

  return null
}

/**
 * 定格提示 —— 深链把人送到某一帧后，控制条上要显示的那句话。
 *
 * 为什么需要：`?t=` / `?critical=` 只是把时间设过去并暂停。学生看到的是一个
 * 不动的画面 + 不动的时间轴，**没有任何东西说明他为什么停在这里**，第一反应是
 * "页面卡了"。而临界瞬间恰恰是值得反复回看的东西：学生接着要自己点播放，
 * 看这一刻前后怎么演化 —— 所以提示必须"粘得住"又"走得掉"。
 *
 * 生命周期由 `AnimationControls` 的显示条件决定：时间偏离这一帧、或开始播放，
 * 提示就自动消失。不做成"URL 消费即清除"，因为学生手滑刷新 / 从错题本后退回来
 * 都会丢掉定格位置，而滑块 step 是 0.01，靠手拖根本找不回 1.53s。
 */
export interface DeepLinkFreezeHint {
  /** 定格时刻（秒） */
  time: number
  /** 一句话：这一帧该看什么 */
  note?: string
}

/**
 * 组装定格提示。
 *
 * @param target `resolveDeepLinkTime` 的结果
 * @param reasonNote 错因标杆自带的「该看什么」（`?reason=` 解析而来，优先级最高）
 * @returns 无有效定格、或定格在 0s（等于没定格）时返回 null
 */
export function resolveDeepLinkHint(
  target: DeepLinkTimeResult | null,
  reasonNote?: string,
): DeepLinkFreezeHint | null {
  // t=0 就是从头看，没有"定格"可言；给了反而多一条无意义提示
  if (!target || target.time <= 0) return null
  return { time: target.time, note: reasonNote ?? target.label }
}

/**
 * 定格提示当前是否还应显示 —— "粘得住，也走得掉"的那把尺子。
 *
 * 两条判据，缺一不可：
 *   ① 开始播放 → 立刻收起：学生已经在看这一刻怎么演化，提示的使命结束了；
 *   ② 时间偏离这一帧 → 立刻收起：拖进度条、点临界刻度、点重置、按帧步进，
 *      任何一条都会让 time 变，不必在每个 handler 里各写一行"记得清提示"
 *      （同一条规则写两遍就会漏一遍，这个文件头上的教训）。
 *
 * 比较用 toFixed(2)：控制条显示的时间就是两位小数，"显示的数字没变"与"提示还在"
 * 必须同源 —— 否则学生看到还写着 1.53s，提示却没了，会以为自己点错了。
 *
 * 放在这里而不是写在页面里：这样它是纯函数，能被单测直接覆盖。
 */
export function shouldShowFreezeHint(
  hint: DeepLinkFreezeHint | null,
  time: number,
  isPlaying: boolean,
): DeepLinkFreezeHint | null {
  if (!hint || isPlaying) return null
  return time.toFixed(2) === hint.time.toFixed(2) ? hint : null
}
