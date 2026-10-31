/**
 * 高考物理 7 大典型错因 —— 单一真源。
 *
 * 设计原则（务必保留，改标签前先读）：
 *
 * 1. **双层解耦**：错因是「认知缺陷」，不是「某道题」。
 *    因此每个错因只绑定一个**标杆案例**（benchmark），学生的具体错题
 *    通过 `WrongRecord.reasons` 挂到错因上，两者互不写死。
 *    —— 切忌把某个错因全局死绑到一个动画时刻：学生会在一道天体题里
 *       勾选「矢量正负号」，却被送到弹簧振子，产生严重错位感。
 *
 * 2. **每帧都必须可验收**：`benchmark` 里的 `t` 是**在该动画固定参数下**
 *    真实存在的时刻，已用 `?t=` 深链逐帧核对过；新增/修改时必须同样核对，
 *    并由 `tests/data/wrongReasons.test.ts` 守住「时刻落在 (0, maxTime] 内」。
 *
 *    ⚠ 只守住「时刻在范围内」是**不够**的 —— 脚本无法判断画面和文案是不是同一件事。
 *    implicit-condition 曾把 t 写成 1.0s，落在 B 球落地（0.54s）之后快半秒，
 *    文案却说「细绳消失的瞬间」，而测试全绿。所以每个 `t` 旁边**必须写清它是怎么
 *    算出来的**（哪个事件、何时发生、为什么取这个值），让人能复核，而不是只信范围。
 *
 * 3. **优先语义化定位**：动画自己声明了 `criticalTimes` 的，用 `critical`
 *    语义（first/last）而不是写死秒数——参数一改，秒数就错位，语义不会。
 *    目前只有 anim-conveyor / anim-block-board 具备该能力，其余用显式 t。
 *
 * 4. 标签名必须是**可判定的行为描述**，不是抽象名词：
 *    写「隔离法与整体法用错对象」而不是「受力分析失误」，学生才能自我归因。
 */

export type WrongReasonId =
  | 'friction-mutation'
  | 'critical-separation'
  | 'conservation-condition'
  | 'vector-sign'
  | 'graph-slope-area'
  | 'implicit-condition'
  | 'equation-target'

/** 标杆案例：一条可直接打开的动画定格帧 */
export interface WrongReasonBenchmark {
  animId: string
  /** 定格到动画声明的临界时刻（与 criticalT 二选一，优先此项） */
  critical?: 'first' | 'last'
  /** 显式定格秒数（该动画在 presetParams 下的真实时刻） */
  t?: number
  /** 复现标杆场景所需的参数（不填则用动画默认值） */
  presetParams?: Record<string, number>
  /** 这一帧要学生看到的物理瞬态（经由 ?reason= 带到动画页定格条上显示） */
  highlight: string
}

export interface WrongReasonMeta {
  id: WrongReasonId
  /** 行为化错因名称 */
  label: string
  /** 学生的错误行为描述（自述式，用于自评时对号入座） */
  behavior: string
  /** 高考典型场景关键词 */
  scenes: string[]
  benchmark: WrongReasonBenchmark
}

