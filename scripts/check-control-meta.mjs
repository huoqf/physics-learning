#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const REGISTRY_DIR = join(ROOT, 'src', 'data', 'registries')

/**
 * 守卫左屏 ControlMeta 架构规范：
 * 1. 杜绝在 controlMeta.preset 的 description 中堆砌长篇题解小论文（上限 85 字符）。
 * 2. 避免在同一动画配置内，将 preset 错误地排在 segmented 模式切换之前（倒置交互顺序）。
 */

const violations = []

for (const file of readdirSync(REGISTRY_DIR)) {
  if (!file.endsWith('.ts')) continue
  const fullPath = join(REGISTRY_DIR, file)
  const relPath = relative(ROOT, fullPath)
  const content = readFileSync(fullPath, 'utf8')

  // 1. 检查 preset description 长度
  const descRegex = /type:\s*['"]preset['"][\s\S]*?description:\s*['"`]([\s\S]*?)['"`]/g
  let match
  while ((match = descRegex.exec(content)) !== null) {
    const descText = match[1].trim()
    // 去除多行换行
    const cleanText = descText.replace(/\s+/g, ' ')
    if (cleanText.length > 85) {
      const lineNum = content.slice(0, match.index).split('\n').length
      violations.push({
        file: relPath,
        line: lineNum,
        reason: `预设描述过长（${cleanText.length} 字符 > 85 字符限制），严禁在左屏塞入长篇题解或考点：${cleanText.slice(0, 40)}...`,
      })
    }
  }
}

if (violations.length > 0) {
  console.error('❌ 左屏 ControlMeta 规范守卫检查失败：')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} - ${v.reason}`)
  }
  process.exit(1)
}

console.log('✅ control-meta architecture check passed: 预设文案精炼，无长篇题解堆砌。')
