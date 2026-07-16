#!/usr/bin/env node
/**
 * check-no-raf.mjs
 *
 * 检测非 src/utils/animation.ts 中的 requestAnimationFrame 直接调用（铁律1-4）。
 * 动画调度必须通过 src/utils/animation.ts 的 Hook。
 *
 * 用法：node scripts/check-no-raf.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC_DIR = join(ROOT, 'src')
const ALLOWED_FILE = join(ROOT, 'src', 'utils', 'animation.ts')
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])
const RAF_CALL_REGEX = /(?<!\w)requestAnimationFrame\s*\(/g
// 匹配注释行（// 或 * 开头的行）
const COMMENT_REGEX = /^\s*(\/\/|\/?\*|\*)/

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

const violations = []
for (const file of walk(SRC_DIR)) {
  if (file === ALLOWED_FILE) continue

  const content = readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 跳过注释行
    if (COMMENT_REGEX.test(line)) continue
    RAF_CALL_REGEX.lastIndex = 0
    if (RAF_CALL_REGEX.test(line)) {
      violations.push({
        file: relative(ROOT, file).replaceAll('\\', '/'),
        line: i + 1,
        text: line.trim(),
      })
    }
  }
}

if (violations.length > 0) {
  console.error('❌ Direct requestAnimationFrame calls detected (铁律1-4)。')
  console.error('   动画调度必须通过 useAnimationFrame / useSimulationFrame（src/utils/animation.ts）。')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`)
  }
  process.exit(1)
}

console.log('✅ No-RAF check passed: no direct requestAnimationFrame calls found.')