export const WRONG_REASONS: WrongReasonMeta[] = [
  {
    id: 'friction-mutation',
    label: '漏判摩擦力突变',
    behavior: '全程用同一个摩擦力大小/方向，没意识到共速瞬间滑动摩擦会变成静摩擦（甚至反向）。',
    scenes: ['传送带', '板块', '斜面＋传送带'],
    benchmark: {
      animId: 'anim-conveyor',
      critical: 'first',
      presetParams: { conveyorMode: 0, vBelt: 2.0, v0: 5.0, mu: 0.2, L: 6.0 },
      highlight: '物块减速到与带同速：相对速度归零，摩擦力由 μN 突变为 0（静摩擦接手）。',
    },
  },
  {
    id: 'critical-separation',
    label: '未检验临界脱离',
    behavior: '只管套向心力公式，没检验弹力 N 是否已降到 0，忘记「单面约束会脱轨」。',
    scenes: ['竖直圆（绳模型）', '弧形轨道', '凹槽最高点'],
    benchmark: {
      // 用竖直圆而非弧形槽：这里的脱离判据就是 N=0，且默认参数可复现。
      // r=3、v0=9 落在 [√(2gr), √(5gr)) 区间，必然中途脱轨（v0=5 只会摆动，看不到脱离）。
      animId: 'anim-vertical-circular',
      t: 0.84,
      presetParams: { r: 3, v0: 9, m: 1, trackType: 0 },
      highlight: 'N 降为 0 的瞬间：此后小球做斜抛运动，向心力公式立刻失效。',
    },
  },
  {
    id: 'conservation-condition',
    label: '守恒条件漏判',
    behavior: '不检验合外力是否为零、是否有摩擦生热，见到碰撞/连接体就直接写动量或机械能守恒。',
    scenes: ['弧形槽（固定 vs 自由）', '有摩擦的板块', '电磁感应安培力做功'],
    benchmark: {
      // 固定轨道：地面对槽有水平外力，系统水平动量不守恒，只有机械能守恒。
      animId: 'anim-curved-slot',
      t: 0.72,
      presetParams: { m_block: 2, M_slot: 5, R_slot: 1.5, isFixed: 1, slotShape: 0 },
      highlight: '轨道固定：槽位移恒为 0，系统水平动量不守恒——右屏「适用条件」正对着这一帧。',
    },
  },
  {
    id: 'vector-sign',
    label: '矢量方向/正负号漏写',
    behavior: '一开始没规定正方向，动量、速度、冲量带符号代入时把反向的量写成正值。',
    scenes: ['弹性碰撞', '反弹', '一维碰撞求末速'],
    benchmark: {
      // 碰撞时刻由布局几何决定（gap / 接近速度 = 1.68s），
      // 取 1.70s 落在碰后，才看得到「A 减速、B 加速」的符号反转。
      animId: 'anim-collision',
      t: 1.7,
      presetParams: { m1: 3, v1: 5, m2: 2, v2: 0, isElastic: 1, advancedMode: 0 },
      highlight: '碰后瞬间：A 仍向右但变慢、B 从静止被撞出——先定正方向，四个速度才能同号入式。',
    },
  },
  {
    id: 'graph-slope-area',
    label: '图像斜率与面积混淆',
    behavior: '把 v-t 图的面积当加速度、斜率当位移，或不知道微元 Δt 累加才是位移。',
    scenes: ['v-t 图像', 'x-t 图像', '微元法求位移'],
    benchmark: {
      // 默认参数 deltaT=2，t=2 恰好是第一个微元区间的右端点：
      // 「面积≈位移」的近似在这里第一次闭合，切线/割线也在这一点对比。
      animId: 'anim-velocity',
      t: 2.0,
      highlight: '第一个 Δt 微元收尾：梯形面积累加＝位移，而切线斜率才是该时刻加速度。',
    },
  },
  {
    id: 'implicit-condition',
    label: '忽略题干隐含条件',
    behavior: '漏读「轻质」「缓慢」「恰好」「光滑」等关键词，把特殊约束当普通条件代入。',
    scenes: ['剪断轻绳/轻弹簧', '轻杆', '恰好离开'],
    benchmark: {
      // 该动画物理层（physics/dynamics/spring-force.ts 的 precomputeCutRopeTrajectory）
      // 写死 isCut=1、tCutStart=0 —— 整条时间轴从「已剪断」起算，t=0 就是剪断那一刻。
      // 取 0.02s = 剪断后第一帧：绳力 fA_rope 已归零，弹簧力 mg(1+cos ωt) = mg(1+cos 0.2)
      // ≈ 1.98mg，仍是剪断前的 2mg ——「一个突变、一个不突变」在同一帧里同时可见。
      //
      // ⚠ 不要取 1.0s：B 球自由落体 fallTime = √(2×1.44/9.8) ≈ 0.54s 就已落地，
      //    t=1.0 的画面是「球砸在地上、A 球振荡了 1.6 个周期（a_A 已在随机相位）」，
      //    与「细绳消失的瞬间」差了一整秒。
      animId: 'anim-light-weight-mutation',
      t: 0.02,
      presetParams: { m: 1 },
      highlight: '剪断后的第一帧：绳的拉力已归零，弹簧的弹力仍是原来的 2mg——形变来不及恢复，弹力不突变。',
    },
  },
  {
    id: 'equation-target',
    label: '隔离法与整体法用错对象',
    behavior: '该隔离时用整体、该整体时用隔离，把内力当外力写进方程，导致加速度算错。',
    scenes: ['板块模型', '连接体', '叠放物块'],
    benchmark: {
      // t=0.3s 处于相对滑动阶段：两体加速度不同，正是「必须隔离」的时刻。
      // 不用 critical=first（该动画首个临界是「滑离」，是另一件事）。
      animId: 'anim-block-board',
      t: 0.3,
      presetParams: { m: 1, M: 3, mu1: 0.3, mu2: 0.05, v0: 5, L: 2.5 },
      highlight: '相对滑动阶段：滑块与木板加速度不同——整体法只能求系统外力，求内力必须隔离。',
    },
  },
]

