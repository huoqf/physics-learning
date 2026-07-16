#!/usr/bin/env node
/**
 * check-no-marker.mjs
 *
 * 检测 src/features/ 和 src/components/ 中手写 <marker> 元素（铁律1-5）。
 * 白名单见 legacy-marker-whitelist.json，每项必须记录原因和预期清除日期。
 *
 * 用法：node scripts/check-no-marker.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = [join(ROOT, 'src', 'features'), join(ROOT, 'src', 'components')]
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])
const MARKER_REGEX = /<marker[\s>]/g

// ── 白名单加载 ─────────────────────────────────────────────
const WHITELIST_PATH = join(ROOT, 'scripts', 'legacy-marker-whitelist.json')
let whitelist = new Set()
try {
  const raw = JSON.parse(readFileSync(WHITELIST_PATH, 'utf8'))
  whitelist = new Set((raw.entries || []).map(e => e.file))
} catch {
  // 白名单文件不存在或解析失败，不阻塞（但后续匹配会全部报错）
}

// ── 文件遍历 ───────────────────────────────────────────────
function walk(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) files.push(...walk(full))
    else if (FILE_EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) files.push(full)
  }
  return files
}

// ── 检测 ───────────────────────────────────────────────────
const violations = []
for (const dir of TARGET_DIRS) {
  if (!statSync(dir).isDirectory()) continue
  for (const file of walk(dir)) {
    const relPath = relative(ROOT, file).replaceAll('\\', '/')
    if (whitelist.has(relPath)) continue

    const content = readFileSync(file, 'utf8')
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      MARKER_REGEX.lastIndex = 0
      if (MARKER_REGEX.test(lines[i])) {
        violations.push({ file: relPath, line: i + 1, text: lines[i].trim() })
      }
    }
  }
}

// ── 输出 ───────────────────────────────────────────────────
if (violations.length > 0) {
  console.error('❌ Handwritten <marker> elements detected (铁律1-5: 禁止自造 marker)。')
  console.error('   使用 VectorDefs 组件统一管理 SVG marker 定义。')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`)
  }
  console.error('')
  console.error(`   如确需保留，请在 scripts/legacy-marker-whitelist.json 中添加条目并记录原因。`)
  process.exit(1)
}

// ── 白名单到期检查 ─────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
try {
  const raw = JSON.parse(readFileSync(WHITELIST_PATH, 'utf8'))
  const expired = (raw.entries || []).filter(e => e.targetDate && e.targetDate < today)
  if (expired.length > 0) {
    console.warn(`⚠️  白名单中有 ${expired.length} 项已过期（targetDate < ${today}）：`)
    for (const e of expired) {
      console.warn(`  - ${e.file}  (targetDate: ${e.targetDate})  ${e.reason}`)
    }
    console.warn('   请评估是否已迁移，若已迁移则从白名单中移除。')
  }
} catch { /* whitelist not critical */ }

console.log('✅ No-marker check passed: no handwritten <marker> elements found.')
