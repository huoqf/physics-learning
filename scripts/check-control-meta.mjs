#!/usr/bin/env node
/**
 * check-control-meta.mjs
 *
 * 左屏 `controlMeta` 规范守卫。
 *
 * 背景：docs/agent-rules/ui/08_THREE_PANEL_RULES.md §2.6 对左屏预设（preset）
 *      与教学提示（tip）写了两组**可机器校验**的边界：
 *        §2.6.2  预设标签字数与来源信息约束 —— 名称 ≤ 12 字、参数标注 ≤ 14 字
 *                （够放 1~2 个关键量，如 `vₐ=300, aᵦ=10`）、总计 ≤ 22 字；
 *                禁止把卷别（「2023全国甲卷」）或「高考/真题/压轴」写进左屏标签；
 *                超出的说明下沉到 `description`（≤ 85 字）。
 *        §2.6.5  左屏 tip 三档边界 —— 只允许「操作/观察引导」（单句 ≤ 90 字，
 *                分步引导 ≤ 120 字）与「一句物理判据」（≤ 40 字）；禁止本题答案、
 *                公式搬运、高考考点总结/采分点/秒杀结论、真题题干与长篇解析。
 *        §2.1    渲染顺序 —— 分组顺序即 `controlMeta` 声明顺序
 *                （ControlPanel 只把 tip 分组下沉到底部），因此「模型选择」
 *                必须声明在「快捷预设」之前，否则学生会先看到预设、后看到
 *                它究竟在哪个模型下生效。
 *
 * 历史：本脚本此前只实现了 description 长度一条，注释里却宣称还检查了
 *      preset / segmented 顺序倒置 —— 规范与实现脱节。现补齐为真守卫：
 *        1. preset.description 长度 ≤ 85
 *        2. preset.label 字数（名称 ≤ 12 / 参数标注 ≤ 14 / 总长 ≤ 22）
 *        3. 左屏任一可见文案不得出现卷别与应试化措辞（预设标签、选项标签、
 *           滑块刻度、分组名、tip 标题全覆盖）
 *        4. preset 不得声明在 segmented / modeGrid 之前
 *        5. tip.content / tip.title 长度与透题/考点/结论性数值关键词
 *
 * 2026-10 补记：第 3 条此前只作用于 `preset.label`，于是「高考典型情境一键配置」
 *      这类分组名、「③ 高考综合应用」这类选项标签、「37°高考常考」这类滑块刻度、
 *      以及 tip 的 `title: '高考考点探究指导'` 全部漏检。现改为对 controlMeta 内
 *      **所有** label / group / title 统一扫描。
 *
 * 实现：不引第三方 AST，用字符扫描定位 `controlMeta: [ ... ]` 并做顶层逗号切分，
 *      扫描时跳过字符串、模板串与注释，因此多行/嵌套对象/数组都不会错判。
 *
 * 用法：node scripts/check-control-meta.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const REGISTRY_DIR = join(ROOT, 'src', 'data', 'registries')

const LIMIT = {
  descMax: 85,
  labelNameMax: 12,
  labelAnnotationMax: 14,
  labelTotalMax: 22,
  tipHardMax: 120,
  tipSingleMax: 90,
}

/**
 * 分段器（segmented）选项宽度上限（§2.6.6）。
 *
 * 分段器按「选项个数等分列宽」，单格能放下多长文字完全由档位决定。
 *
 * **内容宽不再写死**：由 `theme/spacing.ts` 的 `PANEL.left` 与 `LEFT_PANEL_GEOMETRY` 现算
 * （`buildSegWidths()`）。历史故障：内边距从 `p-4` 改成 `p-3` 后脚本仍按旧的 229px 判定，
 * 静态守卫全绿而实际全部折行——数字与实现脱钩是这类漏检的唯一来源。
 *
 * 推导：`PANEL.left.X − 2×(panelPad + sectionPad + sectionBorder + trackPad) − subpixel`
 *   280px 左屏：280 − 12×2 − 12×2 − 1×2 − 2×2 − 1 = 225px
 *   240px 左屏：240 − 12×2 − 12×2 − 1×2 − 2×2 − 1 = 185px
 * 与 Chrome `getBoundingClientRect()` 实测一致（2 档单格 111.5 / 91.5px、3 档 73.7px）。
 *
 * **左屏宽度随视口跳变**（`PANEL.left`：≥1440px 时 280px、1280–1439px 时 240px），
 * 且窄屏下 `SegmentedControl.fitColumns()` 会把 3/4/5 档降到 2 列。
 * 所以判定必须**同时算两个视口、取较小预算**，否则静态检查会放过在
 * 1366×768 笔记本上折行的标签——那段视口恰恰是最常见的使用场景。
 *
 * 判定用**估算像素宽**而不是字数：`0.02s`、`4→1 (12.75 eV)`、`水 H₂O` 这类
 * 半角/上下标标签按字数算会被误杀。字宽表见 `charWidthPx`。
 *
 * 超限即意味着按钮必然折行，整行被撑高（单行≈26px、两行≈44px），
 * 而左屏本来就装不下（实测 1309px 内容 / 800px 视口）。
 * 确实需要长标签时用 `allowWrap: true` 显式豁免，并在 options 上方注释理由。
 */
