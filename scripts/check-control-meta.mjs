#!/usr/bin/env node
/**
 * check-control-meta.mjs
 *
 * 左屏 `controlMeta` / `paramMeta` 规范守卫（精简高信噪比版）。
 *
 * 守卫边界（仅保留能抓真缺陷与结构错误的硬规则）：
 *   1. 纯文本面禁 TeX 标记（`$...$` / `\cmd`）：左屏全程不经 KaTeX，写 TeX 必渲染出源码；
 *   2. 声明顺序守卫（§2.1）：`preset` 不得声明在 `segmented` / `modeGrid` 之前；
 *   3. 卷别与应试化硬禁词（§2.6.2 / §2.6.5 C3）：覆盖预设、选项、滑块名/刻度、分组名、tip；
 *   4. 左屏 tip 禁透题给「= 数值」结论或命题/答案类关键词（§2.6.5 C1/C3/C4）。
 *
 * 已裁除项：
 *   - 字符长度阈值与像素估算引擎（`charWidthPx` / 字数上限）已撤除：
 *     字数少不代表讲得对，而分段器是否折行由真机 DOM 巡检（`probe-seg-wrap`）实测兜底。
 *
 * 用法：node scripts/check-control-meta.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const REGISTRY_DIR = join(ROOT, 'src', 'data', 'registries')

/** 左屏标签禁止出现的题型来源信息（§2.6.2） */
const PAPER_NAME_RE = /(?:\d{2,4}\s*)?(?:全国|新课标|新高考|地方|自主命题)?\s*[甲乙丙丁ⅠⅡⅢ]?\s*卷/

/** 左屏任一可见文案禁止出现的应试化措辞（§2.6.2；高频只禁考试语境修饰，不禁物理术语） */
const SCREEN_WORD_RE = /高考|考点|易错|压轴|真题|新课标|全国卷/
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

/** 左屏 tip 禁止出现的「= 数值」结论（§2.6.5 C1） */
const TIP_VALUE_RE = /[=＝]\s*-?\d/

/** 左屏纯文本面不得出现 TeX 标记（`$...$` / `\lambda` 之类，须先剥掉 JS 模板插值 `${...}`） */
const TEX_MARK_RE = /\$|\\[a-zA-Z]{2,}/
const stripTemplateExpr = (text) => text.replace(/\$\{[^{}]*\}/g, '')

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

function stringFieldsAll(chunk, field) {
  const re = new RegExp(`(?<![\\w$])${field}\\s*:\\s*(['"\`])([\\s\\S]*?)\\1`, 'g')
  const out = []
  let m
  while ((m = re.exec(chunk)) !== null) out.push({ value: m[2], index: m.index })
  return out
}

/** tip.content 可能是函数：收集函数体里全部字符串字面量逐条校验 */
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

const files = []
;(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (entry.endsWith('.ts')) files.push(full)
  }
})(REGISTRY_DIR)

const violations = []
const stats = { preset: 0, tip: 0, tipTitle: 0, group: 0, mark: 0, arrays: 0 }

for (const file of files) {
  const relPath = relative(ROOT, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf8')
  const lineOf = (idx) => content.slice(0, idx).split('\n').length

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
    const tex = stripTemplateExpr(text).match(TEX_MARK_RE)
    if (tex) {
      violations.push({
        file: relPath,
        line,
        reason:
          `${scope}出现 TeX 标记「${tex[0]}」—— 左屏是纯文本面（不经过 KaTeX），会连美元符号/反斜杠一起显示；` +
          `请改成 unicode 写法（λ、δ、R₂、v = λf），真正的公式归右屏 formulas.latex：${text}`,
      })
    }
  }

  // ── paramMeta：滑块名称与滑块刻度 marks 的 label 同样是左屏可见文案 ──
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

  // ── controlMeta ──
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

      if (entry.chunk.includes('group')) {
        const group = stringField(entry.chunk, 'group')
        if (group) {
          stats.group += 1
          auditScreenText(group, lineAt(entry.chunk.indexOf(group)), `分组名「${group}」`)
        }
      }

      for (const lab of stringFieldsAll(entry.chunk, 'label')) {
        const isPresetOwnLabel = type === 'preset' && lab.index === entry.chunk.indexOf('label')
        if (isPresetOwnLabel) continue
        auditScreenText(lab.value, lineAt(lab.index), `${type ?? '控件'} 的选项标签`)
      }

      if (type === 'preset') {
        stats.preset += 1
        const label = (stringField(entry.chunk, 'label') ?? '').replace(EMOJI_RE, '').trim()
        auditScreenText(label, entry.line, '预设标签')
      }

      if (type === 'tip') {
        const tipTitle = stringField(entry.chunk, 'title')
        if (tipTitle) {
          stats.tipTitle += 1
          auditScreenText(tipTitle, lineAt(entry.chunk.indexOf(tipTitle)), 'tip 标题')
        }

        for (const raw of tipContents(entry.chunk)) {
          const text = raw.trim()
          if (!text) continue
          stats.tip += 1

          const hit = TIP_FORBIDDEN.find((kw) => text.includes(kw))
          if (hit) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason: `左屏 tip 出现「${hit}」，属 §2.6.5 C3/C4（考点总结/真题解析），应迁右屏 ExamPointSection 或 /practice：${text.slice(0, 30)}...`,
            })
          }
          const tex = stripTemplateExpr(text).match(TEX_MARK_RE)
          if (tex) {
            violations.push({
              file: relPath,
              line: entry.line,
              reason:
                `左屏 tip 出现 TeX 标记「${tex[0]}」—— 提示卡是纯文本面（不经过 KaTeX），会连美元符号一起显示；` +
                `请改成 unicode 写法（λ、δ、v = λf）：${text.slice(0, 40)}...`,
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

    // 顺序守卫：声明序即渲染分组序，preset 不得在 segmented/modeGrid 之前（§2.1）
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
  `${stats.tip} 条 tip 正文 / ${stats.tipTitle} 个 tip 标题 / ${stats.mark} 组滑块刻度`

if (violations.length > 0) {
  console.error('\n❌ check:control-meta 检测失败：\n')
  for (const v of violations) console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
  console.error(
    `\n共计 ${violations.length} 处违规（本脚本覆盖 ${summary}）。` +
      '\n规范见 docs/agent-rules/ui/08_THREE_PANEL_RULES.md §2.1、§2.6。\n',
  )
  process.exit(1)
}

console.log(`✅ check:control-meta passed: ${summary} 均符合左屏边界。`)
