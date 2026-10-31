#!/usr/bin/env node
/**
 * check-formula-condition.mjs
 *
 * 右屏公式「适用条件」守卫脚本。
 *
 * 背景：docs/agent-rules/ui/08_THREE_PANEL_RULES.md §3.2 明确规定
 *      `condition`（适用条件）对守恒定律类公式「至关重要」——
 *      机械能守恒条件、动量守恒条件、闭合电路欧姆定律适用条件、
 *      法拉第电磁感应定律方向判断、全反射条件。
 *      但在类型层 `condition?: string` 是可选字段（src/components/Formula/PhysicsPanel.tsx），
 *      缺失时右屏静默不渲染，规范宣称的「强制」实际无人把关。
 *      本脚本把这条规范变成 CI 硬约束。
 *
 * 检测范围：src/data/quantities/**（递归，.ts/.tsx）
 * 检测规则：公式 `name` 命中守恒/定律类关键词时，同一公式对象内必须声明非空 `condition`。
 *          ——只对这些「有严格成立前提、学生最易乱套」的定律设卡，
 *            不对全部 266 条公式一刀切（例如 x=v₀t+½at² 之类的定义式无需条件）。
 *
 * 说明：采用「作用域邻近」匹配 —— 每个公式的作用域自其 `name:` 起、
 *      至下一个 `name:`（或 formulas 数组结束）为止，单行与多行写法均可覆盖。
 *
 * 用法：node scripts/check-formula-condition.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGET_DIR = join(ROOT, 'src', 'data', 'quantities')
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])

/** 必须声明适用条件的定律类公式（name 命中即强制要求 condition） */
const LAW_RULES = [
  {
    id: 'mechanical-energy',
    match: /机械能守恒/,
    hint: '例：只有重力（或弹力）做功，其他力不做功',
  },
  {
    id: 'momentum',
    match: /动量守恒/,
    hint: '例：系统不受外力或所受合外力为零（某方向合外力为零则该方向守恒）',
  },
  {
    id: 'closed-circuit-ohm',
    match: /闭合电路欧姆定律/,
    hint: '例：纯电阻外电路，电动势等于内外电压之和',
  },
  {
    id: 'faraday',
    match: /法拉第电磁感应定律/,
    hint: '例：磁通量变化率取绝对值，方向另由楞次定律判断',
  },
  {
    id: 'total-internal-reflection',
    match: /全反射/,
    hint: '例：光由光密介质射向光疏介质，且入射角不小于临界角',
  },
]

const NAME_RE = /name\s*:\s*(['"`])((?:(?!\1).)*)\1/g
// 支持单引号/双引号/反引号字面量，以及包含三元表达式的动态表达式
const CONDITION_RE = /condition\s*:\s*([^,\r\n}]+)/

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else if (FILE_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) files.push(full)
  }
  return files
}

const violations = []
let checked = 0

for (const file of walk(TARGET_DIR)) {
  const relPath = relative(ROOT, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf8')

  const names = [...content.matchAll(NAME_RE)].map((m) => ({
    value: m[2].trim(),
    start: m.index,
    end: m.index + m[0].length,
    line: content.slice(0, m.index).split('\n').length,
  }))

  // 作用域只在 formulas 数组内生效：以 `formulas:` 为界切段，避免误判 quantities / gaokaoPoints
  const formulaScopes = [...content.matchAll(/formulas\s*:\s*\[/g)].map((m) => m.index)

  names.forEach((current, i) => {
    const inFormulaScope = formulaScopes.some((s) => s < current.start)
    if (!inFormulaScope) return

    const rule = LAW_RULES.find((r) => r.match.test(current.value))
    if (!rule) return
    checked += 1

    const scopeEnd = i + 1 < names.length ? names[i + 1].start : content.length
    const scope = content.slice(current.end, scopeEnd)
    const condMatch = scope.match(CONDITION_RE)
    const rawVal = condMatch ? condMatch[1].trim() : ''
    const value = rawVal === "''" || rawVal === '""' || rawVal === '``' || rawVal === 'undefined' ? '' : rawVal

    if (!value) {
      violations.push({
        file: relPath,
        line: current.line,
        reason: `公式「${current.value}」命中 ${rule.id}，缺少 condition。${rule.hint}`,
      })
    }
  })
}

if (violations.length > 0) {
  console.error('\n❌ check:formula-condition 检测失败：守恒/定律类公式缺少「适用条件」：\n')
  for (const v of violations) console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
  console.error(
    `\n共计 ${violations.length} 处缺失（本脚本覆盖 ${checked} 条定律类公式）。` +
      '\n右屏 FormulaSection 只在 condition 存在时渲染条件行，缺失即学生看不到成立前提。\n',
  )
  process.exit(1)
} else {
  console.log(
    `✅ check:formula-condition check passed: ${checked} 条守恒/定律类公式均已声明适用条件。`,
  )
}