/** 与 `theme/spacing.ts` 的 `SEGMENTED` 保持一致，由 `readSpacingTokens` 校验 */
const SEG_GAP_PX = 2
/** 单格放下 6 个汉字才算合格，否则 `fitColumns()` 会降列（§2.6.6） */
const SEG_MIN_CELL_PX = 72

const SPACING_FILE = join(ROOT, 'src', 'theme', 'spacing.ts')

/** 取 `export const NAME = { ... } as const` 的块体；找不到返回 null */
function spacingBlock(src, name) {
  const m = new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\} as const`).exec(src)
  return m ? m[1] : null
}

/** Tailwind 间距比例尺换算（4px 基准）：`p-3` → 12、`p-0.5` → 2 */
const padPx = (cls) => Number(cls.slice(2)) * 4

/**
 * 双源漂移防护（一）：从 `theme/spacing.ts` 现取几何与阈值。
 *
 * 宽度预算**不再手写数字**（曾写死 225/185，内边距从 p-4 改成 p-3 后脚本仍按 229 判定，
 * 静态守卫全绿而页面全部折行）。现在读 `LEFT_PANEL_PADDING` 的类名现算 px，
 * 读 `PANEL.left` 取面板宽，读 `SEGMENTED` 校验单格阈值。
 */
function readSpacingTokens() {
  const src = readFileSync(SPACING_FILE, 'utf8')

  const seg = spacingBlock(src, 'SEGMENTED')
  const padding = spacingBlock(src, 'LEFT_PANEL_PADDING')
  const geo = spacingBlock(src, 'LEFT_PANEL_GEOMETRY')
  const panel = spacingBlock(src, 'PANEL')
  for (const [name, block] of [
    ['SEGMENTED', seg],
    ['LEFT_PANEL_PADDING', padding],
    ['LEFT_PANEL_GEOMETRY', geo],
    ['PANEL', panel],
  ]) {
    if (!block) {
      console.error(`❌ 未能在 src/theme/spacing.ts 中找到 \`${name}\` 常量（§2.6.6 的唯一真源）`)
      process.exit(1)
    }
  }

  const num = (block, key) => {
    const m = new RegExp(`\\b${key}\\s*:\\s*(\\d+(?:\\.\\d+)?)`).exec(block)
    return m ? Number(m[1]) : NaN
  }
  const padClass = (block, key) => {
    const m = new RegExp(`\\b${key}\\s*:\\s*'(p-[0-9.]+)'`).exec(block)
    return m ? m[1] : null
  }

  const pairs = [
    ['SEGMENTED.minCell', num(seg, 'minCell'), SEG_MIN_CELL_PX],
    ['SEGMENTED.gapPx', num(seg, 'gapPx'), SEG_GAP_PX],
  ]
  const bad = pairs.filter(([, themeVal, scriptVal]) => themeVal !== scriptVal)
  if (bad.length) {
    console.error('❌ 分段器阈值双源漂移（theme/spacing.ts ↔ check-control-meta.mjs）：')
    for (const [k, themeVal, scriptVal] of bad) {
      console.error(`   ${k} = ${themeVal}，脚本内为 ${scriptVal}`)
    }
    console.error('   请同步修改两处后再跑。改 Tailwind 的 gap-0.5 / p-0.5 也要更新 gapPx。')
    process.exit(1)
  }

  const classes = {
    panel: padClass(padding, 'panel'),
    section: padClass(padding, 'section'),
    track: padClass(padding, 'track'),
  }
  for (const [key, cls] of Object.entries(classes)) {
    if (!cls) {
      console.error(`❌ LEFT_PANEL_PADDING.${key} 不是合法的 p-N 类名（读不到）`)
      process.exit(1)
    }
  }

  return {
    panelStandard: num(panel, 'standard'),
    panelCompact: num(panel, 'compact'),
    classes,
    geometry: {
      panelPad: padPx(classes.panel),
      sectionPad: padPx(classes.section),
      trackPad: padPx(classes.track),
      sectionBorder: num(geo, 'sectionBorder'),
      subpixel: num(geo, 'subpixel'),
    },
  }
}

