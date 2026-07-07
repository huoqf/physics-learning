#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['src']
const FILE_EXTENSIONS = new Set(['.ts', '.tsx'])

// Existing oversized files are tracked as technical debt. The check fails when:
// 1. a non-allowlisted source file grows beyond SOFT_LIMIT, or
// 2. any source file grows beyond HARD_LIMIT.
const SOFT_LIMIT = 800
const HARD_LIMIT = 1000

const ALLOWLIST = new Set([
  'src/data/knowledgeTree.ts',
  'src/features/mechanics/momentum/MomentumTheoremAnimation.tsx',
  'src/features/electromagnetism/magnetism/VelocitySelector.tsx',
  'src/features/optics/thin-lens/ThinLensAnimation.tsx',
  'src/features/modern/bohr-theory/components/ExcitationSim.tsx',
])

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

function lineCount(file) {
  const text = readFileSync(file, 'utf8')
  if (text.length === 0) return 0
  return text.split(/\r?\n/).length
}

const allFiles = TARGET_DIRS.flatMap((dir) => walk(join(ROOT, dir)))
const oversized = allFiles
  .map((file) => ({ file: relative(ROOT, file).replaceAll('\\', '/'), lines: lineCount(file) }))
  .filter(({ lines }) => lines > SOFT_LIMIT)
  .sort((a, b) => b.lines - a.lines)

const hardViolations = oversized.filter(({ lines }) => lines > HARD_LIMIT)
const newSoftViolations = oversized.filter(({ file }) => !ALLOWLIST.has(file))

if (oversized.length > 0) {
  console.log(`ℹ️  Files over ${SOFT_LIMIT} lines:`)
  for (const item of oversized) {
    const marker = ALLOWLIST.has(item.file) ? 'allowlisted' : 'NEW'
    console.log(`  ${item.lines.toString().padStart(4)}  ${item.file}  (${marker})`)
  }
}

if (hardViolations.length > 0 || newSoftViolations.length > 0) {
  if (hardViolations.length > 0) {
    console.error(`❌ Files exceed hard limit ${HARD_LIMIT} lines:`)
    for (const item of hardViolations) console.error(`  ${item.lines}  ${item.file}`)
  }
  if (newSoftViolations.length > 0) {
    console.error(`❌ New files exceed soft limit ${SOFT_LIMIT} lines. Split logic or add an explicit allowlist entry with justification.`)
    for (const item of newSoftViolations) console.error(`  ${item.lines}  ${item.file}`)
  }
  process.exit(1)
}

console.log('✅ large-file architecture check passed: no new oversized files and no hard-limit violations.')