export const WRONG_REASON_IDS: WrongReasonId[] = WRONG_REASONS.map((r) => r.id)

export const WRONG_REASON_LABELS: Record<WrongReasonId, string> = Object.fromEntries(
  WRONG_REASONS.map((r) => [r.id, r.label]),
) as Record<WrongReasonId, string>

export function getWrongReason(id: WrongReasonId): WrongReasonMeta {
  const found = WRONG_REASONS.find((r) => r.id === id)
  if (!found) throw new Error(`未登记的错因: ${id}`)
  return found
}

const REASON_INDEX: Record<string, number> = Object.fromEntries(
  WRONG_REASONS.map((r, i) => [r.id, i]),
)

/**
 * 归一化错因数组：过滤未登记 id、去重、按 WRONG_REASONS 声明顺序排列。
 *
 * 过滤未登记 id 不是防呆，而是持久化的刚性需要：错因集合一旦迭代（改名/合并/
 * 下线），IndexedDB 里的旧记录就会带着失效 id 复活。若不过滤，「按错因筛选」
 * 会永久漏掉这条记录，且用户无法从界面上解释为什么漏。
 * 排序则保证同一组错因序列化结果稳定，便于比对与测试断言。
 */
export function normalizeReasons(reasons: readonly string[] | undefined): WrongReasonId[] {
  if (!reasons || reasons.length === 0) return []
  const seen = new Set<string>()
  const kept: WrongReasonId[] = []
  for (const id of reasons) {
    if (REASON_INDEX[id] === undefined || seen.has(id)) continue
    seen.add(id)
    kept.push(id as WrongReasonId)
  }
  return kept.sort((a, b) => REASON_INDEX[a] - REASON_INDEX[b])
}

/**
 * 生成标杆案例的动画深链。
 *
 * 统一走 `?params=<JSON>`（动画页唯一解析的参数形式）+ `t=` / `critical=`，
 * 避免各入口各自拼查询串（历史上 Master 卡片拼过顶层键值，静默失效）。
 *
 * 同时带上 `?reason=<id>`：学生落到动画页时，控制条要能说清「你在看哪个错因的
 * 哪一帧」。只传秒数的话，学生看到的是一个不明所以的静止画面 —— 而 `highlight`
 * 这句「该看什么」原本无处可去（打靶台卡片上显示的是 behavior，不是它）。
 * 传 id 而不是直接传文案，是为了让文案保持单一真源：改了 highlight，旧链接自动跟着变。
 */
export function buildBenchmarkUrl(reason: WrongReasonMeta): string {
  const { benchmark } = reason
  const query = new URLSearchParams()
  if (benchmark.presetParams) {
    query.set('params', JSON.stringify(benchmark.presetParams))
  }
  if (benchmark.critical) {
    query.set('critical', benchmark.critical)
  } else if (benchmark.t != null) {
    query.set('t', String(benchmark.t))
  }
  query.set('reason', reason.id)
  const qs = query.toString()
  return `/animation/${benchmark.animId}${qs ? `?${qs}` : ''}`
}