/**
 * 双源漂移防护（二）：组件必须引用 `LEFT_PANEL_PADDING`。
 *
 * 宽度预算的 px 全由类名 token 换算，所以真正要防的是"组件绕过 token 自己写 `p-4`"——
 * 那会让预算与渲染分叉。这里断言三个组件确实读了 token。
 */
function assertGeometryTokenUsage() {
  const expectations = [
    { file: join('src', 'components', 'UI', 'LeftPanel.tsx'), what: 'LeftPanel 根容器内边距', token: 'LEFT_PANEL_PADDING.panel' },
    { file: join('src', 'components', 'UI', 'LeftPanel.tsx'), what: 'LeftPanelSection 常态内边距', token: 'LEFT_PANEL_PADDING.section' },
    { file: join('src', 'components', 'UI', 'SegmentedControl.tsx'), what: '分段器轨道内边距', token: 'LEFT_PANEL_PADDING.track' },
  ]

  const problems = []
  for (const exp of expectations) {
    let src
    try {
      src = readFileSync(join(ROOT, exp.file), 'utf8')
    } catch {
      problems.push(`读不到 ${exp.file}`)
      continue
    }
    if (!src.includes(exp.token)) {
      problems.push(`${exp.file} 未引用 ${exp.token}（${exp.what}），改内边距会绕过宽度预算`)
    }
  }

  if (problems.length) {
    console.error('❌ 左屏内边距未走 LEFT_PANEL_PADDING token（分段器宽度预算会与渲染分叉）：')
    for (const p of problems) console.error(`   ${p}`)
    console.error('   组件的 padding 类名必须取 src/theme/spacing.ts 的 LEFT_PANEL_PADDING，禁止手写字面量。')
    process.exit(1)
  }
}

/** 由 token 现算两个视口的轨道内容宽（不再手写 225/185） */
function buildSegWidths(tokens) {
  const g = tokens.geometry
  const loss = 2 * (g.panelPad + g.sectionPad + g.sectionBorder + g.trackPad) + g.subpixel
  return [
    { panel: tokens.panelStandard, content: tokens.panelStandard - loss, label: '宽屏 1440+' },
    { panel: tokens.panelCompact, content: tokens.panelCompact - loss, label: '窄屏 1280–1439' },
  ]
}

const SPACING = readSpacingTokens()
assertGeometryTokenUsage()
const SEG_WIDTHS = buildSegWidths(SPACING)
/**
 * 折行判定的安全系数。
 *
 * 字宽表已由 `canvas.measureText` 逐字符校准并按"取跨平台较大值"上浮，
 * 模型估算本身偏保守（如 `100 个·适中` 模型 67.7 / 实测 67.05），
 * 因此这里只留 2% 余量吸收不同平台（Segoe UI / SF / DejaVu）的字形差异。
 *
 * 历史教训：字宽表修正前，模型对数字与 `m` 系统性低估 7~12%，
 * 曾让 `① 结合能与质量亏损`（模型 111 / 单格 111.5）与
 * `固定 100m 量程对比`（模型 104.8 / 单格 111.5）双双漏网后真实折行。
 * 当时试图靠把系数压到 0.93 来兜底，反而误报 30 处实测正常的短标签——
 * **模型误差要靠校准字宽解决，不能靠放大安全系数掩盖**。
 * 边界兜底仍由 `npm run audit:seg-wrap` 实测把关。
 */
const SEG_SAFE = 0.98
/** 列数上限（与 SegmentedControl 的 columnsFor 保持一致） */
const SEG_MAX_COLS = 3
/** 超过 3 档且不足 10 档时的列数：4/5 档走 3 列，6/7 档走 2 列 */
const SEG_COLS_OVERFLOW = { 6: 2, 7: 2, 10: 5 }

function segColumns(n) {
  if (n <= SEG_MAX_COLS) return n
  if (n === 10) return 5
  if (n <= 5) return SEG_MAX_COLS
  return SEG_COLS_OVERFLOW[n] ?? 2
}

