#!/usr/bin/env node
/**
 * check-quantity-labels.mjs
 *
 * 物理量看板数据守卫脚本。
 *
 * 背景：看板渲染约定为 `q.symbol ? `${q.label} ${q.symbol}` : q.label`
 *      （见 src/components/Formula/PhysicsPanel.tsx，纯文本拼接，不做 LaTeX 渲染）。
 *      因此数据层必须保证：
 *        - label 为纯中文描述，不得再携带物理符号，否则出现 "感应电动势 E E" 之类重复；
 *        - symbol 为可直接显示的纯文本符号，不得含 LaTeX 命令或花括号下标。
 *
 * 检测范围：src/data/quantities/**（递归，.ts/.tsx）
 * 检测规则：
 *   ① label 已携带 symbol —— 归一化后 label 包含 symbol 的主符号（剥离下标后的部分）
 *   ② symbol 为纯中文 —— 不属于物理符号，应移除 symbol 字段
 *   ③ symbol 含 LaTeX 语法（反斜杠或花括号）—— 看板会原样打印 "\Delta U" 这类字符
 *
 * 说明：label 与 symbol 采用「作用域邻近」匹配——每个 label 的作用域自其结尾起、
 *      至下一个 label 出现为止。因此单行写法（`{ label: '...', symbol: '...' }`）
 *      与多行写法（label 与 symbol 各占一行）均可被覆盖。
 *
 * 用法：node scripts/check-quantity-labels.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGET_DIR = join(ROOT, 'src', 'data', 'quantities')
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])

/** LaTeX 希腊字母命令 -> 实际字符（用于 label / symbol 归一化比对） */
const GREEK = {
  Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ', Eta: 'Η',
  Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ',
  Omicron: 'Ο', Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ', Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ',
  Chi: 'Χ', Psi: 'Ψ', Omega: 'Ω',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
  omicron: 'ο', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω', infty: '∞', partial: '∂', nabla: '∇', parallel: '∥',
}

/** 归一化：忽略 LaTeX 包装、下标花括号与空白差异，仅保留符号本体 */
function normalize(text) {
  return text
    .replace(/\\text\s*\{([^{}]*)\}/g, '$1')                 // \text{共} -> 共
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2') // \frac{a}{b} -> a/b
    .replace(/\\([A-Za-z]+)/g, (_, name) => GREEK[name] ?? '')  // \Delta -> Δ
    .replace(/[{}\s_\\]/g, '')                                // 剥离 {} _ \ 与空白
}

/** 主符号：剥离下标（_{...} 或 _x）后的符号本体，用于判定 label 是否已携带该符号 */
function coreSymbol(symbol) {
  return normalize(
    symbol
      .replace(/_\s*\{[^{}]*\}/g, '')
      .replace(/_[A-Za-z0-9]+/g, ''),
  )
}

const isPureCJK = (text) => /^[\u4e00-\u9fa5]+$/.test(text)

const LABEL_RE = /label\s*:\s*['"`]([^'"`]*)['"`]/g
const SYMBOL_RE = /symbol\s*:\s*['"`]([^'"`]*)['"`]/

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

for (const file of walk(TARGET_DIR)) {
  const relPath = relative(ROOT, file).replaceAll('\\', '/')
  const content = readFileSync(file, 'utf8')

  const labels = [...content.matchAll(LABEL_RE)].map((m) => ({
    value: m[1].trim(),
    start: m.index,
    end: m.index + m[0].length,
    line: content.slice(0, m.index).split('\n').length,
  }))

  labels.forEach((current, i) => {
    const scopeEnd = i + 1 < labels.length ? labels[i + 1].start : content.length
    const symbolMatch = content.slice(current.end, scopeEnd).match(SYMBOL_RE)
    if (!symbolMatch) return

    const symbol = symbolMatch[1].trim()
    const nLabel = normalize(current.value)
    const core = coreSymbol(symbol)

    if (core && nLabel.includes(core)) {
      violations.push({
        file: relPath,
        line: current.line,
        reason: `label '${current.value}' 已携带符号 '${symbol}'，看板将渲染为 '${current.value} ${symbol}'`,
      })
      return
    }

    if (isPureCJK(symbol)) {
      violations.push({
        file: relPath,
        line: current.line,
        reason: `symbol '${symbol}' 为纯中文，不属于物理符号，应移除 symbol 字段`,
      })
      return
    }

    if (/[\\{}]/.test(symbol)) {
      violations.push({
        file: relPath,
        line: current.line,
        reason: `symbol '${symbol}' 含 LaTeX 语法，看板不做 LaTeX 渲染，会原样打印。请改用 Unicode 字符与下划线（如 'ΔU'、'F_安'）`,
      })
    }
  })
}

if (violations.length > 0) {
  console.error('\n❌ check:quantity-labels 检测失败：发现看板物理量 label / symbol 定义缺陷：\n')
  for (const v of violations) console.error(`  ${v.file}:${v.line} -> ${v.reason}`)
  console.error(`\n共计 ${violations.length} 处违规。请保持 label 为纯中文描述、symbol 为可直接显示的纯文本符号。\n`)
  process.exit(1)
} else {
  console.log('✅ check:quantity-labels check passed: 所有物理量看板 label 与 symbol 均规范自洽。')
}
