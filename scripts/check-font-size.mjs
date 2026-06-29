#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC_DIR = join(ROOT, 'src')
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])

/**
 * Guard against newly introduced raw numeric fontSize values in style objects.
 *
 * This intentionally checks `fontSize: 11` style-object literals, which are easy
 * to replace with the responsive `font(...)` helper. SVG attribute literals such
 * as `fontSize="11"` still have a separate migration backlog and are not failed
 * here to keep this guard actionable on the current codebase.
 */
const RAW_STYLE_FONT_SIZE = /fontSize\s*:\s*\d+(?:\.\d+)?\b/g

function walk(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...walk(fullPath))
    } else if (stat.isFile()) {
      const ext = fullPath.slice(fullPath.lastIndexOf('.'))
      if (FILE_EXTENSIONS.has(ext)) files.push(fullPath)
    }
  }
  return files
}

const violations = []
for (const file of walk(SRC_DIR)) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    if (RAW_STYLE_FONT_SIZE.test(line)) {
      violations.push({
        file: relative(ROOT, file),
        line: index + 1,
        text: line.trim(),
      })
    }
    RAW_STYLE_FONT_SIZE.lastIndex = 0
  })
}

if (violations.length > 0) {
  console.error('❌ Raw numeric style fontSize values detected. Use font(...) / canvasSize.font(...).')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.text}`)
  }
  process.exit(1)
}

console.log('✅ fontSize architecture check passed: no raw numeric style fontSize values found.')