/** 与 `SegmentedControl.fitColumns()` 同口径：容器偏窄时 3 档及以上降列 */
function fitColumns(cols, n, contentW) {
  if (n === 10 || cols < 3) return cols
  const fit = Math.floor((contentW + SEG_GAP_PX) / (SEG_MIN_CELL_PX + SEG_GAP_PX))
  return Math.max(2, Math.min(cols, fit))
}

/** 两个视口里最紧的那个单格预算（含安全系数） */
function segBudget(n) {
  let min = Infinity
  let worst = null
  for (const vp of SEG_WIDTHS) {
    const cols = fitColumns(segColumns(n), n, vp.content)
    const cell = (vp.content - SEG_GAP_PX * (cols - 1)) / cols
    const w = cell * SEG_SAFE
    if (w < min) {
      min = w
      worst = { ...vp, cols, cell }
    }
  }
  return { limit: min, ...worst }
}

/**
 * 单字符估算宽度（text-xs = 12px、font-weight 600 下实测校准）。
 *
 * 数值来自 Chrome `canvas.measureText` 逐字符实测（字体 `600 12px ui-sans-serif,
 * system-ui, sans-serif`），并按"取跨平台较大值"的原则向上取整——宁可误报，
 * 不可漏报：折行会把整行撑高 15px，比多改一个词严重得多。
 *
 * 关键结论（2026-10 实测，此前模型在此系统性偏低）：
 * - 中文 / 全角 / `①` **恰好 12.00px**，零偏差，这是唯一能精确建模的一类。
 * - 数字 **7.4px**（旧值 6.6 偏低 12%），`100` 实测 22.2px 而非 19.8px。
 * - 小写 `m` 高达 **11.78px**（旧值 7），`固定 100m` 因此被低估 7.8px 后折行。
 * - 大写拉丁 8.4~9.0px，`+` `=` 均为 9.13px（旧值 6/7 严重偏低）。
 *
 * 校准验证：`① 结合能与质量亏损`=111.57（模型 111.6）、`固定 100m`=61.56（模型 61.6）、
 * `100 个·适中`=67.05（模型 67.7）、`弹簧与胡克定律`=84.00（模型 84.0）。
 */
function charWidthPx(ch) {
  const cp = ch.codePointAt(0)
  if (ch === ' ') return 3.6
  if (ch === '.' || ch === ',') return 3.5
  if (ch === ':') return 3.5
  if (ch === '(' || ch === ')') return 4.8
  if (ch === '-') return 5.3
  if (ch === '/') return 5.7
  if (ch === '·') return 5.3
  if (ch === '=' || ch === '+') return 9.2
  if (cp >= 0x2070 && cp <= 0x209f) return 5.3 // 上标 ¹²³ / 下标 ₁₂₃
  if (cp >= 0x2080 && cp <= 0x209c) return 5.3
  if (cp >= 0x0370 && cp <= 0x03ff) return 8.3 // 希腊字母 Δωθ
  if (cp >= 0x2190 && cp <= 0x21ff) return 12 // 箭头 →←↑↓
  if (cp >= 0x2200 && cp <= 0x22ff) return 10 // 数学运算符 ≥≤≈
  if (cp >= 0x2460 && cp <= 0x24ff) return 12 // ① ② ③
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK 统一表意文字
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x3000 && cp <= 0x303f) || // 全角标点
    (cp >= 0xff00 && cp <= 0xff60) // 全角字符
  ) return 12
  if (ch === 'm') return 12 // 小写 m 在 600 字重下显著偏宽（11.78px）
  if (cp >= 0x41 && cp <= 0x5a) return 8.8 // A-Z
  if (cp >= 0x61 && cp <= 0x7a) return 8.0 // a-z
  if (cp >= 0x30 && cp <= 0x39) return 7.6 // 0-9
  return 7.5 // 其余 ASCII
}

function textWidthPx(text) {
  let w = 0
  for (const ch of text) w += charWidthPx(ch)
  return w
}

/** 左屏标签禁止出现的题型来源信息（§2.6.2 第 4 条） */
const PAPER_NAME_RE = /(?:\d{2,4}\s*)?(?:全国|新课标|新高考|地方|自主命题)?\s*[甲乙丙丁ⅠⅡⅢ]?\s*卷/

/**
 * 左屏任一可见文案禁止出现的应试化措辞（§2.6.2）。
 *
 * 覆盖面：预设 / 分段器选项 / 滑块刻度 的 `label`、`controlMeta` 的 `group` 名、
 *        `tip` 的 `title`。这些字段都会直接画在左屏上，此前只查 `preset.label`，
 *        于是「高考典型情境一键配置」这类分组名与「37°高考常考」这类刻度全部漏检。
 *
 * 词表取舍：
 *   · 收入「新课标 / 全国卷」是为了堵住“换个字段继续写卷别”的口子；
 *   · **不收「高频」**：『通高频阻低频』『高频避振』『高频打点计时』是物理特征术语，
 *     §2.6.5 C3 表格里的「高频」指“考点出现频率”，只在考试语境下才成立，
 *     交给下面的 EXAM_FREQ_RE 用组合词判定，避免误杀物理术语。
 */
const SCREEN_WORD_RE = /高考|考点|易错|压轴|真题|新课标|全国卷/

/** 只有与考试语境连用的「高频」才等价于 C3 的考点频率 */
const EXAM_FREQ_RE = /(?:高考|考试|常考|命题|卷)高频/

/** 左屏 tip 禁止出现的 C3/C4 关键词（§2.6.5） */
const TIP_FORBIDDEN = [
  '答案',
  '故选',
  '采分点',
  '得分点',
  '评分标准',
  '考点',
  '命题',
  '秒杀',
  '口诀',
  '解题',
  '解析',
  '真题',
  '题干',
  '综上',
  '结论是',
  '高考',
  '易错点',
]

/** 分步引导标记：分步操作允许更长的字数预算（§2.6.5 A 档） */
const TIP_STEP_RE = /(?:^|[：:；;。\s])(?:[1-9]\.|[①-⑨]|•|·)/

/** 左屏 tip 禁止出现的「= 数值」结论（§2.6.5 C1） */
const TIP_VALUE_RE = /[=＝]\s*-?\d/

const EMOJI_RE = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu

function skipString(src, i) {
  const quote = src[i]
  let j = i + 1
  while (j < src.length) {
    const c = src[j]
    if (c === '\\') {
      j += 2
      continue
    }
    if (c === quote) return j
    if (quote === '`' && c === '$' && src[j + 1] === '{') {
      const close = matchBracket(src, j + 1)
      j = close < 0 ? src.length : close + 1
      continue
    }
    j += 1
  }
  return src.length
}

function matchBracket(src, openIdx) {
  let depth = 0
  for (let i = openIdx; i < src.length; i += 1) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i)
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      if (nl < 0) return -1
      i = nl
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      if (end < 0) return -1
      i = end + 1
      continue
    }
    if (c === '[' || c === '{' || c === '(') depth += 1
    else if (c === ']' || c === '}' || c === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/** 把 `[...]` 顶层按逗号切成元素（跳过字符串/注释/嵌套） */
function splitTopLevel(src, openIdx, closeIdx) {
  const parts = []
  let depth = 0
  let segStart = openIdx + 1
  for (let i = openIdx + 1; i < closeIdx; i += 1) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i)
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      if (nl < 0) break
      i = nl
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      if (end < 0) break
      i = end + 1
      continue
    }
    if (c === '[' || c === '{' || c === '(') depth += 1
    else if (c === ']' || c === '}' || c === ')') depth -= 1
    else if (c === ',' && depth === 0) {
      parts.push({ start: segStart, end: i })
      segStart = i + 1
    }
  }
  if (src.slice(segStart, closeIdx).trim()) parts.push({ start: segStart, end: closeIdx })
  return parts
}

function stringField(chunk, field) {
  const re = new RegExp(`${field}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`)
  const m = chunk.match(re)
  return m ? m[2] : undefined
}

/**
 * 收集 chunk 内某字段的**全部**字符串取值，含嵌套在 `options` / `marks` 数组里的。
 * 位置一并返回，用于把违规定位到具体那一行而不是整个 controlMeta 条目。
 */
function stringFieldsAll(chunk, field) {
  const re = new RegExp(`(?<![\\w$])${field}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`, 'g')
  const out = []
  let m
  while ((m = re.exec(chunk)) !== null) out.push({ value: m[2], index: m.index })
  return out
}

/** tip.content 可能是函数：把函数体里所有字符串字面量都收上来逐条检查 */
function tipContents(chunk) {
  const re = /content\s*:\s*/
  const m = chunk.match(re)
  if (!m) return []
  const rest = chunk.slice(m.index + m[0].length)
  const out = []
  let i = 0
  while (i < rest.length) {
    const c = rest[i]
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(rest, i)
      out.push(rest.slice(i + 1, end))
      i = end + 1
      continue
    }
    i += 1
  }
  return out
}

function charCount(text) {
  return Array.from(text.replace(/\s+/g, '')).length
}

function splitLabel(label) {
  const trimmed = label.trim()
  const paren = trimmed.match(/^(.*?)（([^）]*)）$/) ?? trimmed.match(/^(.*?)\(([^)]*)\)$/)
  if (paren) return { name: paren[1].trim(), annotation: paren[2].trim() }
  const slash = trimmed.match(/^(.*?)\s*\/\s*(.+)$/)
  if (slash) return { name: slash[1].trim(), annotation: slash[2].trim() }
  return { name: trimmed, annotation: '' }
}

const files = []
;(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (entry.endsWith('.ts')) files.push(full)
  }
})(REGISTRY_DIR)

/**
 * `--print-widths`：打印按当前 token 现算的宽度预算表。
 * 写新标签时照"判定上限"这一列判断（取两视口较小值），不要凭"看上去放得下"——
 * 文档 §2.6.6 的表就是据此生成的。
 */
if (process.argv.includes('--print-widths')) {
  console.log('分段器宽度预算（由 PANEL.left + LEFT_PANEL_GEOMETRY 现算，已乘安全系数）\n')
  console.log('  档位 |  宽屏 1440+（280px）  |  窄屏 1280（240px）  | 判定上限')
  console.log('  -----|----------------------|----------------------|---------')
  for (const n of [2, 3, 4, 5, 6, 7, 10]) {
    const cells = SEG_WIDTHS.map((vp) => {
      const cols = fitColumns(segColumns(n), n, vp.content)
      const cell = (vp.content - SEG_GAP_PX * (cols - 1)) / cols
      return { cols, limit: cell * SEG_SAFE }
    })
    const worst = Math.min(...cells.map((c) => c.limit))
    const fmt = (c) => `${c.cols} 列 ${c.limit.toFixed(1).padStart(5)}px`
    console.log(
      `  ${String(n).padStart(4)} | ${fmt(cells[0]).padEnd(20)} | ${fmt(cells[1]).padEnd(20)} | ${worst.toFixed(1)}px`,
    )
  }
  process.exit(0)
}

const violations = []
const stats = { preset: 0, tip: 0, tipTitle: 0, group: 0, mark: 0, segOption: 0, arrays: 0 }

for (const file of files) {
  const relPath = relative(ROOT, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf8')

  const lineOf = (idx) => content.slice(0, idx).split('\n').length

  /**
   * 左屏可见文案统一体检。scope 只影响报错措辞，判据完全一致：
   * 「卷别」与「应试化措辞」这两类来源信息，写在左屏哪个字段上都不允许。
   */
  const auditScreenText = (text, line, scope) => {
    if (!text) return
    if (PAPER_NAME_RE.test(text)) {
      violations.push({
        file: relPath,
        line,
        reason: `${scope}不得写卷别（来源信息归真题侧 presetDescription）：${text}`,
      })
    }
    const word = text.match(SCREEN_WORD_RE)
    if (word) {
      violations.push({
        file: relPath,
        line,
        reason: `${scope}出现「${word[0]}」，属应试化措辞（§2.6.2）—— 左屏只描述物理工况，考点与题源归 /practice 与 /master-models：${text}`,
      })
    }
    const freq = text.match(EXAM_FREQ_RE)
    if (freq) {
      violations.push({
        file: relPath,
        line,
        reason: `${scope}出现「${freq[0]}」，属考点出现频率（§2.6.5 C3），归右屏 ExamPointSection：${text}`,
      })
    }
  }

  // ── paramMeta：滑块名称与滑块刻度 marks 的 label 同样是左屏可见文案 ──
  // 刻度最容易漏：「37°高考常考」这种写法就在 marks 里，而 marks 不在 controlMeta 中。
  {
    const pRe = /paramMeta\s*:\s*\[/g
    let pm
    while ((pm = pRe.exec(content)) !== null) {
      const openIdx = pm.index + pm[0].length - 1
      const closeIdx = matchBracket(content, openIdx)
      if (closeIdx < 0) continue
      for (const part of splitTopLevel(content, openIdx, closeIdx)) {
        const chunk = content.slice(part.start, part.end)
        if (!/key\s*:/.test(chunk)) continue
        stats.mark += (chunk.match(/marks\s*:/g) ?? []).length
        for (const lab of stringFieldsAll(chunk, 'label')) {
          const isMark = /marks\s*:/.test(chunk) && chunk.indexOf('marks') < lab.index
          auditScreenText(lab.value, lineOf(part.start + lab.index), isMark ? '滑块刻度' : '滑块名称')
        }
      }
    }
  }

  const re = /controlMeta\s*:\s*\[/g
  let m
  while ((m = re.exec(content)) !== null) {
    const openIdx = m.index + m[0].length - 1
    const closeIdx = matchBracket(content, openIdx)
    if (closeIdx < 0) continue
    stats.arrays += 1

    const entries = splitTopLevel(content, openIdx, closeIdx)
      .map((part) => ({
        chunk: content.slice(part.start, part.end),
        start: part.start,
        line: content.slice(0, part.start).split('\n').length,
      }))
      .filter((entry) => /type\s*:/.test(entry.chunk))

    for (const entry of entries) {
      const type = stringField(entry.chunk, 'type')
      const lineAt = (idx) => content.slice(0, entry.start + idx).split('\n').length

      // ── 分组名：group 名会作为左屏每组的标题直接渲染 ──
      if (entry.chunk.includes('group')) {
        const group = stringField(entry.chunk, 'group')
        if (group) {
          stats.group += 1
          auditScreenText(group, lineAt(entry.chunk.indexOf(group)), `分组名「${group}」`)
        }
      }

      // ── 所有 label：预设名、分段器选项、滑块刻度都在这里 ──
      for (const lab of stringFieldsAll(entry.chunk, 'label')) {
        const isPresetOwnLabel = type === 'preset' && lab.index === entry.chunk.indexOf("label")
        if (isPresetOwnLabel) continue // 预设自身的 label 由下面 preset 分支统一处理（含字数与 description）
        auditScreenText(lab.value, lineAt(lab.index), `${type ?? '控件'} 的选项标签`)
      }

      // ── 分段器选项字数（§2.6.6）：选项个数决定列宽，超了就必然折行撑高整行 ──
      if (type === 'segmented' && !entry.chunk.includes('allowWrap')) {
        const arrMatch = /options\s*:\s*\[/.exec(entry.chunk)
        if (arrMatch) {
          const open = arrMatch.index + arrMatch[0].length - 1
          const close = matchBracket(entry.chunk, open)
          if (close > 0) {
            const slice = entry.chunk.slice(open, close + 1)
            const optionLabels = stringFieldsAll(slice, 'label')
            if (optionLabels.length > 0) {
              stats.segOption += optionLabels.length
              const budget = segBudget(optionLabels.length)
              for (const opt of optionLabels) {
                const text = opt.value.replace(EMOJI_RE, '').trim()
                const w = textWidthPx(text)
                if (w > budget.limit) {
                  violations.push({
                    file: relPath,
                    line: lineAt(entry.chunk.indexOf(slice) + opt.index),
                    reason:
                      `${optionLabels.length} 档分段器单格仅 ${budget.cell.toFixed(0)}px（${budget.label} ${budget.cols} 列），该选项估算 ${w.toFixed(0)}px 必然折行：` +
                      `「${text}」—— 请压到 ${budget.limit.toFixed(0)}px 以内（中文 1 字≈12px），括号里的解释下沉到紧随的 tip；` +
                      `确需换行请在 options 上方注释理由并加 allowWrap: true（§2.6.6）`,
                  })
                }
              }
            }
          }
        }
      }

      if (type === 'preset') {
        stats.preset += 1

        const label = stringField(entry.chunk, 'label') ?? ''
        const labelNoEmoji = label.replace(EMOJI_RE, '').trim()
        const total = charCount(labelNoEmoji)
        const { name, annotation } = splitLabel(labelNoEmoji)
        const nameLen = charCount(name)
        const annotationLen = charCount(annotation)

        if (total > LIMIT.labelTotalMax) {
          violations.push({
            file: relPath,
            line: entry.line,
            reason: `预设标签总长 ${total} 字 > ${LIMIT.labelTotalMax} 字：${label}`,
          })
        }
        if (nameLen > LIMIT.labelNameMax) {
          violations.push({
            file: relPath,
            line: entry.line,
            reason: `预设名称 ${nameLen} 字 > ${LIMIT.labelNameMax} 字（参数请移到（）里）：${label}`,
          })
        }
        if (annotationLen > LIMIT.labelAnnotationMax) {
          violations.push({
            file: relPath,
            line: entry.line,
            reason: `预设参数标注 ${annotationLen} 字 > ${LIMIT.labelAnnotationMax} 字（只留最关键的 1 个量）：${label}`,
          })
        }
        auditScreenText(labelNoEmoji, entry.line, '预设标签')

        const desc = stringField(entry.chunk, 'description')
        if (desc != null) {
          const descLen = charCount(desc)
          if (descLen > LIMIT.descMax) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason: `预设描述 ${descLen} 字 > ${LIMIT.descMax} 字，严禁在左屏塞入长篇题解：${desc.slice(0, 30)}...`,
            })
          }
        }
      }

      if (type === 'tip') {
        // tip 的 title 也是左屏可见文案（渲染成提示卡的小标题）。
        // 此前只扫 content，于是 electrostatics 那句 `title: '高考考点探究指导'` 一直在漏网。
        const tipTitle = stringField(entry.chunk, 'title')
        if (tipTitle) {
          stats.tipTitle += 1
          auditScreenText(tipTitle, lineAt(entry.chunk.indexOf(tipTitle)), 'tip 标题')
        }

        for (const raw of tipContents(entry.chunk)) {
          const text = raw.trim()
          if (!text) continue
          stats.tip += 1
          const len = charCount(text)
          if (len > LIMIT.tipHardMax) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason: `左屏 tip ${len} 字 > 硬上限 ${LIMIT.tipHardMax} 字（§2.6.5）：${text.slice(0, 30)}...`,
            })
          } else if (len > LIMIT.tipSingleMax && !TIP_STEP_RE.test(text)) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason: `左屏 tip ${len} 字 > ${LIMIT.tipSingleMax} 字且非分步引导，只能压缩或拆成分步（§2.6.5 A 档）：${text.slice(0, 30)}...`,
            })
          }
          const hit = TIP_FORBIDDEN.find((kw) => text.includes(kw))
          if (hit) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason: `左屏 tip 出现「${hit}」，属 §2.6.5 C3/C4（考点总结/真题解析），应迁右屏 ExamPointSection 或 /practice：${text.slice(0, 30)}...`,
            })
          }
          if (TIP_VALUE_RE.test(text)) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason: `左屏 tip 出现「= 数值」结论，属 §2.6.5 C1（透题），右屏公式已给结论：${text.slice(0, 30)}...`,
            })
          }
        }
      }
    }

    // 顺序守卫：声明序即渲染分组序（ControlPanel 只把 tip 下沉），
    // 因此 preset 出现在 segmented/modeGrid 之前 = 学生先看到预设、后看到模型
    const firstPreset = entries.find((entry) => stringField(entry.chunk, 'type') === 'preset')
    const firstMode = entries.find((entry) => {
      const t = stringField(entry.chunk, 'type')
      return t === 'segmented' || t === 'modeGrid'
    })
    if (firstPreset && firstMode && firstPreset.line < firstMode.line) {
      violations.push({
        file: relPath,
        line: firstPreset.line,
        reason: `「${stringField(firstPreset.chunk, 'label') ?? '预设'}」声明在模型选择「${stringField(firstMode.chunk, 'label') ?? '模型选择'}」（第 ${firstMode.line} 行）之前，渲染顺序倒置 —— 模型选择必须先出现（§2.1）`,
      })
    }
  }
}

violations.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)))

const summary =
  `${stats.arrays} 个 controlMeta / ${stats.preset} 条预设 / ${stats.group} 个分组名 / ` +
  `${stats.tip} 条 tip 正文 / ${stats.tipTitle} 个 tip 标题 / ${stats.mark} 组滑块刻度 / ` +
  `${stats.segOption} 个分段器选项`

if (violations.length > 0) {
  console.error('\n❌ check:control-meta 检测失败：\n')
  for (const v of violations) console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
  console.error(
    `\n共计 ${violations.length} 处违规（本脚本覆盖 ${summary}）。` +
      '\n规范见 docs/agent-rules/ui/08_THREE_PANEL_RULES.md §2.1、§2.6.2、§2.6.5。\n',
  )
  process.exit(1)
}

console.log(`✅ check:control-meta passed: ${summary} 均符合 §2.6 边界。`)
